import React from 'react'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction'
import IconButton from '@mui/material/IconButton'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'

export default function ConnectionList({ connections, isSm, onEdit, onDelete }) {
  if (isSm) {
    return (
      <List>
        {connections.map((row) => (
          <Paper key={row.id} variant="outlined" sx={{ mb: 1, p: 1 }}>
            <ListItem>
              <ListItemText primary={`${row.user_linked} — ${row.code ?? ''}`} secondary={`Creado: ${new Date(row.created_at).toLocaleString()}`} />
              <ListItemSecondaryAction>
                <IconButton edge="end" size="small" onClick={() => onEdit(row)} aria-label="editar"><EditIcon /></IconButton>
                <IconButton edge="end" size="small" onClick={() => onDelete(row)} aria-label="eliminar"><DeleteIcon /></IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          </Paper>
        ))}
      </List>
    )
  }

  return (
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
      <Table sx={{ minWidth: 650 }}>
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
                <IconButton size="small" onClick={() => onEdit(row)} aria-label="editar"><EditIcon /></IconButton>
                <IconButton size="small" onClick={() => onDelete(row)} aria-label="eliminar"><DeleteIcon /></IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

