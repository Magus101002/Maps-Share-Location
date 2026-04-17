import React from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AccessTimeIcon from '@mui/icons-material/AccessTime'

export default function ConnectionList({ connections = [], onEdit, onDelete }) {
  // Responsive grid: xs=12 (1 per row on extra small), sm=6 (2 per row), md=3 (4 per row)
  return (
    <Grid container spacing={2}>
      {connections.map((row) => (
        <Grid key={row.id} item xs={12} sm={6} md={3}>
          <Paper elevation={3} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, wordBreak: 'break-word' }}>{row.user_linked || '—'}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{row.code ? `Código: ${String(row.code).replace(/\D/g,'').slice(0,6)}` : 'Sin código'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">{row.created_at ? new Date(row.created_at).toLocaleString() : ''}</Typography>
              </Box>
              <Box>
                <IconButton size="small" onClick={() => onEdit(row)} aria-label="editar"><EditIcon /></IconButton>
                <IconButton size="small" onClick={() => onDelete(row)} aria-label="eliminar"><DeleteIcon /></IconButton>
              </Box>
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  )
}

