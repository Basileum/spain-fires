import { Router } from 'express';
import { cumulatedFireService } from '../services/cumulatedFireService';
import { createFileLogger } from '../utils/logger';

const logger = createFileLogger('cumulatedFireRoutes.ts');

const router = Router();

/**
 * GET /api/cumulated-fires
 * Get cumulated fire data for a date range and resolution
 */
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, resolution } = req.query;

    // Validate required parameters
    if (!startDate || !endDate || !resolution) {
      return res.status(400).json({
        error: 'Missing required parameters: startDate, endDate, resolution'
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate as string) || !dateRegex.test(endDate as string)) {
      return res.status(400).json({
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    // Validate resolution
    const resolutionNum = parseInt(resolution as string);
    if (isNaN(resolutionNum) || resolutionNum < 0 || resolutionNum > 15) {
      return res.status(400).json({
        error: 'Invalid resolution. Must be between 0 and 15'
      });
    }

    logger.info(`Requesting cumulated fire data: ${startDate} to ${endDate}, resolution ${resolutionNum}`);

    // Calculate cumulated fire data
    const cumulatedData = await cumulatedFireService.calculateCumulatedFireData(
      startDate as string,
      endDate as string,
      resolutionNum
    );

    res.json({
      success: true,
      data: cumulatedData
    });

  } catch (error) {
    logger.error('Error in cumulated fires endpoint:', 'cumulated-fires', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/cumulated-fires/cache/stats
 * Get cache statistics (for debugging)
 */
router.get('/cache/stats', (req, res) => {
  try {
    const stats = cumulatedFireService.getCacheStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting cache stats:', 'cache-stats', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/cumulated-fires/cache/clear
 * Clear the cache (for debugging or when data changes)
 */
router.post('/cache/clear', (req, res) => {
  try {
    cumulatedFireService.clearCache();
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    logger.error('Error clearing cache:', 'clear-cache', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export default router;
