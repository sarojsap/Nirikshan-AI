import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import * as notificationController from '../controllers/notification.controller.js';

const router = Router();

router.use(verifyToken);

router.post('/register', notificationController.registerToken);
router.post('/unregister', notificationController.unregisterToken);

export default router;
