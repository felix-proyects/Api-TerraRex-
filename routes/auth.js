const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const nodemailer = require('nodemailer');

const dbPath = path.join(__dirname, '../data/database.json');

// --- CONFIGURACIÓN DE GMAIL (NUEVA CONTRASEÑA) ---
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, 
    auth: {
        user: 'frasesbebor@gmail.com',
        pass: 'spjvyaigaxmwcoya' // Tu nueva contraseña de aplicación
    },
    tls: {
        rejectUnauthorized: false
    }
});

// --- UTILIDADES ---
const readDB = () => fs.readJsonSync(dbPath);
const writeDB = (data) => fs.writeJsonSync(dbPath, data, { spaces: 4 });

const generateApiKey = () => {
    const c = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = 'kzm-';
    for (let i = 0; i < 12; i++) key += c.charAt(Math.floor(Math.random() * c.length));
    return key;
};

// Función de envío blindada: si falla, NO mata el proceso
async function sendMail(email, username, vCode, id) {
    const mailOptions = {
        from: '"Api Kazuma" <frasesbebor@gmail.com>',
        to: email,
        subject: `Verifica tu cuenta - Código ${vCode}`,
        html: `
            <div style="background-color: #0d1117; color: #ffffff; padding: 30px; border: 1px solid #ff2d55; font-family: sans-serif; border-radius: 10px;">
                <h1 style="color: #ff2d55; text-align: center;">Kazuma Dash</h1>
                <p>Hola <b>${username}</b>,</p>
                <p>Tu código de verificación es:</p>
                <div style="background: rgba(255, 45, 85, 0.1); border: 2px dashed #ff2d55; padding: 20px; font-size: 30px; text-align: center; color: #ff2d55; font-weight: bold; margin: 20px 0;">
                    ${vCode}
                </div>
                <p style="text-align: center;">
                    <a href="https://api.kazuma.giize.com/verify?code=${vCode}&id=${id}" style="color: #ff2d55; text-decoration: none;">O haz clic aquí para verificar automáticamente</a>
                </p>
            </div>
        `
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log(`[MAIL SUCCESS] Enviado a ${email}`);
    } catch (err) {
        console.error(`[MAIL ERROR] Falló el envío a ${email}: ${err.message}`);
    }
}

// --- RUTAS ---

router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const db = readDB();

        if (db.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim())) {
            return res.json({ status: false, message: "El correo ya existe." });
        }

        const newId = Math.floor(10000000 + Math.random() * 90000000);
        const vCode = Math.floor(100000 + Math.random() * 900000).toString();

        const newUser = {
            id: newId,
            username: username.trim(),
            email: email.toLowerCase().trim(),
            password: password,
            role: "user",
            limit: 100,
            requests_today: 0,
            total_requests: 0,
            apikey: "kzm-PENDING-VERIFICATION",
            last_reset: new Date().toISOString().split('T')[0],
            verified: false,
            verificationCode: vCode,
            codeExpires: new Date(Date.now() + 3600000).toISOString()
        };

        db.users.push(newUser);
        writeDB(db);

        // Se envía sin await para que el usuario reciba la respuesta "true" rápido
        sendMail(newUser.email, newUser.username, vCode, newId);

        return res.json({ status: true, message: "Código enviado correctamente.", id: newId });
    } catch (e) {
        console.error("Error en Registro:", e);
        return res.status(500).json({ status: false, message: "Error interno en el servidor." });
    }
});

router.post('/resend', async (req, res) => {
    try {
        const { id } = req.body;
        const db = readDB();
        const user = db.users.find(u => String(u.id) === String(id));

        if (!user) return res.json({ status: false, message: "Usuario no encontrado." });

        const newVCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationCode = newVCode;
        writeDB(db);

        sendMail(user.email, user.username, newVCode, user.id);

        return res.json({ status: true, message: "Nuevo código enviado." });
    } catch (e) {
        return res.status(500).json({ status: false });
    }
});

router.post('/verify', async (req, res) => {
    try {
        const { id, code } = req.body;
        const db = readDB();
        const user = db.users.find(u => String(u.id) === String(id));

        if (!user || user.verificationCode !== code) {
            return res.json({ status: false, message: "Código o ID incorrecto." });
        }

        user.verified = true;
        user.verificationCode = null;
        user.apikey = generateApiKey();

        writeDB(db);
        return res.json({ status: true, message: "Cuenta verificada.", apikey: user.apikey });
    } catch (e) {
        return res.status(500).json({ status: false });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const db = readDB();
        const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password);

        if (user) {
            if (!user.verified) return res.json({ status: "pending", id: user.id });
            return res.json({ status: true, user });
        }
        return res.json({ status: false, message: "Credenciales inválidas." });
    } catch (e) {
        return res.status(500).json({ status: false });
    }
});

module.exports = router;