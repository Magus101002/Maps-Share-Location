import React from 'react'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'

export default function ShareLinkBox({ createdConnection, editing, userPhoneLocal, setSnack }) {
  const token = createdConnection?.token ?? editing?.token ?? ''
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://mi.dominio'
  const link = `${base}/?t=${encodeURIComponent(token)}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setSnack?.({ open: true, message: 'Enlace copiado al portapapeles' })
    } catch (e) {
      setSnack?.({ open: true, message: 'No se pudo copiar el enlace' })
    }
  }

  const handleWhatsApp = () => {
    const connPhoneRaw = createdConnection?.user_linked ?? editing?.user_linked ?? ''
    const connDigits = (connPhoneRaw || '').replace(/\D/g, '')
    const waUrl = `https://wa.me/${connDigits}?text=${encodeURIComponent(link)}`
    window.open(waUrl, '_blank')
  }

  return (
    <Box sx={{ mt: 0.5 }}>
      <Paper variant="outlined" sx={{ p: 1, fontFamily: 'monospace', wordBreak: 'break-all', bgcolor: '#f5f5f5' }}>{link}</Paper>
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <Button size="small" variant="contained" color="primary" startIcon={<ContentCopyIcon />} onClick={handleCopy} sx={{ textTransform: 'none' }}>Copiar enlace</Button>
        <Button size="small" variant="contained" color="success" startIcon={<WhatsAppIcon />} onClick={handleWhatsApp} sx={{ textTransform: 'none' }}>Enviar por WhatsApp</Button>
      </Box>
    </Box>
  )
}

