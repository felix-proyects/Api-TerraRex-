const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');

const dbPath = path.join(__dirname, '../data/database.json');

const readDB = () => fs.readJsonSync(dbPath);
const writeDB = (data) => fs.writeJsonSync(dbPath, data, { spaces: 4 });

const generateApiKey = () => {
    const c = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = 'kzm-';
    for (let i = 0; i < 12; i++) key += c.charAt(Math.floor(Math.random() * c.length));
    return key;
};

router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const db = readDB();

        if (db.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim())) {
            return res.json({ status: false, message: "El correo ya existe." });
        }

        const newId = Math.floor(10000000 + Math.random() * 90000000);
        const newApiKey = generateApiKey();

        const newUser = {
            id: newId,
            username: username.trim(),
            email: email.toLowerCase().trim(),
            password: password,
            role: "user",
            limit: 100,
            requests_today: 0,
            total_requests: 0,
            apikey: newApiKey,
            last_reset: new Date().toISOString().split('T')[0]
        };

        db.users.push(newUser);
        writeDB(db);

        return res.json({ 
            status: true, 
            message: "Registro exitoso.", 
            id: newId, 
            apikey: newApiKey 
        });
    } catch (e) {
        return res.status(500).json({ status: false, message: "Error interno." });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const db = readDB();
        const user = db.users.find(u => 
            u.email.toLowerCase() === email.toLowerCase().trim() && 
            u.password === password
        );

        if (user) {
            return res.json({ 
                status: true, 
                user: { 
                    id: user.id, 
                    username: user.username, 
                    role: user.role, 
                    apikey: user.apikey 
                } 
            });
        }
        return res.json({ status: false, message: "Credenciales inválidas." });
    } catch (e) {
        return res.status(500).json({ status: false });
    }
});

module.exports = router;