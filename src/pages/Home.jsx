import React, { useEffect, useState, useRef } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import CircularProgress from '@mui/material/CircularProgress'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Snackbar from '@mui/material/Snackbar'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'

import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

// Fix leaflet default icon paths for bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl,
  shadowUrl: iconShadow
})

function Recenter({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position) {
      const zoom = 15
      map.setView(position, zoom)
    }
  }, [position, map])
  return null
}

function AutoOpenPopup({ position, markerRef }) {
  const map = useMap()
  useEffect(() => {
    if (!position) return
    const t = setTimeout(() => {
      try {
        if (markerRef?.current && typeof markerRef.current.openPopup === 'function') {
          markerRef.current.openPopup()
        } else if (markerRef?.current && markerRef.current.getPopup) {
          const popup = markerRef.current.getPopup()
          if (popup && map) popup.openOn(map)
        }
      } catch (e) {
        // ignore
      }
    }, 200)
    return () => clearTimeout(t)
  }, [position, markerRef, map])
  return null
}


export default function Home() {
  const { user } = useAuth()
  const [position, setPosition] = useState(null)
  const [sharing, setSharing] = useState(false)
  const watchRef = useRef(null)
  const markerRef = useRef(null)
  const [snack, setSnack] = useState({ open: false, message: '' })
  const [locating, setLocating] = useState(true)
  const [permissionState, setPermissionState] = useState(null) // 'granted' | 'prompt' | 'denied' | null
  const [showPermissionHelp, setShowPermissionHelp] = useState(false)
  const [connectionToken, setConnectionToken] = useState(null)
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false)
  const [tokenDialogLoading, setTokenDialogLoading] = useState(false)
  const [tokenDialogMessage, setTokenDialogMessage] = useState('')
  const [tokenDialogCode, setTokenDialogCode] = useState('')
  const tokenChannelRef = useRef(null)
  const tokenPollRef = useRef(null)
  const [tokenConnection, setTokenConnection] = useState(null)

  useEffect(() => {
    // Check for geolocation support and permission status, then try to obtain position
    if (!navigator.geolocation) {
      setSnack({ open: true, message: 'Geolocation no soportado por este navegador.' })
      setLocating(false)
      return
    }

    // Helper to actually request the position (triggers browser prompt if state is 'prompt')
    const requestPosition = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude])
          setLocating(false)
          setPermissionState('granted')
          setShowPermissionHelp(false)
        },
        (err) => {
          setLocating(false)
          // If permission denied, show help UI to enable location
          if (err.code === 1) {
            setPermissionState('denied')
            setShowPermissionHelp(true)
            setSnack({ open: true, message: 'Permiso de ubicación denegado. Activa la ubicación y recarga la página o utiliza el botón de ayuda.' })
          } else {
            setSnack({ open: true, message: `Error geolocalización: ${err.message}` })
          }
        },
        { enableHighAccuracy: true }
      )
    }

    // If Permissions API is available, use it to determine current state
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((res) => {
          setPermissionState(res.state)
          if (res.state === 'granted') {
            // directly request position
            requestPosition()
          } else if (res.state === 'prompt') {
            // trigger prompt
            requestPosition()
          } else if (res.state === 'denied') {
            setLocating(false)
            setShowPermissionHelp(true)
            setSnack({ open: true, message: 'Permiso de ubicación denegado. Activa la ubicación en los ajustes del dispositivo.' })
          }

          // listen for changes in permission state
          try {
            res.onchange = () => setPermissionState(res.state)
          } catch (e) {
            // ignore if not supported
          }
        })
        .catch(() => {
          // fallback: just request position which will either succeed or show prompt
          requestPosition()
        })
    } else {
      // Permissions API not available: attempt to request position (browser will prompt or fail)
      requestPosition()
    }
  }, [])

  // Read token from URL on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const t = params.get('t')
      if (t) setConnectionToken(t)
    } catch (e) {
      // ignore
    }
  }, [])

  // Auto open popup is handled inside MapContainer by AutoOpenPopup component

  const startSharing = () => {
    if (!navigator.geolocation) return setSnack({ open: true, message: 'Geolocation no disponible' })
    if (sharing) return
    if (permissionState === 'denied') {
      setShowPermissionHelp(true)
      return setSnack({ open: true, message: 'Permiso de ubicación denegado. Abre ajustes para activarlo.' })
    }
    // start watchPosition
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude]
        setPosition(coords)
        // upsert into UserLocations table for this user
        if (user) {
          try {
            await supabase
              .from('UserLocations')
              .upsert({ user: user.id, lat: coords[0], lng: coords[1], updated_at: new Date().toISOString() }, { onConflict: 'user' })
          } catch (e) {
            // ignore for now
          }
        }
      },
      (err) => setSnack({ open: true, message: `Error watchPosition: ${err.message}` }),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    )
    watchRef.current = id
    setSharing(true)
    setSnack({ open: true, message: 'Compartiendo ubicación en tiempo real' })
  }

  // Helper: fetch connection by token
  const fetchConnectionByToken = async (token) => {
    try {
      const { data, error } = await supabase.from('Connection').select('*').eq('token', token).limit(1)
      if (error) return { error }
      const row = Array.isArray(data) ? data[0] : data
      return { data: row }
    } catch (err) {
      return { error: err }
    }
  }

  // Called when user clicks share button in UI
  const handleShareButton = async () => {
    if (connectionToken) {
      // open modal and start waiting for connection/code
      setTokenDialogOpen(true)
      setTokenDialogLoading(true)
      setTokenDialogMessage('Buscando conexión...')
      setTokenDialogCode('')

      // first immediate fetch
      const res = await fetchConnectionByToken(connectionToken)
      if (res.error) {
        setTokenDialogMessage('Error buscando la conexión')
        setTokenDialogLoading(false)
        return
      }
      const row = res.data
      if (row) setTokenConnection(row)
      if (row && row.code) {
        setTokenDialogCode(row.code)
        setTokenDialogLoading(false)
        return
      }

      // if not found or no code yet, set waiting message and subscribe + poll
      setTokenDialogMessage('Esperando código de la conexión...')

      // poll as a fallback
      tokenPollRef.current = setInterval(async () => {
        const r = await fetchConnectionByToken(connectionToken)
        if (r.data) setTokenConnection(r.data)
        if (r.data && r.data.code) {
          setTokenDialogCode(r.data.code)
          setTokenDialogLoading(false)
          clearInterval(tokenPollRef.current)
          tokenPollRef.current = null
          // cleanup channel
          try { tokenChannelRef.current?.unsubscribe() } catch(e){}
        }
      }, 3000)

      // realtime subscription to updates for this token
      try {
        const chan = supabase
          .channel(`token-wait-${connectionToken}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'Connection', filter: `token=eq.${connectionToken}` }, (payload) => {
            const newRow = payload?.new
            if (newRow) setTokenConnection(newRow)
            if (newRow && newRow.code) {
              setTokenDialogCode(newRow.code)
              setTokenDialogLoading(false)
              if (tokenPollRef.current) { clearInterval(tokenPollRef.current); tokenPollRef.current = null }
              try { chan.unsubscribe() } catch (e) {}
            }
          })
          .subscribe()
        tokenChannelRef.current = chan
      } catch (e) {
        // ignore subscribe errors; polling will continue
      }
    } else {
      // no token: just start sharing normally
      startSharing()
    }
  }

  const stopSharing = () => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current)
    watchRef.current = null
    setSharing(false)
    setSnack({ open: true, message: 'Compartir ubicación detenido' })
  }

  // create a nicer pin icon via inline SVG data URI
  const svg = encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' width='40' height='56' viewBox='0 0 40 56'>
      <path d='M20 0C12 0 6 6 6 14c0 11 14 28 14 28s14-17 14-28c0-8-6-14-14-14z' fill='%231e88e5' />
      <circle cx='20' cy='14' r='5.5' fill='white' />
    </svg>
  `)
  const pinIcon = L.icon({
    iconUrl: `data:image/svg+xml;charset=utf-8,${svg}`,
    iconSize: [40, 56],
    iconAnchor: [20, 56]
  })

  return (
    <Box sx={{ width: '100%', overflow: 'hidden' }}>
      {/* Permission help overlay: muestra instrucciones cuando el permiso está denegado */}
      {showPermissionHelp && (
        <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1500 }}>
          <Paper elevation={6} sx={{ p: 2, minWidth: 300 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Permiso de ubicación denegado</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>Para compartir tu ubicación debes permitir el acceso al GPS en la configuración del navegador o del dispositivo.</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'flex-end' }}>
              <Button size="small" onClick={() => { setShowPermissionHelp(false); navigator.geolocation.getCurrentPosition(() => {}, () => {}, { enableHighAccuracy: true }) }}>Volver a solicitar</Button>
              <Button size="small" variant="contained" onClick={() => {
                // intentar abrir ajustes en Android vía intent (funciona en Chrome Android si el dispositivo lo permite)
                const isAndroid = /Android/i.test(navigator.userAgent)
                if (isAndroid) {
                  // Intent URL to open location settings
                  const intentUrl = 'intent:#Intent;action=android.settings.LOCATION_SOURCE_SETTINGS;end'
                  window.location.href = intentUrl
                } else {
                  // En otros dispositivos, abrir instrucciones o la página de configuración de contenido de Chrome (si funciona)
                  try {
                    window.open('chrome://settings/content/location')
                  } catch (e) {
                    // nothing
                  }
                }
              }}>Abrir ajustes</Button>
            </Box>
          </Paper>
        </Box>
      )}
      <Box sx={{ position: 'relative', height: { xs: `calc(100vh - 64px)`, md: `calc(100vh - 64px)` }, width: '100%' }}>
        {/* Map */}
        <MapContainer center={position ?? [0, 0]} zoom={position ? 15 : 2} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {position && (
            <>
              <Marker position={position} icon={pinIcon} ref={markerRef}>
                <Popup>
                  <Paper elevation={0} sx={{ p: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, minWidth: 240 }}>
                    <Box sx={{ bgcolor: '#e3f2fd', borderRadius: '50%', p: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8 2 5 5 5 9c0 7 7 13 7 13s7-6 7-13c0-4-3-7-7-7z" fill="#1565c0"/><circle cx="12" cy="9" r="2.5" fill="white"/></svg>
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Ubicación en tiempo real</Typography>
                    <Button size="small" variant="contained" onClick={sharing ? stopSharing : handleShareButton} sx={{ textTransform: 'none', mt: 0.5 }}>
                      {sharing ? 'Detener' : 'Compartir'}
                    </Button>
                    <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, textAlign: 'center' }}>Presiona el botón compartir y sigue los pasos</Typography>
                  </Paper>
                </Popup>
              </Marker>
              <Recenter position={position} />
              <AutoOpenPopup position={position} markerRef={markerRef} />
            </>
          )}
        </MapContainer>

        {/* share button is inside the Marker Popup to avoid leaflet context issues */}
      </Box>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))} message={snack.message} />

      {locating && (
        <Box sx={{ position: 'fixed', inset: 0, zIndex: 1400, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <Paper elevation={8} sx={{ p: 3, display: 'flex', gap: 2, alignItems: 'center', pointerEvents: 'auto', borderRadius: 2 }}>
            <CircularProgress />
            <Box>
              <Typography variant="h6">Localizando...</Typography>
              <Typography variant="body2" color="text.secondary">Obteniendo tu ubicación. Por favor permite el acceso al GPS.</Typography>
            </Box>
          </Paper>
        </Box>
      )}
      {/* Dialog que muestra progreso cuando hay token en la URL */}
      <Dialog open={tokenDialogOpen} onClose={() => {
        setTokenDialogOpen(false)
        setTokenDialogLoading(false)
        setTokenDialogMessage('')
        setTokenDialogCode('')
        if (tokenPollRef.current) { clearInterval(tokenPollRef.current); tokenPollRef.current = null }
        try { tokenChannelRef.current?.unsubscribe() } catch (e) {}
      }}>
        <DialogTitle>{tokenDialogLoading ? 'Generando enlace...' : (tokenDialogCode ? 'Enlace listo' : 'Esperando')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', minWidth: 300, p: 1 }}>
            {tokenDialogLoading ? <CircularProgress size={24} /> : null}
            <Box>
              <Typography variant="body2">{tokenDialogMessage || (tokenDialogCode ? 'Código disponible' : '')}</Typography>
              {tokenDialogCode ? (
                <Typography variant="h6" sx={{ mt: 1, fontFamily: 'monospace' }}>{tokenDialogCode}</Typography>
              ) : null}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            // close dialog and cleanup
            setTokenDialogOpen(false)
            setTokenDialogLoading(false)
            if (tokenPollRef.current) { clearInterval(tokenPollRef.current); tokenPollRef.current = null }
            try { tokenChannelRef.current?.unsubscribe() } catch (e) {}
          }}>Cerrar</Button>
          {tokenDialogCode ? (
            <Button variant="contained" onClick={() => {
              // Share via WhatsApp to the connection phone including current location
              const token = tokenConnection?.token ?? ''
              const base = typeof window !== 'undefined' ? window.location.origin : 'https://mi.dominio'
              const link = `${base}/?t=${encodeURIComponent(token)}`
              const connPhoneRaw = tokenConnection?.user_linked ?? ''
              const connDigits = (connPhoneRaw || '').replace(/\D/g, '')
              if (!connDigits) {
                setSnack({ open: true, message: 'Teléfono de la conexión no disponible' })
                return
              }

              const sendWithCoords = (lat, lng) => {
                const maps = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
                const text = `${link}%0AUbicación: ${maps}`
                const waUrl = `https://wa.me/${connDigits}?text=${encodeURIComponent(text)}`
                window.open(waUrl, '_blank')
              }

              // try to get current position for best accuracy; fallback to last known position
              if (navigator.geolocation && !sharing) {
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    sendWithCoords(pos.coords.latitude, pos.coords.longitude)
                    // close dialog and cleanup
                    setTokenDialogOpen(false)
                    setTokenDialogLoading(false)
                    if (tokenPollRef.current) { clearInterval(tokenPollRef.current); tokenPollRef.current = null }
                    try { tokenChannelRef.current?.unsubscribe() } catch (e) {}
                  },
                  (err) => {
                    // fallback: use last seen position state
                    if (position) {
                      sendWithCoords(position[0], position[1])
                    } else {
                      setSnack({ open: true, message: 'No se pudo obtener ubicación actual' })
                    }
                    setTokenDialogOpen(false)
                  },
                  { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
                )
              } else if (position) {
                sendWithCoords(position[0], position[1])
                setTokenDialogOpen(false)
              } else {
                setSnack({ open: true, message: 'Ubicación no disponible' })
              }
            }}>Compartir</Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </Box>
  )
}

