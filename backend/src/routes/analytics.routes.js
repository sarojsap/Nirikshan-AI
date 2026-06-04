import { Router } from 'express';
import { getSummary } from '../controllers/analytics.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verifyToken);

router.get('/summary', getSummary);

export default router;
