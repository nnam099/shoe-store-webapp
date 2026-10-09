import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.routes.js';
import orderRoutes from './routes/order.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use('/api', healthRoutes);
app.use('/api', orderRoutes);

// Catch-all 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${req.method} ${req.originalUrl}`
    }
  });
});

// Centralized error handler
app.use(errorHandler);

export default app;
