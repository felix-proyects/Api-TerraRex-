const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');

const dbPath = path.join(__dirname, '../data/database.json');
const MAIN_ADMIN_EMAIL = "frasesbebor@gmail.com";

router.get('/users', async (req, res) => {
    try {
        const db = await fs.readJson(dbPath);
        const filter = req.query.filter;
        let users = db.users;

        if (filter === 'admins') {
            users = db.users.filter(u => u.role === 'admin');
        } else if (filter === 'users') {
            users = db.users.filter(u => u.role === 'user');
        }

        res.json({ status: true, users });
    } catch (err) {
        res.status(500).json({ status: false });
    }
});

router.get('/search', async (req, res) => {
    try {
        const db = await fs.readJson(dbPath);
        const q = req.query.q.toLowerCase();
        const users = db.users.filter(u => 
            u.username.toLowerCase().includes(q) || 
            u.email.toLowerCase().includes(q)
        );
        res.json({ status: true, users });
    } catch (err) {
        res.status(500).json({ status: false });
    }
});

router.post('/update-user', async (req, res) => {
    try {
        const { adminId, targetId, username, role, limit } = req.body;
        const db = await fs.readJson(dbPath);
        
        const admin = db.users.find(u => u.id == adminId);
        const target = db.users.find(u => u.id == targetId);

        if (!admin || admin.role !== 'admin') {
            return res.json({ status: false, message: "Acceso denegado" });
        }

        if (target.email === MAIN_ADMIN_EMAIL && admin.email !== MAIN_ADMIN_EMAIL) {
            return res.json({ status: false, message: "No puedes editar al Dueño de la API" });
        }

        target.username = username;
        target.role = role;
        target.limit = parseInt(limit);

        await fs.writeJson(dbPath, db, { spaces: 4 });
        res.json({ status: true });
    } catch (err) {
        res.json({ status: false, message: "Error al actualizar" });
    }
});

module.exports = router;