const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const { initDB, User } = require('./lib/db');

const app = express();

global.serverStart = Date.now();

const PORT = 9090;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const securityMiddleware = async (req, res, next) => {
    const isApiRoute = req.path.startsWith('/api/');

    const isPublicApi = 
        req.path.startsWith('/api/auth') || 
        req.path.startsWith('/api/stats') || 
        req.path.startsWith('/api/admin') || 
        req.path === '/api';

    if (isApiRoute && !isPublicApi) {
        const apikey = req.query.apikey || req.headers['x-api-key'];
        if (!apikey) return res.status(403).json({ status: false, message: "API Key requerida" });

        try {
            const user = await User.findOne({ where: { apikey: apikey } });

            if (!user) {
                return res.status(403).json({ status: false, message: "API Key inválida" });
            }

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
            user.success_requests += 1;

            await user.save();

        } catch (error) {
            return res.status(500).json({ status: false, message: "Error interno de base de datos" });
        }
    }
    next();
};

app.use(securityMiddleware);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/download/tiktok', require('./routes/tiktok'));
app.use('/api/download/instagram', require('./routes/instagramvid'));
app.use('/api/download/facebook', require('./routes/facebookvid'));
app.use('/api/download/twitter', require('./routes/twitter'));
app.use('/api/search/tiktok', require('./routes/search/tiktok'));
app.use('/api/tools/qr', require('./routes/qrcode'));

const { pinterestRoute } = require('./routes/pinterest');
const { pinterestSearchRoute } = require('./routes/search/pinterest');
const { sswebRoute } = require('./routes/tools/ssweb');

app.use('/api/download/pinterest', (req, res) => pinterestRoute.run(req, res));
app.use('/api/search/pinterest', (req, res) => pinterestSearchRoute.run(req, res));
app.use('/api/tools/ssweb', (req, res) => sswebRoute.run(req, res));

app.use('/temp', express.static(path.join(process.cwd(), 'public', 'temp')));
app.use(express.static(path.join(process.cwd(), 'public'), { extensions: ['html'] }));

app.get('/:page', (req, res, next) => {
    const page = req.params.page;
    const filePath = path.join(process.cwd(), 'public', `${page}.html`);

    if (page === 'api') return next();

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        next();
    }
});

app.get('/', (req, res) => res.sendFile(path.join(process.cwd(), 'public', 'index.html')));

app.use((req, res) => res.status(404).sendFile(path.join(process.cwd(), 'public', '404.html')));

initDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Kazuma API activa en puerto: ${PORT}`);
    });
}).catch(err => {
    console.error("ERROR CRÍTICO AL INICIAR:");
    console.error(err);
    process.exit(1);
});