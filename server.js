const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const app = express();

// Variable global para el Uptime
global.serverStart = Date.now();

// PUERTO: Ajustado al 880 para tu VPS
const PORT = process.env.PORT || 3000;
const dbPath = path.join(process.cwd(), 'data', 'database.json');

// --- IMPORTACIÓN DE RUTAS ---
const authRoutes = require('./routes/auth');
const statsRoutes = require('./routes/stats');
const adminRoutes = require('./routes/admin');
const tiktokRoutes = require('./routes/tiktok');
const tiktokSearchRoute = require('./routes/search/tiktok');
const instagramRoutes = require('./routes/instagramvid');
const facebookRoutes = require('./routes/facebookvid');
const twitterRoutes = require('./routes/twitter');
const qrcodeRoutes = require('./routes/qrcode');
const geminiRoutes = require('./routes/ai/gemini');
const { pinterestRoute } = require('./routes/pinterest');
const { pinterestSearchRoute } = require('./routes/search/pinterest');
const { sswebRoute } = require('./routes/tools/ssweb');

// --- MIDDLEWARES ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de Seguridad y Conteo de Requests
const securityMiddleware = (req, res, next) => {
    const isApiRoute = req.path.startsWith('/api/');
    // Rutas que no requieren API Key
    const isPublicApi = 
        req.path.startsWith('/api/auth') || 
        req.path.startsWith('/api/stats') || 
        req.path.startsWith('/api/admin') || 
        req.path === '/api';

    if (isApiRoute && !isPublicApi) {
        const apikey = req.query.apikey || req.headers['x-api-key'];
        if (!apikey) return res.status(403).json({ status: false, message: "API Key requerida" });

        try {
            const db = fs.readJsonSync(dbPath);
            const userIndex = db.users.findIndex(u => u.apikey === apikey);

            if (userIndex === -1) return res.status(403).json({ status: false, message: "API Key inválida" });

            const user = db.users[userIndex];
            const today = new Date().toISOString().split('T')[0];

            // Reset de límites diarios
            if (user.last_reset !== today) {
                user.requests_today = 0;
                user.last_reset = today;
            }

            if (user.requests_today >= (user.limit || 100)) {
                return res.status(429).json({ status: false, message: "Límite alcanzado" });
            }

            // Actualizar estadísticas del usuario
            user.requests_today += 1;
            user.total_requests += 1;
            user.success_requests = (user.success_requests || 0) + 1;

            fs.writeJsonSync(dbPath, db, { spaces: 4 });
        } catch (error) {
            return res.status(500).json({ status: false, message: "Error interno de DB" });
        }
    }
    next();
};

app.use(securityMiddleware);

// --- VINCULACIÓN DE RUTAS ---
app.use('/api/auth', authRoutes);
app.use('/api/stats', statsRoutes); // Esta es la que hace que el Dash funcione
app.use('/api/admin', adminRoutes);
app.use('/api/download/tiktok', tiktokRoutes);
app.use('/api/search/tiktok', tiktokSearchRoute);
app.use('/api/download/instagram', instagramRoutes);
app.use('/api/download/facebook', facebookRoutes);
app.use('/api/download/twitter', twitterRoutes);
app.use('/api/tools/qr', qrcodeRoutes);

// Configuración especial para Gemini (si es un array de rutas)
if (Array.isArray(geminiRoutes)) {
    const geminiGet = geminiRoutes.find(r => r.metode === "GET");
    if (geminiGet) {
        app.get('/api/ai/gemini', async (req, res) => {
            try {
                const result = await geminiGet.run({ req });
                res.json(result);
            } catch (err) {
                res.status(500).json({ status: false, error: err.message });
            }
        });
    }
}

// Rutas directas de ejecución
app.use('/api/download/pinterest', (req, res) => pinterestRoute.run(req, res));
app.use('/api/search/pinterest', (req, res) => pinterestSearchRoute.run(req, res));
app.use('/api/tools/ssweb', (req, res) => sswebRoute.run(req, res));

// --- ARCHIVOS ESTÁTICOS ---
app.use('/temp', express.static(path.join(process.cwd(), 'public', 'temp')));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// Manejo de navegación del Dashboard
app.get(['/login', '/register', '/profile', '/dash', '/admin'], (req, res) => {
    const page = req.path.split('/')[1];
    const filePath = path.join(__dirname, 'public', `${page}.html`);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// 404 Final
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

// --- INICIO DEL SERVIDOR ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ┌──────────────────────────────────────────┐
    │          KAZUMA API - ONLINE             │
    ├──────────────────────────────────────────┤
    │  PUERTO: ${PORT}                             │
    │  MODO: Producción                        │
    │  SISTEMA: Dashboard Activo               │
    └──────────────────────────────────────────┘
    `);
});