const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const nodemailer = require('nodemailer');

const dbPath = path.join(__dirname, '../data/database.json');

// --- CONFIGURACIÓN DE GMAIL (PUERTO 465 SSL - MÁS RÁPIDO) ---
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

// --- UTILIDADES SÍNCRONAS ---
const readDB = () => fs.readJsonSync(dbPath);
const writeDB = (data) => fs.writeJsonSync(dbPath, data, { spaces: 4 });

const generateApiKey = () => {
    const c = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = 'kzm-';
    for (let i = 0; i < 12; i++) key += c.charAt(Math.floor(Math.random() * c.length));
    return key;
};

// Función de envío aislada para que NO mate el proceso si falla
async function sendMail(email, username, vCode, id) {
    const mailOptions = {
        from: '"Api Kazuma" <frasesbebor@gmail.com>',
        to: email,
        subject: `Código ${vCode}`,
        html: `<div style="background:#0d1117;color:#fff;padding:20px;border:1px solid #ff2d55;">
                <h2>Tu código es: ${vCode}</h2>
                <a href="https://api.kazuma.giize.com/verify?code=${vCode}&id=${id}" style="color:#ff2d55;">Click aquí para verificar</a>
               </div>`
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log(`[MAIL OK] Enviado a ${email}`);
    } catch (err) {
        console.log(`[MAIL ERROR] No se pudo enviar a ${email}: ${err.message}`);
    }
}

// --- RUTAS ---

router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const db = readDB();

        if (db.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim())) {
            return res.json({ status: false, message: "Correo ya existe" });
        }

        const newId = Math.floor(10000000 + Math.random() * 90000000);
        const vCode = Math.floor(100000 + Math.random() * 900000).toString();

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
            codeExpires: new Date(Date.now() + 3600000).toISOString()
        };

        db.users.push(newUser);
        writeDB(db);

        // Disparamos el correo sin "await" para que la respuesta al cliente sea instantánea
        sendMail(newUser.email, newUser.username, vCode, newId);

        return res.json({ status: true, message: "Código enviado", id: newId });
    } catch (e) {
        res.status(500).json({ status: false });
    }
});

router.post('/resend', async (req, res) => {
    try {
        const { id } = req.body;
        const db = readDB();
        const user = db.users.find(u => String(u.id) === String(id));

        if (!user) return res.json({ status: false, message: "No encontrado" });

        const newVCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationCode = newVCode;
        writeDB(db);

        sendMail(user.email, user.username, newVCode, user.id);

        return res.json({ status: true, message: "Reenviado" });
    } catch (e) {
        res.status(500).json({ status: false });
    }
});

router.post('/verify', async (req, res) => {
    try {
        const { id, code } = req.body;
        const db = readDB();
        const user = db.users.find(u => String(u.id) === String(id));

        if (!user || user.verificationCode !== code) {
            return res.json({ status: false, message: "Código inválido" });
        }

        user.verified = true;
        user.verificationCode = null;
        user.apikey = generateApiKey();

        writeDB(db);
        return res.json({ status: true, message: "Verificado", apikey: user.apikey });
    } catch (e) {
        res.status(500).json({ status: false });
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
        return res.json({ status: false, message: "Datos incorrectos" });
    } catch (e) {
        res.status(500).json({ status: false });
    }
});

module.exports = router;
