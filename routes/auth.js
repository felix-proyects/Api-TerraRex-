const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const nodemailer = require('nodemailer');

const dbPath = path.join(__dirname, '../data/database.json');

// --- CONFIGURACIÓN DE GMAIL (PUERTO 587 - MÁS ESTABLE) ---
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Debe ser false para puerto 587
    auth: {
        user: 'frasesbebor@gmail.com',
        pass: 'kafvotvrxkignsrl' // Tu contraseña de aplicación (sin espacios)
    },
    tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
    }
});

// Verificación inmediata en consola
transporter.verify((error) => {
    if (error) {
        console.error("--- ERROR CRÍTICO DE CORREO ---");
        console.error(error.message);
    } else {
        console.log("--- GMAIL CONECTADO CORRECTAMENTE ---");
    }
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

async function sendVerificationMail(email, username, vCode, id) {
    const mailOptions = {
        from: '"Api Kazuma" <frasesbebor@gmail.com>',
        to: email,
        subject: `Tu código: ${vCode}`,
        html: `
            <div style="background-color: #0d1117; color: #ffffff; padding: 40px; border: 1px solid #ff2d55; font-family: sans-serif;">
                <h2 style="color: #ff2d55;">Verifica tu cuenta</h2>
                <p>Hola ${username}, tu código de activación es:</p>
                <div style="font-size: 32px; font-weight: bold; color: #ff2d55; border: 1px dashed #ff2d55; padding: 20px; text-align: center;">
                    ${vCode}
                </div>
                <p><a href="https://api.kazuma.giize.com/verify?code=${vCode}&id=${id}" style="color: #ff2d55;">Haz clic aquí para verificar</a></p>
            </div>
        `
    };
    return transporter.sendMail(mailOptions);
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

        // Envío directo sin .then para evitar cortes de proceso
        try {
            await sendVerificationMail(newUser.email, newUser.username, vCode, newId);
            console.log(`[OK] Mail enviado a ${newUser.email}`);
        } catch (e) {
            console.error(`[FAIL] Error enviando a ${newUser.email}:`, e.message);
        }

        return res.json({ status: true, message: "Código enviado.", id: newId });
    } catch (error) {
        return res.status(500).json({ status: false });
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
        user.codeExpires = new Date(Date.now() + 3600000).toISOString();

        writeDB(db);

        try {
            await sendVerificationMail(user.email, user.username, newVCode, user.id);
            console.log(`[OK] Reenvío exitoso a ${user.email}`);
        } catch (e) {
            console.error(`[FAIL] Error en reenvío:`, e.message);
        }

        return res.json({ status: true, message: "Código reenviado." });
    } catch (error) {
        return res.status(500).json({ status: false });
    }
});

router.post('/verify', async (req, res) => {
    try {
        const { id, code } = req.body;
        const db = readDB();
        const user = db.users.find(u => String(u.id) === String(id));

        if (!user || user.verificationCode !== code) {
            return res.json({ status: false, message: "Código o ID inválido." });
        }

        user.verified = true;
        user.verificationCode = null;
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
            if (!user.verified) return res.json({ status: "pending", id: user.id });
            return res.json({ status: true, user });
        }
        return res.json({ status: false, message: "Datos incorrectos." });
    } catch (error) {
        return res.status(500).json({ status: false });
    }
});

module.exports = router;
