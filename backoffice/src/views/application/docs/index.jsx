import * as React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
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
import Typography from '@mui/material/Typography';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import LinkIcon from '@mui/icons-material/Link';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import SaveIcon from '@mui/icons-material/Save';

import MainCard from 'ui-component/cards/MainCard';
import axios from 'utils/axios';

const emptyDraft = {
    id: null,
    title: '',
    content: '',
    areaId: '',
    driveFileId: '',
    driveUrl: '',
    drivePreviewUrl: ''
};

const getErrorMessage = (error) => {
    const detail = error?.response?.data?.detail;
    if (Array.isArray(detail)) return detail.map((item) => item.msg).join(', ');
    if (detail) return detail;
    if (error?.response?.data?.message) return error.response.data.message;
    if (typeof error?.response?.data === 'string') return error.response.data;
    if (error?.message) return error.message;
    return 'No se pudo completar la accion.';
};

const asArray = (value) => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.items)) return value.items;
    if (Array.isArray(value?.results)) return value.results;
    if (Array.isArray(value?.documents)) return value.documents;
    if (Array.isArray(value?.areas)) return value.areas;
    return [];
};

const extractDriveFileId = (value) => {
    if (!value) return '';
    const trimmed = value.trim();
    const directMatch = trimmed.match(/^[a-zA-Z0-9_-]{20,}$/);
    if (directMatch) return trimmed;
    const pathMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (pathMatch) return pathMatch[1];
    try {
        const url = new URL(trimmed);
        return url.searchParams.get('id') || '';
    } catch {
        return '';
    }
};

const buildDrivePreviewUrl = ({ driveFileId, driveUrl }) => {
    const source = driveUrl || driveFileId;
    const fileId = driveFileId || extractDriveFileId(source);
    if (!fileId) return '';

    if (driveUrl) {
        try {
            const url = new URL(driveUrl);
            const googleDocMatch = url.pathname.match(/^\/(document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/);
            if (url.hostname === 'docs.google.com' && googleDocMatch) {
                return `https://docs.google.com/${googleDocMatch[1]}/d/${fileId}/preview`;
            }
        } catch {
        }
    }

    return `https://drive.google.com/file/d/${fileId}/preview`;
};

const pickDocumentFields = (doc) => ({
    id: doc.id,
    title: doc.title,
    content: doc.content || '',
    areaId: doc.areaId,
    driveFileId: doc.driveFileId || '',
    driveUrl: doc.driveUrl || '',
    drivePreviewUrl: doc.drivePreviewUrl || buildDrivePreviewUrl(doc)
});

const Docs = () => {
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState('');
    const [areas, setAreas] = React.useState([]);
    const [documents, setDocuments] = React.useState([]);
    const [selectedAreaId, setSelectedAreaId] = React.useState('');
    const [draft, setDraft] = React.useState(emptyDraft);
    const [previewExpanded, setPreviewExpanded] = React.useState(false);
    const [previewLarge, setPreviewLarge] = React.useState(false);

    const loadBase = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [areasResponse, docsResponse] = await Promise.all([
                axios.get('/datos/area/'),
                axios.get('/documentos/')
            ]);
            const nextAreas = asArray(areasResponse.data);
            const nextDocs = asArray(docsResponse.data);
            setAreas(nextAreas);
            setDocuments(nextDocs);
            const initialAreaId = selectedAreaId || nextDocs[0]?.areaId || nextAreas[0]?.id || '';
            setSelectedAreaId(initialAreaId);
            if (!draft.id && nextDocs.length > 0) {
                const firstDoc = nextDocs.find((doc) => doc.areaId === initialAreaId) || nextDocs[0];
                setDraft(pickDocumentFields(firstDoc));
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

    const visibleDocuments = documents.filter((doc) => Number(doc.areaId) === Number(selectedAreaId));

    const selectDocument = (doc) => {
        setDraft(pickDocumentFields(doc));
    };

    const newDocument = () => {
        setDraft({
            ...emptyDraft,
            areaId: selectedAreaId || areas[0]?.id || '',
            title: 'Nuevo documento'
        });
    };

    const saveDocument = async () => {
        setSaving(true);
        setError('');
        const payload = {
            title: draft.title,
            content: draft.content,
            areaId: Number(draft.areaId || selectedAreaId),
            driveFileId: draft.driveFileId || extractDriveFileId(draft.driveUrl),
            driveUrl: draft.driveUrl,
            drivePreviewUrl: draft.drivePreviewUrl || buildDrivePreviewUrl(draft),
            archived: false
        };
        try {
            let response;
            if (draft.id) {
                response = await axios.patch(`/documentos/${draft.id}`, payload);
            } else {
                response = await axios.post('/documentos/', payload);
            }
            const saved = response.data;
            setDraft(pickDocumentFields(saved));
            const docsResponse = await axios.get('/documentos/');
            setDocuments(asArray(docsResponse.data));
            setSelectedAreaId(saved.areaId);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const deleteDocument = async () => {
        if (!draft.id || !window.confirm(`Eliminar documento "${draft.title}"?`)) return;
        setSaving(true);
        setError('');
        try {
            await axios.delete(`/documentos/${draft.id}`);
            const docsResponse = await axios.get('/documentos/');
            const nextDocs = asArray(docsResponse.data);
            setDocuments(nextDocs);
            const nextDoc = nextDocs.find((doc) => Number(doc.areaId) === Number(selectedAreaId));
            setDraft(nextDoc ? pickDocumentFields(nextDoc) : { ...emptyDraft, areaId: selectedAreaId });
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
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
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
                        <Box>
                            <Typography variant="h2">Docs</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Bloc de notas por area con documentos internos y rich text.
                            </Typography>
                        </Box>
                        <Stack direction="row" gap={1}>
                            <TextField
                                select
                                size="small"
                                label="Area"
                                value={selectedAreaId}
                                onChange={(event) => {
                                    const areaId = event.target.value;
                                    setSelectedAreaId(areaId);
                                    const nextDoc = documents.find((doc) => Number(doc.areaId) === Number(areaId));
                                    setDraft(nextDoc ? { id: nextDoc.id, title: nextDoc.title, content: nextDoc.content || '', areaId: nextDoc.areaId } : { ...emptyDraft, areaId });
                                }}
                                sx={{ minWidth: 220 }}
                            >
                                {areas.map((area) => (
                                    <MenuItem key={area.id} value={area.id}>
                                        {area.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <Button variant="contained" startIcon={<AddIcon />} onClick={newDocument}>
                                Nuevo doc
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

                <Stack direction={{ xs: 'column', md: 'row' }} sx={{ minHeight: 650 }}>
                    <Paper variant="outlined" sx={{ width: { xs: '100%', md: 280 }, borderRadius: 0, borderTop: 0, borderBottom: 0, p: 1 }}>
                        <List dense>
                            {visibleDocuments.length === 0 && (
                                <ListItemText sx={{ px: 2, py: 1 }} primary="Sin documentos" secondary="Crea el primero para esta area." />
                            )}
                            {visibleDocuments.map((doc) => (
                                <ListItemButton key={doc.id} selected={doc.id === draft.id} onClick={() => selectDocument(doc)}>
                                    <ListItemText primary={doc.title} secondary={doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString() : ''} />
                                </ListItemButton>
                            ))}
                        </List>
                    </Paper>

                    <Box sx={{ flex: 1, p: 3 }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2} sx={{ mb: 2 }}>
                            <TextField
                                fullWidth
                                label="Titulo"
                                value={draft.title}
                                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                            />
                            <Stack direction="row" gap={1}>
                                <Button variant="outlined" startIcon={<SaveIcon />} disabled={saving || !draft.title || !selectedAreaId} onClick={saveDocument}>
                                    Guardar
                                </Button>
                                <IconButton color="error" disabled={!draft.id || saving} onClick={deleteDocument}>
                                    <DeleteIcon />
                                </IconButton>
                            </Stack>
                        </Stack>
                        <Stack direction={{ xs: 'column', lg: 'row' }} gap={2} alignItems="stretch">
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Paper variant="outlined" sx={{ '.ql-container': { minHeight: 440, fontSize: '1rem' }, '.ql-toolbar': { borderTopLeftRadius: 8, borderTopRightRadius: 8 }, '.ql-container.ql-snow': { borderBottomLeftRadius: 8, borderBottomRightRadius: 8 } }}>
                                    <ReactQuill theme="snow" value={draft.content} onChange={(content) => setDraft((current) => ({ ...current, content }))} />
                                </Paper>
                            </Box>
                            <Paper
                                variant="outlined"
                                sx={{
                                    width: { xs: '100%', lg: previewLarge ? 640 : 420 },
                                    p: 2,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 2,
                                    transition: 'width 180ms ease'
                                }}
                            >
                                <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                                    <Box>
                                        <Typography variant="h4">Drive</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Preview embebida del archivo vinculado.
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" gap={1}>
                                        {draft.drivePreviewUrl && (
                                            <>
                                                <Button size="small" variant={previewLarge ? 'contained' : 'outlined'} onClick={() => setPreviewLarge((current) => !current)}>
                                                    {previewLarge ? 'Normal' : 'Grande'}
                                                </Button>
                                                <IconButton aria-label="Expandir preview" size="small" onClick={() => setPreviewExpanded(true)}>
                                                    <OpenInFullIcon fontSize="small" />
                                                </IconButton>
                                            </>
                                        )}
                                        {draft.driveUrl && (
                                            <Button
                                                href={draft.driveUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                size="small"
                                                endIcon={<OpenInNewIcon />}
                                            >
                                                Abrir
                                            </Button>
                                        )}
                                    </Stack>
                                </Stack>
                                <TextField
                                    label="Link de Drive"
                                    value={draft.driveUrl}
                                    onChange={(event) => {
                                        const driveUrl = event.target.value;
                                        const driveFileId = extractDriveFileId(driveUrl);
                                        setDraft((current) => ({
                                            ...current,
                                            driveUrl,
                                            driveFileId: driveFileId || current.driveFileId,
                                            drivePreviewUrl: buildDrivePreviewUrl({ driveUrl, driveFileId: driveFileId || current.driveFileId })
                                        }));
                                    }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LinkIcon fontSize="small" />
                                            </InputAdornment>
                                        )
                                    }}
                                    fullWidth
                                />
                                <TextField
                                    label="Drive file ID"
                                    value={draft.driveFileId}
                                    onChange={(event) => {
                                        const driveFileId = event.target.value.trim();
                                        setDraft((current) => ({
                                            ...current,
                                            driveFileId,
                                            drivePreviewUrl: buildDrivePreviewUrl({ driveUrl: current.driveUrl, driveFileId })
                                        }));
                                    }}
                                    helperText="Opcional si el link ya contiene el ID."
                                    fullWidth
                                />
                                {draft.drivePreviewUrl ? (
                                    <Box
                                        component="iframe"
                                        title={`Preview ${draft.title || 'Drive'}`}
                                        src={draft.drivePreviewUrl}
                                        sx={{
                                            width: '100%',
                                            minHeight: previewLarge ? 680 : 460,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            borderRadius: 1
                                        }}
                                        allow="autoplay"
                                    />
                                ) : (
                                    <Box
                                        sx={{
                                            minHeight: 220,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            textAlign: 'center',
                                            border: '1px dashed',
                                            borderColor: 'divider',
                                            borderRadius: 1,
                                            px: 2
                                        }}
                                    >
                                        <Typography color="text.secondary">
                                            Pega un link de Google Drive o un file ID para ver la preview.
                                        </Typography>
                                    </Box>
                                )}
                            </Paper>
                        </Stack>
                    </Box>
                </Stack>
            </MainCard>
            <Dialog open={previewExpanded} onClose={() => setPreviewExpanded(false)} fullScreen>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                    <Typography variant="h3">{draft.title || 'Preview de Drive'}</Typography>
                    <Stack direction="row" gap={1}>
                        {draft.driveUrl && (
                            <Button href={draft.driveUrl} target="_blank" rel="noreferrer" endIcon={<OpenInNewIcon />}>
                                Abrir en Drive
                            </Button>
                        )}
                        <IconButton aria-label="Cerrar preview" onClick={() => setPreviewExpanded(false)}>
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    {draft.drivePreviewUrl && (
                        <Box
                            component="iframe"
                            title={`Preview expandida ${draft.title || 'Drive'}`}
                            src={draft.drivePreviewUrl}
                            sx={{ width: '100%', height: 'calc(100vh - 72px)', border: 0 }}
                            allow="autoplay"
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Docs;
