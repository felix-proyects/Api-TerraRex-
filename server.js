const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3032;

const tiktokRoutes = require('./routes/tiktok');
const instagramRoutes = require('./routes/instagramvid');
const facebookRoutes = require('./routes/facebookvid');
const youtubeRoutes = require('./routes/youtube');
const twitterRoutes = require('./routes/twitter');
const shortenerRoutes = require('./routes/shortener');
const qrcodeRoutes = require('./routes/qrcode');
const screenshotRoutes = require('./routes/screenshot');
const geminisRoutes = require('./routes/geminis');
const imagehdRoutes = require('./routes/hd');
const r34Routes = require('./routes/r34');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/download', tiktokRoutes);
app.use('/api/download', instagramRoutes);
app.use('/api/download', facebookRoutes);
app.use('/api/download', youtubeRoutes);
app.use('/api/download', twitterRoutes);

app.use('/api/tools', shortenerRoutes);
app.use('/api/tools', qrcodeRoutes);
app.use('/api/tools', screenshotRoutes);

app.use('/api/ai', geminisRoutes);
app.use('/api/ai', imagehdRoutes);

app.use('/api/nsfw', r34Routes);

app.get('/api', (req, res) => {
    res.json({
        status: true,
        message: 'Api Kazuma activa',
        endpoints: {
            youtube: '/api/download/youtube?url=VIDEO_URL',
            tiktok: '/api/download/tiktok?url=VIDEO_URL',
            instagram: '/api/download/instagram?url=VIDEO_URL',
            facebook: '/api/download/facebook?url=VIDEO_URL',
            twitter: '/api/download/twitter?url=VIDEO_URL',
            shortener: '/api/tools/shortener?url=ENLACE',
            qrcode: '/api/tools/qr?text=TEXTO_O_URL',
            chatgpt: '/api/ai/chatgpt?text=MENSAJE'
        }
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Api Kazuma escuchando en el puerto ${PORT}`);
});