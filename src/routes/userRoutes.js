import { Router } from 'express';
import userController from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateUserCreation, validateUserId } from '../validators/userValidator.js';

const router = Router();

// Routes générales
router.post('/users', protect, validateUserCreation, userController.createUser);
router.get('/users', protect, userController.getAllUsers);

// Routes spécifiques à un ID, avec validation du paramètre UUID
router.get('/users/:id', protect, validateUserId, userController.getUserById);
router.put('/users/:id', protect, validateUserId, userController.updateUser);
router.delete('/users/:id', protect, validateUserId, userController.deleteUser);

export default router;