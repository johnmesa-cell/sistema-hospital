const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

// Ajusta estas requires según tu proyecto:
// - `authenticate` debe ser el middleware que valida token/session y setea req.user
// - la forma de importar el modelo User puede variar (Sequelize / Mongoose / index de modelos)
const authenticate = require('../middleware/auth'); // <-- AJUSTAR ruta si hace falta
const checkAdmin = require('../middleware/checkAdmin');     // ruta creada arriba

// Intento simple de resolver el modelo User; si no cuadra, reemplaza por require directo a tu modelo.
let User;
try {
	User = require('../models').User || require('../models/user');
} catch (e) {
	try {
		User = require('../src/models').User || require('../src/models/user');
	} catch (e2) {
		// Si no se puede resolver automáticamente, el desarrollador debe ajustar manualmente.
		User = null;
	}
}

// POST /admin/create
// Body: { email, password, name? }
// Crea un usuario con role='admin'
router.post('/create', authenticate, checkAdmin, async (req, res) => {
	if (!User) {
		return res.status(500).json({ error: 'No se pudo resolver el modelo User. Ajusta la importación en routes/admin.js' });
	}

	const { email, password, name } = req.body || {};
	if (!email || !password) {
		return res.status(400).json({ error: 'Faltan campos: email y password son obligatorios' });
	}

	try {
		const hash = await bcrypt.hash(password, 10);
		// Manejar Sequelize (create) o Mongoose (new + save)
		if (typeof User.create === 'function') {
			const payload = { email, password: hash, role: 'admin' };
			if (name) payload.name = name;
			const created = await User.create(payload);
			return res.status(201).json({ ok: true, user: { id: created.id || created._id, email: created.email } });
		}

		// Mongoose style
		try {
			const instance = new User({ email, password: hash, role: 'admin', name });
			if (typeof instance.save === 'function') {
				const saved = await instance.save();
				return res.status(201).json({ ok: true, user: { id: saved._id, email: saved.email } });
			}
		} catch (err) {
			// continuar al error final
		}

		return res.status(500).json({ error: 'Modelo User no compatible (no tiene create ni save)' });
	} catch (err) {
		return res.status(500).json({ error: 'Error al crear admin', details: err.message });
	}
});

module.exports = router;
