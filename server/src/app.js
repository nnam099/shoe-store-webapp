import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use('/api', healthRoutes);

// Catch-all 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized error handler
app.use(errorHandler);

export default app;
