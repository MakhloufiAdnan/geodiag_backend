import { Router } from 'express';
import userController from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateUserCreation, validateUserId } from '../validators/userValidator.js';

/**
 * @file Définit les routes pour la gestion des utilisateurs (CRUD).
 */
const router = Router();

// Toutes les routes sont protégées. L'autorisation (rôle) est gérée dans le service.
router.post('/users', protect, validateUserCreation, userController.createUser);
router.get('/users', protect, userController.getAllUsers);

// Les routes avec un ID valident que le paramètre est bien un UUID.
router.get('/users/:id', protect, validateUserId, userController.getUserById);
router.put('/users/:id', protect, validateUserId, userController.updateUser);
router.delete('/users/:id', protect, validateUserId, userController.deleteUser);

export default router;