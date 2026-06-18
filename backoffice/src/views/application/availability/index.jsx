import * as React from 'react';

import Alert from '@mui/material/Alert';
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
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';

import MainCard from 'ui-component/cards/MainCard';
import axios from 'utils/axios';
import { useAuth } from 'contexts/Auth0Context';

const emptyPollForm = {
    title: '',
    description: '',
    areaIds: [],
    daysCount: 7,
    startHour: 8,
    endHour: 22
};

const getErrorMessage = (error) => {
    const detail = error?.response?.data?.detail;
    if (Array.isArray(detail)) return detail.map((item) => item.msg).join(', ');
    if (detail) return detail;
    return error?.message || 'No se pudo completar la accion.';
};

const formatSlot = (slot) => {
    const start = new Date(slot.start);
    const end = new Date(slot.end);
    return `${start.toLocaleDateString()} ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const formatTime = (value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDay = (value) =>
    new Date(value).toLocaleDateString([], {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit'
    });

const startOfLocalDay = (date) => {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
};

const generateHalfHourSlots = ({ daysCount, startHour, endHour }) => {
    const slots = [];
    const firstDay = startOfLocalDay(new Date());
    let id = 1;

    for (let dayIndex = 0; dayIndex < Number(daysCount); dayIndex += 1) {
        const day = new Date(firstDay);
        day.setDate(firstDay.getDate() + dayIndex);

        for (let hour = Number(startHour); hour < Number(endHour); hour += 1) {
            for (const minute of [0, 30]) {
                const start = new Date(day);
                start.setHours(hour, minute, 0, 0);
                const end = new Date(start);
                end.setMinutes(end.getMinutes() + 30);
                slots.push({
                    id,
                    start: start.toISOString(),
                    end: end.toISOString()
                });
                id += 1;
            }
        }
    }

    return slots;
};

const groupSlotsByDay = (slots) =>
    slots.reduce((grouped, slot) => {
        const key = new Date(slot.start).toISOString().slice(0, 10);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(slot);
        return grouped;
    }, {});

const Availability = () => {
    const { userId } = useAuth();
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState('');
    const [polls, setPolls] = React.useState([]);
    const [areas, setAreas] = React.useState([]);
    const [selectedPollId, setSelectedPollId] = React.useState('');
    const [summary, setSummary] = React.useState(null);
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [pollForm, setPollForm] = React.useState(emptyPollForm);
    const [selectedSlotIds, setSelectedSlotIds] = React.useState([]);
    const [calendarMode, setCalendarMode] = React.useState('mine');
    const [note, setNote] = React.useState('');

    const selectedPoll = summary?.poll || polls.find((poll) => poll.id === Number(selectedPollId));
    const areaById = React.useMemo(() => new Map(areas.map((area) => [area.id, area])), [areas]);
    const participantCount = summary?.participants?.length || 0;
    const responseGrid = React.useMemo(() => groupSlotsByDay(selectedPoll?.slots || []), [selectedPoll]);
    const summaryGrid = React.useMemo(() => groupSlotsByDay(summary?.slots || []), [summary]);

    const loadBase = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [pollsResponse, areasResponse] = await Promise.all([
                axios.get('/reuniones/availability-polls/'),
                axios.get('/datos/area/')
            ]);
            const nextPolls = pollsResponse.data || [];
            setPolls(nextPolls);
            setAreas(areasResponse.data || []);
            setSelectedPollId((current) => current || nextPolls[0]?.id || '');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    const loadSummary = React.useCallback(async (pollId) => {
        if (!pollId) {
            setSummary(null);
            return;
        }
        setError('');
        try {
            const response = await axios.get(`/reuniones/availability-polls/${pollId}/summary`);
            setSummary(response.data);
            const myResponse = response.data.poll.responses?.find((item) => item.volunteerId === userId);
            setSelectedSlotIds(myResponse?.slotIds || []);
            setNote(myResponse?.note || '');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    }, [userId]);

    React.useEffect(() => {
        loadBase();
    }, [loadBase]);

    React.useEffect(() => {
        loadSummary(selectedPollId);
    }, [selectedPollId, loadSummary]);

    const createPoll = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        const slots = generateHalfHourSlots(pollForm);
        try {
            const response = await axios.post('/reuniones/availability-polls/', {
                title: pollForm.title,
                description: pollForm.description,
                organizerId: userId,
                areaIds: pollForm.areaIds.map(Number),
                daysCount: Number(pollForm.daysCount),
                startHour: Number(pollForm.startHour),
                endHour: Number(pollForm.endHour),
                slots
            });
            setDialogOpen(false);
            setPollForm(emptyPollForm);
            await loadBase();
            setSelectedPollId(response.data.id);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const saveResponse = async () => {
        if (!selectedPollId || !userId) return;
        setSaving(true);
        setError('');
        try {
            await axios.post(`/reuniones/availability-polls/${selectedPollId}/responses`, {
                volunteerId: userId,
                slotIds: selectedSlotIds,
                note,
                updatedAt: new Date().toISOString()
            });
            await loadSummary(selectedPollId);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const archivePoll = async () => {
        if (!selectedPoll || !window.confirm(`Archivar encuesta "${selectedPoll.title}"?`)) return;
        setSaving(true);
        setError('');
        try {
            await axios.delete(`/reuniones/availability-polls/${selectedPoll.id}`);
            setSelectedPollId('');
            setSummary(null);
            await loadBase();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const toggleSlot = (slotId) => {
        setSelectedSlotIds((current) =>
            current.includes(slotId) ? current.filter((id) => id !== slotId) : [...current, slotId].sort((a, b) => a - b)
        );
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
                            <Typography variant="h2">Disponibilidad</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Coordina fechas entre voluntarios antes de crear la reunion definitiva.
                            </Typography>
                        </Box>
                        <Stack direction="row" gap={1}>
                            {selectedPoll && (
                                <Button color="error" variant="outlined" startIcon={<DeleteIcon />} disabled={saving} onClick={archivePoll}>
                                    Archivar
                                </Button>
                            )}
                            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
                                Nueva encuesta
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

                <Stack direction={{ xs: 'column', lg: 'row' }} sx={{ minHeight: 650 }}>
                    <Paper variant="outlined" sx={{ width: { xs: '100%', lg: 320 }, borderRadius: 0, borderTop: 0, borderBottom: 0, p: 1 }}>
                        <List dense>
                            {polls.length === 0 && (
                                <ListItemText sx={{ px: 2, py: 1 }} primary="Sin encuestas" secondary="Crea una para coordinar horarios." />
                            )}
                            {polls.map((poll) => (
                                <ListItemButton key={poll.id} selected={poll.id === Number(selectedPollId)} onClick={() => setSelectedPollId(poll.id)}>
                                    <ListItemText
                                        primary={poll.title}
                                        secondary={poll.areaIds?.length ? poll.areaIds.map((id) => areaById.get(id)?.name || id).join(', ') : 'Todas las areas'}
                                    />
                                </ListItemButton>
                            ))}
                        </List>
                    </Paper>

                    <Box sx={{ flex: 1, p: 3 }}>
                        {!selectedPoll && (
                            <Box sx={{ py: 8, textAlign: 'center' }}>
                                <Typography variant="h3">Selecciona o crea una encuesta</Typography>
                            </Box>
                        )}

                        {selectedPoll && summary && (
                            <Stack gap={3}>
                                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
                                    <Box>
                                        <Typography variant="h3">{selectedPoll.title}</Typography>
                                        {selectedPoll.description && (
                                            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                                                {selectedPoll.description}
                                            </Typography>
                                        )}
                                        <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
                                            {(selectedPoll.areaIds?.length ? selectedPoll.areaIds : ['all']).map((areaId) => (
                                                <Chip
                                                    key={areaId}
                                                    size="small"
                                                    label={areaId === 'all' ? 'Todas las areas' : areaById.get(areaId)?.name || `Area ${areaId}`}
                                                />
                                            ))}
                                        </Stack>
                                    </Box>
                                    <Chip label={`${summary.participants.filter((item) => item.responded).length}/${participantCount} respuestas`} />
                                </Stack>

                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <Paper variant="outlined" sx={{ p: 2 }}>
                                            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2} sx={{ mb: 2 }}>
                                                <Box>
                                                    <Typography variant="h4">
                                                        {calendarMode === 'mine' ? 'Mi disponibilidad' : 'Calendario grupal'}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {calendarMode === 'mine'
                                                            ? 'Marca las casillas de 30 minutos en las que estas libre.'
                                                            : 'Revisa cuantos voluntarios estan disponibles en cada casilla.'}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ minWidth: { sm: 160 }, display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                                                    {calendarMode === 'mine' && (
                                                        <Button variant="contained" startIcon={<SaveIcon />} disabled={saving} onClick={saveResponse}>
                                                            Guardar respuesta
                                                        </Button>
                                                    )}
                                                </Box>
                                            </Stack>
                                            <Stack alignItems="center" sx={{ mb: 2 }}>
                                                <ToggleButtonGroup
                                                    value={calendarMode}
                                                    exclusive
                                                    size="small"
                                                    onChange={(event, value) => value && setCalendarMode(value)}
                                                    aria-label="Vista de disponibilidad"
                                                >
                                                    <ToggleButton value="mine" aria-label="Mi disponibilidad">
                                                        Mi disponibilidad
                                                    </ToggleButton>
                                                    <ToggleButton value="group" aria-label="Calendario grupal">
                                                        Calendario grupal
                                                    </ToggleButton>
                                                </ToggleButtonGroup>
                                            </Stack>
                                            <Stack gap={1}>
                                                {calendarMode === 'mine' && (
                                                    <Box sx={{ overflowX: 'auto', pb: 1 }}>
                                                        <Box
                                                            sx={{
                                                                display: 'grid',
                                                                gridTemplateColumns: `repeat(${Object.keys(responseGrid).length}, minmax(120px, 1fr))`,
                                                                gap: 1,
                                                                minWidth: Math.max(Object.keys(responseGrid).length * 130, 360)
                                                            }}
                                                        >
                                                            {Object.entries(responseGrid).map(([day, slots]) => (
                                                                <Box key={day}>
                                                                    <Typography variant="subtitle2" align="center" sx={{ mb: 1 }}>
                                                                        {formatDay(`${day}T12:00:00`)}
                                                                    </Typography>
                                                                    <Stack gap={0.5}>
                                                                        {slots.map((slot) => {
                                                                            const selected = selectedSlotIds.includes(slot.id);
                                                                            return (
                                                                                <Button
                                                                                    key={slot.id}
                                                                                    variant={selected ? 'contained' : 'outlined'}
                                                                                    size="small"
                                                                                    onClick={() => toggleSlot(slot.id)}
                                                                                    sx={{
                                                                                        minHeight: 30,
                                                                                        px: 0.5,
                                                                                        fontSize: '0.75rem',
                                                                                        lineHeight: 1,
                                                                                        borderRadius: 1,
                                                                                        whiteSpace: 'nowrap'
                                                                                    }}
                                                                                >
                                                                                    {formatTime(slot.start)}
                                                                                </Button>
                                                                            );
                                                                        })}
                                                                    </Stack>
                                                                </Box>
                                                            ))}
                                                        </Box>
                                                    </Box>
                                                )}
                                                {calendarMode === 'group' && (
                                                    <Box sx={{ overflowX: 'auto', pb: 1 }}>
                                                        <Box
                                                            sx={{
                                                                display: 'grid',
                                                                gridTemplateColumns: `repeat(${Object.keys(summaryGrid).length}, minmax(120px, 1fr))`,
                                                                gap: 1,
                                                                minWidth: Math.max(Object.keys(summaryGrid).length * 130, 360)
                                                            }}
                                                        >
                                                            {Object.entries(summaryGrid).map(([day, slots]) => (
                                                                <Box key={day}>
                                                                    <Typography variant="subtitle2" align="center" sx={{ mb: 1 }}>
                                                                        {formatDay(`${day}T12:00:00`)}
                                                                    </Typography>
                                                                    <Stack gap={0.5}>
                                                                        {slots.map((slot) => {
                                                                            const ratio = participantCount ? slot.availableCount / participantCount : 0;
                                                                            return (
                                                                                <Box
                                                                                    key={slot.id}
                                                                                    sx={{
                                                                                        minHeight: 30,
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        justifyContent: 'space-between',
                                                                                        gap: 1,
                                                                                        px: 1,
                                                                                        border: '1px solid',
                                                                                        borderColor: ratio > 0 ? 'primary.main' : 'divider',
                                                                                        borderRadius: 1,
                                                                                        bgcolor: ratio > 0.66 ? 'primary.main' : ratio > 0.33 ? 'primary.light' : ratio > 0 ? 'action.hover' : 'background.paper',
                                                                                        color: ratio > 0.66 ? 'primary.contrastText' : 'text.primary'
                                                                                    }}
                                                                                >
                                                                                    <Typography variant="caption">{formatTime(slot.start)}</Typography>
                                                                                    <Typography variant="caption" fontWeight={700}>
                                                                                        {slot.availableCount}/{participantCount}
                                                                                    </Typography>
                                                                                </Box>
                                                                            );
                                                                        })}
                                                                    </Stack>
                                                                </Box>
                                                            ))}
                                                        </Box>
                                                    </Box>
                                                )}
                                                {calendarMode === 'mine' && (
                                                    <TextField
                                                        label="Nota"
                                                        value={note}
                                                        onChange={(event) => setNote(event.target.value)}
                                                        multiline
                                                        minRows={2}
                                                        fullWidth
                                                    />
                                                )}
                                            </Stack>
                                        </Paper>
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Paper variant="outlined" sx={{ p: 2 }}>
                                            <Typography variant="h4" sx={{ mb: 2 }}>
                                                Mejores horarios
                                            </Typography>
                                            <Stack gap={2}>
                                                {summary.slots
                                                    .slice()
                                                    .sort((a, b) => b.availableCount - a.availableCount)
                                                    .slice(0, 12)
                                                    .map((slot) => (
                                                        <Box key={slot.id}>
                                                            <Stack direction="row" justifyContent="space-between" gap={2}>
                                                                <Typography fontWeight={600}>{formatSlot(slot)}</Typography>
                                                                <Typography color="text.secondary">
                                                                    {slot.availableCount}/{participantCount}
                                                                </Typography>
                                                            </Stack>
                                                            <LinearProgress
                                                                variant="determinate"
                                                                value={participantCount ? (slot.availableCount / participantCount) * 100 : 0}
                                                                sx={{ my: 1, height: 8, borderRadius: 1 }}
                                                            />
                                                            <Stack direction="row" gap={0.5} flexWrap="wrap">
                                                                {slot.availableVolunteerIds.map((id) => (
                                                                    <Chip key={id} size="small" label={summary.volunteersById[id]?.username || `Usuario ${id}`} />
                                                                ))}
                                                            </Stack>
                                                        </Box>
                                                    ))}
                                            </Stack>
                                        </Paper>
                                    </Grid>
                                </Grid>

                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="h4" sx={{ mb: 2 }}>
                                        Respuestas por voluntario
                                    </Typography>
                                    <Grid container spacing={1}>
                                        {summary.participants.map((participant) => (
                                            <Grid key={participant.id} item xs={12} sm={6} md={4}>
                                                <Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}>
                                                    <Stack direction="row" justifyContent="space-between" gap={1}>
                                                        <Typography fontWeight={600}>{participant.username}</Typography>
                                                        <Chip
                                                            size="small"
                                                            color={participant.responded ? 'success' : 'default'}
                                                            label={participant.responded ? 'Respondio' : 'Pendiente'}
                                                        />
                                                    </Stack>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {participant.slotIds.length} horarios seleccionados
                                                    </Typography>
                                                    {participant.note && (
                                                        <Typography variant="body2" sx={{ mt: 1 }}>
                                                            {participant.note}
                                                        </Typography>
                                                    )}
                                                </Paper>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Paper>
                            </Stack>
                        )}
                    </Box>
                </Stack>
            </MainCard>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
                <Box component="form" onSubmit={createPoll}>
                    <DialogTitle>Nueva encuesta de disponibilidad</DialogTitle>
                    <DialogContent dividers>
                        <Stack gap={2}>
                            <TextField
                                label="Titulo"
                                value={pollForm.title}
                                onChange={(event) => setPollForm((current) => ({ ...current, title: event.target.value }))}
                                required
                                fullWidth
                            />
                            <TextField
                                label="Descripcion"
                                value={pollForm.description}
                                onChange={(event) => setPollForm((current) => ({ ...current, description: event.target.value }))}
                                multiline
                                minRows={2}
                                fullWidth
                            />
                            <TextField
                                select
                                label="Areas"
                                value={pollForm.areaIds}
                                onChange={(event) => setPollForm((current) => ({ ...current, areaIds: event.target.value }))}
                                SelectProps={{ multiple: true }}
                                helperText="Sin areas seleccionadas queda visible para todos."
                                fullWidth
                            >
                                {areas.map((area) => (
                                    <MenuItem key={area.id} value={area.id}>
                                        {area.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        label="Proximos dias"
                                        type="number"
                                        value={pollForm.daysCount}
                                        onChange={(event) => setPollForm((current) => ({ ...current, daysCount: event.target.value }))}
                                        inputProps={{ min: 1, max: 31 }}
                                        required
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        label="Desde"
                                        type="number"
                                        value={pollForm.startHour}
                                        onChange={(event) => setPollForm((current) => ({ ...current, startHour: event.target.value }))}
                                        inputProps={{ min: 0, max: 23 }}
                                        helperText="Hora inicial"
                                        required
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        label="Hasta"
                                        type="number"
                                        value={pollForm.endHour}
                                        onChange={(event) => setPollForm((current) => ({ ...current, endHour: event.target.value }))}
                                        inputProps={{ min: 1, max: 24 }}
                                        helperText="Hora final"
                                        required
                                        fullWidth
                                    />
                                </Grid>
                            </Grid>
                            <Alert severity="info">
                                Se van a generar casillas de 30 minutos para los proximos {pollForm.daysCount || 0} dias.
                            </Alert>
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={
                                saving ||
                                !pollForm.title ||
                                Number(pollForm.daysCount) < 1 ||
                                Number(pollForm.startHour) < 0 ||
                                Number(pollForm.endHour) <= Number(pollForm.startHour)
                            }
                        >
                            Crear
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>
        </div>
    );
};

export default Availability;
