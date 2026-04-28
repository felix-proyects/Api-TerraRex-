const express = require('express');
const router = express.Router();
const youtubedl = require('youtube-dl-exec');

function filterDownloads(formats) {
  const filtered = [];
  const seen = new Set();
  for (const f of formats) {
    if (!f.url || f.ext !== 'mp4' || f.url.includes('.m3u8')) continue;
    const key = `${f.ext}-${f.height || f.format_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    filtered.push({
      quality: f.format_note || `${f.height}p`,
      resolution: f.resolution || null,
      ext: f.ext,
      url: f.url
    });
  }
  filtered.sort((a, b) => {
    const ha = parseInt(a.resolution) || 0;
    const hb = parseInt(b.resolution) || 0;
    return hb - ha;
  });
  return filtered;
}

router.get('/', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ status: false, error: 'Debes proporcionar una URL de Twitter.' });
  try {
    const info = await youtubedl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      referer: 'twitter.com',
      addHeader: ['user-agent:Mozilla/5.0']
    });
    const downloads = filterDownloads(info.formats);
    if (downloads.length === 0) {
      return res.status(404).json({ status: false, error: 'No se encontraron formatos de video directos.' });
    }
    res.json({
      status: true,
      creator: 'Félix Ofc',
      metadata: {
        id: info.id,
        title: info.title || null,
        uploader: info.uploader || null,
        duration: info.duration || null,
        thumbnail: info.thumbnail || null,
        upload_date: info.upload_date || null
      },
      downloads
    });
  } catch (error) {
    res.status(500).json({ status: false, error: 'Error al procesar el video de Twitter.' });
  }
});

module.exports = router;