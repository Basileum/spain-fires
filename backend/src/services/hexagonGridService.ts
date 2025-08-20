import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { getRes0Cells, cellToChildren, cellToBoundary, latLngToCell, cellToParent, polygonToCells } from 'h3-js';
import { createFileLogger } from '../utils/logger';

const logger = createFileLogger('hexagonGridService.ts');

interface HexagonGrid {
  resolution: number;
  hexagons: Array<{
    index: string;
    boundary: number[][];
  }>;
  metadata: {
    totalHexagons: number;
    generatedAt: string;
    viewport?: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
    spainBounds?: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  };
}

interface Viewport {
  north: number;
  south: number;
  east: number;
  west: number;
}

export class HexagonGridService {
  private readonly CACHE_DIR = path.join(__dirname, '../../data/hexagon-grids');
  private readonly SPAIN_BOUNDS = {
    north: 44.0,  // Slightly expanded to ensure coverage
    south: 35.8,  // Slightly expanded to ensure coverage
    east: 3.5,    // Slightly expanded to ensure coverage
    west: -9.5    // Slightly expanded to ensure coverage
  };

  constructor() {
    // Don't initialize anything at startup - do it lazily when needed
  }

  private ensureCacheDirectory() {
    try {
      if (!existsSync(this.CACHE_DIR)) {
        mkdirSync(this.CACHE_DIR, { recursive: true });
        logger.info(`📁 Hexagon grid cache directory created: ${this.CACHE_DIR}`);
      }
          } catch (error) {
        logger.error('Error creating hexagon grid cache directory', 'ensureCacheDirectory', error as Error);
      }
  }

  private getCacheFilePath(resolution: number, viewport?: Viewport): string {
    this.ensureCacheDirectory();
    
    if (viewport) {
      // Viewport-based cache file
      const viewportKey = `${viewport.west.toFixed(2)}_${viewport.south.toFixed(2)}_${viewport.east.toFixed(2)}_${viewport.north.toFixed(2)}`;
      return path.join(this.CACHE_DIR, `viewport-res-${resolution}-${viewportKey}.json`);
    } else {
      // Full Spain cache file
      return path.join(this.CACHE_DIR, `spain-grid-res-${resolution}.json`);
    }
  }



  private getResolutionForZoom(zoom: number): number {
    // Zoom-based resolution mapping
    if (zoom < 9) return 6;   // Start with resolution 6 for initial view
    return 7;                 // Higher resolution for zoom >= 9
  }

  private generateHexagonGridForViewport(resolution: number, viewport: Viewport): HexagonGrid {
    logger.info(`🔄 Generating hexagon grid for viewport at resolution ${resolution}...`);
    
    const startTime = Date.now();
    
    // Create viewport polygon in H3 format ([lat, lng] coordinates)
    const viewportPolygon = [
      [
        [viewport.south, viewport.west],  // [lat, lng]
        [viewport.south, viewport.east],  // [lat, lng]
        [viewport.north, viewport.east],  // [lat, lng]
        [viewport.north, viewport.west],  // [lat, lng]
        [viewport.south, viewport.west]   // [lat, lng] - close polygon
      ]
    ];
    
    // Use polygonToCells to efficiently get hexagons within the viewport
    const hexagonIndexes = polygonToCells(viewportPolygon, resolution);
    
    // Convert hexagon indexes to boundary coordinates
    const hexagons = hexagonIndexes.map(index => ({
      index,
      boundary: cellToBoundary(index, false) // Get [lat, lng] format, we'll swap to [lng, lat] later
    }));

    const endTime = Date.now();
    const generationTime = endTime - startTime;
    
    logger.info(`✅ Generated ${hexagons.length} hexagons for viewport at resolution ${resolution} in ${generationTime}ms`);

    return {
      resolution,
      hexagons,
      metadata: {
        totalHexagons: hexagons.length,
        generatedAt: new Date().toISOString(),
        viewport
      }
    };
  }

  private generateHexagonGridForSpain(resolution: number): HexagonGrid {
    logger.info(`🔄 Generating hexagon grid for Spain at resolution ${resolution}...`);
    
    const startTime = Date.now();
    
    // Create Spain polygon in H3 format ([lat, lng] coordinates)
    const spainPolygon = [
      [
        [this.SPAIN_BOUNDS.south, this.SPAIN_BOUNDS.west],  // [lat, lng]
        [this.SPAIN_BOUNDS.south, this.SPAIN_BOUNDS.east],  // [lat, lng]
        [this.SPAIN_BOUNDS.north, this.SPAIN_BOUNDS.east],  // [lat, lng]
        [this.SPAIN_BOUNDS.north, this.SPAIN_BOUNDS.west],  // [lat, lng]
        [this.SPAIN_BOUNDS.south, this.SPAIN_BOUNDS.west]   // [lat, lng] - close polygon
      ]
    ];
    
    // Use polygonToCells to efficiently get hexagons within Spain
    const hexagonIndexes = polygonToCells(spainPolygon, resolution);
    
    // Use the generated hexagons directly
    const finalHexagonIndexes = hexagonIndexes;
    
    // Convert hexagon indexes to boundary coordinates
    const hexagons = finalHexagonIndexes.map(index => ({
      index,
      boundary: cellToBoundary(index, false) // Get [lat, lng] format, we'll swap to [lng, lat] later
    }));

    const endTime = Date.now();
    const generationTime = endTime - startTime;
    
    logger.info(`✅ Generated ${hexagons.length} hexagons for Spain at resolution ${resolution} in ${generationTime}ms`);

    return {
      resolution,
      hexagons,
      metadata: {
        totalHexagons: hexagons.length,
        generatedAt: new Date().toISOString(),
        spainBounds: this.SPAIN_BOUNDS
      }
    };
  }

  async getHexagonGridForViewport(zoom: number, viewport: Viewport): Promise<HexagonGrid> {
    const resolution = this.getResolutionForZoom(zoom);
    const cacheFilePath = this.getCacheFilePath(resolution, viewport);

    try {
      // Try to load from cache first
      const cachedData = await fs.readFile(cacheFilePath, 'utf-8');
      const grid: HexagonGrid = JSON.parse(cachedData);
      
      logger.info(`📋 Loaded cached hexagon grid for viewport at resolution ${resolution}: ${grid.hexagons.length} hexagons`);
      return grid;
    } catch (error) {
      // Cache miss or error, generate new grid
      logger.info(`🔄 Cache miss for viewport at resolution ${resolution}, generating new grid...`);
      
      const grid = this.generateHexagonGridForViewport(resolution, viewport);
      
      // Save to cache
      try {
        await fs.writeFile(cacheFilePath, JSON.stringify(grid, null, 2));
        logger.info(`💾 Cached hexagon grid for viewport at resolution ${resolution}`);
              } catch (cacheError) {
          logger.error(`❌ Failed to cache hexagon grid for viewport at resolution ${resolution}`, 'getHexagonGridForViewport', cacheError as Error);
        }
      
      return grid;
    }
  }

  async getHexagonGridForSpain(resolution: number): Promise<HexagonGrid> {
    // Validate resolution
    if (resolution < 0 || resolution > 15) {
      throw new Error(`Invalid resolution: ${resolution}. Must be between 0 and 15.`);
    }

    const cacheFilePath = this.getCacheFilePath(resolution);

    try {
      // Try to load from cache first
      const cachedData = await fs.readFile(cacheFilePath, 'utf-8');
      const grid: HexagonGrid = JSON.parse(cachedData);
      
      logger.info(`📋 Loaded cached hexagon grid for Spain at resolution ${resolution}: ${grid.hexagons.length} hexagons`);
      return grid;
    } catch (error) {
      // Cache miss or error, generate new grid
      logger.info(`🔄 Cache miss for Spain at resolution ${resolution}, generating new grid...`);
      
      const grid = this.generateHexagonGridForSpain(resolution);
      
      // Save to cache
      try {
        await fs.writeFile(cacheFilePath, JSON.stringify(grid, null, 2));
        logger.info(`💾 Cached hexagon grid for Spain at resolution ${resolution}`);
              } catch (cacheError) {
          logger.error(`❌ Failed to cache hexagon grid for Spain at resolution ${resolution}`, 'getHexagonGridForSpain', cacheError as Error);
        }
      
      return grid;
    }
  }

  async getHexagonGridAsGeoJSON(zoom: number, viewport?: Viewport) {
    let grid: HexagonGrid;
    
    if (viewport) {
      grid = await this.getHexagonGridForViewport(zoom, viewport);
    } else {
      // Use zoom-based resolution mapping
      const resolution = this.getResolutionForZoom(zoom);
      grid = await this.getHexagonGridForSpain(resolution);
    }

    return {
      type: 'FeatureCollection' as const,
      features: grid.hexagons.map(hexagon => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [hexagon.boundary.map(coord => [coord[1], coord[0]])] // Swap lat/lng to lng/lat for GeoJSON
        },
        properties: {
          h3Index: hexagon.index,
          resolution: grid.resolution
        }
      })),
      metadata: grid.metadata
    };
  }

  async pregenerateSpainOverview(): Promise<void> {
    logger.info('🚀 Pre-generating Spain overview hexagon grid (resolution 5)...');
    
    try {
      const startTime = Date.now();
      await this.getHexagonGridForSpain(5);
      const endTime = Date.now();
      
      logger.info(`✅ Spain overview generated in ${endTime - startTime}ms`);
          } catch (error) {
        logger.error('❌ Error generating Spain overview', 'pregenerateSpainOverview', error as Error);
        throw error;
      }
  }

  async getCacheStatus(): Promise<{
    cachedResolutions: number[];
    totalCacheSize: number;
    lastUpdated: string;
    viewportCaches: number;
  }> {
    this.ensureCacheDirectory();
    
    try {
      const files = await fs.readdir(this.CACHE_DIR);
      const gridFiles = files.filter(file => file.endsWith('.json'));
      
      const spainGridFiles = gridFiles.filter(file => file.startsWith('spain-grid-res-'));
      const viewportGridFiles = gridFiles.filter(file => file.startsWith('viewport-res-'));
      
      const cachedResolutions = spainGridFiles.map(file => {
        const match = file.match(/spain-grid-res-(\d+)\.json/);
        return match ? parseInt(match[1]) : null;
      }).filter((res): res is number => res !== null);

      let totalSize = 0;
      for (const file of gridFiles) {
        const stats = await fs.stat(path.join(this.CACHE_DIR, file));
        totalSize += stats.size;
      }

      return {
        cachedResolutions: cachedResolutions.sort((a, b) => a - b),
        totalCacheSize: totalSize,
        lastUpdated: new Date().toISOString(),
        viewportCaches: viewportGridFiles.length
      };
    } catch (error) {
      logger.error('Error getting cache status', 'getCacheStatus', error as Error);
      return {
        cachedResolutions: [],
        totalCacheSize: 0,
        lastUpdated: new Date().toISOString(),
        viewportCaches: 0
      };
    }
  }

  async clearCache(): Promise<void> {
    this.ensureCacheDirectory();
    
    try {
      const files = await fs.readdir(this.CACHE_DIR);
      const gridFiles = files.filter(file => file.endsWith('.json'));
      
      for (const file of gridFiles) {
        await fs.unlink(path.join(this.CACHE_DIR, file));
      }
      
      logger.info(`🗑️ Cleared ${gridFiles.length} cached hexagon grid files`);
    } catch (error) {
      logger.error('Error clearing cache', 'clearCache', error as Error);
      throw error;
    }
  }
}
