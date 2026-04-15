import React from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import MenuIcon from '@mui/icons-material/Menu'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const baseLinks = [
  { label: 'Inicio', to: '/' }
]

export default function NavBar() {
  const [anchorEl, setAnchorEl] = React.useState(null)
  const { user, logout } = useAuth()

  const links = React.useMemo(() => {
    if (user) return [...baseLinks, { label: 'Dashboard', to: '/dashboard' }]
    return [...baseLinks, { label: 'Login', to: '/login' }]
  }, [user])

  const handleOpen = (e) => setAnchorEl(e.currentTarget)
  const handleClose = () => setAnchorEl(null)

  const handleLogout = async () => {
    await logout()
    handleClose()
  }

  return (
    <AppBar position="sticky" elevation={3} color="primary">
      <Toolbar>
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          sx={{ color: 'inherit', textDecoration: 'none', fontWeight: 700 }}
        >
          MyApp
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        {/* Desktop buttons */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
          {links.map((l) => (
            <Button key={l.to} color="inherit" component={RouterLink} to={l.to}>
              {l.label}
            </Button>
          ))}
          {user && (
            <Button color="inherit" onClick={handleLogout}>Cerrar sesión</Button>
          )}
        </Box>

        {/* Mobile menu */}
        <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
          <IconButton color="inherit" edge="end" onClick={handleOpen} aria-label="menu">
            <MenuIcon />
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose} keepMounted>
            {links.map((l) => (
              <MenuItem key={l.to} component={RouterLink} to={l.to} onClick={handleClose}>
                {l.label}
              </MenuItem>
            ))}
            {user && <MenuItem onClick={handleLogout}>Cerrar sesión</MenuItem>}
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  )
}

