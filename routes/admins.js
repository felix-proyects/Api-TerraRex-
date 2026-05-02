// Dentro de routes/admin.js
const MAIN_ADMIN_EMAIL = "frasesbebor@gmail.com";

router.post('/update-user', async (req, res) => {
    const { adminId, targetId, username, role, limit } = req.body;
    const db = await fs.readJson(dbPath);
    
    const admin = db.users.find(u => u.id == adminId);
    const target = db.users.find(u => u.id == targetId);

    if (!admin || admin.role !== 'admin') return res.json({ status: false, message: "No autorizado" });

    // REGLA DE ORO: Si el objetivo es el Admin Principal y el que edita NO es él, bloqueamos.
    if (target.email === MAIN_ADMIN_EMAIL && admin.email !== MAIN_ADMIN_EMAIL) {
        return res.json({ status: false, message: "No puedes editar al Dueño de la API" });
    }

    target.username = username;
    target.role = role;
    target.limit = limit;

    await fs.writeJson(dbPath, db, { spaces: 4 });
    res.json({ status: true });
});
