import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import userRoutes from './routes/userRoutes';
import chatRoutes from './routes/chatRoutes';
import simulationRoutes from './routes/simulationRoutes';
import taskRoutes from './routes/taskRoutes';
import activityRoutes from './routes/activityRoutes';
import forecastRoutes from './routes/forecastRoutes';

// Load .env from root (works whether run from /server or project root)
dotenv.config({ path: require('path').resolve(__dirname, '../../.env') });
dotenv.config({ path: require('path').resolve(__dirname, '../../../.env') }); // fallback for root run
dotenv.config(); // final fallback

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', userRoutes);
app.use('/api', chatRoutes);
app.use('/api', simulationRoutes);
app.use('/api', taskRoutes);
app.use('/api', activityRoutes);
app.use('/api', forecastRoutes);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: '🧠 You² API is running',
    timestamp: new Date().toISOString(),
  });
});

// API overview
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: '🧠 You² API',
    version: '1.0.0',
    endpoints: {
      user: {
        create: 'POST /api/create-user',
        get: 'GET /api/get-user/:userId',
        update: 'PUT /api/update-user/:userId',
        list: 'GET /api/users',
      },
      chat: {
        send: 'POST /api/chat',
        history: 'GET /api/chat/history/:userId',
      },
      simulation: {
        run: 'POST /api/simulate',
        history: 'GET /api/simulate/history/:userId',
      },
      tasks: {
        generate: 'POST /api/generate-tasks',
        list: 'GET /api/tasks/:userId',
        update: 'PUT /api/tasks/:taskId',
        delete: 'DELETE /api/tasks/:taskId',
      },
      activity: {
        log: 'POST /api/activity',
        stats: 'GET /api/activity/stats/:userId',
        insights: 'GET /api/insights/:userId',
      },
    },
  });
});

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

const startServer = async () => {
  await connectDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 You² server running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer();
