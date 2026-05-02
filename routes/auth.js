const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');

const dbPath = path.join(__dirname, '../data/database.json');

const readDB = () => fs.readJsonSync(dbPath);
const writeDB = (data) => fs.writeJsonSync(dbPath, data, { spaces: 4 });

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

    let newKey;
    do {
        newKey = generateApiKey();
    } while (db.users.find(u => u.apikey === newKey));

    const newUser = {
        id: newId,
        username,
        email,
        password,
        role: "user",
        limit: 100,
        requests_today: 0,
        total_requests: 0,
        apikey: newKey,
        last_reset: new Date().toISOString().split('T')[0]
    };

    db.users.push(newUser);
    writeDB(db);

    res.json({ status: true, message: "Usuario registrado con éxito.", id: newId, apikey: newKey });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const db = readDB();

    const user = db.users.find(u => u.email === email && u.password === password);

    if (user) {
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