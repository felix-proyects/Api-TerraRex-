const axios = require('axios');

async function scrapeSpotify(url) {
    try {
        const headers = {
            "accept": "application/json, text/plain, */*",
            "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            "sec-ch-ua": "\"Not)A;Brand\";v=\"24\", \"Chromium\";v=\"116\"",
            "sec-ch-ua-mobile": "?1",
            "sec-ch-ua-platform": "\"Android\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site",
            "Referer": "https://spotifydownload.org/",
            "Referrer-Policy": "strict-origin-when-cross-origin",
        };

        const initialResponse = await axios.get(
            `https://api.fabdl.com/spotify/get?url=${encodeURIComponent(url)}`,
            { headers }
        );

        const { result } = initialResponse.data;
        if (!result) return null;

        const trackId = result.type === "album" ? result.tracks[0].id : result.id;

        const convertResponse = await axios.get(
            `https://api.fabdl.com/spotify/mp3-convert-task/${result.gid}/${trackId}`,
            { headers }
        );

        const tid = convertResponse.data.result.tid;

        const progressResponse = await axios.get(
            `https://api.fabdl.com/spotify/mp3-convert-progress/${tid}`,
            { headers }
        );

        return {
            titulo: result.name,
            tipo: result.type,
            artista: result.artists,
            duracion: result.type === "album" ? result.tracks[0].duration_ms : result.duration_ms,
            imagen: result.image,
            link: `https://api.fabdl.com${progressResponse.data.result.download_url}`,
            status: progressResponse.data.result.status
        };
    } catch (error) {
        return null;
    }
}

module.exports = async (req, res) => {
    const url = req.query.url || req.body.url;

    if (!url) {
        return res.status(400).json({
            status: false,
            creator: "Félix Ofc",
            message: "Ingresa la url"
        });
    }

    const result = await scrapeSpotify(url);

    if (!result) {
        return res.status(500).json({
            status: false,
            creator: "Félix Ofc",
            message: "Error en la API interna"
        });
    }

    res.json({
        status: true,
        creator: "Félix Ofc",
        resultado: result
    });
};