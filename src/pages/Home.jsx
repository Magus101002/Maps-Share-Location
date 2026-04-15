import React from 'react'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { Link as RouterLink } from 'react-router-dom'

export default function Home() {
  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Stack spacing={2} alignItems="center">
        <Typography variant="h4">Inicio</Typography>
        <Typography>Bienvenido a la app. Accede al dashboard protegido.</Typography>
        <Button component={RouterLink} to="/login" variant="contained">Ir a login</Button>
      </Stack>
    </Container>
  )
}

