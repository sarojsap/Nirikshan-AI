import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as notificationController from '../controllers/notification.controller.js';

const router = Router();

router.use(authenticate);

router.post('/register', notificationController.registerToken);
router.post('/unregister', notificationController.unregisterToken);

export default router;
