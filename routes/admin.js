const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');

// Esto busca la carpeta data en la raíz del proyecto sin importar desde dónde se ejecute
const dbPath = path.join(process.cwd(), 'data', 'database.json');

router.get('/users', async (req, res) => {
    try {
        console.log("Intentando leer DB en:", dbPath); // Esto saldrá en pm2 logs
        if (!(await fs.pathExists(dbPath))) {
            return res.json({ status: false, users: [], message: "Archivo no encontrado" });
        }
        
        const db = await fs.readJson(dbPath);
        const filter = req.query.filter;
        let users = db.users || [];

        if (filter === 'admins') {
            users = users.filter(u => u.role === 'admin');
        } else if (filter === 'users') {
            users = users.filter(u => u.role === 'user');
        }

        res.json({ status: true, users });
    } catch (err) {
        console.error("Error crítico en /users:", err);
        res.status(500).json({ status: false, users: [], error: err.message });
    }
});

// ... tu ruta search y update-user igual ...
module.exports = router;