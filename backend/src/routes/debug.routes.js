import { Router } from 'express';
import { createTestIncident, getSocketStatus } from '../controllers/incident.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verifyToken);

router.get('/socket-status', getSocketStatus);
router.post('/test-incident', createTestIncident);

export default router;
