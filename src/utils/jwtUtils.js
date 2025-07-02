import jwt from 'jsonwebtoken';

/**
 * Génère un token JWT pour un utilisateur.
 * @param {string} userId - L'ID de l'utilisateur.
 * @returns {string} Le token JWT.
 */
export function generateToken(userId) {
    // 1. Le contenu du token
    const payload = {
        id: userId,
    };

    // 2. La clé secrète 
    const secret = process.env.JWT_SECRET;

    // 3. Les options, y compris la durée de vie
    const options = {
        expiresIn: '1h', // Le token expirera dans 1 heure
    };

    return jwt.sign(payload, secret, options);
}