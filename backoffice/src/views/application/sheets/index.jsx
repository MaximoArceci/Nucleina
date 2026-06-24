import * as React from 'react';
import ExcelJS from 'exceljs/dist/exceljs.min.js';
import Spreadsheet from 'react-spreadsheet';
import * as XLSX from 'xlsx';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import MainCard from 'ui-component/cards/MainCard';
import axios from 'utils/axios';
import { useAuth } from 'contexts/Auth0Context';

const ROWS = 24;
const COLUMNS = 12;
const DEFAULT_COLUMN_WIDTH = 132;
const DEFAULT_ROW_HEIGHT = 36;
const FONT_FAMILIES = ['Inter', 'Roboto', 'Arial', 'Georgia', 'Courier New'];
const FONT_SIZES = [11, 12, 13, 14, 16, 18, 20, 24];

const defaultCellStyle = {
    color: '#111827',
    backgroundColor: '#ffffff',
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left'
};

const emptyCell = () => ({ value: '', style: { ...defaultCellStyle } });

const createEmptyGrid = () =>
    Array.from({ length: ROWS }, () => Array.from({ length: COLUMNS }, emptyCell));

const createEmptyWorkbook = () => ({
    cells: createEmptyGrid(),
    columnWidths: [],
    rowHeights: [],
    merges: []
});

const emptyDraft = {
    id: null,
    title: '',
    areaId: '',
    workbook: createEmptyWorkbook()
};

const getErrorMessage = (error) => {
    const detail = error?.response?.data?.detail;
    if (Array.isArray(detail)) return detail.map((item) => item.msg).join(', ');
    if (detail) return detail;
    return error?.message || 'No se pudo completar la accion.';
};

const asArray = (value) => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.items)) return value.items;
    if (Array.isArray(value?.results)) return value.results;
    if (Array.isArray(value?.spreadsheets)) return value.spreadsheets;
    if (Array.isArray(value?.areas)) return value.areas;
    return [];
};

const normalizeAreaId = (value) => (value === undefined || value === null || value === '' ? '' : String(value));

const normalizeGrid = (cells) => {
    if (!Array.isArray(cells) || cells.length === 0) return createEmptyGrid();
    const next = cells.map((row) =>
        Array.isArray(row)
            ? row.map((cell) => ({
                value: cell?.value ?? '',
                type: cell?.type || 'text',
                options: Array.isArray(cell?.options) ? cell.options : [],
                style: {
                    ...defaultCellStyle,
                    ...(cell?.style || {})
                }
            }))
            : []
    );
    while (next.length < ROWS) next.push(Array.from({ length: COLUMNS }, emptyCell));
    return next.map((row) => {
        const normalizedRow = [...row];
        while (normalizedRow.length < COLUMNS) normalizedRow.push(emptyCell());
        return normalizedRow;
    });
};

const normalizeWorkbook = (workbook = {}) => ({
    cells: normalizeGrid(workbook.cells),
    columnWidths: Array.isArray(workbook.columnWidths) ? workbook.columnWidths : [],
    rowHeights: Array.isArray(workbook.rowHeights) ? workbook.rowHeights : [],
    merges: Array.isArray(workbook.merges) ? workbook.merges.map(normalizeMerge).filter((merge) =>
        Number.isFinite(merge.startRow) &&
        Number.isFinite(merge.startColumn) &&
        Number.isFinite(merge.endRow) &&
        Number.isFinite(merge.endColumn)
    ) : []
});

const pickSpreadsheetFields = (spreadsheet) => ({
    id: spreadsheet.id,
    title: spreadsheet.title,
    areaId: spreadsheet.areaId,
    workbook: normalizeWorkbook(spreadsheet.workbook)
});

const gridToAoA = (grid) => grid.map((row) => row.map((cell) => cell?.value ?? ''));

const aoaToGrid = (rows) => {
    const grid = rows.map((row) => row.map((value) => ({ value: value ?? '' })));
    return normalizeGrid(grid);
};

const argbToHex = (argb) => {
    if (!argb || typeof argb !== 'string') return '';
    const normalized = argb.replace('#', '').trim();
    const rgb = normalized.length === 8 ? normalized.slice(2) : normalized;
    return rgb.length === 6 ? `#${rgb}` : '';
};

const excelColorToHex = (color) => {
    if (!color) return '';
    if (color.argb) return argbToHex(color.argb);
    if (color.theme !== undefined) return '';
    return '';
};

const excelValueToText = (value) => {
    if (value == null) return '';
    if (value instanceof Date) return value.toLocaleDateString();
    if (typeof value === 'object') {
        if (value.text !== undefined) return String(value.text);
        if (value.result !== undefined) return String(value.result ?? '');
        if (value.richText) return value.richText.map((part) => part.text).join('');
        if (value.hyperlink && value.text) return String(value.text);
        return String(value.result ?? value.formula ?? '');
    }
    return String(value);
};

const excelAlignmentToTextAlign = (horizontal) => {
    if (horizontal === 'center' || horizontal === 'right') return horizontal;
    return 'left';
};

const excelColumnWidthToPx = (width) => {
    if (!width) return undefined;
    return Math.max(56, Math.round(width * 7 + 16));
};

const excelRowHeightToPx = (height) => {
    if (!height) return undefined;
    return Math.max(28, Math.round(height * 1.33));
};

const columnLettersToIndex = (letters) =>
    letters.split('').reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;

const excelAddressToPoint = (address) => {
    const match = String(address).match(/^([A-Z]+)(\d+)$/i);
    if (!match) return null;
    return {
        row: Number(match[2]) - 1,
        column: columnLettersToIndex(match[1].toUpperCase())
    };
};

const excelRangeToMerge = (range) => {
    const [startAddress, endAddress = startAddress] = String(range).split(':');
    const start = excelAddressToPoint(startAddress);
    const end = excelAddressToPoint(endAddress);
    if (!start || !end) return null;
    return {
        startRow: Math.min(start.row, end.row),
        startColumn: Math.min(start.column, end.column),
        endRow: Math.max(start.row, end.row),
        endColumn: Math.max(start.column, end.column)
    };
};

function normalizeMerge(merge) {
    return {
    startRow: Math.min(merge.startRow, merge.endRow),
    startColumn: Math.min(merge.startColumn, merge.endColumn),
    endRow: Math.max(merge.startRow, merge.endRow),
    endColumn: Math.max(merge.startColumn, merge.endColumn)
    };
}

const mergeContainsPoint = (merge, row, column) =>
    row >= merge.startRow && row <= merge.endRow && column >= merge.startColumn && column <= merge.endColumn;

const findMergeAt = (merges, row, column) =>
    (merges || []).find((merge) => mergeContainsPoint(merge, row, column));

const isMergeAnchor = (merge, row, column) =>
    merge && merge.startRow === row && merge.startColumn === column;

const mergeOverlaps = (a, b) =>
    a.startRow <= b.endRow && a.endRow >= b.startRow && a.startColumn <= b.endColumn && a.endColumn >= b.startColumn;

const excelCellToSheetCell = (cell) => {
    const fillColor = cell.fill?.type === 'pattern' ? excelColorToHex(cell.fill.fgColor) : '';
    const fontColor = excelColorToHex(cell.font?.color);
    const listFormula = cell.dataValidation?.type === 'list' ? cell.dataValidation.formulae?.[0] : '';
    const selectOptions = typeof listFormula === 'string' && listFormula.startsWith('"') && listFormula.endsWith('"')
        ? listFormula.slice(1, -1).split(',').map((option) => option.trim()).filter(Boolean)
        : [];
    const style = {
        ...defaultCellStyle,
        ...(fillColor ? { backgroundColor: fillColor } : {}),
        ...(fontColor ? { color: fontColor } : {}),
        ...(cell.font?.name ? { fontFamily: cell.font.name } : {}),
        ...(cell.font?.size ? { fontSize: cell.font.size } : {}),
        ...(cell.font?.bold ? { fontWeight: 'bold' } : {}),
        ...(cell.font?.italic ? { fontStyle: 'italic' } : {}),
        ...(cell.alignment?.horizontal ? { textAlign: excelAlignmentToTextAlign(cell.alignment.horizontal) } : {}),
        ...(cell.alignment?.wrapText ? { whiteSpace: 'normal' } : {})
    };

    return {
        value: excelValueToText(cell.value),
        type: selectOptions.length > 0 ? 'select' : 'text',
        options: selectOptions,
        style
    };
};

const importStyledWorkbook = async (buffer) => {
    const excelWorkbook = new ExcelJS.Workbook();
    await excelWorkbook.xlsx.load(buffer);
    const worksheet = excelWorkbook.worksheets[0];
    if (!worksheet) return createEmptyWorkbook();

    const rowCount = Math.max(worksheet.actualRowCount || 0, ROWS);
    const columnCount = Math.max(worksheet.actualColumnCount || 0, COLUMNS);
    const cells = Array.from({ length: rowCount }, (_, rowIndex) =>
        Array.from({ length: columnCount }, (_, columnIndex) => excelCellToSheetCell(worksheet.getCell(rowIndex + 1, columnIndex + 1)))
    );

    const columnWidths = Array.from({ length: columnCount }, (_, columnIndex) =>
        excelColumnWidthToPx(worksheet.getColumn(columnIndex + 1).width)
    );
    const rowHeights = Array.from({ length: rowCount }, (_, rowIndex) =>
        excelRowHeightToPx(worksheet.getRow(rowIndex + 1).height)
    );
    const merges = (worksheet.model?.merges || [])
        .map(excelRangeToMerge)
        .filter(Boolean)
        .map(normalizeMerge);

    return normalizeWorkbook({ cells, columnWidths, rowHeights, merges });
};

const importValueWorkbook = (buffer) => {
    const workbook = XLSX.read(buffer);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, blankrows: false });
    return normalizeWorkbook({ cells: aoaToGrid(rows) });
};

const downloadWorkbook = (draft) => {
    const worksheet = XLSX.utils.aoa_to_sheet(gridToAoA(draft.workbook.cells));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Planilla');
    XLSX.writeFile(workbook, `${draft.title || 'planilla'}.xlsx`);
};

const StyledDataViewer = ({ cell, evaluatedCell }) => {
    const value = evaluatedCell?.value ?? cell?.value ?? '';
    const style = { ...defaultCellStyle, ...(cell?.style || {}) };
    return (
        <Box
            component="span"
            sx={{
                ...style,
                alignItems: 'center',
                boxSizing: 'border-box',
                display: 'flex',
                height: '100%',
                justifyContent: style.textAlign === 'right' ? 'flex-end' : style.textAlign === 'center' ? 'center' : 'flex-start',
                minHeight: '100%',
                overflow: 'hidden',
                px: 1,
                whiteSpace: style.whiteSpace || 'nowrap',
                width: '100%'
            }}
        >
            <Box component="span" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {value}
            </Box>
            {cell?.type === 'select' && (
                <Box component="span" sx={{ color: 'text.secondary', fontSize: 10, ml: 0.75 }}>
                    ▼
                </Box>
            )}
        </Box>
    );
};

const StyledDataEditor = ({ cell, onChange }) => {
    const value = cell?.value ?? '';
    const style = { ...defaultCellStyle, ...(cell?.style || {}) };

    return (
        cell?.type === 'select' ? (
            <select
                autoFocus
                value={value}
                onChange={(event) => onChange({ ...cell, value: event.target.value })}
                style={{
                    ...style,
                    width: '100%',
                    height: '100%',
                    border: 0,
                    outline: 0,
                    padding: '6px 8px',
                    boxSizing: 'border-box'
                }}
            >
                <option value=""></option>
                {(cell.options || []).map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>
        ) : (
            <input
                autoFocus
                value={value}
                onChange={(event) => onChange({ ...cell, value: event.target.value })}
                style={{
                    ...style,
                    width: '100%',
                    height: '100%',
                    border: 0,
                    outline: 0,
                    padding: '6px 8px',
                    boxSizing: 'border-box'
                }}
            />
        )
    );
};

const MergedSpreadsheetCell = ({
    row,
    column,
    DataViewer,
    selected,
    active,
    copied,
    dragging,
    mode,
    data,
    evaluatedData,
    select,
    activate,
    setCellDimensions,
    setCellData,
    merges
}) => {
    const merge = findMergeAt(merges, row, column);
    const rootRef = React.useRef(null);
    const point = React.useMemo(() => ({ row, column }), [row, column]);
    const rowSpan = merge ? merge.endRow - merge.startRow + 1 : 1;
    const colSpan = merge ? merge.endColumn - merge.startColumn + 1 : 1;

    const setDimensions = React.useCallback((element) => {
        if (!element) return;
        setCellDimensions(point, {
            width: element.offsetWidth,
            height: element.offsetHeight,
            top: element.offsetTop,
            left: element.offsetLeft
        });
    }, [point, setCellDimensions]);

    const handleMouseDown = React.useCallback((event) => {
        if (mode === 'view') {
            setDimensions(event.currentTarget);
            if (event.shiftKey) {
                select(point);
            } else {
                activate(point);
            }
        }
    }, [activate, mode, point, select, setDimensions]);

    const handleMouseOver = React.useCallback((event) => {
        if (dragging) {
            setDimensions(event.currentTarget);
            select(point);
        }
    }, [dragging, point, select, setDimensions]);

    React.useEffect(() => {
        if (selected && rootRef.current) setDimensions(rootRef.current);
        if (rootRef.current && active && mode === 'view') rootRef.current.focus();
    }, [active, data, mode, selected, setDimensions]);

    if (merge && !isMergeAnchor(merge, row, column)) return null;

    return (
        <td
            ref={rootRef}
            tabIndex={0}
            rowSpan={rowSpan}
            colSpan={colSpan}
            className={[
                'Spreadsheet__cell',
                selected ? 'Spreadsheet__cell--selected' : '',
                active ? 'Spreadsheet__cell--active' : '',
                copied ? 'Spreadsheet__cell--copied' : '',
                data?.readOnly ? 'Spreadsheet__cell--readonly' : '',
                merge ? 'Spreadsheet__cell--merged' : ''
            ].filter(Boolean).join(' ')}
            onMouseDown={handleMouseDown}
            onMouseOver={handleMouseOver}
        >
            <DataViewer
                row={row}
                column={column}
                cell={data}
                evaluatedCell={evaluatedData}
                setCellData={setCellData}
            />
        </td>
    );
};

const Sheets = () => {
    const { userId } = useAuth();
    const fileInputRef = React.useRef(null);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState('');
    const [areas, setAreas] = React.useState([]);
    const [spreadsheets, setSpreadsheets] = React.useState([]);
    const [selectedAreaId, setSelectedAreaId] = React.useState('');
    const [draft, setDraft] = React.useState(emptyDraft);
    const [search, setSearch] = React.useState('');
    const [deleteOpen, setDeleteOpen] = React.useState(false);
    const [activeCell, setActiveCell] = React.useState(null);
    const [selectedRange, setSelectedRange] = React.useState(null);
    const [isFullscreen, setIsFullscreen] = React.useState(false);
    const [selectOptionsText, setSelectOptionsText] = React.useState('');

    const activeCellData = React.useMemo(() => {
        if (!activeCell) return null;
        return draft.workbook.cells?.[activeCell.row]?.[activeCell.column] || null;
    }, [activeCell, draft.workbook.cells]);

    const activeStyle = React.useMemo(() => {
        if (!activeCell) return defaultCellStyle;
        return {
            ...defaultCellStyle,
            ...(draft.workbook.cells?.[activeCell.row]?.[activeCell.column]?.style || {})
        };
    }, [activeCell, draft.workbook.cells]);

    const activeMerge = React.useMemo(() => {
        if (!activeCell) return null;
        return findMergeAt(draft.workbook.merges, activeCell.row, activeCell.column) || null;
    }, [activeCell, draft.workbook.merges]);

    const spreadsheetSizeSx = React.useMemo(() => {
        const columnWidths = draft.workbook.columnWidths || [];
        const rowHeights = draft.workbook.rowHeights || [];
        const columnRules = columnWidths.reduce((rules, width, index) => {
            if (!width) return rules;
            rules[`& .Spreadsheet tr > *:nth-of-type(${index + 2})`] = {
                maxWidth: width,
                minWidth: width,
                width
            };
            return rules;
        }, {});
        const rowRules = rowHeights.reduce((rules, height, index) => {
            if (!height) return rules;
            rules[`& .Spreadsheet tr:nth-of-type(${index + 2}) .Spreadsheet__cell`] = {
                height,
                minHeight: height
            };
            return rules;
        }, {});
        return { ...columnRules, ...rowRules };
    }, [draft.workbook.columnWidths, draft.workbook.rowHeights]);

    React.useEffect(() => {
        if (!activeCellData || activeCellData.type !== 'select') {
            setSelectOptionsText('');
            return;
        }
        setSelectOptionsText((activeCellData.options || []).join('\n'));
    }, [activeCellData]);

    const loadBase = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const areasResponse = await axios.get('/datos/area/');
            const nextAreas = asArray(areasResponse.data);
            setAreas(nextAreas);

            let nextSheets = [];
            try {
                const sheetsResponse = await axios.get('/planillas/');
                nextSheets = asArray(sheetsResponse.data);
            } catch (err) {
                setError(getErrorMessage(err));
            }
            setSpreadsheets(nextSheets);
            const initialAreaId = normalizeAreaId(selectedAreaId || nextSheets[0]?.areaId || nextAreas[0]?.id || '');
            setSelectedAreaId(initialAreaId);
            if (!draft.id && nextSheets.length > 0) {
                const firstSheet = nextSheets.find((sheet) => normalizeAreaId(sheet.areaId) === initialAreaId) || nextSheets[0];
                setDraft(pickSpreadsheetFields(firstSheet));
            } else if (!draft.id) {
                setDraft({ ...emptyDraft, areaId: initialAreaId, title: 'Nueva planilla' });
            }
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [draft.id, selectedAreaId]);

    React.useEffect(() => {
        loadBase();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const visibleSpreadsheets = spreadsheets.filter((sheet) => {
        const matchesArea = normalizeAreaId(sheet.areaId) === normalizeAreaId(selectedAreaId);
        const matchesSearch = sheet.title.toLowerCase().includes(search.trim().toLowerCase());
        return matchesArea && matchesSearch;
    });

    const selectSpreadsheet = (spreadsheet) => {
        setDraft(pickSpreadsheetFields(spreadsheet));
        setActiveCell(null);
        setSelectedRange(null);
    };

    const createSpreadsheet = () => {
        setDraft({
            ...emptyDraft,
            title: 'Nueva planilla',
            areaId: normalizeAreaId(selectedAreaId || areas[0]?.id || ''),
            workbook: createEmptyWorkbook()
        });
        setActiveCell(null);
        setSelectedRange(null);
    };

    const handleSelect = React.useCallback((selection) => {
        if (!selection?.toRange) {
            setSelectedRange(null);
            return;
        }
        const range = selection.toRange(draft.workbook.cells);
        if (!range) {
            setSelectedRange(null);
            return;
        }
        setSelectedRange({
            startRow: Math.min(range.start.row, range.end.row),
            startColumn: Math.min(range.start.column, range.end.column),
            endRow: Math.max(range.start.row, range.end.row),
            endColumn: Math.max(range.start.column, range.end.column)
        });
    }, [draft.workbook.cells]);

    const applyCellStyle = (styleUpdate) => {
        if (!activeCell) {
            setError('Seleccioná una celda para aplicar formato.');
            return;
        }

        updateActiveCell((cell) => ({
            ...cell,
            style: {
                ...defaultCellStyle,
                ...(cell.style || {}),
                ...styleUpdate
            }
        }));
    };

    const updateActiveCell = (updater) => {
        if (!activeCell) {
            setError('Seleccioná una celda para editar sus propiedades.');
            return;
        }

        setDraft((current) => {
            const cells = normalizeGrid(current.workbook.cells).map((row) => row.map((cell) => ({ ...cell, style: { ...cell.style } })));
            const cell = cells[activeCell.row]?.[activeCell.column];
            if (!cell) return current;
            cells[activeCell.row][activeCell.column] = updater(cell);
            return { ...current, workbook: { ...current.workbook, cells } };
        });
    };

    const setActiveCellType = (type) => {
        updateActiveCell((cell) => ({
            ...cell,
            type,
            options: type === 'select' ? cell.options || [] : []
        }));
    };

    const saveSelectOptions = () => {
        const options = selectOptionsText
            .split('\n')
            .map((option) => option.trim())
            .filter(Boolean);
        updateActiveCell((cell) => ({
            ...cell,
            type: 'select',
            options,
            value: options.includes(cell.value) ? cell.value : ''
        }));
    };

    const addRow = () => {
        setDraft((current) => ({
            ...current,
            workbook: {
                ...current.workbook,
                cells: [...normalizeGrid(current.workbook.cells), Array.from({ length: Math.max(COLUMNS, current.workbook.cells?.[0]?.length || COLUMNS) }, emptyCell)],
                rowHeights: [...(current.workbook.rowHeights || []), DEFAULT_ROW_HEIGHT]
            }
        }));
    };

    const addColumn = () => {
        setDraft((current) => ({
            ...current,
            workbook: {
                ...current.workbook,
                cells: normalizeGrid(current.workbook.cells).map((row) => [...row, emptyCell()]),
                columnWidths: [...(current.workbook.columnWidths || []), DEFAULT_COLUMN_WIDTH]
            }
        }));
    };

    const mergeSelectedCells = () => {
        const sourceMerge = selectedRange || (activeCell ? {
            startRow: activeCell.row,
            startColumn: activeCell.column,
            endRow: activeCell.row,
            endColumn: activeCell.column
        } : null);
        const merge = sourceMerge ? normalizeMerge(sourceMerge) : null;

        if (!merge || (merge.startRow === merge.endRow && merge.startColumn === merge.endColumn)) {
            setError('Seleccioná un rango de al menos dos celdas para unir.');
            return;
        }

        setDraft((current) => {
            const merges = (current.workbook.merges || []).filter((existingMerge) => !mergeOverlaps(existingMerge, merge));
            return {
                ...current,
                workbook: {
                    ...current.workbook,
                    merges: [...merges, merge]
                }
            };
        });
        setActiveCell({ row: merge.startRow, column: merge.startColumn });
    };

    const unmergeActiveCells = () => {
        if (!activeCell) {
            setError('Seleccioná una celda unida para separar.');
            return;
        }
        const merge = findMergeAt(draft.workbook.merges, activeCell.row, activeCell.column);
        if (!merge) {
            setError('La celda seleccionada no pertenece a una union.');
            return;
        }
        setDraft((current) => ({
            ...current,
            workbook: {
                ...current.workbook,
                merges: (current.workbook.merges || []).filter((existingMerge) =>
                    existingMerge.startRow !== merge.startRow ||
                    existingMerge.startColumn !== merge.startColumn ||
                    existingMerge.endRow !== merge.endRow ||
                    existingMerge.endColumn !== merge.endColumn
                )
            }
        }));
    };

    const MergedCell = React.useCallback((props) => (
        <MergedSpreadsheetCell {...props} merges={draft.workbook.merges || []} />
    ), [draft.workbook.merges]);

    const saveSpreadsheet = async () => {
        if (!draft.title.trim()) {
            setError('Ingresá un titulo para la planilla.');
            return;
        }
        const areaId = normalizeAreaId(draft.areaId || selectedAreaId);
        if (!areaId) {
            setError('No hay un area seleccionada. Creá al menos un area en Gestion > Areas y volvé a intentar.');
            return;
        }
        setSaving(true);
        setError('');
        const payload = {
            title: draft.title,
            areaId: Number(areaId),
            workbook: {
                ...draft.workbook,
                cells: normalizeGrid(draft.workbook.cells)
            },
            updatedBy: Number(userId || 0),
            archived: false
        };
        try {
            let response;
            if (draft.id) {
                response = await axios.patch(`/planillas/${draft.id}`, payload);
            } else {
                response = await axios.post('/planillas/', payload);
            }
            const saved = response.data;
            setDraft(pickSpreadsheetFields(saved));
            setActiveCell(null);
            setSelectedRange(null);
            const sheetsResponse = await axios.get('/planillas/');
            setSpreadsheets(asArray(sheetsResponse.data));
            setSelectedAreaId(normalizeAreaId(saved.areaId));
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const deleteSpreadsheet = async () => {
        if (!draft.id) return;
        setSaving(true);
        setError('');
        try {
            await axios.delete(`/planillas/${draft.id}`);
            const sheetsResponse = await axios.get('/planillas/');
            const nextSheets = asArray(sheetsResponse.data);
            setSpreadsheets(nextSheets);
            const nextSheet = nextSheets.find((sheet) => normalizeAreaId(sheet.areaId) === normalizeAreaId(selectedAreaId));
            setDraft(nextSheet ? pickSpreadsheetFields(nextSheet) : { ...emptyDraft, areaId: selectedAreaId, title: 'Nueva planilla', workbook: createEmptyWorkbook() });
            setActiveCell(null);
            setSelectedRange(null);
            setDeleteOpen(false);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const importWorkbook = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setError('');
        try {
            const buffer = await file.arrayBuffer();
            let importedWorkbook;
            try {
                importedWorkbook = await importStyledWorkbook(buffer);
            } catch {
                importedWorkbook = importValueWorkbook(buffer);
            }
            setDraft((current) => ({
                ...current,
                title: current.title || file.name.replace(/\.[^.]+$/, ''),
                workbook: importedWorkbook
            }));
            setActiveCell(null);
            setSelectedRange(null);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            event.target.value = '';
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box
            sx={
                isFullscreen
                    ? {
                        position: 'fixed',
                        inset: 0,
                        zIndex: 1400,
                        bgcolor: 'background.default',
                        overflow: 'auto',
                        p: 1.5
                    }
                    : undefined
            }
        >
        <MainCard content={false}>
            <Box sx={{ p: 2.5 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }}>
                    <Box>
                        <Typography variant="h3">Planillas</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Archivos editables por area con importacion y exportacion XLSX.
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => fileInputRef.current?.click()}>
                            Importar
                        </Button>
                        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => downloadWorkbook(draft)}>
                            Exportar
                        </Button>
                        <Button variant="outlined" startIcon={<AddIcon />} onClick={createSpreadsheet}>
                            Nueva
                        </Button>
                        <Button variant="outlined" onClick={addRow}>
                            Fila
                        </Button>
                        <Button variant="outlined" onClick={addColumn}>
                            Columna
                        </Button>
                        <Button variant="outlined" onClick={mergeSelectedCells}>
                            Unir
                        </Button>
                        <Button variant="outlined" onClick={unmergeActiveCells} disabled={!activeMerge}>
                            Separar
                        </Button>
                        <Tooltip title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}>
                            <IconButton color="primary" onClick={() => setIsFullscreen((current) => !current)}>
                                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                            </IconButton>
                        </Tooltip>
                        <Button variant="contained" startIcon={<SaveIcon />} onClick={saveSpreadsheet} disabled={saving || areas.length === 0}>
                            Guardar
                        </Button>
                    </Stack>
                </Stack>

                <input ref={fileInputRef} type="file" hidden accept=".xlsx,.xls,.csv" onChange={importWorkbook} />

                {error && (
                    <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}
                {!loading && areas.length === 0 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                        No hay areas cargadas. Creá al menos una desde Gestion &gt; Areas para poder guardar planillas.
                    </Alert>
                )}

                <Divider sx={{ my: 2.5 }} />

                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="stretch">
                    <Paper variant="outlined" sx={{ width: { xs: '100%', lg: 300 }, p: 2, flexShrink: 0, display: isFullscreen ? 'none' : 'block' }}>
                        <Stack spacing={2}>
                            <TextField
                                select
                                label="Area"
                                value={normalizeAreaId(selectedAreaId)}
                                onChange={(event) => {
                                    const nextAreaId = normalizeAreaId(event.target.value);
                                    setSelectedAreaId(nextAreaId);
                                    setDraft((current) => ({ ...current, areaId: nextAreaId }));
                                }}
                                fullWidth
                                disabled={areas.length === 0}
                            >
                                {areas.length === 0 && (
                                    <MenuItem value="">Sin areas</MenuItem>
                                )}
                                {areas.map((area) => (
                                    <MenuItem key={area.id} value={normalizeAreaId(area.id)}>
                                        {area.name}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                placeholder="Buscar planilla"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    )
                                }}
                                fullWidth
                            />

                            <List dense disablePadding>
                                {visibleSpreadsheets.map((spreadsheet) => (
                                    <ListItemButton
                                        key={spreadsheet.id}
                                        selected={spreadsheet.id === draft.id}
                                        onClick={() => selectSpreadsheet(spreadsheet)}
                                        sx={{ borderRadius: 1 }}
                                    >
                                        <ListItemText
                                            primary={spreadsheet.title}
                                            secondary={new Date(spreadsheet.updatedAt || Date.now()).toLocaleString()}
                                        />
                                    </ListItemButton>
                                ))}
                                {visibleSpreadsheets.length === 0 && (
                                    <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 2 }}>
                                        No hay planillas en esta area.
                                    </Typography>
                                )}
                            </List>
                        </Stack>
                    </Paper>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
                                <TextField
                                    label="Titulo"
                                    value={draft.title}
                                    onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                                    fullWidth
                                />
                                <TextField
                                    select
                                    label="Area"
                                    value={normalizeAreaId(draft.areaId || selectedAreaId)}
                                    onChange={(event) => setDraft((current) => ({ ...current, areaId: normalizeAreaId(event.target.value) }))}
                                    sx={{ minWidth: { xs: '100%', md: 220 } }}
                                    disabled={areas.length === 0}
                                >
                                    {areas.length === 0 && (
                                        <MenuItem value="">Sin areas</MenuItem>
                                    )}
                                    {areas.map((area) => (
                                        <MenuItem key={area.id} value={normalizeAreaId(area.id)}>
                                            {area.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                                <Tooltip title="Eliminar planilla">
                                    <span>
                                        <IconButton color="error" onClick={() => setDeleteOpen(true)} disabled={!draft.id || saving}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </Stack>
                        </Paper>

                        <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
                            <Stack direction={{ xs: 'column', xl: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', xl: 'center' }}>
                                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 92 }}>
                                    {activeCell ? `Celda ${activeCell.row + 1}:${activeCell.column + 1}` : 'Sin celda'}
                                    {activeMerge ? ` · Unida ${activeMerge.endRow - activeMerge.startRow + 1}x${activeMerge.endColumn - activeMerge.startColumn + 1}` : ''}
                                </Typography>

                                <TextField
                                    size="small"
                                    label="Valor"
                                    value={activeCellData?.value || ''}
                                    onChange={(event) => updateActiveCell((cell) => ({ ...cell, value: event.target.value }))}
                                    disabled={!activeCell}
                                    sx={{ minWidth: { xs: '100%', xl: 180 } }}
                                />

                                <TextField
                                    select
                                    size="small"
                                    label="Tipo"
                                    value={activeCellData?.type || 'text'}
                                    onChange={(event) => setActiveCellType(event.target.value)}
                                    disabled={!activeCell}
                                    sx={{ minWidth: 120 }}
                                >
                                    <MenuItem value="text">Texto</MenuItem>
                                    <MenuItem value="select">Select</MenuItem>
                                </TextField>

                                <TextField
                                    select
                                    size="small"
                                    label="Fuente"
                                    value={activeStyle.fontFamily}
                                    onChange={(event) => applyCellStyle({ fontFamily: event.target.value })}
                                    sx={{ minWidth: 150 }}
                                >
                                    {FONT_FAMILIES.map((fontFamily) => (
                                        <MenuItem key={fontFamily} value={fontFamily} sx={{ fontFamily }}>
                                            {fontFamily}
                                        </MenuItem>
                                    ))}
                                </TextField>

                                <TextField
                                    select
                                    size="small"
                                    label="Tamaño"
                                    value={activeStyle.fontSize}
                                    onChange={(event) => applyCellStyle({ fontSize: Number(event.target.value) })}
                                    sx={{ minWidth: 110 }}
                                >
                                    {FONT_SIZES.map((fontSize) => (
                                        <MenuItem key={fontSize} value={fontSize}>
                                            {fontSize}px
                                        </MenuItem>
                                    ))}
                                </TextField>

                                <Stack direction="row" spacing={1} alignItems="center">
                                    <TextField
                                        size="small"
                                        type="color"
                                        label="Texto"
                                        value={activeStyle.color}
                                        onChange={(event) => applyCellStyle({ color: event.target.value })}
                                        sx={{ width: 92 }}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                    <TextField
                                        size="small"
                                        type="color"
                                        label="Fondo"
                                        value={activeStyle.backgroundColor}
                                        onChange={(event) => applyCellStyle({ backgroundColor: event.target.value })}
                                        sx={{ width: 92 }}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Stack>

                                <ToggleButtonGroup size="small" exclusive={false}>
                                    <ToggleButton
                                        value="bold"
                                        selected={activeStyle.fontWeight === 'bold'}
                                        onClick={() => applyCellStyle({ fontWeight: activeStyle.fontWeight === 'bold' ? 'normal' : 'bold' })}
                                    >
                                        <Tooltip title="Negrita">
                                            <FormatBoldIcon fontSize="small" />
                                        </Tooltip>
                                    </ToggleButton>
                                    <ToggleButton
                                        value="italic"
                                        selected={activeStyle.fontStyle === 'italic'}
                                        onClick={() => applyCellStyle({ fontStyle: activeStyle.fontStyle === 'italic' ? 'normal' : 'italic' })}
                                    >
                                        <Tooltip title="Italica">
                                            <FormatItalicIcon fontSize="small" />
                                        </Tooltip>
                                    </ToggleButton>
                                </ToggleButtonGroup>

                                <ToggleButtonGroup
                                    size="small"
                                    exclusive
                                    value={activeStyle.textAlign}
                                    onChange={(_, value) => value && applyCellStyle({ textAlign: value })}
                                >
                                    <ToggleButton value="left">
                                        <Tooltip title="Alinear izquierda">
                                            <FormatAlignLeftIcon fontSize="small" />
                                        </Tooltip>
                                    </ToggleButton>
                                    <ToggleButton value="center">
                                        <Tooltip title="Alinear centro">
                                            <FormatAlignCenterIcon fontSize="small" />
                                        </Tooltip>
                                    </ToggleButton>
                                    <ToggleButton value="right">
                                        <Tooltip title="Alinear derecha">
                                            <FormatAlignRightIcon fontSize="small" />
                                        </Tooltip>
                                    </ToggleButton>
                                </ToggleButtonGroup>
                            </Stack>

                            {activeCellData?.type === 'select' && (
                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'flex-start' }} sx={{ mt: 1.5 }}>
                                    <TextField
                                        size="small"
                                        label="Opciones del select"
                                        value={selectOptionsText}
                                        onChange={(event) => setSelectOptionsText(event.target.value)}
                                        multiline
                                        minRows={2}
                                        placeholder={'Pendiente\nEn curso\nFinalizado'}
                                        fullWidth
                                    />
                                    <Button variant="outlined" onClick={saveSelectOptions} sx={{ minWidth: 120 }}>
                                        Aplicar
                                    </Button>
                                </Stack>
                            )}
                        </Paper>

                        <Paper
                            variant="outlined"
                            sx={{
                                overflow: 'auto',
                                borderColor: 'grey.300',
                                minHeight: isFullscreen ? 'calc(100vh - 270px)' : 560,
                                p: 0,
                                '& .Spreadsheet': {
                                    width: 'max-content',
                                    minWidth: '100%',
                                    borderCollapse: 'separate',
                                    borderSpacing: 0
                                },
                                '& .Spreadsheet__cell': {
                                    backgroundClip: 'padding-box',
                                    boxSizing: 'border-box',
                                    height: 36,
                                    minWidth: 132,
                                    padding: '0 !important',
                                    fontFamily: 'Inter, Roboto, sans-serif',
                                    fontSize: 13,
                                    overflow: 'hidden'
                                },
                                '& .Spreadsheet__cell--selected, & .Spreadsheet__cell--active': {
                                    boxShadow: 'inset 0 0 0 2px #2563eb'
                                },
                                '& .Spreadsheet__cell--merged': {
                                    position: 'relative',
                                    zIndex: 0
                                },
                                '& .Spreadsheet__data-viewer, & .Spreadsheet__data-editor': {
                                    height: '100%',
                                    padding: '0 !important',
                                    width: '100%'
                                },
                                '& .Spreadsheet__header': {
                                    backgroundColor: 'grey.100',
                                    color: 'grey.800',
                                    fontWeight: 600,
                                    position: 'sticky',
                                    zIndex: 1
                                },
                                '& .Spreadsheet__header--column': {
                                    top: 0
                                },
                                '& .Spreadsheet__header--row': {
                                    left: 0
                                },
                                ...spreadsheetSizeSx
                            }}
                        >
                            <Spreadsheet
                                data={draft.workbook.cells}
                                Cell={MergedCell}
                                DataViewer={StyledDataViewer}
                                DataEditor={StyledDataEditor}
                                onActivate={setActiveCell}
                                onSelect={handleSelect}
                                onChange={(cells) => setDraft((current) => ({ ...current, workbook: { ...current.workbook, cells: normalizeGrid(cells) } }))}
                            />
                        </Paper>
                    </Box>
                </Stack>
            </Box>

            <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Eliminar planilla</DialogTitle>
                <DialogContent>
                    <Typography>
                        Se archivara "{draft.title}". Esta accion no borra el registro fisicamente.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteOpen(false)}>Cancelar</Button>
                    <Button color="error" variant="contained" onClick={deleteSpreadsheet} disabled={saving}>
                        Eliminar
                    </Button>
                </DialogActions>
            </Dialog>
        </MainCard>
        </Box>
    );
};

export default Sheets;
