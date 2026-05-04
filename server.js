const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const app = express();

global.serverStart = Date.now();

const PORT = process.env.PORT || 3032;
// Usamos path.join para asegurar compatibilidad en Linux/Hyden
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

// --- LÓGICA DEL BARRENDERO (Limpieza de cuentas no verificadas) ---
setInterval(async () => {
    try {
        if (!await fs.exists(dbPath)) return;
        const db = await fs.readJson(dbPath);
        const ahora = new Date();
        const inicial = db.users.length;

        db.users = db.users.filter(user => {
            // Mantener si está verificado
            if (user.verified) return true;
            // Si no tiene fecha de expiración, por seguridad lo dejamos
            if (!user.codeExpires) return true; 
            // Eliminar si el tiempo actual superó la expiración
            return ahora < new Date(user.codeExpires);
        });

        if (db.users.length !== inicial) {
            await fs.writeJson(dbPath, db, { spaces: 4 });
            console.log(`[!] Barrendero: Se eliminaron ${inicial - db.users.length} cuentas inactivas.`);
        }
    } catch (error) {
        console.error("Error Barrendero:", error.message);
    }
}, 10 * 60 * 1000); // Cada 10 minutos

// --- MIDDLEWARE DE SEGURIDAD (API KEYS) ---
const securityMiddleware = async (req, res, next) => {
    const isApiRoute = req.path.startsWith('/api/');
    // Rutas que NO requieren API Key
    const isPublicApi = 
        req.path.includes('/auth') || 
        req.path.includes('/stats') || 
        req.path.includes('/admin') || 
        req.path === '/api' || 
        req.path.startsWith('/temp/');

    if (isApiRoute && !isPublicApi) {
        const apikey = req.query.apikey || req.headers['x-api-key'];
        
        if (!apikey) return res.status(403).json({ status: false, message: "API Key requerida" });
        
        try {
            const db = await fs.readJson(dbPath);
            const userIndex = db.users.findIndex(u => u.apikey === apikey);
            
            if (userIndex === -1) return res.status(403).json({ status: false, message: "API Key inválida" });
            
            const user = db.users[userIndex];

            if (user.verified === false) {
                return res.status(403).json({ status: false, message: "Cuenta no verificada. Revisa tu correo." });
            }

            // Reset diario de límites
            const today = new Date().toISOString().split('T')[0];
            if (user.last_reset !== today) {
                user.requests_today = 0;
                user.last_reset = today;
            }

            if (user.requests_today >= user.limit) {
                return res.status(429).json({ status: false, message: "Límite diario alcanzado" });
            }

            // Incrementar contadores
            user.requests_today += 1;
            user.total_requests += 1;
            
            await fs.writeJson(dbPath, db, { spaces: 4 });
        } catch (error) {
            return res.status(500).json({ status: false, message: "Error en base de datos" });
        }
    }
    next();
};

app.use(securityMiddleware);

// --- SERVIR ARCHIVOS ESTÁTICOS ---
app.use('/temp', express.static(path.join(process.cwd(), 'public', 'temp')));
// Importante: Servir 'public' primero para que los .html se encuentren
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

// Lógica especial para Gemini (Módulos dinámicos)
const geminiGet = geminiRoutes.find(r => r.metode === "GET");
const geminiPost = geminiRoutes.find(r => r.metode === "POST");

if (geminiGet) {
    app.get('/api/ai/gemini', (req, res) => {
        geminiGet.run({ req }).then(result => res.json(result)).catch(err => res.status(500).json({ status: false, error: err.message }));
    });
}

if (geminiPost) {
    app.post('/api/ai/gemini', (req, res) => {
        const guf = async (request, field) => {
            if (request.file) return { file: request.file.buffer, name: request.file.originalname, isValid: true };
            return { file: null, isValid: false };
        };
        geminiPost.run({ req, guf }).then(result => res.json(result)).catch(err => res.status(500).json({ status: false, error: err.message }));
    });
}

// Rutas de Pinterest y herramientas adicionales
app.use('/api/download/pinterest', (req, res) => pinterestRoute.run(req, res));
app.use('/api/search/pinterest', (req, res) => pinterestSearchRoute.run(req, res));
app.use('/api/tools/ssweb', (req, res) => sswebRoute.run(req, res));

// --- DOCUMENTACIÓN Y PÁGINAS ---
app.get('/api', (req, res) => {
    res.json({
        status: true,
        message: 'Api Kazuma activa',
        creator: 'Félix Ofc',
        serverStart: global.serverStart,
        endpoints: {
            gemini: '/api/ai/gemini?text=QUERY&cookie=COOKIE&apikey=TU_KEY',
            tiktok: '/api/download/tiktok?url=URL&apikey=TU_KEY',
            tiktok_search: '/api/search/tiktok?query=TEXTO&apikey=TU_KEY',
            instagram: '/api/download/instagram?url=URL&apikey=TU_KEY',
            facebook: '/api/download/facebook?url=URL&apikey=TU_KEY',
            twitter: '/api/download/twitter?url=URL&apikey=TU_KEY',
            pinterest_dl: '/api/download/pinterest?url=URL&apikey=TU_KEY',
            pinterest_search: '/api/search/pinterest?query=QUERY&type=image&apikey=TU_KEY',
            qrcode: '/api/tools/qr?text=TEXTO&apikey=TU_KEY',
            ssweb: '/api/tools/ssweb?url=URL&theme=dark&device=desktop&apikey=TU_KEY'
        }
    });
});

// Manejo de rutas limpias (sin .html en la URL)
app.get(['/login', '/register', '/profile', '/admin', '/search', '/verify'], (req, res) => {
    const page = req.path.split('/')[1];
    res.sendFile(path.join(__dirname, 'public', `${page}.html`));
});

// Inicio por defecto
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// 404 - Debe ir al final de todas las rutas
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

// --- INICIO DEL SERVIDOR ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`-----------------------------------------`);
    console.log(`|  API KAZUMA CORRIENDO EN PUERTO ${PORT}  |`);
    console.log(`-----------------------------------------`);
});