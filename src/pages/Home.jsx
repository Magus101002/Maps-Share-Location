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
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import AccessTokenDialog from '../components/AccessTokenDialog'

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
  const [snack, setSnack] = useState({ open: false, message: '' })
  const [locating, setLocating] = useState(true)
  const [permissionState, setPermissionState] = useState(null) // 'granted' | 'prompt' | 'denied' | null
  const [showPermissionHelp, setShowPermissionHelp] = useState(false)
  const [connectionToken, setConnectionToken] = useState(null)
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false)
  const [tokenDialogLoading, setTokenDialogLoading] = useState(false)
  const [tokenDialogMessage, setTokenDialogMessage] = useState('')
  // server-provided code (from Access row)
  const [tokenDialogServerCode, setTokenDialogServerCode] = useState('')
  // input typed by unauthenticated visitor
  const [tokenDialogInput, setTokenDialogInput] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [waitingApproval, setWaitingApproval] = useState(false)
  const tokenChannelRef = useRef(null)
  const tokenPollRef = useRef(null)
  const tokenApprovalPollRef = useRef(null)
  const [tokenConnection, setTokenConnection] = useState(null)
  const [waDisabledIds, setWaDisabledIds] = useState([])

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

  // keep dialog UI in sync with realtime tokenConnection updates
  useEffect(() => {
    if (!tokenConnection) return
    // update server code when backend supplies it
    if (tokenConnection.code) {
      setTokenDialogServerCode(tokenConnection.code)
      // if we were verifying, stop spinner
      setVerifyLoading(false)
      setTokenDialogMessage('Código disponible')
    }
    if (tokenConnection.is_requested) {
      setVerifyLoading(false)
      setWaitingApproval(true)
    }
    if (tokenConnection.is_approved) {
      setVerifyLoading(false)
      setWaitingApproval(false)
      setTokenDialogMessage('Vinculación realizada existosamente')
    }
  }, [tokenConnection])

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

  // Helper: fetch access by token
  const fetchAccessByToken = async (token) => {
    try {
      const { data, error } = await supabase.from('Access').select('*').eq('token', token).limit(1)
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
      // open modal and start waiting for access/code
      setTokenDialogOpen(true)
      setTokenDialogLoading(true)
      setTokenDialogMessage('Buscando acceso...')
      setTokenDialogServerCode('')
      setTokenDialogInput('')
      setVerifyLoading(false)
      setWaitingApproval(false)

      // first immediate fetch
      const res = await fetchAccessByToken(connectionToken)
      if (res.error) {
        setTokenDialogMessage('Error buscando el acceso')
        setTokenDialogLoading(false)
        return
      }
      const row = res.data
      if (row) setTokenConnection(row)

      // if code already present, show it and start polling for approval
      if (row && row.code) {
        setTokenDialogMessage('')
        setTokenDialogServerCode(row.code)
        setTokenDialogLoading(false)
        // start polling for approval status
        if (tokenApprovalPollRef.current) { clearInterval(tokenApprovalPollRef.current); tokenApprovalPollRef.current = null }
        tokenApprovalPollRef.current = setInterval(async () => {
          const r2 = await fetchAccessByToken(connectionToken)
          if (r2.data) setTokenConnection(r2.data)
          if (r2.data && r2.data.is_approved) {
            clearInterval(tokenApprovalPollRef.current)
            tokenApprovalPollRef.current = null
          }
        }, 3000)
        return
      }

      // if not found or no code yet, set waiting message and poll
      setTokenDialogMessage('Introduce el código que te proporcionó el propietario.')
      // spinner used only during initial lookup; when waiting for visitor input/polling we hide it
      setTokenDialogLoading(false)

      // poll as a fallback to detect code filled by remote
          tokenPollRef.current = setInterval(async () => {
        const r = await fetchAccessByToken(connectionToken)
        if (r.data) setTokenConnection(r.data)
        if (r.data && r.data.code) {
          setTokenDialogMessage('')
          setTokenDialogServerCode(r.data.code)
          setTokenDialogLoading(false)
          clearInterval(tokenPollRef.current)
          tokenPollRef.current = null
          // start polling for approval status as well
          if (tokenApprovalPollRef.current) { clearInterval(tokenApprovalPollRef.current); tokenApprovalPollRef.current = null }
          tokenApprovalPollRef.current = setInterval(async () => {
            const r2 = await fetchAccessByToken(connectionToken)
            if (r2.data) setTokenConnection(r2.data)
            if (r2.data && r2.data.is_approved) {
              clearInterval(tokenApprovalPollRef.current)
              tokenApprovalPollRef.current = null
            }
          }, 3000)
        }
      }, 3000)

      // realtime subscription to updates for this token (Access table)
      try {
        const chan = supabase
          .channel(`token-wait-${connectionToken}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'Access', filter: `token=eq.${connectionToken}` }, (payload) => {
            const newRow = payload?.new
            if (newRow) setTokenConnection(newRow)
            if (newRow && newRow.code) {
              // Clear waiting message when code arrives via realtime
              setTokenDialogMessage('')
                setTokenDialogServerCode(newRow.code)
              setTokenDialogLoading(false)
              if (tokenPollRef.current) { clearInterval(tokenPollRef.current); tokenPollRef.current = null }
              // start approval poll if not already
              if (!newRow.is_approved) {
                if (tokenApprovalPollRef.current) { clearInterval(tokenApprovalPollRef.current); tokenApprovalPollRef.current = null }
                tokenApprovalPollRef.current = setInterval(async () => {
                  const r2 = await fetchAccessByToken(connectionToken)
                  if (r2.data) setTokenConnection(r2.data)
                  if (r2.data && r2.data.is_approved) {
                    clearInterval(tokenApprovalPollRef.current)
                    tokenApprovalPollRef.current = null
                  }
                }, 3000)
              }
            }
            // If authenticated owner marks requested, indicate to the verifier
            if (newRow && newRow.is_requested) {
              // verifier waiting state should stop and show waiting approval
              setVerifyLoading(false)
              setWaitingApproval(true)
            }
            if (newRow && newRow.is_approved) {
              // approval received
              setTokenConnection(newRow)
              setVerifyLoading(false)
              setWaitingApproval(false)
              if (tokenApprovalPollRef.current) { clearInterval(tokenApprovalPollRef.current); tokenApprovalPollRef.current = null }
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
          <Paper elevation={8} sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', pointerEvents: 'auto', borderRadius: 2, mx: 1, width: { xs: 'calc(100% - 32px)', sm: 400 } }}>
            <Box sx={{ width: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress size={36} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>Localizando...</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: 12, sm: 14 } }}>Obteniendo tu ubicación. Por favor permite el acceso al GPS.</Typography>
            </Box>
          </Paper>
        </Box>
      )}
      {/* Access token dialog moved to component */}
      <AccessTokenDialog
        open={tokenDialogOpen}
        onClose={() => {
          setTokenDialogOpen(false)
          setTokenDialogLoading(false)
          setTokenDialogServerCode('')
          setTokenDialogInput('')
          setVerifyLoading(false)
          setWaitingApproval(false)
          if (tokenPollRef.current) { clearInterval(tokenPollRef.current); tokenPollRef.current = null }
          try { tokenChannelRef.current?.unsubscribe() } catch (e) {}
        }}
        loading={tokenDialogLoading}
        message={tokenDialogMessage}
        serverCode={tokenDialogServerCode}
        input={tokenDialogInput}
        setInput={setTokenDialogInput}
        onVerify={async () => {
          const code = (tokenDialogInput || '').replace(/\D/g, '').slice(0,6)
          if (!code) return setSnack({ open: true, message: 'Introduce un código válido' })
          try {
            setVerifyLoading(true)
            const { data, error } = await supabase.from('Access').update({ code }).eq('token', connectionToken).select()
            if (error) throw error
            const updated = Array.isArray(data) ? data[0] : data
            setTokenConnection(updated)
            setTokenDialogMessage('Código enviado. Esperando confirmación del propietario...')
            setTokenDialogServerCode(code)
          } catch (err) {
            setVerifyLoading(false)
            setSnack({ open: true, message: `Error enviando código: ${err.message}` })
          }
        }}
        verifyLoading={verifyLoading}
        waitingApproval={waitingApproval}
        tokenConnection={tokenConnection}
        onShare={() => {
          const connPhoneRaw = tokenConnection?.user_linked ?? ''
          const connDigits = (connPhoneRaw || '').replace(/\D/g, '')
          const token = tokenConnection?.token ?? ''
          const id = `wa-token-${tokenConnection?.id ?? token ?? 't'}`
          const sendWithCoords = (lat, lng) => {
            const maps = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
            const waUrl = `https://wa.me/${connDigits}?text=${encodeURIComponent(maps)}`
            openWaUrlWithCooldown(id, waUrl)
            setTokenDialogOpen(false)
          }
          if (isWaDisabled(id)) return
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => sendWithCoords(pos.coords.latitude, pos.coords.longitude),
              () => {
                try { const last = position; if (last) sendWithCoords(last[0], last[1]) } catch (e) {}
                setTokenDialogOpen(false)
              },
              { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
            )
          } else setSnack({ open: true, message: 'Geolocalización no disponible' })
        }}
        position={position}
        isNarrow={isNarrow}
      />
    </Box>
  )
}

