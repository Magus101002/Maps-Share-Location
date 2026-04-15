import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Container from '@mui/material/Container'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import NavBar from './components/NavBar'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NavBar />
        <MainRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}

function MainRoutes() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <Box
      component="main"
      className={isHome ? undefined : 'app-main'}
      sx={isHome ? { p: 0, width: '100%' } : { p: { xs: 2, md: 4 }, maxWidth: '1200px', mx: 'auto' }}
    >
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      </Routes>
    </Box>
  )
}

