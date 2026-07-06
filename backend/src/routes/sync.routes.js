import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { getSyncStatus } from '../controllers/incident.controller.js';
import { syncPendingIncidents } from '../services/sync.service.js';

const router = Router();

router.use(verifyToken);

router.get('/status', getSyncStatus);

router.post('/trigger', async (req, res) => {
  try {
    const result = await syncPendingIncidents();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
