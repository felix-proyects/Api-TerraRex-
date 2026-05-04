const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const nodemailer = require('nodemailer');

const dbPath = path.join(__dirname, '../data/database.json');

const readDB = () => fs.readJsonSync(dbPath);
const writeDB = (data) => fs.writeJsonSync(dbPath, data, { spaces: 4 });

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'frasesbebor@gmail.com',
        pass: 'kafvotvrxkignsrl'
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

router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    const db = readDB();

    if (db.users.find(u => u.email === email)) {
        return res.json({ status: false, message: "El correo ya está registrado." });
    }

    let newId;
    do {
        newId = Math.floor(10000000 + Math.random() * 90000000);
    } while (db.users.find(u => u.id === newId));

    const vCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    const newUser = {
        id: newId,
        username,
        email,
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
                <p style="font-size: 16px; line-height: 1.6;">Este es tu código para verificar tu cuenta en la <b>API Kazuma</b>:</p>
                
                <div style="background: rgba(255, 45, 85, 0.1); border: 2px dashed #ff2d55; padding: 20px; font-size: 32px; text-align: center; letter-spacing: 10px; font-weight: bold; color: #ff2d55; margin: 25px 0; border-radius: 10px;">
                    ${vCode}
                </div>
                
                <p style="font-size: 16px; line-height: 1.6;">• También puedes hacerlo de manera más rápida tocando el siguiente botón:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://api.kazuma.giize.com/verify?code=${vCode}&id=${newId}" style="background-color: #ff2d55; color: #ffffff; padding: 15px 35px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(255, 45, 85, 0.4); display: inline-block;">Verificar cuenta</a>
                </div>
                
                <p style="font-size: 14px; color: #8b949e; text-align: center; margin-top: 40px;">El código expira en 1 hora. Si no solicitaste esto, puedes ignorar este mensaje.</p>
                
                <div style="border-top: 1px solid #30363d; margin-top: 30px; padding-top: 20px; text-align: center;">
                    <a href="https://whatsapp.com/channel/0029Vb6sgWdJkK73qeLU0J0N" style="color: #ff2d55; text-decoration: none; font-size: 14px; font-weight: bold;">Canal de WhatsApp</a>
                    <p style="font-size: 12px; color: #8b949e; margin-top: 15px;">
                        Copyright © 2026 Kazuma. All rights reserved.<br>
                        Powered by <b>PixelCrew-Team</b>
                    </p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        db.users.push(newUser);
        writeDB(db);
        res.json({ status: true, message: "Código enviado al correo.", id: newId });
    } catch (error) {
        res.status(500).json({ status: false, message: "Error al enviar el correo." });
    }
});

router.post('/verify', async (req, res) => {
    const { id, code } = req.body;
    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id == id);

    if (userIndex === -1) return res.json({ status: false, message: "Usuario no encontrado." });
    
    const user = db.users[userIndex];
    const ahora = new Date();
    const expiracion = new Date(user.codeExpires);

    if (user.verified) return res.json({ status: false, message: "Esta cuenta ya está verificada." });
    if (user.verificationCode !== code) return res.json({ status: false, message: "Código incorrecto." });
    if (ahora > expiracion) return res.json({ status: false, message: "El código ha expirado." });

    let newKey;
    do {
        newKey = generateApiKey();
    } while (db.users.find(u => u.apikey === newKey));

    user.verified = true;
    user.verificationCode = null;
    user.codeExpires = null;
    user.apikey = newKey;

    writeDB(db);
    res.json({ status: true, message: "Cuenta verificada con éxito.", apikey: newKey });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const db = readDB();

    const user = db.users.find(u => u.email === email && u.password === password);

    if (user) {
        if (!user.verified) {
            return res.json({ status: "pending", message: "Cuenta no verificada.", id: user.id });
        }
        res.json({ 
            status: true, 
            user: { id: user.id, username: user.username, role: user.role, apikey: user.apikey } 
        });
    } else {
        res.json({ status: false, message: "Correo o contraseña incorrectos." });
    }
});

router.get('/user/:id', (req, res) => {
    const db = readDB();
    const user = db.users.find(u => u.id == req.params.id);
    if (user) res.json({ status: true, user });
    else res.json({ status: false });
});

router.post('/update', (req, res) => {
    const { id, type, value } = req.body;
    const db = readDB();
    const index = db.users.findIndex(u => u.id == id);
    if (index !== -1) {
        db.users[index][type] = value;
        writeDB(db);
        res.json({ status: true });
    } else res.json({ status: false });
});

router.post('/delete', (req, res) => {
    const { id } = req.body;
    const db = readDB();
    db.users = db.users.filter(u => u.id != id);
    writeDB(db);
    res.json({ status: true });
});

module.exports = router;