import React from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import Alert from '@mui/material/Alert'

const INSTRUCTIONS = [
  'Copia el código mostrado arriba.',
  'Abre la notificación de WhatsApp y pega el código.',
  'Alternativamente, abre WhatsApp y presiona "Dispositivos Vinculados" en el menú de puntos.',
  'Pega el código.',
]

export default function ConnectionTokenDialog({
  open,
  onClose,
  loading,
  code,
  tokenConnection,
  onShare,
  isNarrow,
  waDisabled,
  onCopy,
}) {
  const renderCodeBoxes = (rawCode) => {
    const raw = (rawCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    const chars = raw.split('')
    const elems = []
    for (let i = 0; i < chars.length; i++) {
      if (i === 4) elems.push(<Box key="dash" sx={{ px: 0.5, fontWeight: 700, fontSize: { xs: 14, sm: 18 } }}>-</Box>)
      elems.push(
        <Box
          key={i}
          sx={{
            minWidth: { xs: 20, sm: 36 },
            height: { xs: 28, sm: 40 },
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'monospace',
            fontWeight: 700,
            bgcolor: 'background.paper',
            px: 0.5,
            fontSize: { xs: 14, sm: 18 },
          }}
        >
          {chars[i]}
        </Box>
      )
    }
    return (
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', px: 1 }}>
        {elems}
      </Box>
    )
  }

  const isApproved = Boolean(tokenConnection?.is_approved)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { m: { xs: 1, sm: 2 }, width: 'auto', maxWidth: 480 } }}
    >
      <DialogTitle>
        {loading ? 'Buscando conexión...' : code ? 'Enlace listo' : 'Esperando'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'grid', gap: 1.5, p: { xs: 0, sm: 1 } }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {loading && (
              <Box sx={{ width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress size={24} />
              </Box>
            )}
            <Box sx={{ flex: 1 }}>
              {!loading && !code && (
                <Typography variant="body2" color="text.secondary">
                  Esperando código de la conexión...
                </Typography>
              )}
              {code && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center', mt: 1 }}>
                  {renderCodeBoxes(code)}
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 0.5 }}>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<ContentCopyIcon />}
                      onClick={onCopy}
                      sx={{ textTransform: 'none' }}
                    >
                      Copiar al portapapeles
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>

          {code && (
            <Box sx={{ display: 'grid', gap: 1 }}>
              <List dense sx={{ p: 0 }}>
                {INSTRUCTIONS.map((text, i) => (
                  <ListItem key={i} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <FiberManualRecordIcon sx={{ fontSize: 12 }} />
                    </ListItemIcon>
                    <ListItemText primary={text} primaryTypographyProps={{ variant: 'body2' }} />
                  </ListItem>
                ))}
              </List>

              {!isApproved ? (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2">Esperando por la vinculación...</Typography>
                </Box>
              ) : (
                <Alert severity="success" sx={{ mt: 1 }}>Vinculación realizada exitosamente</Alert>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ flexDirection: isNarrow ? 'column' : 'row', gap: 1 }}>
        <Button onClick={onClose} sx={{ width: 'auto' }}>Cerrar</Button>
        {code && isApproved && (
          <Button
            variant="contained"
            onClick={onShare}
            disabled={waDisabled}
            sx={{ width: isNarrow ? '100%' : 'auto' }}
          >
            Compartir
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
