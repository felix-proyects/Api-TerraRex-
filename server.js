const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const app = express();

global.serverStart = Date.now();

const PORT = process.env.PORT || 3032;
const dbPath = path.join(process.cwd(), 'data', 'database.json');

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
const { youtubeRoute } = require('./routes/youtube'); 
const { pinterestRoute } = require('./routes/pinterest');
const { pinterestSearchRoute } = require('./routes/search/pinterest');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const securityMiddleware = async (req, res, next) => {
    const isApiRoute = req.path.startsWith('/api/');
    const isPublicApi = 
        req.path.includes('/auth') || 
        req.path.includes('/stats') || 
        req.path.includes('/admin') || 
        req.path === '/api';

    if (isApiRoute && !isPublicApi) {
        const apikey = req.query.apikey || req.headers['x-api-key'];
        if (!apikey) return res.status(403).json({ status: false, message: "API Key requerida" });

        try {
            const db = await fs.readJson(dbPath);
            const userIndex = db.users.findIndex(u => u.apikey === apikey);

            if (userIndex === -1) return res.status(403).json({ status: false, message: "API Key inválida" });

            const user = db.users[userIndex];
            const today = new Date().toISOString().split('T')[0];

            if (user.last_reset !== today) {
                user.requests_today = 0;
                user.last_reset = today;
            }

            if (user.requests_today >= user.limit) {
                return res.status(429).json({ status: false, message: "Límite diario alcanzado" });
            }

            user.requests_today += 1;
            user.total_requests += 1;
            await fs.writeJson(dbPath, db, { spaces: 4 });
        } catch (error) {
            return res.status(500).json({ status: false, message: "Error DB" });
        }
    }
    next();
};

app.use(securityMiddleware);

app.use('/api/auth', authRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/download/tiktok', tiktokRoutes);
app.use('/api/search/tiktok', tiktokSearchRoute);
app.use('/api/download/instagram', instagramRoutes);
app.use('/api/download/facebook', facebookRoutes);
app.use('/api/download/twitter', twitterRoutes);
app.use('/api/tools/qr', qrcodeRoutes);

const geminiGet = geminiRoutes.find(r => r.metode === "GET");
const geminiPost = geminiRoutes.find(r => r.metode === "POST");

app.get('/api/ai/gemini', (req, res) => {
    geminiGet.run({ req }).then(result => res.json(result)).catch(err => res.status(500).json({ status: false, error: err.message }));
});

app.post('/api/ai/gemini', (req, res) => {
    const guf = async (request, field) => {
        if (request.file) return { file: request.file.buffer, name: request.file.originalname, isValid: true };
        return { file: null, isValid: false };
    };
    geminiPost.run({ req, guf }).then(result => res.json(result)).catch(err => res.status(500).json({ status: false, error: err.message }));
});

app.use('/api/download/youtube', (req, res) => youtubeRoute.run(req, res));
app.use('/api/download/pinterest', (req, res) => pinterestRoute.run(req, res));
app.use('/api/search/pinterest', (req, res) => pinterestSearchRoute.run(req, res));

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
            youtube: '/api/download/youtube?query=URL_O_TEXTO&apikey=TU_KEY',
            qrcode: '/api/tools/qr?text=TEXTO&apikey=TU_KEY'
        }
    });
});

app.get(['/login', '/register', '/profile', '/admin', '/search'], (req, res) => {
    const page = req.path.split('/')[1];
    res.sendFile(path.join(__dirname, 'public', `${page}.html`));
});

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Api Kazuma corriendo en puerto ${PORT}`);
});