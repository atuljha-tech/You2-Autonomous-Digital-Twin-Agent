import { Router } from 'express';
import { 
  createUser, 
  getUser, 
  getAllUsers, 
  updateUser 
} from '../controllers/userController';

const router = Router();

// Create new user (digital twin)
router.post('/create-user', createUser);

// Get user by ID
router.get('/get-user/:userId', getUser);

// Get all users
router.get('/users', getAllUsers);

// Update user
router.put('/update-user/:userId', updateUser);

export default router;
