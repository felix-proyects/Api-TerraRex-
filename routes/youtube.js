const axios = require("axios");
const yts = require("yt-search");
const ytdl = require("ytdl-core");

class Youtube {
  constructor() {
    this.name = "Youtube Downloader";
  }

  isUrl(str) {
    try {
      new URL(str);
      return true;
    } catch (_) {
      return false;
    }
  }

  async searchAndDownload(query) {
    try {
      let videoUrl = query;

      if (!ytdl.validateURL(query)) {
        const search = await yts(query);
        if (!search.videos.length) return { status: false, code: 404, message: "No se encontraron videos." };
        videoUrl = search.videos[0].url;
      }

      const info = await ytdl.getInfo(videoUrl);
      const format = ytdl.chooseFormat(info.formats, { 
        quality: 'highest', 
        filter: 'audioandvideo' 
      });

      return {
        status: true,
        code: 200,
        result: {
          id: info.videoDetails.videoId,
          title: info.videoDetails.title,
          description: info.videoDetails.description?.slice(0, 200),
          duration: info.videoDetails.lengthSeconds,
          views: info.videoDetails.viewCount,
          author: info.videoDetails.author.name,
          thumbnail: info.videoDetails.thumbnails[0].url,
          url_youtube: videoUrl,
          download_url: format.url,
          quality: format.qualityLabel || '720p'
        }
      };
    } catch (error) {
      return { status: false, code: 500, message: error.message };
    }
  }
}

const youtube = new Youtube();

const youtubeRoute = {
  endpoint: "/api/download/youtube",
  async run(req, res) {
    const query = (req.query.url || req.query.query || req.body.url || req.body.query || "").trim();
    
    if (!query) {
      return res.status(400).json({ status: false, error: "URL or Query parameter is required", code: 400 });
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
      return res.status(500).json({ status: false, error: error.message || "Internal Server Error", code: 500 });
    }
  }
};

module.exports = { youtube, youtubeRoute };