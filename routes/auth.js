const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const nodemailer = require('nodemailer');

const dbPath = path.join(__dirname, '../data/database.json');

// Funciones de utilidad síncronas para evitar colisiones con el Middleware
const readDB = () => fs.readJsonSync(dbPath);
const writeDB = (data) => fs.writeJsonSync(dbPath, data, { spaces: 4 });

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'frasesbebor@gmail.com',
        pass: 'kafvotvrxkignsrl' // Contraseña de aplicación actualizada
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
                <p style="font-size: 16px; line-height: 1.6;">Tu código de verificación es:</p>
                <div style="background: rgba(255, 45, 85, 0.1); border: 2px dashed #ff2d55; padding: 20px; font-size: 32px; text-align: center; letter-spacing: 10px; font-weight: bold; color: #ff2d55; margin: 25px 0; border-radius: 10px;">
                    ${vCode}
                </div>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://api.kazuma.giize.com/verify?code=${vCode}&id=${id}" style="background-color: #ff2d55; color: #ffffff; padding: 15px 35px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 18px; display: inline-block;">Verificar ahora</a>
                </div>
                <p style="font-size: 12px; color: #8b949e; text-align: center;">Copyright © 2026 Kazuma | Powered by PixelCrew-Team</p>
            </div>
        `
    };
    return transporter.sendMail(mailOptions);
};

// --- RUTA DE REGISTRO OPTIMIZADA ---
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const db = readDB();

        if (db.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim())) {
            return res.json({ status: false, message: "El correo ya está registrado." });
        }

        const newId = Math.floor(10000000 + Math.random() * 90000000);
        const vCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 3600000); // Expira en 1 hora

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
            codeExpires: expires.toISOString()
        };

        // PASO 1: Guardar en DB inmediatamente para asegurar persistencia
        db.users.push(newUser);
        writeDB(db);

        // PASO 2: Intentar enviar correo en segundo plano (no bloquea la respuesta)
        sendVerificationMail(newUser.email, newUser.username, vCode, newId)
            .catch(err => console.error("[ERROR MAIL]:", err.message));

        // PASO 3: Responder al cliente de una vez
        return res.json({ status: true, message: "Código enviado.", id: newId });

    } catch (error) {
        console.error("[ERROR REGISTER]:", error);
        return res.status(500).json({ status: false, message: "Error crítico en el servidor." });
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
        return res.status(500).json({ status: false });
    }
});

router.post('/verify', async (req, res) => {
    try {
        const { id, code } = req.body;
        const db = readDB();
        const user = db.users.find(u => String(u.id) === String(id));

        if (!user) return res.json({ status: false, message: "Usuario no encontrado." });
        if (user.verified) return res.json({ status: false, message: "Ya verificada." });
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

// Rutas de utilidad para el Panel Staff
router.get('/user/:id', (req, res) => {
    try {
        const db = readDB();
        const user = db.users.find(u => String(u.id) === String(req.params.id));
        return user ? res.json({ status: true, user }) : res.json({ status: false });
    } catch (e) { res.status(500).json({ status: false }); }
});

module.exports = router;