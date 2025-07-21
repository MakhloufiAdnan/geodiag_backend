// src/routes/userRoutes.js

import { Router } from 'express';
import userController from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateUserCreation } from '../validators/userValidator.js'; 
import { authorize } from '../middleware/authorizationMiddleware.js';
import { validateUuidParam } from '../validators/commonValidator.js';
import { parsePagination } from '../middleware/paginationMiddleware.js';

/**
 * @file Définit les routes pour la gestion des utilisateurs (CRUD).
 */
const router = Router();

router.post(
    '/users', 
    protect, 
    validateUserCreation, 
    userController.createUser);
router.get(
    '/users', 
    protect, 
    authorize('admin'), 
    parsePagination(15), 
    userController.getAllUsers);

// Utilisation du nouveau validateur
router.get(
    '/users/:id', 
    protect,
    validateUuidParam('id'), 
    userController.getUserById);
router.put(
    '/users/:id', 
    protect, 
    validateUuidParam('id'), 
    userController.updateUser);
router.delete(
    '/users/:id', 
    protect, 
    authorize('admin'), 
    validateUuidParam('id'), 
    userController.deleteUser);

export default router;