import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Container from '@mui/material/Container'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await login(email, password)
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Stack spacing={2} component="form" onSubmit={handleSubmit}>
        <Typography variant="h5">Iniciar sesión</Typography>
        <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <TextField label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <Typography color="error">{error}</Typography>}
        <Button type="submit" variant="contained" disabled={loading}>{loading ? 'Ingresando...' : 'Entrar'}</Button>
      </Stack>
    </Container>
  )
}

