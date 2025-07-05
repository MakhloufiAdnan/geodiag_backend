import jwt from 'jsonwebtoken';

export function generateToken(payload) {
    const secret = process.env.JWT_SECRET;
    const options = { expiresIn: '1h' }; 
    return jwt.sign(payload, secret, options);
}