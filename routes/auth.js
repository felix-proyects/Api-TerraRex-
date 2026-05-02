const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');

const dbPath = path.join(__dirname, '../data/database.json');

const readDB = () => fs.readJsonSync(dbPath);
const writeDB = (data) => fs.writeJsonSync(dbPath, data, { spaces: 4 });

router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    const db = readDB();

    if (db.users.find(u => u.email === email)) {
        return res.json({ status: false, message: "El correo ya está registrado." });
    }

    // Generar ID de 8 dígitos numéricos
    let newId;
    do {
        newId = Math.floor(10000000 + Math.random() * 90000000);
    } while (db.users.find(u => u.id === newId));

    const newUser = {
        id: newId,
        username,
        email,
        password,
        role: "user",
        limit: 50,
        requests_today: 0,
        last_reset: new Date().toISOString().split('T')[0]
    };

    db.users.push(newUser);
    writeDB(db);

    res.json({ status: true, message: "Usuario registrado con éxito.", id: newId });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const db = readDB();

    const user = db.users.find(u => u.email === email && u.password === password);

    if (user) {
        res.json({ 
            status: true, 
            user: { id: user.id, username: user.username, role: user.role } 
        });
    } else {
        res.json({ status: false, message: "Correo o contraseña incorrectos." });
    }
});

module.exports = router;