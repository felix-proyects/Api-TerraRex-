const express = require('express');
const router = express.Router();
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

router.get('/', async (req, res) => {
  const text = req.query.text;

  if (!text) {
    return res.status(400).json({
      status: false,
      error: "Debes proporcionar un texto en el parámetro ?text="
    });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      status: false,
      error: "API Key no configurada en el servidor."
    });
  }

  try {
    const apiResponse = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: text
          }]
        }]
      })
    });

    if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error?.message || "Error en la API de Google");
    }

    const responseData = await apiResponse.json();
    const responseText = responseData.candidates[0].content.parts[0].text;

    res.json({
      status: true,
      creator: "Félix Ofc",
      result: responseText
    });

  } catch (err) {
    res.status(500).json({
      status: false,
      error: "No se pudo obtener respuesta de la IA."
    });
  }
});

module.exports = router;