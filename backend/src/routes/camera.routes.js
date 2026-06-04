import { Router } from 'express';
import { createCamera, getCamera } from '../controllers/camera.controller.js';
import { verifyToken, requireAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// Apply veriyToken to all routes in this file
router.use(verifyToken);

// Allowed for both OPERATOR and ADMIN
router.get('/', getCamera);

// Only ADMIN can add a new camera
router.post('/', requireAdmin, createCamera);

export default router;
