import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'

export default function Dashboard() {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <Container maxWidth="md" sx={{ mt: 8 }}>
      <Stack spacing={2}>
        <Typography variant="h4">Dashboard</Typography>
        <Typography>Bienvenido, {user?.email ?? 'usuario'}</Typography>
        <Button variant="contained" color="secondary" onClick={handleLogout}>Cerrar sesión</Button>
      </Stack>
    </Container>
  )
}

