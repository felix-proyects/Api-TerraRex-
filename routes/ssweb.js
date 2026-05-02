const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs-extra');

const DOWNLOAD_DIR = path.join(__dirname, '../public/download');

fs.ensureDirSync(DOWNLOAD_DIR);

router.get('/', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({
      status: false,
      error: "Falta el parámetro ?url="
    });
  }

  const fileName = `web-${Date.now()}`;
  const folderPath = path.join(DOWNLOAD_DIR, fileName);
  const zipPath = `${folderPath}.zip`;

  try {
    const browser = await puppeteer.launch({ 
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    const html = await page.content();
    await browser.close();

    await fs.ensureDir(folderPath);
    await fs.writeFile(path.join(folderPath, 'index.html'), html);

    const zip = new AdmZip();
    zip.addLocalFolder(folderPath);
    zip.writeZip(zipPath);

    await fs.remove(folderPath);

    const downloadUrl = `${req.protocol}://${req.get('host')}/download/${fileName}.zip`;

    res.json({
      status: true,
      creator: "Félix Ofc",
      result: {
        url: targetUrl,
        download: downloadUrl,
        note: "El archivo se eliminará en 5 minutos."
      }
    });

    setTimeout(async () => {
      try {
        if (await fs.pathExists(zipPath)) {
          await fs.remove(zipPath);
        }
      } catch (err) {
        console.error(err);
      }
    }, 5 * 60 * 1000);

  } catch (err) {
    res.status(500).json({
      status: false,
      error: "Error al procesar la web."
    });
  }
});

module.exports = router;