const express = require('express');
const path = require('path');
const fs = require('fs');
const authRoutes = require('./routes/auth'); // Asegúrate de que la ruta sea correcta

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Rutas de Autenticación
app.use('/api/auth', authRoutes);

// Servir archivos HTML limpios
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/dash', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dash.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 KAZUMA CORE ONLINE - Puerto ${PORT}`);
});