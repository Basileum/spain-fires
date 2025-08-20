import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fireRoutes from './routes/fireRoutes';
import cumulatedFireRoutes from './routes/cumulatedFireRoutes';
import { createFileLogger } from './utils/logger';

// Load environment variables
dotenv.config();

const logger = createFileLogger('index.ts');
const app = express();
const PORT = process.env.PORT || 3001;

logger.info('Starting Spain Forest Fires API server', 'main');

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['http://localhost', 'http://127.0.0.1', 'http://localhost:80', 'http://127.0.0.1:80']
    : [process.env.FRONTEND_URL || 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

logger.info('Middleware configured', 'main');

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`, 'request-logger', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Routes
app.use('/api/fires', fireRoutes);
app.use('/api/cumulated-fires', cumulatedFireRoutes);
logger.info('Fire routes mounted', 'main');
logger.info('Cumulated fire routes mounted', 'main');

// Root endpoint
app.get('/', (req, res) => {
  logger.info('Root endpoint accessed', 'root-endpoint');
  res.json({
    message: 'Spain Forest Fires API',
    version: '1.0.0',
    endpoints: {
      health: '/api/fires/health',
      today: '/api/fires/today',
      date: '/api/fires/date/:date',
      range: '/api/fires/range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD',
      cumulated: '/api/cumulated-fires?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&resolution=X'
    }
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error occurred', 'error-handler', err, {
    method: req.method,
    path: req.path,
    ip: req.ip
  });
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn('404 - Endpoint not found', '404-handler', {
    method: req.method,
    path: req.path,
    ip: req.ip
  });
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`, 'server-startup');
  logger.info(`📊 API available at http://localhost:${PORT}/api/fires`, 'server-startup');
  logger.info(`🌍 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`, 'server-startup');
  logger.info(`💾 Using existing data from /data directory`, 'server-startup');
  logger.info(`📝 Logs available in logs/combined.log and logs/error.log`, 'server-startup');
});
