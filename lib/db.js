const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME, 
    process.env.DB_USER, 
    process.env.DB_PASS, 
    {
        host: process.env.DB_HOST,
        dialect: 'mariadb',
        logging: false,
        dialectOptions: {
            connectTimeout: 10000
        }
    }
);

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: { 
        type: DataTypes.STRING 
    },
    email: { 
        type: DataTypes.STRING, 
        unique: true 
    },
    password: { 
        type: DataTypes.STRING 
    },
    role: { 
        type: DataTypes.STRING, 
        defaultValue: 'user' 
    },
    limit: { 
        type: DataTypes.INTEGER, 
        defaultValue: 100 
    },
    requests_today: { 
        type: DataTypes.INTEGER, 
        defaultValue: 0 
    },
    total_requests: { 
        type: DataTypes.INTEGER, 
        defaultValue: 0 
    },
    success_requests: { 
        type: DataTypes.INTEGER, 
        defaultValue: 0 
    },
    apikey: { 
        type: DataTypes.STRING, 
        unique: true 
    },
    last_reset: { 
        type: DataTypes.STRING, 
        defaultValue: new Date().toISOString().split('T')[0] 
    }
});

const initDB = async () => {
    try {
        await sequelize.authenticate();
        await sequelize.sync({ alter: true });
        
        const adminEmail = 'frasesbebor@gmail.com';
        const adminExists = await User.findOne({ where: { email: adminEmail } });
        
        if (!adminExists) {
            await User.create({
                username: 'Admin',
                email: adminEmail,
                password: 'Mantis2026',
                role: 'admin',
                limit: 1000,
                apikey: 'kzm-A1b2C-Akoajzpu'
            });
        }
    } catch (error) {
        throw error;
    }
};

module.exports = { User, initDB, sequelize };