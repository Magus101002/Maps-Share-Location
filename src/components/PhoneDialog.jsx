import React from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

export default function PhoneDialog({ open, onClose, phoneForm, setPhoneForm, onConfirm, disabled }) {
  return (
    <Dialog open={open} onClose={onClose}>
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
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={onConfirm} disabled={disabled}>Confirmar</Button>
      </DialogActions>
    </Dialog>
  )
}

