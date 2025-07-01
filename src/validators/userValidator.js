import Joi from 'joi';

export const createUserSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
    role: Joi.string().valid('admin', 'technician').required(),
    company_id: Joi.string().uuid().required(),
});

// Middleware de validation
export const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
        // Si la validation échoue, on renvoie une erreur 400
        return res.status(400).json({ message: error.details[0].message });
    }
    next();
};