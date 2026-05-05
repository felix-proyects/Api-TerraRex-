const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const nodemailer = require('nodemailer');

const dbPath = path.join(__dirname, '../data/database.json');

// Utilidades de base de datos con manejo de errores síncrono
const readDB = () => {
    try {
        return fs.readJsonSync(dbPath);
    } catch (e) {
        console.error("Error leyendo DB:", e);
        return { users: [] };
    }
};

const writeDB = (data) => {
    try {
        fs.writeJsonSync(dbPath, data, { spaces: 4 });
    } catch (e) {
        console.error("Error escribiendo DB:", e);
    }
};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'frasesbebor@gmail.com',
        pass: 'kafvotvrxkignsrl' // Contraseña de aplicación
    }
});

const generateApiKey = () => {
    const chars1 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const chars2 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let p1 = '';
    for (let i = 0; i < 5; i++) {
        p1 += chars1.charAt(Math.floor(Math.random() * chars1.length));
    }
    let p2 = '';
    for (let i = 0; i < 8; i++) {
        p2 += chars2.charAt(Math.floor(Math.random() * chars2.length));
    }
    return `kzm-${p1}-${p2}`;
};

const sendVerificationMail = async (email, username, vCode, id) => {
    const mailOptions = {
        from: '"Api Kazuma" <frasesbebor@gmail.com>',
        to: email,
        subject: 'Verifica tu cuenta - Api Kazuma',
        html: `
            <div style="background-color: #0d1117; color: #ffffff; font-family: sans-serif; padding: 40px; border-radius: 15px; max-width: 600px; margin: auto; border: 1px solid #ff2d55;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #ff2d55; margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px;">Kazuma <span style="color: #ffffff;">Dash</span></h1>
                </div>
                <p style="font-size: 16px; line-height: 1.6;">¡Hola <b>${username}</b>!</p>
                <div style="background: rgba(255, 45, 85, 0.1); border: 2px dashed #ff2d55; padding: 20px; font-size: 32px; text-align: center; letter-spacing: 10px; font-weight: bold; color: #ff2d55; margin: 25px 0; border-radius: 10px;">
                    ${vCode}
                </div>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://api.kazuma.giize.com/verify?code=${vCode}&id=${id}" style="background-color: #ff2d55; color: #ffffff; padding: 15px 35px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block;">Verificar cuenta</a>
                </div>
                <p style="font-size: 12px; color: #8b949e; text-align: center;">Copyright © 2026 Kazuma. Powered by PixelCrew-Team</p>
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
            return res.json({ status: false, message: "El correo ya está registrado." });
        }

        const newId = Math.floor(10000000 + Math.random() * 90000000);
        const vCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 3600000);

        const newUser = {
            id: newId,
            username: username.trim(),
            email: email.toLowerCase().trim(),
            password,
            role: "user",
            limit: 100,
            requests_today: 0,
            total_requests: 0,
            apikey: "kzm-PENDING-VERIFICATION",
            last_reset: new Date().toISOString().split('T')[0],
            verified: false,
            verificationCode: vCode,
            codeExpires: expires.toISOString()
        };

        // 1. Escritura inmediata para evitar pérdida de datos si el mail falla
        db.users.push(newUser);
        writeDB(db);

        // 2. Correo en segundo plano
        sendVerificationMail(email, username, vCode, newId).catch(e => console.log("Mail Error:", e.message));

        return res.json({ status: true, message: "Código enviado.", id: newId });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Error en el servidor." });
    }
});

router.post('/resend', async (req, res) => {
    try {
        const { id } = req.body;
        const db = readDB();
        const user = db.users.find(u => String(u.id) === String(id));

        if (!user) return res.json({ status: false, message: "Usuario no encontrado." });
        if (user.verified) return res.json({ status: false, message: "Cuenta ya verificada." });

        const newVCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationCode = newVCode;
        user.codeExpires = new Date(Date.now() + 3600000).toISOString();

        writeDB(db);
        sendVerificationMail(user.email, user.username, newVCode, user.id).catch(e => console.log(e.message));

        return res.json({ status: true, message: "Nuevo código enviado." });
    } catch (error) {
        return res.status(500).json({ status: false, message: "Error al reenviar." });
    }
});

router.post('/verify', async (req, res) => {
    try {
        const { id, code } = req.body;
        const db = readDB();
        const userIndex = db.users.findIndex(u => String(u.id) === String(id));

        if (userIndex === -1) return res.json({ status: false, message: "Usuario no encontrado." });
        
        const user = db.users[userIndex];
        if (user.verified) return res.json({ status: false, message: "Ya verificada." });
        if (user.verificationCode !== code) return res.json({ status: false, message: "Código incorrecto." });
        if (new Date() > new Date(user.codeExpires)) return res.json({ status: false, message: "Código expirado." });

        user.verified = true;
        user.verificationCode = null;
        user.codeExpires = null;
        user.apikey = generateApiKey();

        writeDB(db);
        return res.json({ status: true, message: "Verificado con éxito.", apikey: user.apikey });
    } catch (error) {
        return res.status(500).json({ status: false, message: "Error en verificación." });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const db = readDB();
        const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password);

        if (user) {
            if (!user.verified) return res.json({ status: "pending", message: "Cuenta no verificada.", id: user.id });
            return res.json({ 
                status: true, 
                user: { id: user.id, username: user.username, role: user.role, apikey: user.apikey } 
            });
        }
        return res.json({ status: false, message: "Credenciales incorrectas." });
    } catch (error) {
        return res.status(500).json({ status: false, message: "Error en login." });
    }
});

module.exports = router;