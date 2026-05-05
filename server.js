const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const app = express();

global.serverStart = Date.now();

const PORT = process.env.PORT || 3032;
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

// --- MIDDLEWARES BASE ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- LÓGICA DEL BARRENDERO (Limpieza de cuentas inactivas) ---
setInterval(() => {
    try {
        if (!fs.existsSync(dbPath)) return;
        const db = fs.readJsonSync(dbPath);
        const ahora = new Date();
        const inicial = db.users.length;

        db.users = db.users.filter(user => {
            if (user.verified) return true;
            if (!user.codeExpires) return true; 
            return ahora < new Date(user.codeExpires);
        });

        if (db.users.length !== inicial) {
            fs.writeJsonSync(dbPath, db, { spaces: 4 });
            console.log(`[!] Barrendero: Se eliminaron ${inicial - db.users.length} cuentas no verificadas.`);
        }
    } catch (error) {
        console.error("Error Barrendero:", error.message);
    }
}, 15 * 60 * 1000); // Cada 15 minutos

// --- MIDDLEWARE DE SEGURIDAD (Optimizado para evitar crashes) ---
const securityMiddleware = (req, res, next) => {
    const isApiRoute = req.path.startsWith('/api/');
    
    // Rutas públicas que NO requieren API Key (Ajustado para auth)
    const isPublicApi = 
        req.path.startsWith('/api/auth') || 
        req.path.startsWith('/api/stats') || 
        req.path.startsWith('/api/admin') || 
        req.path === '/api';

    if (isApiRoute && !isPublicApi) {
        const apikey = req.query.apikey || req.headers['x-api-key'];
        
        if (!apikey) return res.status(403).json({ status: false, message: "API Key requerida" });
        
        try {
            // Usamos Sync para evitar colisiones durante escrituras de registro
            const db = fs.readJsonSync(dbPath);
            const userIndex = db.users.findIndex(u => u.apikey === apikey);
            
            if (userIndex === -1) return res.status(403).json({ status: false, message: "API Key inválida" });
            
            const user = db.users[userIndex];

            if (!user.verified) {
                return res.status(403).json({ status: false, message: "Cuenta no verificada." });
            }

            // Reset diario de límites
            const today = new Date().toISOString().split('T')[0];
            if (user.last_reset !== today) {
                user.requests_today = 0;
                user.last_reset = today;
            }

            if (user.requests_today >= user.limit) {
                return res.status(429).json({ status: false, message: "Límite alcanzado" });
            }

            // Actualización de contadores
            user.requests_today += 1;
            user.total_requests += 1;
            
            fs.writeJsonSync(dbPath, db, { spaces: 4 });
        } catch (error) {
            return res.status(500).json({ status: false, message: "Error interno de DB" });
        }
    }
    next();
};

app.use(securityMiddleware);

// --- SERVIR ARCHIVOS ESTÁTICOS ---
app.use('/temp', express.static(path.join(process.cwd(), 'public', 'temp')));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// --- RUTAS DE LA API ---
app.use('/api/auth', authRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/download/tiktok', tiktokRoutes);
app.use('/api/search/tiktok', tiktokSearchRoute);
app.use('/api/download/instagram', instagramRoutes);
app.use('/api/download/facebook', facebookRoutes);
app.use('/api/download/twitter', twitterRoutes);
app.use('/api/tools/qr', qrcodeRoutes);

// Lógica para Gemini
const geminiGet = geminiRoutes.find(r => r.metode === "GET");
if (geminiGet) {
    app.get('/api/ai/gemini', (req, res) => {
        geminiGet.run({ req }).then(result => res.json(result)).catch(err => res.status(500).json({ status: false, error: err.message }));
    });
}

// Otras herramientas
app.use('/api/download/pinterest', (req, res) => pinterestRoute.run(req, res));
app.use('/api/search/pinterest', (req, res) => pinterestSearchRoute.run(req, res));
app.use('/api/tools/ssweb', (req, res) => sswebRoute.run(req, res));

// --- MANEJO DE RUTAS LÍMPIAS ---
app.get(['/login', '/register', '/profile', '/dash', '/verify', '/admin'], (req, res) => {
    const page = req.path.split('/')[1];
    res.sendFile(path.join(__dirname, 'public', `${page}.html`));
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// 404
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

// --- INICIO ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`|  API KAZUMA ONLINE - PUERTO ${PORT}  |`);
});
