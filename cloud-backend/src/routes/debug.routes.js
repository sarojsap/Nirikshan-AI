import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verifyToken, requireRole('SUPER_ADMIN'));

router.get('/socket-status', (req, res) => {
  const io = req.app.get('io');
  res.json({
    connectedClients: io?.engine?.clientsCount || 0,
    rooms: io?.sockets?.adapter?.rooms ? [...io.sockets.adapter.rooms.keys()].filter(r => !r.startsWith('/')) : [],
  });
});

export default router;
