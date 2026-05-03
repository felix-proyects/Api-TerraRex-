const express = require('express');
const axios = require('axios');

class Youtube {
  constructor() {}

  async searchAndDownload(query) {
    try {
      // Usamos una API estable para evitar el error 410
      const response = await axios.get(`https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(query)}`);
      const res = response.data;

      if (!res.status) {
        return { status: false, code: 404, message: "No se pudo obtener el video." };
      }

      return {
        status: true,
        code: 200,
        result: {
          id: res.result.id || '',
          title: res.result.title,
          author: res.result.author || 'YouTube',
          thumbnail: res.result.thumbnail,
          url_youtube: query,
          download_url: res.result.download.url,
          quality: res.result.download.quality || '720p'
        }
      };
    } catch (error) {
      return { status: false, code: 500, message: "Error en el servidor de descarga." };
    }
  }
}

const youtube = new Youtube();

const youtubeRoute = {
  endpoint: "/api/download/youtube",
  async run(req, res) {
    const query = (req.query.query || req.body.query || req.query.url || "").trim();
    
    if (!query) {
      return res.status(400).json({ status: false, error: "Query or URL is required", code: 400 });
    }

    try {
      const result = await youtube.searchAndDownload(query);
      if (!result.status) {
        return res.status(result.code).json({ status: false, error: result.message, code: result.code });
      }

      return res.json({ 
        status: true, 
        creator: "Félix Ofc",
        data: result.result, 
        timestamp: new Date().toISOString() 
      });
    } catch (error) {
      return res.status(500).json({ status: false, error: "Internal Server Error", code: 500 });
    }
  }
};

module.exports = { youtube, youtubeRoute };