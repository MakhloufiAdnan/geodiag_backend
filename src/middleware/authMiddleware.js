export function protect(req, res, next) {
    const token = req.headers.authorization;

    if (token === 'un-bon-token') {
        // Vérification du token et extraction des informations de l'utilisateur
        // req.user = decodedToken; 
        next(); // L'utilisateur est authentifié
    } else {
        res.status(401).json({ message: 'Not authorized' });
    }
}