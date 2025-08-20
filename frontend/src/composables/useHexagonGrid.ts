import { ref } from 'vue';
import { latLngToCell, cellToBoundary, getRes0Cells, cellToChildren } from 'h3-js';
import { FireDataService } from '@/services/api';
import type { FireData } from '@/types';
import type { Ref } from 'vue';

const fireDataService = new FireDataService();

export function useHexagonGrid(map: Ref<any>, currentZoom: Ref<number>) {
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  // Cache for hexagon data to avoid refetching on theme changes
  let cachedHexagonData: any = null;
  let cachedZoom: number | null = null;

  const getResolutionForZoom = (zoom: number): number => {
    // Zoom-based resolution mapping
    if (zoom < 9) return 6;   // Start with resolution 6 for initial view
    return 7;                 // Higher resolution for zoom >= 9
  };

  const generateHexagonGrid = (resolution: number) => {
    const hexagons: Array<{ index: string; boundary: number[][] }> = [];
    
    // Get all resolution 0 cells (base icosahedron)
    const res0Cells = getRes0Cells();
    
    // Filter for Spain bounds and generate children
    const spainBounds = {
      north: 43.8,
      south: 36.0,
      east: 3.3,
      west: -9.4
    };

    res0Cells.forEach(cell => {
      const children = cellToChildren(cell, resolution);
      
      children.forEach(child => {
        const boundary = cellToBoundary(child, true);
        
        // Check if hexagon intersects Spain bounds
        const intersects = boundary.some(coord => 
          coord[1] >= spainBounds.south && 
          coord[1] <= spainBounds.north && 
          coord[0] >= spainBounds.west && 
          coord[0] <= spainBounds.east
        );
        
        if (intersects) {
          hexagons.push({
            index: child,
            boundary
          });
        }
      });
    });

    return hexagons;
  };

  const createHexagonGrid = async (zoom: number) => {
    if (!map.value) {
      console.error('Map not available for hexagon grid creation');
      return;
    }

    try {
      let viewport;
      
      // Always use Spain bounds to ensure we capture all fires
      viewport = {
        north: 44.0,  // Slightly expanded to ensure coverage
        south: 35.8,  // Slightly expanded to ensure coverage
        east: 3.5,    // Slightly expanded to ensure coverage
        west: -9.5    // Slightly expanded to ensure coverage
      };
      console.log('Using Spain bounds to capture all fires:', viewport);
      
      console.log('Making API call to:', `/api/fires/hexagon-grid?zoom=${zoom}&viewport=${JSON.stringify(viewport)}`);
      
      // Fetch hexagon grid from server with cache busting
      const geojson = await fireDataService.getHexagonGrid(zoom, viewport);
      
      // Cache the data for future use
      cachedHexagonData = geojson;
      cachedZoom = zoom;
      
      console.log('Received geojson:', geojson);
      
      // Remove existing layers and source if they exist
      if (map.value.getLayer('hexagon-grid-fill')) {
        console.log('Removing existing hexagon-grid-fill layer');
        map.value.removeLayer('hexagon-grid-fill');
      }
      if (map.value.getLayer('hexagon-grid-border')) {
        console.log('Removing existing hexagon-grid-border layer');
        map.value.removeLayer('hexagon-grid-border');
      }
      if (map.value.getSource('hexagon-grid')) {
        console.log('Removing existing hexagon-grid source');
        map.value.removeSource('hexagon-grid');
      }
      
      // Add hexagon grid source
      console.log('Adding hexagon-grid source');
      map.value.addSource('hexagon-grid', {
        type: 'geojson',
        data: geojson
      });

      // Add hexagon grid layer (base layer)
      console.log('Adding hexagon-grid-fill layer');
      try {
        map.value.addLayer({
          id: 'hexagon-grid-fill',
          type: 'fill',
          source: 'hexagon-grid',
          paint: {
            'fill-color': '#f8f9fa', // Light gray for hexagons without fire data
            'fill-opacity': 0.1,     // Very low opacity for subtle appearance
            'fill-outline-color': '#e9ecef'
          }
        });
        console.log('✅ Hexagon fill layer added successfully');
      } catch (error) {
        console.error('❌ Failed to add hexagon fill layer:', error);
      }

      // Add hexagon grid border layer
      console.log('Adding hexagon-grid-border layer');
      try {
        map.value.addLayer({
          id: 'hexagon-grid-border',
          type: 'line',
          source: 'hexagon-grid',
          paint: {
            'line-color': '#dee2e6',
            'line-width': 0.5,
            'line-opacity': 0.3
          }
        });
        console.log('✅ Hexagon border layer added successfully');
      } catch (error) {
        console.error('❌ Failed to add hexagon border layer:', error);
      }

      console.log(`✅ Loaded hexagon grid from server: ${geojson.metadata.totalHexagons} hexagons at zoom ${zoom}`);
      console.log('Sample hexagon data:', geojson.features.slice(0, 2));
      
      // Debug: Check if hexagons are in the right location
      if (geojson.features.length > 0) {
        const firstHexagon = geojson.features[0];
        console.log('First hexagon coordinates:', firstHexagon.geometry.coordinates[0]);
        console.log('First hexagon bounds:', {
          minLng: Math.min(...firstHexagon.geometry.coordinates[0].map((coord: number[]) => coord[0])),
          maxLng: Math.max(...firstHexagon.geometry.coordinates[0].map((coord: number[]) => coord[0])),
          minLat: Math.min(...firstHexagon.geometry.coordinates[0].map((coord: number[]) => coord[1])),
          maxLat: Math.max(...firstHexagon.geometry.coordinates[0].map((coord: number[]) => coord[1]))
        });
        
        // Check if coordinates are in Spain bounds
        const spainBounds = {
          north: 43.8,
          south: 36.0,
          east: 3.3,
          west: -9.4
        };
        
        const firstCoord = firstHexagon.geometry.coordinates[0][0];
        console.log('First coordinate [lng, lat]:', firstCoord);
        console.log('Is in Spain bounds:', 
          firstCoord[1] >= spainBounds.south && 
          firstCoord[1] <= spainBounds.north && 
          firstCoord[0] >= spainBounds.west && 
          firstCoord[0] <= spainBounds.east
        );
      }
      
      // Verify layers are added
      console.log('Layers after creation:', {
        fill: map.value.getLayer('hexagon-grid-fill'),
        border: map.value.getLayer('hexagon-grid-border'),
        source: map.value.getSource('hexagon-grid')
      });
      
      // Check if source has data
      const source = map.value.getSource('hexagon-grid') as any;
      if (source) {
        console.log('Source data check:', {
          hasData: !!source._data,
          featureCount: source._data?.features?.length || 0
        });
      }
      
      // Verify layers are visible by checking their paint properties
      setTimeout(() => {
        const fillLayer = map.value.getLayer('hexagon-grid-fill');
        const borderLayer = map.value.getLayer('hexagon-grid-border');
        
        if (fillLayer && borderLayer) {
          console.log('✅ Hexagon layers created successfully');
          console.log('Fill layer paint:', fillLayer.paint);
          console.log('Border layer paint:', borderLayer.paint);
        } else {
          console.error('❌ Hexagon layers not found');
          console.log('Available layers:', map.value.getStyle().layers.map((l: any) => l.id));
        }
      }, 500);
    } catch (error) {
      console.error('Failed to load hexagon grid from server, falling back to client-side generation:', error);
      
      // Fallback to client-side generation
      const hexagons = generateHexagonGrid(getResolutionForZoom(zoom));
      
      const fallbackGeojson = {
        type: 'FeatureCollection' as const,
        features: hexagons.map(hexagon => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Polygon' as const,
            coordinates: [hexagon.boundary]
          },
          properties: {
            h3Index: hexagon.index,
            hasData: false
          }
        }))
      };

      // Remove existing layers and source if they exist
      if (map.value.getLayer('hexagon-grid-fill')) {
        map.value.removeLayer('hexagon-grid-fill');
      }
      if (map.value.getLayer('hexagon-grid-border')) {
        map.value.removeLayer('hexagon-grid-border');
      }
      if (map.value.getSource('hexagon-grid')) {
        map.value.removeSource('hexagon-grid');
      }

      // Add hexagon grid source
      map.value.addSource('hexagon-grid', {
        type: 'geojson',
        data: fallbackGeojson
      });

      // Add hexagon grid layer (base layer)
      try {
        map.value.addLayer({
          id: 'hexagon-grid-fill',
          type: 'fill',
          source: 'hexagon-grid',
          paint: {
            'fill-color': '#00ff00',
            'fill-opacity': 0.8,
            'fill-outline-color': '#00ff00'
          }
        });
        console.log('✅ Hexagon fill layer added successfully (fallback)');
      } catch (error) {
        console.error('❌ Failed to add hexagon fill layer (fallback):', error);
      }

      // Add hexagon grid border layer
      try {
        map.value.addLayer({
          id: 'hexagon-grid-border',
          type: 'line',
          source: 'hexagon-grid',
          paint: {
            'line-color': '#00ff00',
            'line-width': 3,
            'line-opacity': 1
          }
        });
        console.log('✅ Hexagon border layer added successfully (fallback)');
      } catch (error) {
        console.error('❌ Failed to add hexagon border layer (fallback):', error);
      }

      console.log(`✅ Generated hexagon grid client-side: ${hexagons.length} hexagons at zoom ${zoom}`);
      console.log('Sample fallback hexagon data:', fallbackGeojson.features.slice(0, 2));
    }
  };

  const updateHexagonGridForViewport = async (zoom: number) => {
    if (!map.value) return;
    
    try {
      // Get current viewport bounds
      const bounds = map.value.getBounds();
      const viewport = {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      };
      
      console.log('Updating hexagon grid for new viewport:', viewport);
      
      // Fetch new hexagon grid for current viewport
      const geojson = await fireDataService.getHexagonGrid(zoom, viewport);
      
      // Update the existing hexagon grid source
      const hexagonSource = map.value.getSource('hexagon-grid') as any;
      if (hexagonSource) {
        hexagonSource.setData(geojson);
        console.log(`✅ Updated hexagon grid for viewport: ${geojson.metadata.totalHexagons} hexagons`);
      } else {
        // If source doesn't exist, create it
        console.log('Hexagon source not found, creating new one...');
        await createHexagonGrid(zoom);
      }
    } catch (error) {
      console.error('Failed to update hexagon grid for viewport:', error);
      // Fallback: recreate the hexagon grid
      console.log('Falling back to recreating hexagon grid...');
      await createHexagonGrid(zoom);
    }
  };

  const clearHexagonLayers = () => {
    if (!map.value) return;

    // Clear hexagon grid layers
    if (map.value.getLayer('hexagon-grid-fill')) {
      map.value.removeLayer('hexagon-grid-fill');
    }
    if (map.value.getLayer('hexagon-grid-border')) {
      map.value.removeLayer('hexagon-grid-border');
    }
    if (map.value.getSource('hexagon-grid')) {
      map.value.removeSource('hexagon-grid');
    }
  };

  const updateHexagonBorderStyle = (isDark: boolean) => {
    if (!map.value || !map.value.getLayer('hexagon-grid-border')) return;
    
    const borderColor = isDark ? '#4a5568' : '#dee2e6';
    const borderOpacity = isDark ? 0.15 : 0.3;
    
    map.value.setPaintProperty('hexagon-grid-border', 'line-color', borderColor);
    map.value.setPaintProperty('hexagon-grid-border', 'line-opacity', borderOpacity);
    
    console.log(`Updated hexagon border style for ${isDark ? 'dark' : 'light'} mode`);
  };

  // Recreate hexagon grid using cached data (for theme changes)
  const recreateHexagonGridFromCache = () => {
    if (!map.value) {
      console.error('Map not available for hexagon grid recreation');
      return;
    }

    if (!cachedHexagonData) {
      console.log('No cached hexagon data available, will need to fetch');
      return false;
    }

    console.log('Recreating hexagon grid from cached data...');

    try {
      // Remove existing layers and source if they exist
      if (map.value.getLayer('hexagon-grid-fill')) {
        console.log('Removing existing hexagon-grid-fill layer');
        map.value.removeLayer('hexagon-grid-fill');
      }
      if (map.value.getLayer('hexagon-grid-border')) {
        console.log('Removing existing hexagon-grid-border layer');
        map.value.removeLayer('hexagon-grid-border');
      }
      if (map.value.getSource('hexagon-grid')) {
        console.log('Removing existing hexagon-grid source');
        map.value.removeSource('hexagon-grid');
      }
      
      // Add hexagon grid source using cached data
      console.log('Adding hexagon-grid source from cache');
      map.value.addSource('hexagon-grid', {
        type: 'geojson',
        data: cachedHexagonData
      });

      // Add hexagon grid layer (base layer)
      console.log('Adding hexagon-grid-fill layer');
      try {
        map.value.addLayer({
          id: 'hexagon-grid-fill',
          type: 'fill',
          source: 'hexagon-grid',
          paint: {
            'fill-color': '#f8f9fa', // Light gray for hexagons without fire data
            'fill-opacity': 0.1,     // Very low opacity for subtle appearance
            'fill-outline-color': '#e9ecef'
          }
        });
        console.log('✅ Hexagon fill layer added successfully from cache');
      } catch (error) {
        console.error('❌ Failed to add hexagon fill layer from cache:', error);
      }

      // Add hexagon grid border layer
      console.log('Adding hexagon-grid-border layer');
      try {
        map.value.addLayer({
          id: 'hexagon-grid-border',
          type: 'line',
          source: 'hexagon-grid',
          paint: {
            'line-color': '#dee2e6',
            'line-width': 0.5,
            'line-opacity': 0.3
          }
        });
        console.log('✅ Hexagon border layer added successfully from cache');
      } catch (error) {
        console.error('❌ Failed to add hexagon border layer from cache:', error);
      }

      console.log(`✅ Recreated hexagon grid from cache: ${cachedHexagonData.metadata.totalHexagons} hexagons at zoom ${cachedZoom}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to recreate hexagon grid from cache:', error);
      return false;
    }
  };

  return {
    loading,
    error,
    getResolutionForZoom,
    generateHexagonGrid,
    createHexagonGrid,
    updateHexagonGridForViewport,
    clearHexagonLayers,
    updateHexagonBorderStyle,
    recreateHexagonGridFromCache
  };
}
