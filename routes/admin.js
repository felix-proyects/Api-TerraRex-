const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');

// Ruta absoluta a la base de datos
const dbPath = path.join(process.cwd(), 'data', 'database.json');
const MAIN_ADMIN_EMAIL = "frasesbebor@gmail.com";

// --- RUTA: OBTENER TODOS LOS USUARIOS ---
router.get('/users', async (req, res) => {
    try {
        if (!(await fs.pathExists(dbPath))) {
            return res.json({ status: false, users: [], total: 0, message: "Archivo database.json no encontrado" });
        }

        const db = await fs.readJson(dbPath);
        const filter = req.query.filter;
        let users = db.users || [];
        const totalGlobal = users.length; // Para el contador del dashboard

        if (filter === 'admins') {
            users = users.filter(u => u.role === 'admin');
        } else if (filter === 'users') {
            users = users.filter(u => u.role === 'user');
        }

        res.json({ 
            status: true, 
            users, 
            total: totalGlobal 
        });
    } catch (err) {
        console.error("Error en GET /users:", err);
        res.status(500).json({ status: false, users: [], total: 0, error: err.message });
    }
});

// --- RUTA: BUSCAR USUARIOS (Inlcuye búsqueda por ID) ---
router.get('/search', async (req, res) => {
    try {
        const db = await fs.readJson(dbPath);
        const q = req.query.q ? req.query.q.toLowerCase() : "";

        const users = db.users.filter(u => 
            u.username.toLowerCase().includes(q) || 
            u.email.toLowerCase().includes(q) ||
            String(u.id).includes(q) // Permite buscar por el número de ID
        );

        res.json({ status: true, users, total: db.users.length });
    } catch (err) {
        console.error("Error en GET /search:", err);
        res.status(500).json({ status: false, users: [] });
    }
});

// --- RUTA: ACTUALIZAR USUARIO ---
router.post('/update-user', async (req, res) => {
    try {
        const { adminId, targetId, username, role, limit } = req.body;
        const db = await fs.readJson(dbPath);

        // Buscamos usando == para ignorar si uno es String y el otro Number
        const admin = db.users.find(u => u.id == adminId);
        const target = db.users.find(u => u.id == targetId);

        if (!admin || admin.role !== 'admin') {
            return res.json({ status: false, message: "No tienes permisos de administrador" });
        }

        if (!target) {
            return res.json({ status: false, message: "Usuario no encontrado" });
        }

        // Protección para el Dueño Principal
        if (target.email === MAIN_ADMIN_EMAIL && admin.email !== MAIN_ADMIN_EMAIL) {
            return res.json({ status: false, message: "Acceso denegado: No puedes editar al Dueño" });
        }

        // Aplicar cambios
        target.username = username;
        target.role = role;
        target.limit = parseInt(limit);

        await fs.writeJson(dbPath, db, { spaces: 4 });
        res.json({ status: true, message: "Usuario actualizado correctamente" });
    } catch (err) {
        console.error("Error en POST /update-user:", err);
        res.json({ status: false, message: "Error interno al guardar cambios" });
    }
});

module.exports = router;
