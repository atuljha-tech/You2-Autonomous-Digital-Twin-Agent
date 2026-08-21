import { Router } from 'express';
import { chat, getChatHistory } from '../controllers/chatController';

const router = Router();

router.post('/chat', chat);
router.get('/chat/history/:userId', getChatHistory);

export default router;
