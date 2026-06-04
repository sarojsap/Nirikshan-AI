import { Router } from 'express';
import { logIncident, getIncidents } from '../controllers/incident.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Apply authentication middleware to all incident routes
router.use(verifyToken)

// GET /api/incidents -> Fetch all incidents for the dashboard
router.get('/', getIncidents);

// POST /api/incidents -> Log a new incident (Called by Python AI Service)
router.post('/', logIncident);

export default router;