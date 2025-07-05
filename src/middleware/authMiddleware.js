import jwt from 'jsonwebtoken';

/**
 * Middleware pour protéger les routes.
 * Vérifie la présence et la validité d'un token JWT Bearer.
 * Attache le payload décodé à `req.user`.
 */
export function protect(req, res, next) {
    let token;

    // Vérifie si le token est dans les en-têtes et s'il est de type Bearer
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Accès non autorisé, token manquant.' });
    }

    try {
        // Vérifie le token en utilisant le secret stocké dans les variables d'environnement
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attache les informations de l'utilisateur à l'objet de la requête
        req.user = decoded;
        
        next();
    } catch (error) { 
        // Log de l'erreur pour le débogage en production
        console.error('Erreur de vérification JWT:', error.message);
        
        res.status(401).json({ message: 'Token non valide.' });
    }
}