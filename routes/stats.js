const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');

const dbPath = path.join(__dirname, '../data/database.json');
const routesPath = path.join(__dirname, '../routes');

router.get('/global', async (req, res) => {
    try {
        const db = await fs.readJson(dbPath);
        
        // 1. Contar Endpoints (archivos en /routes menos auth.js y stats.js)
        const files = await fs.readdir(routesPath);
        const endpointFiles = files.filter(file => 
            file.endsWith('.js') && 
            file !== 'auth.js' && 
            file !== 'stats.js'
        );

        // 2. Calcular Solicitudes Totales Globales
        const totalRequests = db.users.reduce((acc, user) => acc + (user.total_requests || 0), 0);

        // 3. Obtener Top 5 Usuarios
        // Ordena por total_requests de mayor a menor y toma los primeros 5
        const topUsers = db.users
            .filter(u => u.username !== 'Admin') // Opcional: excluir al admin del top
            .sort((a, b) => (b.total_requests || 0) - (a.total_requests || 0))
            .slice(0, 5)
            .map(u => ({
                username: u.username,
                requests: u.total_requests || 0
            }));

        res.json({
            status: true,
            totalRequests: totalRequests,
            totalEndpoints: endpointFiles.length,
            topUsers: topUsers
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, message: "Error al obtener estadísticas" });
    }
});

module.exports = router;