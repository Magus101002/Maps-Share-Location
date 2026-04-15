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

  useEffect(() => {
    // Try to get current position once
    if (!navigator.geolocation) {
      setSnack({ open: true, message: 'Geolocation no soportado por este navegador.' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude])
        setLocating(false)
      },
      (err) => {
        setSnack({ open: true, message: `Error geolocalización: ${err.message}` })
        setLocating(false)
      },
      { enableHighAccuracy: true }
    )
  }, [])

  // Auto open popup is handled inside MapContainer by AutoOpenPopup component

  const startSharing = () => {
    if (!navigator.geolocation) return setSnack({ open: true, message: 'Geolocation no disponible' })
    if (sharing) return
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
                    <Button size="small" variant="contained" onClick={sharing ? stopSharing : startSharing} sx={{ textTransform: 'none', mt: 0.5 }}>
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
    </Box>
  )
}

