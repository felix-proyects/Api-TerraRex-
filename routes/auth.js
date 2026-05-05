const express = require('express');
const router = express.Router();
const { User } = require('../lib/db');

router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const existingUser = await User.findOne({ 
            where: { email: email.toLowerCase().trim() } 
        });

        if (existingUser) {
            return res.json({ status: false, message: "El correo ya existe." });
        }

        const newApiKey = 'kzm-' + Math.random().toString(36).substring(2, 15);
        
        const newUser = await User.create({
            username: username.trim(),
            email: email.toLowerCase().trim(),
            password: password,
            role: "user",
            limit: 100,
            apikey: newApiKey
        });

        return res.json({ 
            status: true, 
            message: "Registro exitoso.", 
            id: newUser.id, 
            apikey: newUser.apikey 
        });
    } catch (e) {
        return res.status(500).json({ status: false, message: "Error interno." });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ 
            where: { 
                email: email.toLowerCase().trim(), 
                password: password 
            } 
        });

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