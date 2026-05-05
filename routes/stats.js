const express = require('express');
const router = express.Router();
const { User, sequelize } = require('../lib/db');
const fs = require('fs-extra');
const path = require('path');

router.get('/global', async (req, res) => {
    try {
        const routesPath = path.join(process.cwd(), 'routes');
        const files = await fs.readdir(routesPath);
        const endpointFiles = files.filter(file => 
            file.endsWith('.js') && 
            !['auth.js', 'admin.js', 'stats.js'].includes(file)
        );

        const totalUsers = await User.count();
        
        const stats = await User.findOne({
            attributes: [
                [sequelize.fn('SUM', sequelize.col('total_requests')), 'totalRequests'],
                [sequelize.fn('SUM', sequelize.col('success_requests')), 'totalSuccess']
            ],
            raw: true
        });

        const topUsers = await User.findAll({
            attributes: ['username', ['total_requests', 'requests']],
            where: {
                total_requests: { [sequelize.Op.gt]: 0 }
            },
            order: [['total_requests', 'DESC']],
            limit: 5,
            raw: true
        });

        res.json({
            status: true,
            totalUsers: totalUsers,
            totalRequests: parseInt(stats.totalRequests) || 0,
            totalSuccess: parseInt(stats.totalSuccess) || 0,
            totalErrors: 0, 
            totalEndpoints: endpointFiles.length,
            topUsers: topUsers,
            serverStart: global.serverStart || Date.now()
        });

    } catch (err) {
        res.status(500).json({ status: false, message: "Error" });
    }
});

module.exports = router;