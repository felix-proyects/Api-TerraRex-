const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const FormData = require('form-data');

class SnapTikSearcher {
    constructor() {
        this.baseURL = "https://snaptik.app";
        this.headers = { "User-Agent": "Mozilla/5.0 (Linux; Android 10; K)" };
    }

    async get_token() {
        const { data } = await axios.get(`${this.baseURL}/en2`, { headers: this.headers });
        const $ = cheerio.load(data);
        return $("input[name=\"token\"]").val();
    }

    async get_download_link(url) {
        try {
            const form = new FormData();
            const token = await this.get_token();
            form.append("url", url);
            form.append("lang", "en2");
            form.append("token", token);

            const { data: script1 } = await axios.post(`${this.baseURL}/abc2.php`, form, { 
                headers: { ...this.headers, ...form.getHeaders() } 
            });

            // Ejecución del script de SnapTik para obtener el HTML
            const script2 = await new Promise((resolve) => Function("eval", script1)(resolve));
            const html = await new Promise((resolve, reject) => {
                let _h = "";
                const mock = {
                    $: () => ({ set innerHTML(t) { _h = t; }, get innerHTML() { return _h; }, remove() {}, style: {} }),
                    app: { showAlert: reject },
                    document: { getElementById: () => ({ src: "" }) },
                    fetch: () => { resolve(_h); return { json: () => ({}) }; },
                    window: { location: { hostname: "snaptik.app" } },
                    gtag: () => 0, Math: { round: () => 0 }, XMLHttpRequest: function() { return { open() {}, send() {} }; }
                };
                try { Function(...Object.keys(mock), script2)(...Object.values(mock)); } catch (e) { reject(e); }
            });

            const $ = cheerio.load(html);
            return $("div.video-links > a:not([href='/'])").first().attr("href");
        } catch (e) {
            return null;
        }
    }
}

const snaptik = new SnapTikSearcher();

router.get('/', async (req, res) => {
    const query = req.query.query;
    if (!query) return res.status(400).json({ status: false, message: "Ingresa un texto de búsqueda" });

    try {
        // 1. Buscamos los videos en TikTok
        const searchRes = await axios.get(`https://api.vreden.my.id/api/tiktoksearch?query=${encodeURIComponent(query)}`);
        
        if (!searchRes.data.status) {
            return res.status(404).json({ status: false, message: "No se encontraron videos" });
        }

        const rawResults = searchRes.data.result.slice(0, 5); // Limitamos a los primeros 5 para no saturar el servidor

        // 2. Para cada resultado, obtenemos el link sin marca de agua en paralelo
        const processedResults = await Promise.all(rawResults.map(async (video) => {
            const dlLink = await snaptik.get_download_link(video.url);
            return {
                title: video.title,
                author: video.author,
                thumbnail: video.cover,
                origin_url: video.url,
                download_url: dlLink ? (dlLink.startsWith('/') ? 'https://snaptik.app' + dlLink : dlLink) : null
            };
        }));

        res.json({
            status: true,
            creator: "Félix Ofc",
            total: processedResults.length,
            results: processedResults
        });

    } catch (error) {
        res.status(500).json({ status: false, message: "Error procesando la búsqueda" });
    }
});

module.exports = router;