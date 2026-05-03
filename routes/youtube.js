const yts = require('yt-search');
const { exec } = require('child_process');
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

            const command = `yt-dlp -x --audio-format mp3 --audio-quality 96K -o "${filePath}" ${video.url}`;

            exec(command, (error) => {
                if (error) {
                    return res.status(500).json({ status: false, creator, error: 'Error al procesar audio' });
                }

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

        } catch (error) {
            res.status(500).json({ status: false, creator, error: error.message });
        }
    }
};

module.exports = { youtubeRoute };