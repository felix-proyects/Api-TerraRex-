const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const nodemailer = require('nodemailer');

const dbPath = path.join(__dirname, '../data/database.json');

// --- CONFIGURACIÓN DE GMAIL (SMTP DIRECTO) ---
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, 
    auth: {
        user: 'frasesbebor@gmail.com',
        pass: 'kafvotvrxkignsrl' // Contraseña de aplicación sin espacios
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verificar conexión al iniciar para ver errores en consola
transporter.verify((error) => {
    if (error) console.log("[!] Error SMTP:", error.message);
    else console.log("[+] Gmail conectado y listo.");
});

// --- UTILIDADES ---
const readDB = () => fs.readJsonSync(dbPath);
const writeDB = (data) => fs.writeJsonSync(dbPath, data, { spaces: 4 });

const generateApiKey = () => {
    const c1 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const c2 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let p1 = '', p2 = '';
    for (let i = 0; i < 5; i++) p1 += c1.charAt(Math.floor(Math.random() * c1.length));
    for (let i = 0; i < 8; i++) p2 += c2.charAt(Math.floor(Math.random() * c2.length));
    return `kzm-${p1}-${p2}`;
};

const sendVerificationMail = async (email, username, vCode, id) => {
    const mailOptions = {
        from: '"Api Kazuma" <frasesbebor@gmail.com>',
        to: email,
        subject: `Código: ${vCode} - Verifica tu cuenta`,
        html: `
            <div style="background-color: #0d1117; color: #ffffff; font-family: sans-serif; padding: 40px; border-radius: 15px; border: 1px solid #ff2d55; max-width: 500px; margin: auto;">
                <h1 style="color: #ff2d55; text-align: center; margin-bottom: 20px;">Kazuma Verify</h1>
                <p>Hola <b>${username}</b>,</p>
                <p>Usa el siguiente código para activar tu API Key:</p>
                <div style="background: rgba(255, 45, 85, 0.1); border: 2px dashed #ff2d55; padding: 20px; font-size: 32px; text-align: center; color: #ff2d55; font-weight: bold; margin: 20px 0;">
                    ${vCode}
                </div>
                <p style="text-align: center;">
                    <a href="https://api.kazuma.giize.com/verify?code=${vCode}&id=${id}" style="color: #ff2d55; text-decoration: none; font-weight: bold;">[ Verificar Automáticamente ]</a>
                </p>
                <p style="font-size: 11px; color: #484f58; text-align: center; margin-top: 30px;">Copyright © 2026 Kazuma. Powered by PixelCrew-Team</p>
            </div>
        `
    };
    return transporter.sendMail(mailOptions);
};

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
        const expires = new Date(Date.now() + 3600000).toISOString();

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
            codeExpires: expires
        };

        db.users.push(newUser);
        writeDB(db);

        // Envío asíncrono para no bloquear la respuesta
        sendVerificationMail(newUser.email, newUser.username, vCode, newId)
            .then(info => console.log("[MAIL]: Enviado a", newUser.email, info.messageId))
            .catch(e => console.error("[MAIL ERROR]:", e.message));

        return res.json({ status: true, message: "Código enviado.", id: newId });
    } catch (error) {
        return res.status(500).json({ status: false, message: "Error interno." });
    }
});

router.post('/resend', async (req, res) => {
    try {
        const { id } = req.body;
        const db = readDB();
        const user = db.users.find(u => String(u.id) === String(id));

        if (!user) return res.json({ status: false, message: "Usuario no encontrado." });
        if (user.verified) return res.json({ status: false, message: "Ya estás verificado." });

        const newVCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationCode = newVCode;
        user.codeExpires = new Date(Date.now() + 3600000).toISOString();

        writeDB(db);

        sendVerificationMail(user.email, user.username, newVCode, user.id)
            .then(info => console.log("[RESEND]: Reenviado a", user.email))
            .catch(e => console.error("[RESEND ERROR]:", e.message));

        return res.json({ status: true, message: "Nuevo código enviado." });
    } catch (error) {
        return res.status(500).json({ status: false });
    }
});

router.post('/verify', async (req, res) => {
    try {
        const { id, code } = req.body;
        const db = readDB();
        const user = db.users.find(u => String(u.id) === String(id));

        if (!user) return res.json({ status: false, message: "Usuario no encontrado." });
        if (user.verified) return res.json({ status: false, message: "Ya verificado." });
        if (user.verificationCode !== code) return res.json({ status: false, message: "Código incorrecto." });
        if (new Date() > new Date(user.codeExpires)) return res.json({ status: false, message: "Código expirado." });

        user.verified = true;
        user.verificationCode = null;
        user.codeExpires = null;
        user.apikey = generateApiKey();

        writeDB(db);
        return res.json({ status: true, message: "Verificado.", apikey: user.apikey });
    } catch (error) {
        return res.status(500).json({ status: false });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const db = readDB();
        const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password);

        if (user) {
            if (!user.verified) return res.json({ status: "pending", message: "Verifica tu cuenta.", id: user.id });
            return res.json({ status: true, user: { id: user.id, username: user.username, role: user.role, apikey: user.apikey } });
        }
        return res.json({ status: false, message: "Datos incorrectos." });
    } catch (error) {
        return res.status(500).json({ status: false });
    }
});

module.exports = router;
