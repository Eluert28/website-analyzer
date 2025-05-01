// middleware/auth.js
exports.checkAuth = (req, res, next) => {
  // Einfache Authentifizierungsprüfung (Mock)
  // In einer Produktionsumgebung würdest du hier eine richtige Authentifizierung implementieren
  req.user = { id: 1, username: 'admin' }; // Mock-Benutzer
  next(); // Weiter zum nächsten Middleware
};