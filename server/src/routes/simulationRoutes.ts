import { Router } from 'express';
import { simulate, getSimulationHistory } from '../controllers/simulationController';

const router = Router();

router.post('/simulate', simulate);
router.get('/simulate/history/:userId', getSimulationHistory);

export default router;
