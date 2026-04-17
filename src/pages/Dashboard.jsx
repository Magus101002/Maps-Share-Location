import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
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
import Avatar from '@mui/material/Avatar'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import ConnectionList from '../components/ConnectionList'
import PhoneDialog from '../components/PhoneDialog'
import ShareLinkBox from '../components/ShareLinkBox'
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
  const theme = useTheme()
  const isSm = useMediaQuery(theme.breakpoints.down('sm'))
  const { user, logout } = useAuth()
  const [connections, setConnections] = useState([])
  const [accesses, setAccesses] = useState([])
  const accessRowChannelRef = React.useRef(null)
  const [loading, setLoading] = useState(false)
  const [accessLoading, setAccessLoading] = useState(false)
  const [open, setOpen] = useState(false) // dialog open (create/edit)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ code: '', user_country: '+53', user_phone: '' })
  const [createdConnection, setCreatedConnection] = useState(null)
  const [createdAccess, setCreatedAccess] = useState(null)
  const [accessOpen, setAccessOpen] = useState(false)
  const [accessEditing, setAccessEditing] = useState(null)
  const [accessForm, setAccessForm] = useState({ code: '', user_country: '+53', user_phone: '' })
  const [userPhoneLocal, setUserPhoneLocal] = useState(null)
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false)
  const [phoneForm, setPhoneForm] = useState({ country: '+53', number: '' })
  const [snack, setSnack] = useState({ open: false, message: '' })
  const [waDisabledIds, setWaDisabledIds] = useState([])
  const [profileAnchor, setProfileAnchor] = useState(null)
  const [activeTab, setActiveTab] = useState('connections')
  const headerDescription = activeTab === 'connections' ? 'Gestiona tus conexiones' : 'Gestiona tus accesos'

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

  const fetchAccesses = useCallback(async () => {
    if (!user) return
    setAccessLoading(true)
    const { data, error } = await supabase
      .from('Access')
      .select('*')
      .eq('user', user.id)
      .order('created_at', { ascending: false })

    setAccessLoading(false)
    if (error) {
      setSnack({ open: true, message: `Error al leer accesos: ${error.message}` })
    } else {
      setAccesses(data || [])
    }
  }, [user])

  useEffect(() => {
    fetchConnections()
    fetchAccesses()
  }, [fetchConnections])

  // Profile menu handlers
  const openProfileMenu = (e) => setProfileAnchor(e.currentTarget)
  const closeProfileMenu = () => setProfileAnchor(null)

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

    // subscribe to Access changes as well
    const channel2 = supabase
      .channel('public-access')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Access', filter: `user=eq.${user.id}` },
        (payload) => {
          try {
            // Simple strategy: refetch accesses on any change
            fetchAccesses()
          } catch (e) {
            // ignore
          }
        }
      )
      .subscribe()

    return () => {
      try { channel.unsubscribe() } catch (e) {}
      try { channel2.unsubscribe() } catch (e) {}
    }
  }, [user, fetchConnections, fetchAccesses])

  const handleLogout = async () => {
    await logout()
  }

  const handleOpenCreate = () => {
    setEditing(null)
    setForm({ code: '', user_country: '+53', user_phone: '' })
    setCreatedConnection(null)
    setOpen(true)
  }

  const isWaDisabled = (id) => waDisabledIds.includes(id)
  const triggerWaCooldown = (id) => {
    setWaDisabledIds((s) => [...s, id])
    setTimeout(() => setWaDisabledIds((s) => s.filter((x) => x !== id)), 3000)
  }
  const openWaUrlWithCooldown = (id, url) => {
    if (!id) id = 'wa-global'
    if (isWaDisabled(id)) return
    try {
      window.open(url, '_blank')
      triggerWaCooldown(id)
    } catch (e) {
      setSnack({ open: true, message: 'No se pudo abrir WhatsApp' })
    }
  }

  const handleDeleteAccess = async (row) => {
    if (!confirm('¿Eliminar este acceso?')) return
    const { error } = await supabase.from('Access').delete().eq('id', row.id)
    if (error) setSnack({ open: true, message: `Error al eliminar: ${error.message}` })
    else setSnack({ open: true, message: 'Acceso eliminado' })
    fetchAccesses()
  }

  const handleRequestAccess = async () => {
    // Removed: marking as requested is no longer required in the dashboard
    return
  }

  const handleOpenCreateAccess = () => {
    setAccessEditing(null)
    setAccessForm({ code: '', user_country: '+53', user_phone: '' })
    setCreatedAccess(null)
    setAccessOpen(true)
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

  const handleOpenEditAccess = (row) => {
    setAccessEditing(row)
    const raw = row.user_linked || ''
    const m = raw.match(/^(\+\d{1,3})(\d{8})$/)
    if (m) {
      setAccessForm({ code: row.code || '', user_country: m[1], user_phone: m[2] })
    } else {
      const digits = (raw || '').replace(/\D/g, '')
      const phone = digits.slice(-8)
      setAccessForm({ code: row.code || '', user_country: '+53', user_phone: phone })
    }
    setAccessOpen(true)
  }

  // When an access row is opened for editing/viewing, subscribe specifically to that row
  useEffect(() => {
    if (!accessEditing) return
    // cleanup previous
    try { accessRowChannelRef.current?.unsubscribe() } catch (e) {}
    try {
      const chan = supabase
        .channel(`access-row-${accessEditing.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'Access', filter: `id=eq.${accessEditing.id}` }, (payload) => {
          const newRow = payload?.new
          if (newRow) {
            setAccessEditing(newRow)
            setCreatedAccess((c) => (c && c.id === newRow.id ? newRow : c))
            setAccesses((prev) => prev.map((r) => (r.id === newRow.id ? newRow : r)))
          }
        })
        .subscribe()
      accessRowChannelRef.current = chan
    } catch (e) {
      // ignore
    }

    return () => {
      try { accessRowChannelRef.current?.unsubscribe() } catch (e) {}
      accessRowChannelRef.current = null
    }
  }, [accessEditing])

  // Keep dialog-local access objects in sync when the accesses list changes
  useEffect(() => {
    if (!accesses || accesses.length === 0) return
    if (accessEditing) {
      const latest = accesses.find((a) => a.id === accessEditing.id)
      if (latest && latest !== accessEditing) setAccessEditing(latest)
    }
    if (createdAccess) {
      const latest = accesses.find((a) => a.id === createdAccess.id)
      if (latest && latest !== createdAccess) setCreatedAccess(latest)
    }
  }, [accesses])

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
      fetchAccesses()
    } catch (err) {
      setSnack({ open: true, message: `Error: ${err.message}` })
    }
  }

  const handleSubmitAccess = async (e) => {
    e?.preventDefault()
    if (!user) return setSnack({ open: true, message: 'Usuario no autenticado' })

    try {
      const finalUserLinked = `${accessForm.user_country || '+53'}${accessForm.user_phone || ''}`
      if (accessEditing) {
        const { data, error } = await supabase
          .from('Access')
          .update({ user_linked: finalUserLinked })
          .eq('id', accessEditing.id)
          .select()

        if (error) throw error
        setSnack({ open: true, message: 'Acceso actualizado' })
      } else {
        const { data, error } = await supabase
          .from('Access')
          .insert([{ user: user.id, user_linked: finalUserLinked }])
          .select()

        if (error) throw error
        setSnack({ open: true, message: 'Acceso creado' })
      }
      setAccessOpen(false)
      fetchAccesses()
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

  // Access analogs: quick create, save code, mark approve
  const handleCreateFromPhoneAccess = async () => {
    if (!user) return setSnack({ open: true, message: 'Usuario no autenticado' })
    if (!(/^[+]\d{1,3}$/.test(accessForm.user_country) && /^\d{8}$/.test(accessForm.user_phone))) return

    const finalUserLinked = `${accessForm.user_country}${accessForm.user_phone}`
    try {
      const { data, error } = await supabase
        .from('Access')
        .insert([{ user: user.id, user_linked: finalUserLinked }])
        .select()

      if (error) throw error
      const created = Array.isArray(data) ? data[0] : data
      setSnack({ open: true, message: 'Acceso creado exitosamente' })
      setCreatedAccess(created)
      fetchAccesses()
      setAccessEditing(created)
      const raw = created.user_linked || ''
      const m = raw.match(/^(\+\d{1,3})(\d{8})$/)
      if (m) {
        setAccessForm({ code: created.code || '', user_country: m[1], user_phone: m[2] })
      } else {
        const digits = (raw || '').replace(/\D/g, '')
        const phone = digits.slice(-8)
        setAccessForm({ code: created.code || '', user_country: '+53', user_phone: phone })
      }
    } catch (err) {
      setSnack({ open: true, message: `Error creando acceso: ${err.message}` })
    }
  }

  const handleSaveCodeAccess = async () => {
    const acc = createdAccess ?? accessEditing
    if (!acc || !acc.id) return setSnack({ open: true, message: 'No existe el acceso para guardar el código' })
    const linked = acc.user_linked || ''
    if (!linked) return setSnack({ open: true, message: 'No hay número vinculado en el acceso' })
    try {
      const { data, error } = await supabase
        .from('Access')
        .update({ code: accessForm.code })
        .eq('id', acc.id)
        .select()
      if (error) throw error
      const updated = Array.isArray(data) ? data[0] : data
      setSnack({ open: true, message: 'Código guardado' })
      setCreatedAccess((c) => (c && c.id === updated.id ? updated : c))
      if (accessEditing && accessEditing.id === updated.id) setAccessEditing(updated)
    } catch (err) {
      setSnack({ open: true, message: `Error guardando código: ${err.message}` })
    }
  }

  const handleApproveAccess = async () => {
    const acc = createdAccess ?? accessEditing
    if (!acc || !acc.id) return setSnack({ open: true, message: 'No existe el acceso' })
    try {
      const { data, error } = await supabase
        .from('Access')
        .update({ is_approved: true })
        .eq('id', acc.id)
        .select()
      if (error) throw error
      const updated = Array.isArray(data) ? data[0] : data
      setSnack({ open: true, message: 'Vinculación marcada como realizada' })
      setCreatedAccess((c) => (c && c.id === updated.id ? updated : c))
      if (accessEditing && accessEditing.id === updated.id) setAccessEditing(updated)
    } catch (err) {
      setSnack({ open: true, message: `Error marcando vinculación: ${err.message}` })
    }
  }

  const handleDelete = async (row) => {
    if (!confirm('¿Eliminar esta conexión?')) return
    const { error } = await supabase.from('Connection').delete().eq('id', row.id)
    if (error) setSnack({ open: true, message: `Error al eliminar: ${error.message}` })
    else setSnack({ open: true, message: 'Conexión eliminada' })
    fetchConnections()
  }

  // Save code to the current connection (editing or created)
  const handleSaveCode = async () => {
    const conn = createdConnection ?? editing
    if (!conn || !conn.id) return setSnack({ open: true, message: 'No existe la conexión para guardar el código' })
    // ensure user_linked exists
    const linked = conn.user_linked || ''
    if (!linked) return setSnack({ open: true, message: 'No hay número vinculado en la conexión' })

    try {
      const { data, error } = await supabase
        .from('Connection')
        .update({ code: form.code })
        .eq('id', conn.id)
        .select()

      if (error) throw error
      const updated = Array.isArray(data) ? data[0] : data
      setSnack({ open: true, message: 'Código guardado' })
      // sync local state
      setCreatedConnection((c) => (c && c.id === updated.id ? updated : c))
      if (editing && editing.id === updated.id) setEditing(updated)
    } catch (err) {
      setSnack({ open: true, message: `Error guardando código: ${err.message}` })
    }
  }

  // Mark connection as approved (is_approved = true)
  const handleApprove = async () => {
    const conn = createdConnection ?? editing
    if (!conn || !conn.id) return setSnack({ open: true, message: 'No existe la conexión' })
    try {
      const { data, error } = await supabase
        .from('Connection')
        .update({ is_approved: true })
        .eq('id', conn.id)
        .select()
      if (error) throw error
      const updated = Array.isArray(data) ? data[0] : data
      setSnack({ open: true, message: 'Vinculación marcada como realizada' })
      setCreatedConnection((c) => (c && c.id === updated.id ? updated : c))
      if (editing && editing.id === updated.id) setEditing(updated)
    } catch (err) {
      setSnack({ open: true, message: `Error marcando vinculación: ${err.message}` })
    }
  }
  const phoneValid = (/^[+]\d{1,3}$/.test(form.user_country) && /^\d{8}$/.test(form.user_phone))
  const finalUserLinked = `${form.user_country}${form.user_phone}`
  const isCreatedForThis = createdConnection && createdConnection.user_linked === finalUserLinked
  // show instructions also when editing an existing connection that matches the phone
  const hasConnectionForThis = isCreatedForThis || (editing && editing.user_linked === finalUserLinked)
  const userHasPhone = Boolean(user?.user_metadata?.phone) || Boolean(userPhoneLocal)
  return (
    <Box sx={{ width: '100%', minHeight: '100vh', p: { xs: 1, sm: 2 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Top bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="h4">Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">{headerDescription}</Typography>
          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
            <Button variant={activeTab === 'connections' ? 'contained' : 'outlined'} size="small" onClick={() => setActiveTab('connections')}>Conexiones</Button>
            <Button variant={activeTab === 'access' ? 'contained' : 'outlined'} size="small" onClick={() => setActiveTab('access')}>Access</Button>
          </Box>
        </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => { if (activeTab === 'connections') handleOpenCreate(); else handleOpenCreateAccess(); }}>Nueva</Button>
          <IconButton onClick={openProfileMenu} size="small" sx={{ ml: 1 }} aria-label="perfil">
            <Avatar sx={{ width: 36, height: 36 }}>{(user?.email || '?').charAt(0).toUpperCase()}</Avatar>
          </IconButton>
          <Menu anchorEl={profileAnchor} open={Boolean(profileAnchor)} onClose={closeProfileMenu}>
            <MenuItem disabled>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="body2">{user?.email ?? ''}</Typography>
                <Typography variant="caption" color="text.secondary">{user?.user_metadata?.phone ?? userPhoneLocal ?? 'Sin teléfono'}</Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { closeProfileMenu(); openPhoneDialog(); }}>Editar teléfono</MenuItem>
            <MenuItem onClick={() => { closeProfileMenu(); handleLogout(); }}>Cerrar sesión</MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Main content area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Alerts */}
        {!userHasPhone && (
          <Alert severity="warning" action={
            <Button color="inherit" size="small" onClick={openPhoneDialog}>Añadir teléfono</Button>
          }>
            Es requerido que añadas un teléfono en tu cuenta para crear conexiones.
          </Alert>
        )}

        {/* Dynamic: show Connections or Access depending on activeTab */}
        {activeTab === 'connections' ? (
          (loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : (
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              <ConnectionList connections={connections} isSm={isSm} onEdit={handleOpenEdit} onDelete={handleDelete} />
            </Box>
          ))
        ) : (
          (accessLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : (
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              <ConnectionList connections={accesses} isSm={isSm} onEdit={handleOpenEditAccess} onDelete={handleDeleteAccess} />
            </Box>
          ))
        )}
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
                <Grid item xs={isSm ? 12 : 2} sm={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    onClick={editing ? () => handleSubmit() : handleCreateFromPhone}
                    disabled={!phoneValid || !userHasPhone || (!editing && hasConnectionForThis)}
                    aria-label="Crear conexión"
                  >
                    {editing ? 'Modificar' : (hasConnectionForThis ? 'Creado' : 'Crear')}
                  </Button>
                </Grid>
              </Grid>
            </Box>

            {/* If a connection exists for this phone (created now or editing), show instructions and ask for the external code; otherwise show the Code field as before */}
            {hasConnectionForThis ? (
              <Box sx={{ display: 'grid', gap: 1 }}>
                <Typography variant="body2">Ve al siguiente <a href="https://web.whatsapp.com/" target="_blank" rel="noopener noreferrer">WhatsApp Web</a> e introduce el código de país y el número que has puesto.</Typography>

                {/* Nueva instrucción: generar enlace y actions - colocada justo debajo de la instrucción anterior */}
                <Box sx={{ mt: 0.5 }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>Copia el siguiente enlace en el chat del usuario:</Typography>

                  {/* generated link box */}
                  <Paper variant="outlined" sx={{ p: 1, fontFamily: 'monospace', wordBreak: 'break-all', bgcolor: '#f5f5f5' }}>
                    {(() => {
                      // use token of connection as single parameter
                      const token = createdConnection?.token ?? editing?.token ?? ''
                      const base = typeof window !== 'undefined' ? window.location.origin + '/' : 'https://mi.dominio/'
                      const params = `?t=${encodeURIComponent(token)}`
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
                        const token = createdConnection?.token ?? editing?.token ?? ''
                        const base = typeof window !== 'undefined' ? window.location.origin : 'https://mi.dominio'
                        const link = `${base}/?t=${encodeURIComponent(token)}`
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
                        const connPhoneRaw = createdConnection?.user_linked ?? editing?.user_linked ?? finalUserLinked
                        const connDigits = (connPhoneRaw || '').replace(/\D/g, '')
                        const waNumber = connDigits
                        const id = `wa-conn-${createdConnection?.id ?? editing?.id ?? 'new'}`
                        const sendWithCoords = (lat, lng) => {
                          const maps = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
                          const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(maps)}`
                          openWaUrlWithCooldown(id, waUrl)
                        }
                        if (isWaDisabled(id)) return
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            (pos) => { sendWithCoords(pos.coords.latitude, pos.coords.longitude) },
                            () => {
                              // fallback: open wa with app link if geolocation not available
                              const token = createdConnection?.token ?? editing?.token ?? ''
                              const base = typeof window !== 'undefined' ? window.location.origin : 'https://mi.dominio'
                              const link = `${base}/?t=${encodeURIComponent(token)}`
                              const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(link)}`
                              openWaUrlWithCooldown(id, waUrl)
                            },
                            { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
                          )
                        } else {
                          const token = createdConnection?.token ?? editing?.token ?? ''
                          const base = typeof window !== 'undefined' ? window.location.origin : 'https://mi.dominio'
                          const link = `${base}/?t=${encodeURIComponent(token)}`
                          const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(link)}`
                          openWaUrlWithCooldown(id, waUrl)
                        }
                      }}
                      sx={{ textTransform: 'none' }}
                    >
                      Enviar por WhatsApp
                    </Button>
                  </Box>
                </Box>

                <FormHelperText>Cuando obtengas el código, póngalo aquí debajo</FormHelperText>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    label="Código"
                    value={form.code}
                    onChange={(e) => {
                      const v = (e.target.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
                      setForm((s) => ({ ...s, code: v }))
                    }}
                    fullWidth
                    inputProps={{ maxLength: 8 }}
                    disabled={!((createdConnection?.user_linked) || (editing?.user_linked))}
                    helperText="Máximo 8 caracteres. Letras se convierten a mayúsculas."
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSaveCode}
                    disabled={!((createdConnection?.user_linked) || (editing?.user_linked)) || form.code.length !== 8}
                  >Guardar</Button>
                </Box>

                {/* After code is present, show instruction and approve button */}
                {((createdConnection?.code) || (editing?.code)) ? (
                  <Box sx={{ mt: 1, display: 'grid', gap: 1 }}>
                    <Typography variant="body2">Esperando que el usuario haga la vinculación.</Typography>
                    <Button variant="contained" color="success" onClick={handleApprove} disabled={(createdConnection?.is_approved) || (editing?.is_approved)}>
                      Marcar vinculación como realizada
                    </Button>
                  </Box>
                ) : null}
              </Box>
            ) : (
              <TextField
                label="Código"
                value={form.code}
                onChange={(e) => {
                  const v = (e.target.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
                  setForm((s) => ({ ...s, code: v }))
                }}
                inputProps={{ maxLength: 8 }}
                helperText="Máximo 8 caracteres. Letras se convierten a mayúsculas."
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={!userHasPhone && !editing}>{editing ? 'Guardar' : 'Crear'}</Button>
        </DialogActions>
      </Dialog>

      {/* Access dialog (similar to Connection dialog) */}
      <Dialog open={accessOpen} onClose={() => { setAccessOpen(false); setAccessEditing(null); setAccessForm({ code: '', user_country: '+53', user_phone: '' }); setCreatedAccess(null); }} fullWidth>
        <DialogTitle>{accessEditing ? 'Editar acceso' : 'Nuevo acceso'}</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ display: 'grid', gap: 2, mt: 1 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>No de telefono a vincular</Typography>
              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>Introduce el código de país y el número de 8 dígitos, luego pulsa el botón "Crear".</Typography>
              <Grid container spacing={1} alignItems="center">
                <Grid item xs={4} sm={3}>
                  <TextField
                    label="Código país"
                    value={accessForm.user_country}
                    onChange={(e) => {
                      let v = e.target.value || ''
                      v = v.replace(/[^+\d]/g, '')
                      if (!v.startsWith('+')) v = '+' + v.replace(/\+/g, '')
                      v = v.slice(0, 4)
                      setAccessForm((s) => ({ ...s, user_country: v }))
                      setCreatedAccess(null)
                    }}
                    fullWidth
                    inputProps={{ maxLength: 4 }}
                  />
                </Grid>
                <Grid item xs={6} sm={7}>
                  <TextField
                    label="Número"
                    value={accessForm.user_phone}
                    onChange={(e) => { setAccessForm((s) => ({ ...s, user_phone: e.target.value.replace(/\D/g, '').slice(0,8) })); setCreatedAccess(null) }}
                    fullWidth
                    inputProps={{ inputMode: 'numeric', pattern: '\\d*', maxLength: 8 }}
                  />
                </Grid>
                <Grid item xs={isSm ? 12 : 2} sm={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    onClick={accessEditing ? () => handleSubmitAccess() : handleCreateFromPhoneAccess}
                    disabled={!(/^[+]\d{1,3}$/.test(accessForm.user_country) && /^\d{8}$/.test(accessForm.user_phone)) || !userHasPhone}
                    aria-label="Crear acceso"
                  >
                    {accessEditing ? 'Modificar' : 'Crear'}
                  </Button>
                </Grid>
              </Grid>
            </Box>

            {/* If created or editing show actions */}
            {(createdAccess || accessEditing) ? (
              <Box sx={{ display: 'grid', gap: 1 }}>
                <Typography variant="body2">Puedes copiar el enlace o enviar la ubicación por WhatsApp al usuario vinculado.</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Paper variant="outlined" sx={{ p: 1, fontFamily: 'monospace', wordBreak: 'break-all', bgcolor: '#f5f5f5' }}>
                    {(() => {
                      const token = createdAccess?.token ?? accessEditing?.token ?? ''
                      const base = typeof window !== 'undefined' ? window.location.origin + '/' : 'https://mi.dominio/'
                      const params = `?t=${encodeURIComponent(token)}`
                      return `${base}${params}`
                    })()}
                  </Paper>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Button size="small" variant="contained" startIcon={<ContentCopyIcon />} onClick={() => {
                      const token = createdAccess?.token ?? accessEditing?.token ?? ''
                      const base = typeof window !== 'undefined' ? window.location.origin : 'https://mi.dominio'
                      const link = `${base}/?t=${encodeURIComponent(token)}`
                      try { navigator.clipboard.writeText(link); setSnack({ open: true, message: 'Enlace copiado al portapapeles' }) } catch(e){ setSnack({ open: true, message: 'No se pudo copiar el enlace' }) }
                    }} sx={{ textTransform: 'none' }}>Copiar enlace</Button>

                    <Button size="small" variant="contained" color="success" startIcon={<WhatsAppIcon />} onClick={() => {
                      const connPhoneRaw = createdAccess?.user_linked ?? accessEditing?.user_linked ?? `${accessForm.user_country}${accessForm.user_phone}`
                      const connDigits = (connPhoneRaw || '').replace(/\D/g, '')
                      const waNumber = connDigits
                      const id = `wa-access-${createdAccess?.id ?? accessEditing?.id ?? 'new'}`
                      const sendWithCoords = (lat, lng) => {
                        const maps = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
                        const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(maps)}`
                        openWaUrlWithCooldown(id, waUrl)
                      }
                      if (isWaDisabled(id)) return
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (pos) => { sendWithCoords(pos.coords.latitude, pos.coords.longitude) },
                          () => {
                            const token = createdAccess?.token ?? accessEditing?.token ?? ''
                            const base = typeof window !== 'undefined' ? window.location.origin : 'https://mi.dominio'
                            const link = `${base}/?t=${encodeURIComponent(token)}`
                            const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(link)}`
                            openWaUrlWithCooldown(id, waUrl)
                          },
                          { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
                        )
                      } else {
                        const token = createdAccess?.token ?? accessEditing?.token ?? ''
                        const base = typeof window !== 'undefined' ? window.location.origin : 'https://mi.dominio'
                        const link = `${base}/?t=${encodeURIComponent(token)}`
                        const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(link)}`
                        openWaUrlWithCooldown(id, waUrl)
                      }
                    }} sx={{ textTransform: 'none' }}>Enviar por WhatsApp</Button>
                  </Box>

                  <FormHelperText>Cuando el usuario ponga el código desde el enlace, se mostrará aquí (no editable).</FormHelperText>

                  {/* Display the code read-only if present, otherwise show waiting message */}
                  {(createdAccess?.code) || (accessEditing?.code) ? (
                    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                      {(() => {
                        const raw = (createdAccess?.code ?? accessEditing?.code ?? '').toString().replace(/\D/g, '').slice(0, 6)
                        const chars = raw.split('')
                        const boxes = []
                        for (let i = 0; i < 6; i++) boxes.push(chars[i] || '')
                        return (
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center', px: 1 }}>
                            {boxes.map((c, i) => (
                              <Box key={i} sx={{ minWidth: { xs: 20, sm: 36 }, height: { xs: 28, sm: 40 }, border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontWeight: 700, bgcolor: 'background.paper', px: 0.5, fontSize: { xs: 14, sm: 18 } }}>{c}</Box>
                            ))}
                          </Box>
                        )
                      })()}

                      {/* If approved show green label, otherwise show approve button */}
                      {((createdAccess?.is_approved) || (accessEditing?.is_approved)) ? (
                        <Alert severity="success" sx={{ mt: 1 }}>Vinculado</Alert>
                      ) : (
                        <Button variant="contained" color="success" onClick={handleApproveAccess}>Marcar como accesso aprobado</Button>
                      )}
                    </Box>
                  ) : (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2">Esperando a que el usuario introduzca el código desde el enlace público.</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            ) : null}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAccessOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmitAccess}>{accessEditing ? 'Guardar' : 'Crear'}</Button>
        </DialogActions>
      </Dialog>

      <PhoneDialog
        open={phoneDialogOpen}
        onClose={() => setPhoneDialogOpen(false)}
        phoneForm={phoneForm}
        setPhoneForm={setPhoneForm}
        onConfirm={handleSaveUserPhone}
        disabled={!(/^[+]\d{1,3}$/.test(phoneForm.country) && /^\d{8}$/.test(phoneForm.number))}
      />

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))} message={snack.message} />
    </Box>
  )
}

