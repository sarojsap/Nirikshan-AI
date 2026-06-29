import { Router } from 'express';
import {
  createCamera,
  getCameras,
  getCamera,
  updateSettings,
  deleteCamera,
} from '../controllers/camera.controller.js';
import { verifyToken, requireAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// Apply veriyToken to all routes in this file
router.use(verifyToken);

// Allowed for both OPERATOR and ADMIN
router.get('/', getCameras);

// Fetch specific camera config
router.get('/:id', getCamera);

// Only ADMIN can add a new camera
router.post('/', requireAdmin, createCamera);

// Update configs
router.put('/:id/settings', requireAdmin, updateSettings);

// Delete camera
router.delete('/:id', requireAdmin, deleteCamera);

export default router;
