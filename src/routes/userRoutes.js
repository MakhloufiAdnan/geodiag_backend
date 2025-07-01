import { Router } from 'express';
import userController from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate, createUserSchema } from '../validators/userValidator.js';

const router = Router();

router.post('/users', validate(createUserSchema), userController.createUser);
router.get('/users', userController.getAllUsers);
router.get('/users/:id', userController.getUserById);
router.put('/users/:id', userController.updateUser);
router.delete('/users/:id', protect, userController.deleteUser);

export default router;