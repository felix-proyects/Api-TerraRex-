const express = require('express');
const router = express.Router();
const { User, sequelize } = require('../lib/db');
const { Op } = require('sequelize');

const MAIN_ADMIN_EMAIL = "frasesbebor@gmail.com";

router.get('/users', async (req, res) => {
    try {
        const filter = req.query.filter;
        let whereClause = {};

        if (filter === 'admins') {
            whereClause.role = 'admin';
        } else if (filter === 'users') {
            whereClause.role = 'user';
        }

        const users = await User.findAll({ where: whereClause });
        const totalGlobal = await User.count();

        res.json({ 
            status: true, 
            users, 
            total: totalGlobal 
        });
    } catch (err) {
        res.status(500).json({ status: false, users: [], total: 0 });
    }
});

router.get('/search', async (req, res) => {
    try {
        const q = req.query.q ? req.query.q.toLowerCase() : "";

        const users = await User.findAll({
            where: {
                [Op.or]: [
                    { username: { [Op.like]: `%${q}%` } },
                    { email: { [Op.like]: `%${q}%` } },
                    { id: { [Op.like]: `%${q}%` } }
                ]
            }
        });

        const totalGlobal = await User.count();

        res.json({ status: true, users, total: totalGlobal });
    } catch (err) {
        res.status(500).json({ status: false, users: [] });
    }
});

router.post('/update-user', async (req, res) => {
    try {
        const { adminId, targetId, username, role, limit, email, password } = req.body;

        const admin = await User.findByPk(adminId);
        const target = await User.findByPk(targetId);

        if (!admin || admin.role !== 'admin') {
            return res.json({ status: false, message: "No tienes permisos de administrador" });
        }

        if (!target) {
            return res.json({ status: false, message: "Usuario no encontrado" });
        }

        if (target.email === MAIN_ADMIN_EMAIL && admin.email !== MAIN_ADMIN_EMAIL) {
            return res.json({ status: false, message: "Acceso denegado: No puedes editar al Dueño" });
        }

        await target.update({
            username: username,
            email: email,
            password: password,
            role: role,
            limit: parseInt(limit)
        });

        res.json({ status: true, message: "Usuario actualizado correctamente" });
    } catch (err) {
        res.json({ status: false, message: "Error interno al guardar cambios" });
    }
});

module.exports = router;
