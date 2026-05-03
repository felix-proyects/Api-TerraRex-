const yts = require('yt-search');
const ytdl = require('ytdl-core');
const fs = require('fs-extra');
const path = require('path');

const youtubeRoute = {
    endpoint: "/api/download/ytplay",
    async run(req, res) {
        const { q } = req.query;
        const creator = "Félix Ofc";

        if (!q) {
            return res.status(400).json({ status: false, creator, error: 'Query is required' });
        }

        try {
            const ytResults = await yts.search(q);
            const video = ytResults.videos[0];

            if (!video) {
                return res.status(404).json({ status: false, creator, error: 'No se encontró el video' });
            }

            const fileName = `yt_${Date.now()}.mp3`;
            const tempDir = path.join(process.cwd(), 'public', 'temp');
            const filePath = path.join(tempDir, fileName);
            
            await fs.ensureDir(tempDir);

            const stream = ytdl(video.url, { 
                filter: 'audioonly', 
                quality: 'lowest' 
            });
            
            const fileStream = fs.createWriteStream(filePath);
            
            let timeout = setTimeout(() => {
                stream.destroy();
                if (!res.headersSent) {
                    res.status(504).json({ status: false, creator, error: 'Tiempo de espera agotado al descargar' });
                }
            }, 40000);

            stream.pipe(fileStream);

            fileStream.on('finish', () => {
                clearTimeout(timeout);
                res.status(200).json({
                    status: true,
                    creator,
                    result: {
                        title: video.title,
                        channel: video.author.name,
                        duration: video.duration.timestamp,
                        thumbnail: video.thumbnail,
                        url_original: video.url,
                        download_url: `${req.protocol}://${req.get('host')}/temp/${fileName}`
                    }
                });

                setTimeout(async () => {
                    try {
                        if (await fs.pathExists(filePath)) {
                            await fs.remove(filePath);
                        }
                    } catch (err) {}
                }, 300000); 
            });

            fileStream.on('error', (err) => {
                clearTimeout(timeout);
                if (!res.headersSent) {
                    res.status(500).json({ status: false, creator, error: err.message });
                }
            });

        } catch (error) {
            if (!res.headersSent) {
                res.status(500).json({ status: false, creator, error: error.message });
            }
        }
    }
};

module.exports = { youtubeRoute };
