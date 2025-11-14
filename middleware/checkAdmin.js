module.exports = function checkAdmin(req, res, next) {
	// Este middleware asume que hay un middleware de autenticación previo
	// que pone el objeto `req.user` con la propiedad `role`.
	if (!req.user) {
		return res.status(401).json({ error: 'No autenticado' });
	}
	if (req.user.role !== 'admin') {
		return res.status(403).json({ error: 'Acceso restringido: admin requerido' });
	}
	next();
}