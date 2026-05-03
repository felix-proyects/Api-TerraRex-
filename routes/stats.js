const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'database.json');
const routesPath = path.join(process.cwd(), 'routes');

router.get('/global', async (req, res) => {
    try {
        const db = await fs.readJson(dbPath);

        const files = await fs.readdir(routesPath);
        const endpointFiles = files.filter(file => 
            file.endsWith('.js') && 
            !['auth.js', 'admin.js', 'stats.js'].includes(file)
        );

        const totalRequests = db.users.reduce((acc, user) => acc + (user.total_requests || 0), 0);

        const topUsers = db.users
            .filter(u => (u.total_requests || 0) > 0)
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
            topUsers: topUsers,

            serverStart: global.serverStart || Date.now() 
        });

    } catch (err) {
        res.status(500).json({ status: false, message: "Error" });
    }
});

module.exports = router;