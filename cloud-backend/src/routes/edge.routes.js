import { Router } from 'express';
import * as incidentController from '../controllers/incident.controller.js';
import * as deviceController from '../controllers/device.controller.js';
import { authenticateDevice } from '../middlewares/deviceAuth.middleware.js';

const router = Router();

router.post('/incidents', authenticateDevice, incidentController.receiveFromEdge);
router.post(
  '/upload-url/:incidentId',
  authenticateDevice,
  incidentController.requestMediaUploadUrl,
);
router.post('/heartbeat', authenticateDevice, deviceController.heartbeat);

export default router;
