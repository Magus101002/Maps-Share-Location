import React from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import HomeIcon from "@mui/icons-material/Home";

export default function App() {
  return (
    <Container maxWidth="sm" style={{ marginTop: 48 }}>
      <Stack spacing={2} alignItems="center">
        <Typography variant="h4">Hola — Bun + React + MUI</Typography>
        <Typography variant="body1">Proyecto listo para desarrollo y deploy en Vercel.</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" color="primary">Acción</Button>
          <IconButton color="primary" aria-label="home">
            <HomeIcon />
          </IconButton>
        </Stack>
      </Stack>
    </Container>
  );
}

