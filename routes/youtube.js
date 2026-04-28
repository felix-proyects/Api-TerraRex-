const express = require('express');
const router = express.Router();
const { ytmp3, ytmp4, ytdlv2 } = require('./youtube_scraper');

router.get('/mp3', async (req, res) => {
  const url = req.query.url;
  const quality = req.query.quality || "128";
  if (!url) return res.status(400).json({ status: false, error: 'Debes proporcionar una URL de YouTube.' });
  try {
    const result = await ytmp3(url, quality);
    if (!result || !result.status || !result.download) return res.status(404).json({ status: false, error: 'No se pudo obtener el audio.' });
    return res.json({
      status: true,
      creator: 'Félix Ofc',
      type: 'mp3',
      quality,
      metadata: result.metadata || {},
      download: result.download
    });
  } catch (err) {
    console.error('Error en YouTube MP3:', err);
    return res.status(500).json({ status: false, error: 'Error interno del servidor.' });
  }
});

router.get('/mp4', async (req, res) => {
  const url = req.query.url;
  const quality = req.query.quality || "360";
  if (!url) return res.status(400).json({ status: false, error: 'Debes proporcionar una URL de YouTube.' });
  try {
    const result = await ytmp4(url, quality);
    if (!result || !result.status || !result.download) return res.status(404).json({ status: false, error: 'No se pudo obtener el video.' });
    return res.json({
      status: true,
      creator: 'Api Kazuma',
      type: 'mp4',
      quality,
      metadata: result.metadata || {},
      download: result.download
    });
  } catch (err) {
    console.error('Error en YouTube MP4:', err);
    return res.status(500).json({ status: false, error: 'Error interno del servidor.' });
  }
});

router.get('/dlv2', async (req, res) => {
  const url = req.query.url;
  const audioQuality = req.query.audio || "128";
  const videoQuality = req.query.video || "360";
  if (!url) return res.status(400).json({ status: false, error: 'Debes proporcionar una URL de YouTube.' });
  try {
    const result = await ytdlv2(url, { audio: audioQuality, video: videoQuality });
    if (!result || !result.status) return res.status(404).json({ status: false, error: 'No se pudo obtener el recurso.' });
    return res.json({
      status: true,
      creator: 'Api Kazuma',
      type: 'dlv2',
      qualities: { audio: audioQuality, video: videoQuality },
      metadata: result.metadata || {},
      download: result.downloads || {}
    });
  } catch (err) {
    console.error('Error en YouTube DLV2:', err);
    return res.status(500).json({ status: false, error: 'Error interno del servidor.' });
  }
});

module.exports = router;