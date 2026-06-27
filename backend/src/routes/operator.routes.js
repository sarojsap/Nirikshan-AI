import { Router } from 'express';
import {
  createOperator,
  getAllOperators,
  getOperator,
  changeOperatorPassword,
  updateOperator,
  deleteOperator,
} from '../controllers/operator.controller.js';
import { verifyToken, requireAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// All operator management routes require authentication + admin role
router.use(verifyToken, requireAdmin);

// CRUD operations
router.post('/', createOperator);
router.get('/', getAllOperators);
router.get('/:id', getOperator);
router.put('/:id', updateOperator);
router.delete('/:id', deleteOperator);

// Password management (no old password verification needed)
router.patch('/:id/password', changeOperatorPassword);

export default router;
