import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', verifyToken, authController.getMe);
router.post(
  '/organizations',
  verifyToken,
  requireRole('SUPER_ADMIN'),
  authController.createOrganization,
);

export default router;
