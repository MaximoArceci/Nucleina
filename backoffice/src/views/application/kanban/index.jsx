import * as React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

import MainCard from 'ui-component/cards/MainCard';
import axios from 'utils/axios';
import { useAuth } from 'contexts/Auth0Context';

const emptyBoardForm = { name: '', areaIds: [] };
const emptyColumnForm = { title: '', position: 0 };
const emptyCardForm = {
    title: '',
    description: '',
    dueDate: '',
    assigneeIds: [],
    labelsText: '',
    blocksCardId: '',
    location: '',
    columnId: '',
    areaId: ''
};

const byPosition = (a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id;

const getErrorMessage = (error) => {
    const detail = error?.response?.data?.detail;
    if (Array.isArray(detail)) return detail.map((item) => item.msg).join(', ');
    return detail || 'No se pudo completar la accion.';
};

const formatDateInput = (date) => {
    if (!date) return '';
    return new Date(date).toISOString().slice(0, 10);
};

const toIsoOrNull = (date) => {
    if (!date) return null;
    return new Date(`${date}T12:00:00`).toISOString();
};

const Kanban = () => {
    const { userId } = useAuth();
    const [loading, setLoading] = React.useState(true);
    const [boardLoading, setBoardLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [boards, setBoards] = React.useState([]);
    const [areas, setAreas] = React.useState([]);
    const [users, setUsers] = React.useState([]);
    const [selectedBoardId, setSelectedBoardId] = React.useState('');
    const [boardData, setBoardData] = React.useState({ board: null, columns: [], cards: [] });
    const [search, setSearch] = React.useState('');

    const [boardDialogOpen, setBoardDialogOpen] = React.useState(false);
    const [columnDialogOpen, setColumnDialogOpen] = React.useState(false);
    const [cardDialogOpen, setCardDialogOpen] = React.useState(false);
    const [deleteDialog, setDeleteDialog] = React.useState(null);
    const [editingBoard, setEditingBoard] = React.useState(null);
    const [editingColumn, setEditingColumn] = React.useState(null);
    const [editingCard, setEditingCard] = React.useState(null);
    const [boardForm, setBoardForm] = React.useState(emptyBoardForm);
    const [columnForm, setColumnForm] = React.useState(emptyColumnForm);
    const [cardForm, setCardForm] = React.useState(emptyCardForm);
    const [saving, setSaving] = React.useState(false);

    const selectedBoard = boardData.board || boards.find((board) => board.id === Number(selectedBoardId));
    const areaById = React.useMemo(() => new Map(areas.map((area) => [area.id, area])), [areas]);
    const userById = React.useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
    const cardById = React.useMemo(() => new Map(boardData.cards.map((card) => [card.id, card])), [boardData.cards]);

    const loadBaseData = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [boardsResponse, areasResponse, usersResponse] = await Promise.all([
                axios.get('/kanban/boards'),
                axios.get('/datos/area/'),
                axios.get('/datos/voluntario/')
            ]);
            const nextBoards = boardsResponse.data || [];
            setBoards(nextBoards);
            setAreas(areasResponse.data || []);
            setUsers(usersResponse.data || []);
            setSelectedBoardId((current) => current || nextBoards[0]?.id || '');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    const loadBoard = React.useCallback(async (boardId) => {
        if (!boardId) {
            setBoardData({ board: null, columns: [], cards: [] });
            return;
        }
        setBoardLoading(true);
        setError('');
        try {
            const response = await axios.get(`/kanban/boards/${boardId}/full`);
            setBoardData({
                board: response.data.board,
                columns: [...(response.data.columns || [])].sort(byPosition),
                cards: [...(response.data.cards || [])].sort(byPosition)
            });
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setBoardLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadBaseData();
    }, [loadBaseData]);

    React.useEffect(() => {
        loadBoard(selectedBoardId);
    }, [selectedBoardId, loadBoard]);

    const cardsByColumn = React.useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        const grouped = new Map();
        for (const column of boardData.columns) grouped.set(column.id, []);
        for (const card of boardData.cards) {
            if (card.archived) continue;
            if (normalizedSearch) {
                const haystack = `${card.title} ${card.description} ${(card.labels || []).join(' ')}`.toLowerCase();
                if (!haystack.includes(normalizedSearch)) continue;
            }
            if (!grouped.has(card.columnId)) grouped.set(card.columnId, []);
            grouped.get(card.columnId).push(card);
        }
        for (const cards of grouped.values()) cards.sort(byPosition);
        return grouped;
    }, [boardData.columns, boardData.cards, search]);

    const dueSoonCards = React.useMemo(() => {
        return boardData.cards
            .filter((card) => !card.archived && card.dueDate)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 8);
    }, [boardData.cards]);

    const openCreateBoard = () => {
        setEditingBoard(null);
        setBoardForm({ ...emptyBoardForm, areaIds: areas[0] ? [areas[0].id] : [] });
        setBoardDialogOpen(true);
    };

    const openEditBoard = () => {
        if (!selectedBoard) return;
        setEditingBoard(selectedBoard);
        setBoardForm({ name: selectedBoard.name || '', areaIds: selectedBoard.areaIds || (selectedBoard.areaId ? [selectedBoard.areaId] : []) });
        setBoardDialogOpen(true);
    };

    const openCreateColumn = () => {
        setEditingColumn(null);
        setColumnForm({ title: '', position: boardData.columns.length });
        setColumnDialogOpen(true);
    };

    const openEditColumn = (column) => {
        setEditingColumn(column);
        setColumnForm({ title: column.title || '', position: column.position || 0 });
        setColumnDialogOpen(true);
    };

    const openCreateCard = (column) => {
        setEditingCard(null);
        setCardForm({
            ...emptyCardForm,
            columnId: column.id,
            areaId: selectedBoard?.areaIds?.[0] || selectedBoard?.areaId || '',
            assigneeIds: []
        });
        setCardDialogOpen(true);
    };

    const openEditCard = (card) => {
        setEditingCard(card);
        setCardForm({
            title: card.title || '',
            description: card.description || '',
            dueDate: formatDateInput(card.dueDate),
            assigneeIds: card.assigneeIds || [],
            labelsText: (card.labels || []).join(', '),
            blocksCardId: card.blocksCardId || '',
            location: card.location || '',
            columnId: card.columnId || '',
            areaId: card.areaId || selectedBoard?.areaIds?.[0] || selectedBoard?.areaId || ''
        });
        setCardDialogOpen(true);
    };

    const refreshBoardListAndBoard = async (boardId = selectedBoardId) => {
        const response = await axios.get('/kanban/boards');
        setBoards(response.data || []);
        await loadBoard(boardId);
    };

    const submitBoard = async (event) => {
        event.preventDefault();
        if (boardForm.areaIds.length === 0) {
            setError('Selecciona al menos un area para el tablero.');
            return;
        }
        setSaving(true);
        setError('');
        const payload = {
            name: boardForm.name,
            areaIds: boardForm.areaIds.map(Number),
            createdBy: Number(userId || 0)
        };
        try {
            if (editingBoard) {
                const response = await axios.patch(`/kanban/boards/${editingBoard.id}`, payload);
                setSelectedBoardId(response.data.id);
                await refreshBoardListAndBoard(response.data.id);
            } else {
                const response = await axios.post('/kanban/boards', { ...payload, archived: false });
                setSelectedBoardId(response.data.id);
                await refreshBoardListAndBoard(response.data.id);
            }
            setBoardDialogOpen(false);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const submitColumn = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        const payload = {
            boardId: Number(selectedBoardId),
            title: columnForm.title,
            position: Number(columnForm.position || 0)
        };
        try {
            if (editingColumn) {
                await axios.patch(`/kanban/columns/${editingColumn.id}`, payload);
            } else {
                await axios.post('/kanban/columns', payload);
            }
            setColumnDialogOpen(false);
            await loadBoard(selectedBoardId);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const submitCard = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        const columnCards = cardsByColumn.get(Number(cardForm.columnId)) || [];
        const payload = {
            boardId: Number(selectedBoardId),
            columnId: Number(cardForm.columnId),
            title: cardForm.title,
            description: cardForm.description,
            areaId: Number(cardForm.areaId),
            assigneeIds: cardForm.assigneeIds.map(Number),
            labels: cardForm.labelsText.split(',').map((label) => label.trim()).filter(Boolean),
            blocksCardId: cardForm.blocksCardId ? Number(cardForm.blocksCardId) : null,
            location: cardForm.location,
            position: editingCard?.position ?? columnCards.length,
            dueDate: toIsoOrNull(cardForm.dueDate),
            archived: false,
            createdBy: Number(userId || 0)
        };
        try {
            if (editingCard) {
                await axios.patch(`/kanban/cards/${editingCard.id}`, payload);
            } else {
                await axios.post('/kanban/cards', payload);
            }
            setCardDialogOpen(false);
            await loadBoard(selectedBoardId);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteDialog) return;
        setSaving(true);
        setError('');
        try {
            if (deleteDialog.type === 'card') {
                const dependentCards = boardData.cards.filter((card) => card.blocksCardId === deleteDialog.item.id);
                await Promise.all(dependentCards.map((card) => axios.patch(`/kanban/cards/${card.id}`, { blocksCardId: null })));
                await axios.delete(`/kanban/cards/${deleteDialog.item.id}`);
            }
            if (deleteDialog.type === 'column') {
                const columnCards = boardData.cards.filter((card) => card.columnId === deleteDialog.item.id);
                await Promise.all(columnCards.map((card) => axios.delete(`/kanban/cards/${card.id}`)));
                await axios.delete(`/kanban/columns/${deleteDialog.item.id}`);
            }
            if (deleteDialog.type === 'board') {
                await Promise.all(boardData.cards.map((card) => axios.delete(`/kanban/cards/${card.id}`)));
                await Promise.all(boardData.columns.map((column) => axios.delete(`/kanban/columns/${column.id}`)));
                await axios.delete(`/kanban/boards/${deleteDialog.item.id}`);
                setSelectedBoardId('');
                await loadBaseData();
            } else {
                await loadBoard(selectedBoardId);
            }
            setDeleteDialog(null);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const handleDragEnd = async (result) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        const sourceColumnId = Number(source.droppableId);
        const destinationColumnId = Number(destination.droppableId);
        if (sourceColumnId === destinationColumnId && source.index === destination.index) return;

        const cardId = Number(draggableId.replace('card-', ''));
        const movedCard = boardData.cards.find((card) => card.id === cardId);
        if (!movedCard) return;

        const nextCards = boardData.cards.map((card) => ({ ...card }));
        const sourceCards = nextCards.filter((card) => card.columnId === sourceColumnId).sort(byPosition);
        const destinationCards = sourceColumnId === destinationColumnId ? sourceCards : nextCards.filter((card) => card.columnId === destinationColumnId).sort(byPosition);
        const [removed] = sourceCards.splice(source.index, 1);
        removed.columnId = destinationColumnId;
        destinationCards.splice(destination.index, 0, removed);

        sourceCards.forEach((card, index) => {
            card.position = index;
        });
        destinationCards.forEach((card, index) => {
            card.position = index;
        });

        const merged = nextCards.map((card) => {
            const sourceMatch = sourceCards.find((item) => item.id === card.id);
            const destinationMatch = destinationCards.find((item) => item.id === card.id);
            return sourceMatch || destinationMatch || card;
        });
        setBoardData((current) => ({ ...current, cards: merged }));

        try {
            await Promise.all(
                [...new Map([...sourceCards, ...destinationCards].map((card) => [card.id, card])).values()].map((card) =>
                    axios.patch(`/kanban/cards/${card.id}`, { columnId: card.columnId, position: card.position })
                )
            );
            await loadBoard(selectedBoardId);
        } catch (err) {
            setError(getErrorMessage(err));
            await loadBoard(selectedBoardId);
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
        <div className="min-h-screen bg-navbar">
            <MainCard content={false}>
                <Box sx={{ px: 3, pt: 3 }}>
                    <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" gap={2}>
                        <Box>
                            <Typography variant="h2">Kanban</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Gestiona tableros por area, columnas, tareas, responsables, etiquetas y vencimientos.
                            </Typography>
                        </Box>
                        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
                            <TextField
                                select
                                size="small"
                                label="Tablero"
                                value={selectedBoardId}
                                onChange={(event) => setSelectedBoardId(event.target.value)}
                                sx={{ minWidth: 220 }}
                            >
                                {boards.map((board) => (
                                    <MenuItem key={board.id} value={board.id}>
                                        {board.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <Button variant="outlined" startIcon={<EditIcon />} disabled={!selectedBoard} onClick={openEditBoard}>
                                Editar tablero
                            </Button>
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteIcon />}
                                disabled={!selectedBoard}
                                onClick={() => setDeleteDialog({ type: 'board', item: selectedBoard })}
                            >
                                Eliminar tablero
                            </Button>
                            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateBoard}>
                                Nuevo tablero
                            </Button>
                        </Stack>
                    </Stack>
                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
                            {error}
                        </Alert>
                    )}
                </Box>
                <Divider sx={{ mt: 2 }} />

                {!selectedBoard ? (
                    <Box sx={{ p: 4 }}>
                        <Alert severity="info">Crea un tablero para comenzar a organizar tareas.</Alert>
                    </Box>
                ) : (
                    <Box sx={{ p: 3 }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} sx={{ mb: 2 }}>
                            <Stack>
                                <Typography variant="h3">{selectedBoard.name}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Areas:{' '}
                                    {(selectedBoard.areaIds || (selectedBoard.areaId ? [selectedBoard.areaId] : []))
                                        .map((areaId) => areaById.get(areaId)?.name || `Area ${areaId}`)
                                        .join(', ')}
                                </Typography>
                            </Stack>
                            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
                                <TextField size="small" label="Buscar tareas" value={search} onChange={(event) => setSearch(event.target.value)} />
                                <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreateColumn}>
                                    Nueva columna
                                </Button>
                            </Stack>
                        </Stack>

                        {dueSoonCards.length > 0 && (
                            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'primary.light' }}>
                                <Typography variant="h4" sx={{ mb: 1 }}>
                                    Tareas por vencer
                                </Typography>
                                <Stack direction="row" gap={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
                                    {dueSoonCards.map((card) => (
                                        <Chip
                                            key={card.id}
                                            label={`${card.title} - ${formatDateInput(card.dueDate)}`}
                                            onClick={() => openEditCard(card)}
                                            sx={{ bgcolor: 'background.paper' }}
                                        />
                                    ))}
                                </Stack>
                            </Paper>
                        )}

                        {boardLoading ? (
                            <Box display="flex" justifyContent="center" alignItems="center" minHeight="360px">
                                <CircularProgress />
                            </Box>
                        ) : (
                            <DragDropContext onDragEnd={handleDragEnd}>
                                <Stack direction="row" gap={2} sx={{ overflowX: 'auto', minHeight: 560, pb: 1 }}>
                                    {boardData.columns.map((column) => (
                                        <KanbanColumn
                                            key={column.id}
                                            column={column}
                                            cards={cardsByColumn.get(column.id) || []}
                                            users={userById}
                                            cardsById={cardById}
                                            onAddCard={() => openCreateCard(column)}
                                            onEditColumn={() => openEditColumn(column)}
                                            onDeleteColumn={() => setDeleteDialog({ type: 'column', item: column })}
                                            onEditCard={openEditCard}
                                            onDeleteCard={(card) => setDeleteDialog({ type: 'card', item: card })}
                                        />
                                    ))}
                                    <Paper
                                        variant="outlined"
                                        sx={{
                                            minWidth: 290,
                                            maxWidth: 290,
                                            height: 'fit-content',
                                            p: 2,
                                            borderStyle: 'dashed',
                                            bgcolor: 'background.paper'
                                        }}
                                    >
                                        <Button fullWidth startIcon={<AddIcon />} onClick={openCreateColumn}>
                                            Añadir otra columna
                                        </Button>
                                    </Paper>
                                </Stack>
                            </DragDropContext>
                        )}
                    </Box>
                )}
            </MainCard>

            <BoardDialog
                open={boardDialogOpen}
                areas={areas}
                form={boardForm}
                editing={Boolean(editingBoard)}
                saving={saving}
                onChange={setBoardForm}
                onClose={() => setBoardDialogOpen(false)}
                onSubmit={submitBoard}
            />
            <ColumnDialog
                open={columnDialogOpen}
                form={columnForm}
                editing={Boolean(editingColumn)}
                saving={saving}
                onChange={setColumnForm}
                onClose={() => setColumnDialogOpen(false)}
                onSubmit={submitColumn}
            />
            <CardDialog
                open={cardDialogOpen}
                form={cardForm}
                editingCard={editingCard}
                saving={saving}
                columns={boardData.columns}
                areas={areas.filter((area) => (selectedBoard?.areaIds || (selectedBoard?.areaId ? [selectedBoard.areaId] : [])).includes(area.id))}
                users={users}
                cards={boardData.cards}
                onChange={setCardForm}
                onClose={() => setCardDialogOpen(false)}
                onSubmit={submitCard}
            />
            <Dialog open={Boolean(deleteDialog)} onClose={() => setDeleteDialog(null)} fullWidth maxWidth="xs">
                <DialogTitle>Eliminar</DialogTitle>
                <DialogContent>
                    <Typography>
                        {deleteDialog?.type === 'board' && `Eliminar tablero "${deleteDialog.item.name}"?`}
                        {deleteDialog?.type === 'column' && `Eliminar columna "${deleteDialog.item.title}" y sus tareas?`}
                        {deleteDialog?.type === 'card' && `Eliminar tarea "${deleteDialog.item.title}"?`}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button variant="outlined" onClick={() => setDeleteDialog(null)}>
                        Cancelar
                    </Button>
                    <Button variant="contained" color="error" disabled={saving} onClick={confirmDelete}>
                        Eliminar
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

const KanbanColumn = ({ column, cards, users, cardsById, onAddCard, onEditColumn, onDeleteColumn, onEditCard, onDeleteCard }) => {
    return (
        <Paper
            elevation={0}
            sx={{
                minWidth: 310,
                maxWidth: 310,
                bgcolor: 'primary.light',
                border: '1px solid',
                borderColor: 'primary.200',
                borderRadius: 2,
                p: 1.5,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 650
            }}
        >
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="h4" noWrap title={column.title}>
                    {column.title}
                </Typography>
                <Stack direction="row">
                    <Tooltip title="Editar columna">
                        <IconButton size="small" onClick={onEditColumn}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar columna">
                        <IconButton size="small" onClick={onDeleteColumn}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Nueva tarea">
                        <IconButton size="small" onClick={onAddCard}>
                            <AddIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Stack>
            <Droppable droppableId={String(column.id)}>
                {(provided, snapshot) => (
                    <Box
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        sx={{
                            flex: 1,
                            minHeight: 420,
                            overflowY: 'auto',
                            borderRadius: 2,
                            p: 1,
                            bgcolor: snapshot.isDraggingOver ? 'secondary.light' : 'background.paper'
                        }}
                    >
                        <Stack gap={1}>
                            {cards.map((card, index) => (
                                <KanbanCard
                                    key={card.id}
                                    card={card}
                                    index={index}
                                    users={users}
                                    cardsById={cardsById}
                                    onEdit={() => onEditCard(card)}
                                    onDelete={() => onDeleteCard(card)}
                                />
                            ))}
                            {provided.placeholder}
                        </Stack>
                    </Box>
                )}
            </Droppable>
            <Button startIcon={<AddIcon />} onClick={onAddCard} sx={{ mt: 1 }}>
                Añadir tarea
            </Button>
        </Paper>
    );
};

const KanbanCard = ({ card, index, users, cardsById, onEdit, onDelete }) => {
    const overdue = card.dueDate && new Date(card.dueDate) < new Date();
    return (
        <Draggable draggableId={`card-${card.id}`} index={index}>
            {(provided, snapshot) => (
                <Paper
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    elevation={snapshot.isDragging ? 4 : 1}
                    sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: snapshot.isDragging ? 'primary.light' : 'background.paper',
                        border: '1px solid',
                        borderColor: overdue ? 'error.main' : 'grey.200'
                    }}
                >
                    <Stack direction="row" justifyContent="space-between" gap={1}>
                        <Typography variant="h5" sx={{ wordBreak: 'break-word' }}>
                            {card.title}
                        </Typography>
                        <Stack direction="row" sx={{ flexShrink: 0 }}>
                            <IconButton size="small" onClick={onEdit}>
                                <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={onDelete}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Stack>
                    </Stack>
                    {card.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                            {card.description}
                        </Typography>
                    )}
                    <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1 }}>
                        {(card.labels || []).map((label) => (
                            <Chip key={label} size="small" label={label} color="success" variant="outlined" />
                        ))}
                    </Stack>
                    <Stack gap={0.5} sx={{ mt: 1 }}>
                        {card.dueDate && (
                            <Typography variant="caption" color={overdue ? 'error.main' : 'text.secondary'}>
                                Vence: {formatDateInput(card.dueDate)}
                            </Typography>
                        )}
                        {(card.assigneeIds || []).length > 0 && (
                            <Typography variant="caption" color="text.secondary">
                                Responsables: {(card.assigneeIds || []).map((id) => users.get(id)?.username || users.get(id)?.email || `Usuario ${id}`).join(', ')}
                            </Typography>
                        )}
                        {card.blocksCardId && (
                            <Typography variant="caption" color="warning.dark">
                                Bloqueada por: {cardsById.get(card.blocksCardId)?.title || `Tarea ${card.blocksCardId}`}
                            </Typography>
                        )}
                        {card.location && (
                            <Typography variant="caption" color="text.secondary">
                                Ubicacion: {card.location}
                            </Typography>
                        )}
                    </Stack>
                </Paper>
            )}
        </Draggable>
    );
};

const BoardDialog = ({ open, form, areas, editing, saving, onChange, onClose, onSubmit }) => (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <form onSubmit={onSubmit}>
            <DialogTitle>
                <DialogHeader title={editing ? 'Editar tablero' : 'Nuevo tablero'} onClose={onClose} />
            </DialogTitle>
            <Divider />
            <DialogContent>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField fullWidth required label="Nombre" value={form.name} onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))} />
                    </Grid>
                    <Grid item xs={12}>
                        <Autocomplete
                            multiple
                            options={areas}
                            getOptionLabel={(option) => option.name}
                            value={areas.filter((area) => form.areaIds.includes(area.id))}
                            onChange={(event, newValue) => onChange((current) => ({ ...current, areaIds: newValue.map((area) => area.id) }))}
                            renderInput={(params) => <TextField {...params} required label="Areas" placeholder="Seleccionar areas" />}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
                <Button variant="outlined" onClick={onClose}>
                    Cancelar
                </Button>
                <Button type="submit" variant="contained" disabled={saving}>
                    Guardar
                </Button>
            </DialogActions>
        </form>
    </Dialog>
);

const ColumnDialog = ({ open, form, editing, saving, onChange, onClose, onSubmit }) => (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <form onSubmit={onSubmit}>
            <DialogTitle>
                <DialogHeader title={editing ? 'Editar columna' : 'Nueva columna'} onClose={onClose} />
            </DialogTitle>
            <Divider />
            <DialogContent>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={8}>
                        <TextField fullWidth required label="Titulo" value={form.title} onChange={(event) => onChange((current) => ({ ...current, title: event.target.value }))} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            fullWidth
                            type="number"
                            label="Posicion"
                            value={form.position}
                            onChange={(event) => onChange((current) => ({ ...current, position: event.target.value }))}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
                <Button variant="outlined" onClick={onClose}>
                    Cancelar
                </Button>
                <Button type="submit" variant="contained" disabled={saving}>
                    Guardar
                </Button>
            </DialogActions>
        </form>
    </Dialog>
);

const CardDialog = ({ open, form, editingCard, saving, columns, areas, users, cards, onChange, onClose, onSubmit }) => (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <form onSubmit={onSubmit}>
            <DialogTitle>
                <DialogHeader title={editingCard ? 'Editar tarea' : 'Nueva tarea'} onClose={onClose} />
            </DialogTitle>
            <Divider />
            <DialogContent>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <TextField fullWidth required label="Titulo" value={form.title} onChange={(event) => onChange((current) => ({ ...current, title: event.target.value }))} />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <TextField
                            select
                            fullWidth
                            required
                            label="Columna"
                            value={form.columnId}
                            onChange={(event) => onChange((current) => ({ ...current, columnId: event.target.value }))}
                        >
                            {columns.map((column) => (
                                <MenuItem key={column.id} value={column.id}>
                                    {column.title}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <TextField
                            select
                            fullWidth
                            required
                            label="Area"
                            value={form.areaId}
                            onChange={(event) => onChange((current) => ({ ...current, areaId: event.target.value }))}
                        >
                            {areas.map((area) => (
                                <MenuItem key={area.id} value={area.id}>
                                    {area.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            multiline
                            minRows={3}
                            label="Descripcion"
                            value={form.description}
                            onChange={(event) => onChange((current) => ({ ...current, description: event.target.value }))}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            type="date"
                            label="Fecha limite"
                            value={form.dueDate}
                            onChange={(event) => onChange((current) => ({ ...current, dueDate: event.target.value }))}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            select
                            fullWidth
                            label="Bloqueada por"
                            value={form.blocksCardId}
                            onChange={(event) => onChange((current) => ({ ...current, blocksCardId: event.target.value }))}
                        >
                            <MenuItem value="">Ninguna</MenuItem>
                            {cards
                                .filter((card) => !editingCard || card.id !== editingCard.id)
                                .map((card) => (
                                    <MenuItem key={card.id} value={card.id}>
                                        {card.title}
                                    </MenuItem>
                                ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            label="Etiquetas"
                            placeholder="legal, evento, urgente"
                            value={form.labelsText}
                            onChange={(event) => onChange((current) => ({ ...current, labelsText: event.target.value }))}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Ubicacion"
                            placeholder="Direccion, sala o referencia"
                            value={form.location}
                            onChange={(event) => onChange((current) => ({ ...current, location: event.target.value }))}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <Autocomplete
                            multiple
                            options={users}
                            getOptionLabel={(option) => option.username || option.email}
                            value={users.filter((user) => form.assigneeIds.includes(user.id))}
                            onChange={(event, newValue) => onChange((current) => ({ ...current, assigneeIds: newValue.map((user) => user.id) }))}
                            renderInput={(params) => <TextField {...params} label="Responsables" placeholder="Asignar usuarios" />}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
                <Button variant="outlined" onClick={onClose}>
                    Cancelar
                </Button>
                <Button type="submit" variant="contained" disabled={saving}>
                    Guardar
                </Button>
            </DialogActions>
        </form>
    </Dialog>
);

const DialogHeader = ({ title, onClose }) => (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">{title}</Typography>
        <IconButton onClick={onClose}>
            <CloseIcon />
        </IconButton>
    </Stack>
);

export default Kanban;
