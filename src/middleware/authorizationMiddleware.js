import { ForbiddenException } from '../exceptions/apiException.js';

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user ||!roles.includes(req.user.role)) {
            // Lève une exception, attrapée par le errorHandler
            return next(new ForbiddenException('Accès refusé. Permissions insuffisantes.'));
        }
        next();
    };
};