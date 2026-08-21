import { Router } from 'express';
import { logActivity, getActivityStats, getInsights, logActivityBatch, getRecentActivity } from '../controllers/activityController';

const router = Router();

router.post('/activity', logActivity);
router.post('/activity/batch', logActivityBatch);
router.get('/activity/recent/:userId', getRecentActivity);
router.get('/activity/stats/:userId', getActivityStats);
router.get('/insights/:userId', getInsights);

export default router;
