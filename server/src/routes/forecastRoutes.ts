import { Router } from 'express';
import { getDailyForecast, getTwinEvolution } from '../controllers/forecastController';

const router = Router();

router.get('/forecast/:userId', getDailyForecast);
router.get('/evolution/:userId', getTwinEvolution);

export default router;
