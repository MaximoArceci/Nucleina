import * as React from 'react';

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
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

import MainCard from 'ui-component/cards/MainCard';
import axios from 'utils/axios';

const emptyContactForm = {
    name: '',
    organization: '',
    email: '',
    phone: '',
    description: ''
};

const getErrorMessage = (error) => {
    const detail = error?.response?.data?.detail;
    if (Array.isArray(detail)) return detail.map((item) => item.msg).join(', ');
    if (detail) return detail;
    return error?.message || 'No se pudo completar la accion.';
};

const Contacts = () => {
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState('');
    const [contacts, setContacts] = React.useState([]);
    const [search, setSearch] = React.useState('');
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [editingContact, setEditingContact] = React.useState(null);
    const [contactForm, setContactForm] = React.useState(emptyContactForm);

    const loadContacts = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.get('/contactos/');
            setContacts(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadContacts();
    }, [loadContacts]);

    const visibleContacts = React.useMemo(() => {
        const value = search.trim().toLowerCase();
        if (!value) return contacts;
        return contacts.filter((contact) => {
            const haystack = `${contact.name} ${contact.organization} ${contact.email || ''} ${contact.phone} ${contact.description}`.toLowerCase();
            return haystack.includes(value);
        });
    }, [contacts, search]);

    const openCreate = () => {
        setEditingContact(null);
        setContactForm(emptyContactForm);
        setDialogOpen(true);
    };

    const openEdit = (contact) => {
        setEditingContact(contact);
        setContactForm({
            name: contact.name || '',
            organization: contact.organization || '',
            email: contact.email || '',
            phone: contact.phone || '',
            description: contact.description || ''
        });
        setDialogOpen(true);
    };

    const saveContact = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        const payload = {
            ...contactForm,
            email: contactForm.email || null
        };
        try {
            if (editingContact) {
                await axios.patch(`/contactos/${editingContact.id}`, payload);
            } else {
                await axios.post('/contactos/', payload);
            }
            setDialogOpen(false);
            await loadContacts();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const deleteContact = async (contact) => {
        if (!window.confirm(`Eliminar contacto ${contact.name}?`)) return;
        setSaving(true);
        setError('');
        try {
            await axios.delete(`/contactos/${contact.id}`);
            await loadContacts();
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
                            <Typography variant="h2">Agenda de contactos</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Centraliza contactos externos e institucionales.
                            </Typography>
                        </Box>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                            Nuevo contacto
                        </Button>
                    </Stack>
                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
                            {error}
                        </Alert>
                    )}
                    <TextField
                        label="Buscar"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        fullWidth
                        sx={{ mt: 2 }}
                    />
                </Box>
                <Divider sx={{ mt: 2 }} />

                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Nombre</TableCell>
                                <TableCell>Organizacion</TableCell>
                                <TableCell>Mail</TableCell>
                                <TableCell>Telefono</TableCell>
                                <TableCell>Descripcion</TableCell>
                                <TableCell align="right">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {visibleContacts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6}>
                                        <Typography color="text.secondary">No hay contactos para mostrar.</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                            {visibleContacts.map((contact) => (
                                <TableRow key={contact.id} hover>
                                    <TableCell>
                                        <Typography fontWeight={600}>{contact.name}</Typography>
                                    </TableCell>
                                    <TableCell>{contact.organization || '-'}</TableCell>
                                    <TableCell>
                                        {contact.email ? (
                                            <Link href={`mailto:${contact.email}`} underline="hover">
                                                {contact.email}
                                            </Link>
                                        ) : (
                                            '-'
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {contact.phone ? (
                                            <Link href={`tel:${contact.phone}`} underline="hover">
                                                {contact.phone}
                                            </Link>
                                        ) : (
                                            '-'
                                        )}
                                    </TableCell>
                                    <TableCell sx={{ maxWidth: 360 }}>
                                        <Typography variant="body2" color="text.secondary" noWrap>
                                            {contact.description || '-'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton aria-label="Editar contacto" onClick={() => openEdit(contact)}>
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton aria-label="Eliminar contacto" color="error" disabled={saving} onClick={() => deleteContact(contact)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </MainCard>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
                <Box component="form" onSubmit={saveContact}>
                    <DialogTitle>{editingContact ? 'Editar contacto' : 'Nuevo contacto'}</DialogTitle>
                    <DialogContent dividers>
                        <Stack gap={2}>
                            <TextField
                                label="Nombre"
                                value={contactForm.name}
                                onChange={(event) => setContactForm((current) => ({ ...current, name: event.target.value }))}
                                required
                                fullWidth
                            />
                            <TextField
                                label="Organizacion"
                                value={contactForm.organization}
                                onChange={(event) => setContactForm((current) => ({ ...current, organization: event.target.value }))}
                                fullWidth
                            />
                            <TextField
                                label="Mail"
                                type="email"
                                value={contactForm.email}
                                onChange={(event) => setContactForm((current) => ({ ...current, email: event.target.value }))}
                                fullWidth
                            />
                            <TextField
                                label="Telefono"
                                value={contactForm.phone}
                                onChange={(event) => setContactForm((current) => ({ ...current, phone: event.target.value }))}
                                fullWidth
                            />
                            <TextField
                                label="Descripcion"
                                value={contactForm.description}
                                onChange={(event) => setContactForm((current) => ({ ...current, description: event.target.value }))}
                                multiline
                                minRows={4}
                                fullWidth
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button type="submit" variant="contained" disabled={saving || !contactForm.name}>
                            Guardar
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>
        </div>
    );
};

export default Contacts;
