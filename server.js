const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3032;

const tiktokRoutes = require('./routes/tiktok');
const instagramRoutes = require('./routes/instagramvid');
const facebookRoutes = require('./routes/facebookvid');
const youtubeRoutes = require('./routes/youtube');
const twitterRoutes = require('./routes/twitter');
const qrcodeRoutes = require('./routes/qrcode');
const geminisRoutes = require('./routes/geminis');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/download/tiktok', tiktokRoutes);
app.use('/api/download/instagram', instagramRoutes);
app.use('/api/download/facebook', facebookRoutes);
app.use('/api/download/youtube', youtubeRoutes);
app.use('/api/download/twitter', twitterRoutes);
app.use('/api/tools/qr', qrcodeRoutes);
app.use('/api/ai/gemini', geminisRoutes);

app.get('/api', (req, res) => {
    res.json({
        status: true,
        message: 'Api Kazuma activa',
        creator: 'Félix Ofc',
        endpoints: {
            tiktok: '/api/download/tiktok?url=URL',
            instagram: '/api/download/instagram?url=URL',
            facebook: '/api/download/facebook?url=URL',
            twitter: '/api/download/twitter?url=URL',
            youtube_mp3: '/api/download/youtube/mp3?url=URL',
            youtube_mp4: '/api/download/youtube/mp4?url=URL',
            qrcode: '/api/tools/qr?text=TEXTO',
            gemini: '/api/ai/gemini?text=HOLA'
        }
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Api Kazuma corriendo en puerto ${PORT}`);
});