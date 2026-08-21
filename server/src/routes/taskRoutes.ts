import { Router } from 'express';
import {
  generateTasks,
  addTasksBulk,
  getTasks,
  updateTask,
  deleteTask,
  reorderTasks,
  replanDay,
  getActiveMission,
} from '../controllers/taskController';

const router = Router();

router.post('/generate-tasks', generateTasks);
router.post('/tasks/bulk', addTasksBulk);
// Specific routes BEFORE parameterized routes
router.put('/tasks/reorder', reorderTasks);
router.post('/tasks/replan/:userId', replanDay);
router.get('/tasks/active/:userId', getActiveMission);
// Parameterized routes last
router.get('/tasks/:userId', getTasks);
router.put('/tasks/:taskId', updateTask);
router.delete('/tasks/:taskId', deleteTask);

export default router;
