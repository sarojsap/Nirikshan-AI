import { Router } from 'express';
import * as deviceController from '../controllers/device.controller.js';
import {
  verifyToken,
  requireRole,
  scopeToOrganization,
} from '../middlewares/auth.middleware.js';

const router = Router();

router.post(
  '/',
  verifyToken,
  requireRole('ORG_ADMIN', 'SUPER_ADMIN'),
  scopeToOrganization,
  deviceController.register,
);
router.get('/', verifyToken, scopeToOrganization, deviceController.list);
router.get('/:id', verifyToken, scopeToOrganization, deviceController.getById);
router.put(
  '/:id/config',
  verifyToken,
  requireRole('ORG_ADMIN', 'SUPER_ADMIN'),
  scopeToOrganization,
  deviceController.updateConfig,
);
router.delete(
  '/:id',
  verifyToken,
  requireRole('ORG_ADMIN', 'SUPER_ADMIN'),
  scopeToOrganization,
  deviceController.remove,
);

export default router;
