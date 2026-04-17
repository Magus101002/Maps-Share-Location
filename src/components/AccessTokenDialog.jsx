import React from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import Alert from '@mui/material/Alert'
import ContentPasteIcon from '@mui/icons-material/ContentPaste'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'

export default function AccessTokenDialog({
  open,
  onClose,
  loading,
  message,
  serverCode,
  input,
  setInput,
  onVerify,
  verifyLoading,
  waitingApproval,
  tokenConnection,
  onShare,
  position,
  isNarrow
}) {
  // helper to render server code boxes (6 digits)
  const renderCodeBoxes = (code) => {
    // allow alphanumeric codes (letters + numbers), show up to 6 chars
    const raw = (code || '').toString().replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase()
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
  }

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      // accept letters and numbers, strip other chars, uppercase
      const v = (text || '').toString().replace(/[^A-Za-z0-9]/g, '').slice(0,6).toUpperCase()
      setInput(v)
    } catch (e) {
      // ignore
    }
  }

  const copyServerCode = () => {
    try {
      const text = (serverCode || '').toString().replace(/[^A-Za-z0-9]/g, '').slice(0,6)
      navigator.clipboard.writeText(text)
    } catch (e) {}
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { m: { xs: 1, sm: 2 }, width: 'auto', maxWidth: 520 } }}>
      <DialogTitle>{loading ? 'Generando enlace...' : (serverCode ? 'Enlace listo' : 'Esperando')}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'grid', gap: 1, width: '100%', p: 1, boxSizing: 'border-box' }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {loading ? (
              <Box sx={{ width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress size={24} /></Box>
            ) : null}
            <Box>
              <Typography variant="body2">{message || (serverCode ? 'Código disponible' : '')}</Typography>
              {serverCode ? (
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',gap: 1 }}>
                  {renderCodeBoxes(serverCode)}
                </Box>
              ) : null}

              {!serverCode && tokenConnection ? (
                <Box sx={{ mt: 1, display: 'grid', gap: 1 }}>
                  <Typography variant="body2">Hemos generado un código de vinculación y te lo hemos enviado a través de WhatsApp. Pégalo aquí debajo y pulsa Verificar.</Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                      label="Código"
                      value={input}
                      onChange={(e) => setInput((e.target.value || '').toString().replace(/[^A-Za-z0-9]/g, '').slice(0,6).toUpperCase())}
                      inputProps={{ maxLength: 6 }}
                      size="small"
                      fullWidth
                    />
                    <Button variant="outlined" onClick={pasteFromClipboard} startIcon={<ContentPasteIcon />} sx={{ textTransform: 'none', whiteSpace: 'nowrap' }} />
                  </Box>
                  <Box>
                    <Button variant="contained" onClick={onVerify} disabled={verifyLoading} fullWidth sx={{ textTransform: 'none' }}>
                      {verifyLoading ? <CircularProgress size={18} /> : 'Verificar'}
                    </Button>
                  </Box>
                </Box>
              ) : null}

            </Box>
          </Box>

          {serverCode ? (
            <Box sx={{ mt: 1, display: 'grid', gap: 1 }}>
              {/*<List dense sx={{ p: 0, mt: 0 }}>*/}
              {/*  {['Copia el código mostrado arriba.', 'Abre la notificación de WhatsApp y pega el código.', 'Alternativamente, abre WhatsApp y presiona "Dispositos Vinculados" en el menu de puntos.', 'Pega el código.'].map((it, i) => (*/}
              {/*    <ListItem key={i} sx={{ py: 0.5 }}>*/}
              {/*      <ListItemIcon sx={{ minWidth: 28 }}><FiberManualRecordIcon sx={{ fontSize: 12 }} /></ListItemIcon>*/}
              {/*      <ListItemText primary={it} primaryTypographyProps={{ variant: 'body2' }} />*/}
              {/*    </ListItem>*/}
              {/*  ))}*/}
              {/*</List>*/}

              {verifyLoading ? (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
                  <Box sx={{ width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress size={20} /></Box>
                  <Typography variant="body2">Código enviado. Esperando que el propietario confirme la solicitud...</Typography>
                </Box>
              ) : waitingApproval ? (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
                  <Typography variant="body2">Solicitud confirmada. Esperando aprobación final...</Typography>
                </Box>
              ) : !(tokenConnection?.is_approved) ? (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
                  <Typography variant="body2">Esperando por la vinculación...</Typography>
                </Box>
              ) : (
                <Alert severity="success" sx={{ mt: 1 }}>Vinculacion realizada existosamente</Alert>
              )}

            </Box>
          ) : null}

        </Box>
      </DialogContent>
      <DialogActions sx={{ flexDirection: isNarrow ? 'column' : 'row', gap: 1 }}>
        <Button onClick={onClose} sx={{ width: 'auto' }}>Cerrar</Button>
        {serverCode && tokenConnection?.is_approved ? (
          <Button variant="contained" onClick={onShare} sx={{ width: isNarrow ? '100%' : 'auto' }}>Compartir</Button>
        ) : null}
      </DialogActions>
    </Dialog>
  )
}

