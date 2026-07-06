import { Router } from 'express';
import * as incidentController from '../controllers/incident.controller.js';
import { verifyToken, scopeToOrganization } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', verifyToken, scopeToOrganization, incidentController.list);
router.get('/summary', verifyToken, scopeToOrganization, incidentController.summary);
router.get('/:id', verifyToken, scopeToOrganization, incidentController.getById);

export default router;
