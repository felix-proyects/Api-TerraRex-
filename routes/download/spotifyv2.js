const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeSpotifyV2(url) {
    try {
        const resHome = await axios.get("https://spotimate.io/");
        const $ = cheerio.load(resHome.data);

        const tokenInput = $("input[type=\"hidden\"]").filter((i, el) => {
            const name = $(el).attr("name");
            return name && name.startsWith("_");
        });

        const tokenName = tokenInput.attr("name");
        const tokenValue = tokenInput.attr("value");

        const cookies = resHome.headers["set-cookie"];
        let sessionData = "";

        if (cookies) {
            const sessionCookie = cookies.find((cookie) => cookie.startsWith("session_data="));
            if (sessionCookie) {
                sessionData = sessionCookie.split(";")[0].split("=")[1];
            }
        }

        if (!tokenName || !tokenValue) return null;

        const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substr(2, 16);
        const formData = [
            `--${boundary}`,
            "Content-Disposition: form-data; name=\"url\"",
            "",
            url,
            `--${boundary}`,
            `Content-Disposition: form-data; name="${tokenName}"`,
            "",
            tokenValue,
            `--${boundary}`,
            "Content-Disposition: form-data; name=\"cf-turnstile-response\"",
            "",
            "0.XTZ...", // Aquí el sitio suele requerir bypass de captcha
            `--${boundary}--`,
            "",
        ].join("\r\n");

        const resApi = await axios.post("https://spotimate.io/action", formData, {
            headers: {
                "content-type": `multipart/form-data; boundary=${boundary}`,
                "cookie": `session_data=${sessionData}`,
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
            },
        });

        const $result = cheerio.load(resApi.data.html || resApi.data);

        const mp3Link = $result("a").filter((i, el) => {
            const href = $(el).attr("href");
            const text = $(el).text();
            return href && href.includes("/dl?token=") && text.includes("Download Mp3");
        }).first().attr("href");

        const coverLink = $result("a").filter((i, el) => {
            const href = $(el).attr("href");
            const text = $(el).text();
            return href && href.includes("/dl?token=") && text.includes("Download Cover");
        }).first().attr("href");

        return {
            titulo: $result("h3 div").text().trim(),
            artista: $result("p span").text().trim(),
            imagen: $result("img").first().attr("src"),
            link_mp3: mp3Link || null,
            link_cover: coverLink || null
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

    const result = await scrapeSpotifyV2(url);

    if (!result || !result.link_mp3) {
        return res.status(500).json({
            status: false,
            creator: "Félix Ofc",
            message: "Error al obtener descarga (Posible protección de Captcha activa)"
        });
    }

    res.json({
        status: true,
        creator: "Félix Ofc",
        resultado: result
    });
};