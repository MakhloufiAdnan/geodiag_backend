import { Router } from 'express';
import userController from '../controllers/userController.js';

const router = Router();

// L'URL /api/users sera gérée par cette route
router.get('/users', userController.getAllUsers);

export default router;