import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Grid from '@mui/material/Grid'
import InputAdornment from '@mui/material/InputAdornment'
import FormHelperText from '@mui/material/FormHelperText'
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
import Alert from '@mui/material/Alert'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false) // dialog open (create/edit)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ code: '', user_country: '+53', user_phone: '' })
  const [createdConnection, setCreatedConnection] = useState(null)
  const [userPhoneLocal, setUserPhoneLocal] = useState(null)
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false)
  const [phoneForm, setPhoneForm] = useState({ country: '+53', number: '' })
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
    setForm({ code: '', user_country: '+53', user_phone: '' })
    setCreatedConnection(null)
    setOpen(true)
  }

  const openPhoneDialog = () => {
    setPhoneForm({ country: '+53', number: '' })
    setPhoneDialogOpen(true)
  }

  const handleSaveUserPhone = async () => {
    // validate
    const country = phoneForm.country
    const number = phoneForm.number.replace(/\D/g, '').slice(0,8)
    if (!(/^[+]\d{1,3}$/.test(country) && /^\d{8}$/.test(number))) {
      setSnack({ open: true, message: 'Formato de teléfono inválido' })
      return
    }
    const final = `${country}${number}`
    try {
      // update user metadata via supabase auth
      const { data, error } = await supabase.auth.updateUser({ data: { phone: final } })
      if (error) throw error
      setSnack({ open: true, message: 'Teléfono guardado' })
      setUserPhoneLocal(final)
      setPhoneDialogOpen(false)
      // refresh connections list just in case
      fetchConnections()
    } catch (err) {
      setSnack({ open: true, message: `Error guardando teléfono: ${err.message}` })
    }
  }

  const handleOpenEdit = (row) => {
    setEditing(row)
    // Try to parse existing user_linked into country and phone
    const raw = row.user_linked || ''
    const m = raw.match(/^(\+\d{1,3})(\d{8})$/)
    if (m) {
      setForm({ code: row.code || '', user_country: m[1], user_phone: m[2] })
    } else {
      // fallback: extract digits and take last 8 as phone
      const digits = (raw || '').replace(/\D/g, '')
      const phone = digits.slice(-8)
      setForm({ code: row.code || '', user_country: '+53', user_phone: phone })
    }
    setOpen(true)
  }

  const handleClose = () => setOpen(false)

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!user) return setSnack({ open: true, message: 'Usuario no autenticado' })

    try {
      // build user_linked from country + phone
      const finalUserLinked = `${form.user_country || '+53'}${form.user_phone || ''}`
      if (editing) {
        const { data, error } = await supabase
          .from('Connection')
          .update({ code: form.code, user_linked: finalUserLinked })
          .eq('id', editing.id)
          .select()

        if (error) throw error
        setSnack({ open: true, message: 'Conexión actualizada' })
      } else {
        const { data, error } = await supabase
          .from('Connection')
          .insert([{ user: user.id, code: form.code, user_linked: finalUserLinked }])
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

  // Quick create: when phone+country valid and user clicks the check button,
  // create the Connection immediately and switch the dialog to edit mode with the created row.
  const handleCreateFromPhone = async () => {
    if (!user) return setSnack({ open: true, message: 'Usuario no autenticado' })
    if (!(/^[+]\d{1,3}$/.test(form.user_country) && /^\d{8}$/.test(form.user_phone))) return

    const finalUserLinked = `${form.user_country}${form.user_phone}`
    try {
      const { data, error } = await supabase
        .from('Connection')
        .insert([{ user: user.id, code: form.code, user_linked: finalUserLinked }])
        .select()

      if (error) throw error
      const created = Array.isArray(data) ? data[0] : data
      setSnack({ open: true, message: 'Conexión creada exitosamente' })
      setCreatedConnection(created)
      // refresh list
      fetchConnections()
      // switch dialog to edit mode with the created row so user can modify
      setEditing(created)
      // populate form with created values
      // parse created.user_linked
      const raw = created.user_linked || ''
      const m = raw.match(/^(\+\d{1,3})(\d{8})$/)
      if (m) {
        setForm({ code: created.code || '', user_country: m[1], user_phone: m[2] })
      } else {
        const digits = (raw || '').replace(/\D/g, '')
        const phone = digits.slice(-8)
        setForm({ code: created.code || '', user_country: '+53', user_phone: phone })
      }
      // leave dialog open so user can edit details
    } catch (err) {
      setSnack({ open: true, message: `Error creando conexión: ${err.message}` })
    }
  }

  const handleDelete = async (row) => {
    if (!confirm('¿Eliminar esta conexión?')) return
    const { error } = await supabase.from('Connection').delete().eq('id', row.id)
    if (error) setSnack({ open: true, message: `Error al eliminar: ${error.message}` })
    else setSnack({ open: true, message: 'Conexión eliminada' })
    fetchConnections()
  }
  const phoneValid = (/^[+]\d{1,3}$/.test(form.user_country) && /^\d{8}$/.test(form.user_phone))
  const finalUserLinked = `${form.user_country}${form.user_phone}`
  const isCreatedForThis = createdConnection && createdConnection.user_linked === finalUserLinked
  const userHasPhone = Boolean(user?.user_metadata?.phone) || Boolean(userPhoneLocal)

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

          {/* Si el usuario no tiene teléfono, mostrar alerta debajo del navbar con botón para añadir */}
          {!userHasPhone && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="warning" action={
                <Button color="inherit" size="small" onClick={openPhoneDialog}>Añadir teléfono</Button>
              }>
                Es requerido que añadas un teléfono en tu cuenta para crear conexiones.
              </Alert>
            </Box>
          )}

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
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>No de telefono a vincular</Typography>
              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>Introduce el código de país y el número de 8 dígitos, luego pulsa el botón "Crear".</Typography>
              <Grid container spacing={1} alignItems="center">
                <Grid item xs={4} sm={3}>
                  <TextField
                    label="Código país"
                    value={form.user_country}
                    onChange={(e) => {
                      let v = e.target.value || ''
                      // keep only digits and optional leading +, ensure leading +
                      v = v.replace(/[^+\d]/g, '')
                      if (!v.startsWith('+')) v = '+' + v.replace(/\+/g, '')
                      // limit length (e.g. +123)
                      v = v.slice(0, 4)
                      setForm((s) => ({ ...s, user_country: v }))
                      setCreatedConnection(null)
                    }}
                    fullWidth
                    inputProps={{ maxLength: 4 }}
                  />
                </Grid>
                <Grid item xs={6} sm={7}>
                  <TextField
                    label="Número"
                    value={form.user_phone}
                    onChange={(e) => { setForm((s) => ({ ...s, user_phone: e.target.value.replace(/\D/g, '').slice(0,8) })); setCreatedConnection(null) }}
                    fullWidth
                    inputProps={{ inputMode: 'numeric', pattern: '\\d*', maxLength: 8 }}
                  />
                </Grid>
                <Grid item xs={2} sm={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={handleCreateFromPhone}
                    disabled={!phoneValid || isCreatedForThis || !userHasPhone}
                    aria-label="Crear conexión"
                  >
                    {isCreatedForThis ? 'Creado' : 'Crear'}
                  </Button>
                </Grid>
              </Grid>
            </Box>

            {/* If a connection was created for this phone, show instructions and ask for the external code; otherwise show the Code field as before */}
            {isCreatedForThis ? (
              <Box sx={{ display: 'grid', gap: 1 }}>
                <Typography variant="body2">Ve al siguiente <a href="https://example.com" target="_blank" rel="noopener noreferrer">enlace</a> e introduce el código de país y el número que has puesto.</Typography>

                {/* Nueva instrucción: generar enlace y actions - colocada justo debajo de la instrucción anterior */}
                <Box sx={{ mt: 0.5 }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>Copia el siguiente enlace en el chat del usuario:</Typography>

                  {/* generated link box */}
                  <Paper variant="outlined" sx={{ p: 1, fontFamily: 'monospace', wordBreak: 'break-all', bgcolor: '#f5f5f5' }}>
                    {(() => {
                      const authPhone = user?.user_metadata?.phone ?? userPhoneLocal ?? ''
                      const connPhone = createdConnection?.user_linked ?? finalUserLinked
                      const base = typeof window !== 'undefined' ? window.location.origin + '/' : 'https://mi.dominio/'
                      const params = `?conn=${encodeURIComponent(connPhone)}&user=${encodeURIComponent(authPhone)}`
                      return `${base}${params}`
                    })()}
                  </Paper>

                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => {
                        const authPhone = user?.user_metadata?.phone ?? userPhoneLocal ?? ''
                        const connPhone = createdConnection?.user_linked ?? finalUserLinked
                        const base = typeof window !== 'undefined' ? window.location.origin : 'https://mi.dominio'
                        const link = `${base}/?conn=${encodeURIComponent(connPhone)}&user=${encodeURIComponent(authPhone)}`
                        try {
                          navigator.clipboard.writeText(link)
                          setSnack({ open: true, message: 'Enlace copiado al portapapeles' })
                        } catch (e) {
                          setSnack({ open: true, message: 'No se pudo copiar el enlace' })
                        }
                      }}
                      sx={{ textTransform: 'none' }}
                    >
                      Copiar enlace
                    </Button>

                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={<WhatsAppIcon />}
                      onClick={() => {
                        const connPhoneRaw = createdConnection?.user_linked ?? finalUserLinked
                        const connDigits = (connPhoneRaw || '').replace(/\D/g, '')
                        const authPhone = user?.user_metadata?.phone ?? userPhoneLocal ?? ''
                        const base = typeof window !== 'undefined' ? window.location.origin : 'https://mi.dominio'
                        const link = `${base}/?conn=${encodeURIComponent(connPhoneRaw)}&user=${encodeURIComponent(authPhone)}`
                        // wa.me requires digits only (no +). Use encoded text param
                        const waNumber = connDigits
                        const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(link)}`
                        window.open(waUrl, '_blank')
                      }}
                      sx={{ textTransform: 'none' }}
                    >
                      Enviar por WhatsApp
                    </Button>
                  </Box>
                </Box>

                <FormHelperText>Cuando obtengas el código, póngalo aquí debajo</FormHelperText>
                <TextField
                  label="Código obtenido"
                  value={form.code}
                  onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
                  fullWidth
                />
              </Box>
            ) : (
              <TextField label="Code" value={form.code} onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))} />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={!userHasPhone && !editing}>{editing ? 'Guardar' : 'Crear'}</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para añadir teléfono al usuario */}
      <Dialog open={phoneDialogOpen} onClose={() => setPhoneDialogOpen(false)}>
        <DialogTitle>Añadir teléfono</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gap: 2, mt: 1, width: 360 }}>
            <Typography variant="body2">Introduce tu código de país y número (8 dígitos).</Typography>
            <Grid container spacing={1} alignItems="center">
              <Grid item xs={4}>
                <TextField
                  label="Código país"
                  value={phoneForm.country}
                  onChange={(e) => {
                    let v = e.target.value || ''
                    v = v.replace(/[^+\d]/g, '')
                    if (!v.startsWith('+')) v = '+' + v.replace(/\+/g, '')
                    v = v.slice(0, 4)
                    setPhoneForm((s) => ({ ...s, country: v }))
                  }}
                />
              </Grid>
              <Grid item xs={8}>
                <TextField
                  label="Número"
                  value={phoneForm.number}
                  onChange={(e) => setPhoneForm((s) => ({ ...s, number: e.target.value.replace(/\D/g, '').slice(0,8) }))}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPhoneDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveUserPhone} disabled={!(/^[+]\d{1,3}$/.test(phoneForm.country) && /^\d{8}$/.test(phoneForm.number))}>Confirmar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))} message={snack.message} />
    </Container>
  )
}

