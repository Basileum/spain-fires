import { Router, Request, Response } from 'express';
import { CopernicusService } from '../services/copernicusService';
import { HexagonGridService } from '../services/hexagonGridService';
import { createFileLogger } from '../utils/logger';

const router = Router();
const logger = createFileLogger('fireRoutes.ts');
const copernicusService = new CopernicusService();

// Lazy initialization of HexagonGridService to avoid blocking server startup
let hexagonGridService: HexagonGridService | null = null;

const getHexagonGridService = () => {
  if (!hexagonGridService) {
    logger.info('🔄 Initializing HexagonGridService...', 'getHexagonGridService');
    hexagonGridService = new HexagonGridService();
  }
  return hexagonGridService;
};

// Get fire data for a specific date
router.get('/date/:date', async (req: Request, res: Response) => {
  const { date } = req.params;
  logger.info(`Fetching fire data for date: ${date}`, 'date-route');
  
  try {
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      logger.warn(`Invalid date format provided: ${date}`, 'date-route');
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const data = await copernicusService.getFireDataByDate(date);
    logger.info(`Successfully fetched fire data for ${date}: ${data.count} fires`, 'date-route');
    res.json(data);
  } catch (error) {
    logger.error('Error in /date/:date route', 'date-route', error as Error, { date });
    res.status(500).json({ 
      error: 'Failed to fetch fire data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get fire data for a date range
router.get('/range', async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  logger.info(`Fetching fire data for range: ${startDate} to ${endDate}`, 'range-route');
  
  try {
    if (!startDate || !endDate) {
      logger.warn('Missing startDate or endDate parameters', 'range-route');
      return res.status(400).json({ error: 'startDate and endDate query parameters are required' });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate as string) || !dateRegex.test(endDate as string)) {
      logger.warn(`Invalid date format provided: ${startDate} or ${endDate}`, 'range-route');
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const data = await copernicusService.getFireDataByDateRange(
      startDate as string, 
      endDate as string
    );
    logger.info(`Successfully fetched fire data for range: ${data.count} fires`, 'range-route');
    res.json(data);
  } catch (error) {
    logger.error('Error in /range route', 'range-route', error as Error, { startDate, endDate });
    res.status(500).json({ 
      error: 'Failed to fetch fire data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get fire data for today (default)
router.get('/today', async (req: Request, res: Response) => {
  const today = new Date().toISOString().split('T')[0];
  logger.info(`Fetching fire data for today: ${today}`, 'today-route');
  
  try {
    const data = await copernicusService.getFireDataByDate(today);
    logger.info(`Successfully fetched fire data for today: ${data.count} fires`, 'today-route');
    res.json(data);
  } catch (error) {
    logger.error('Error in /today route', 'today-route', error as Error, { today });
    res.status(500).json({ 
      error: 'Failed to fetch fire data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get current situation data (latest available data with timestamp)
router.get('/current', async (req: Request, res: Response) => {
  logger.info('Fetching current situation data', 'current-route');
  
  try {
    const data = await copernicusService.getCurrentData();
    if (data) {
      logger.info(`Successfully fetched current situation data: ${data.count} fires`, 'current-route');
      res.json(data);
    } else {
      logger.warn('No current data available, falling back to today\'s data', 'current-route');
      const today = new Date().toISOString().split('T')[0];
      const todayData = await copernicusService.getFireDataByDate(today);
      res.json(todayData);
    }
  } catch (error) {
    logger.error('Error in /current route', 'current-route', error as Error);
    res.status(500).json({ 
      error: 'Failed to fetch current situation data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get the actual data range (earliest and latest dates with fire data)
router.get('/data-range', async (req: Request, res: Response) => {
  logger.info('Fetching actual data range', 'data-range-route');
  
  try {
    const dataRange = await copernicusService.getDataRange();
    logger.info(`Successfully fetched data range: ${dataRange.start} to ${dataRange.end}`, 'data-range-route');
    res.json(dataRange);
  } catch (error) {
    logger.error('Error in /data-range route', 'data-range-route', error as Error);
    res.status(500).json({ 
      error: 'Failed to fetch data range',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Data collection management endpoints
router.post('/collection/start', async (req: Request, res: Response) => {
  logger.info('Starting data collection service', 'collection-start');
  
  try {
    await copernicusService.startDataCollection();
    logger.info('Data collection service started successfully', 'collection-start');
    res.json({ 
      success: true, 
      message: 'Data collection service started',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error starting data collection', 'collection-start', error as Error);
    res.status(500).json({ 
      error: 'Failed to start data collection',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/collection/stop', async (req: Request, res: Response) => {
  logger.info('Stopping data collection service', 'collection-stop');
  
  try {
    await copernicusService.stopDataCollection();
    logger.info('Data collection service stopped successfully', 'collection-stop');
    res.json({ 
      success: true, 
      message: 'Data collection service stopped',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error stopping data collection', 'collection-stop', error as Error);
    res.status(500).json({ 
      error: 'Failed to stop data collection',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/collection/status', async (req: Request, res: Response) => {
  logger.info('Getting data collection status', 'collection-status');
  
  try {
    const status = await copernicusService.getDataCollectionStatus();
    logger.info(`Data collection status retrieved: ${status.isRunning ? 'running' : 'stopped'}`, 'collection-status');
    res.json(status);
  } catch (error) {
    logger.error('Error getting data collection status', 'collection-status', error as Error);
    res.status(500).json({ 
      error: 'Failed to get data collection status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  logger.info('Health check requested', 'health');
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Hexagon grid endpoints
router.get('/hexagon-grid', async (req: Request, res: Response) => {
  const zoom = parseFloat(req.query.zoom as string) || 5;
  const viewport = req.query.viewport ? JSON.parse(req.query.viewport as string) : undefined;
  
  logger.info(`Fetching hexagon grid for zoom: ${zoom}`, 'hexagon-grid', { zoom, viewport });
  
  try {
    if (zoom < 0 || zoom > 20) {
      logger.warn(`Invalid zoom level provided: ${zoom}`, 'hexagon-grid');
      return res.status(400).json({ 
        error: 'Invalid zoom level. Must be between 0 and 20.' 
      });
    }

    const service = getHexagonGridService();
    const geojson = await service.getHexagonGridAsGeoJSON(zoom, viewport);
    logger.info(`Successfully fetched hexagon grid: ${geojson.metadata.totalHexagons} hexagons`, 'hexagon-grid');
    res.json(geojson);
  } catch (error) {
    logger.error('Error in /hexagon-grid route', 'hexagon-grid', error as Error, { zoom, viewport });
    res.status(500).json({ 
      error: 'Failed to fetch hexagon grid',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Legacy endpoint for backward compatibility
router.get('/hexagon-grid/:resolution', async (req: Request, res: Response) => {
  const resolution = parseInt(req.params.resolution);
  logger.info(`Fetching hexagon grid for resolution: ${resolution}`, 'hexagon-grid-resolution');
  
  try {
    if (isNaN(resolution) || resolution < 0 || resolution > 15) {
      logger.warn(`Invalid resolution provided: ${resolution}`, 'hexagon-grid-resolution');
      return res.status(400).json({ 
        error: 'Invalid resolution. Must be a number between 0 and 15.' 
      });
    }

    const service = getHexagonGridService();
    const geojson = await service.getHexagonGridAsGeoJSON(5); // Default to Spain overview
    logger.info(`Successfully fetched hexagon grid for resolution ${resolution}: ${geojson.metadata.totalHexagons} hexagons`, 'hexagon-grid-resolution');
    res.json(geojson);
  } catch (error) {
    logger.error('Error in /hexagon-grid/:resolution route', 'hexagon-grid-resolution', error as Error, { resolution });
    res.status(500).json({ 
      error: 'Failed to fetch hexagon grid',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Pre-generate Spain overview hexagon grid
router.post('/hexagon-grid/pregenerate', async (req: Request, res: Response) => {
  logger.info('Pre-generating Spain overview hexagon grid', 'hexagon-pregenerate');
  
  try {
    const service = getHexagonGridService();
    await service.pregenerateSpainOverview();
    logger.info('Spain overview hexagon grid pre-generated successfully', 'hexagon-pregenerate');
    res.json({ 
      success: true, 
      message: 'Spain overview hexagon grid pre-generated',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error pre-generating Spain overview hexagon grid', 'hexagon-pregenerate', error as Error);
    res.status(500).json({ 
      error: 'Failed to pre-generate Spain overview hexagon grid',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get hexagon grid cache status
router.get('/hexagon-grid/cache/status', async (req: Request, res: Response) => {
  logger.info('Getting hexagon grid cache status', 'hexagon-cache-status');
  
  try {
    const service = getHexagonGridService();
    const status = await service.getCacheStatus();
    logger.info('Hexagon grid cache status retrieved successfully', 'hexagon-cache-status', { status });
    res.json(status);
  } catch (error) {
    logger.error('Error getting hexagon grid cache status', 'hexagon-cache-status', error as Error);
    res.status(500).json({ 
      error: 'Failed to get cache status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Clear hexagon grid cache
router.delete('/hexagon-grid/cache', async (req: Request, res: Response) => {
  logger.info('Clearing hexagon grid cache', 'hexagon-cache-clear');
  
  try {
    const service = getHexagonGridService();
    await service.clearCache();
    logger.info('Hexagon grid cache cleared successfully', 'hexagon-cache-clear');
    res.json({ 
      success: true, 
      message: 'Hexagon grid cache cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error clearing hexagon grid cache', 'hexagon-cache-clear', error as Error);
    res.status(500).json({ 
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
