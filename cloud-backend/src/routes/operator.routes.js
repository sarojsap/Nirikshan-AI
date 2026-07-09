import { Router } from 'express';
import * as operatorController from '../controllers/operator.controller.js';
import {
  verifyToken,
  requireRole,
  scopeToOrganization,
} from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verifyToken, requireRole('ORG_ADMIN', 'SUPER_ADMIN'), scopeToOrganization);

router.post('/', operatorController.createOperator);
router.get('/', operatorController.getAllOperators);
router.get('/:id', operatorController.getOperator);
router.put('/:id', operatorController.updateOperator);
router.delete('/:id', operatorController.deleteOperator);
router.patch('/:id/password', operatorController.changeOperatorPassword);

export default router;
