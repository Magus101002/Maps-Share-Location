import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false) // dialog open (create/edit)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ code: '', user_linked: '' })
  const [snack, setSnack] = useState({ open: false, message: '' })

  const fetchConnections = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('Connection')
      .select('*')
      .eq('user', user.id)
      .order('created_at', { ascending: false })

    setLoading(false)
    if (error) {
      setSnack({ open: true, message: `Error al leer conexiones: ${error.message}` })
    } else {
      setConnections(data || [])
    }
  }, [user])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  useEffect(() => {
    if (!user) return
    // Subscribe to realtime changes for this user's Connection rows
    const channel = supabase
      .channel('public-connections')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Connection', filter: `user=eq.${user.id}` },
        (payload) => {
          // Simple strategy: refetch on changes
          fetchConnections()
        }
      )
      .subscribe()

    return () => {
      try {
        channel.unsubscribe()
      } catch (e) {
        // ignore
      }
    }
  }, [user, fetchConnections])

  const handleLogout = async () => {
    await logout()
  }

  const handleOpenCreate = () => {
    setEditing(null)
    setForm({ code: '', user_linked: '' })
    setOpen(true)
  }

  const handleOpenEdit = (row) => {
    setEditing(row)
    setForm({ code: row.code || '', user_linked: row.user_linked || '' })
    setOpen(true)
  }

  const handleClose = () => setOpen(false)

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!user) return setSnack({ open: true, message: 'Usuario no autenticado' })

    try {
      if (editing) {
        const { data, error } = await supabase
          .from('Connection')
          .update({ code: form.code, user_linked: form.user_linked })
          .eq('id', editing.id)
          .select()

        if (error) throw error
        setSnack({ open: true, message: 'Conexión actualizada' })
      } else {
        const { data, error } = await supabase
          .from('Connection')
          .insert([{ user: user.id, code: form.code, user_linked: form.user_linked }])
          .select()

        if (error) throw error
        setSnack({ open: true, message: 'Conexión creada' })
      }
      handleClose()
      fetchConnections()
    } catch (err) {
      setSnack({ open: true, message: `Error: ${err.message}` })
    }
  }

  const handleDelete = async (row) => {
    if (!confirm('¿Eliminar esta conexión?')) return
    const { error } = await supabase.from('Connection').delete().eq('id', row.id)
    if (error) setSnack({ open: true, message: `Error al eliminar: ${error.message}` })
    else setSnack({ open: true, message: 'Conexión eliminada' })
    fetchConnections()
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box className="card">
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h4">Dashboard</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2">{user?.email ?? ''}</Typography>
              <Button variant="outlined" onClick={handleLogout}>Cerrar sesión</Button>
            </Stack>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Tus conexiones</Typography>
            <Button startIcon={<AddIcon />} variant="contained" onClick={handleOpenCreate}>Nueva</Button>
          </Stack>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Code</TableCell>
                    <TableCell>User Linked</TableCell>
                    <TableCell>Creado</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {connections.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{row.code}</TableCell>
                      <TableCell>{row.user_linked}</TableCell>
                      <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleOpenEdit(row)}><EditIcon /></IconButton>
                        <IconButton size="small" onClick={() => handleDelete(row)}><DeleteIcon /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      </Box>

      <Dialog open={open} onClose={handleClose} fullWidth>
        <DialogTitle>{editing ? 'Editar conexión' : 'Nueva conexión'}</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ display: 'grid', gap: 2, mt: 1 }}>
            <TextField label="Code" value={form.code} onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))} />
            <TextField label="User linked" value={form.user_linked} onChange={(e) => setForm((s) => ({ ...s, user_linked: e.target.value }))} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit}>{editing ? 'Guardar' : 'Crear'}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))} message={snack.message} />
    </Container>
  )
}

