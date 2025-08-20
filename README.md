# Spain Forest Fires Map

A web application for visualizing forest fires in Spain using data from the Copernicus Emergency Management Service (EFFIS).

## Features

- **Interactive Map**: Built with MapLibre GL JS for smooth, responsive mapping
- **H3 Hexagonal Visualization**: Uses H3 geospatial indexing for efficient fire area representation
- **Date-based Filtering**: View fire data for specific dates with a date picker
- **Real-time Data**: Fetches data from the Copernicus EFFIS API
- **Responsive Design**: Modern UI with loading states and error handling
- **Fire Size Classification**: Color-coded fire areas based on size (small, medium, large)
- **Live Data**: Currently displaying real fire data from Spain

## Tech Stack

### Frontend
- **Vue.js 3** - Progressive JavaScript framework
- **TypeScript** - Type-safe JavaScript
- **MapLibre GL JS** - Open-source mapping library
- **[VersaTiles](https://docs.versatiles.org/basics/frontend.html)** - Free, open-source vector tiles
- **H3** - Uber's hexagonal hierarchical geospatial indexing system
- **Vite** - Fast build tool and dev server

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **TypeScript** - Type-safe JavaScript
- **Axios** - HTTP client for API requests

## Project Structure

```
spain-forest-fires/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── index.ts        # Main server file
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── types/          # TypeScript type definitions
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # Vue.js web application
│   ├── src/
│   │   ├── components/     # Vue components
│   │   ├── services/       # API client
│   │   ├── types/          # TypeScript type definitions
│   │   ├── App.vue         # Main app component
│   │   └── main.ts         # App entry point
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── package.json            # Root package.json for workspace
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd spain-forest-fires
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install all workspace dependencies
   npm run install:all
   ```

3. **Start the development servers**
   ```bash
   # Start both frontend and backend
   npm run dev
   
   # Or start them separately
   npm run dev:backend  # Backend on http://localhost:3001
   npm run dev:frontend # Frontend on http://localhost:5173
   ```

### Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

## API Endpoints

The backend provides the following endpoints:

### Fire Data
- `GET /api/fires/health` - Health check
- `GET /api/fires/today` - Get today's fire data
- `GET /api/fires/date/:date` - Get fire data for a specific date (YYYY-MM-DD)
- `GET /api/fires/range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` - Get fire data for a date range

### Data Collection Management
- `POST /api/fires/collection/start` - Start the data collection service
- `POST /api/fires/collection/stop` - Stop the data collection service
- `GET /api/fires/collection/status` - Get data collection status and statistics

## Data Sources

### Fire Data
The application fetches data from the Copernicus Emergency Management Service (EFFIS) API:
- **URL**: https://api.effis.emergency.copernicus.eu/rest/2/burntareas/current/
- **Country**: Spain (ES)
- **Data**: Forest fire burnt areas with geographic coordinates, area measurements, and metadata

### Map Layers
The application uses [VersaTiles](https://docs.versatiles.org/basics/frontend.html) for map tiles:

**VersaTiles**
- **URL**: https://tiles.versatiles.org/assets/styles/colorful/style.json
- **License**: Completely free for any use (Unlicense)
- **Provider**: VersaTiles (open-source project)
- **Features**: 
  - Vector tiles optimized for MapLibre GL JS
  - Pre-compressed with Brotli for fast loading
  - Includes styles, sprites, and fonts
  - No usage limits or attribution requirements
  - Direct tile access: `https://tiles.versatiles.org/tiles/osm/{z}/{x}/{y}`

## Features in Detail

### Map Visualization
- **Base Map**: [VersaTiles](https://docs.versatiles.org/guides/use_tiles_versatiles_org.html) - Free, open-source vector tiles
  - **URL**: https://tiles.versatiles.org/assets/styles/colorful/style.json
  - **License**: Completely free for any use (Unlicense)
  - **Provider**: VersaTiles (open-source project)
- **Fire Areas**: H3 hexagonal representations of fire perimeters
- **Color Coding**: 
  - Red (#ff6b6b): Small fires (< 10 ha)
  - Orange (#ff8e53): Medium fires (10-100 ha)
  - Dark Red (#ff4757): Large fires (> 100 ha)

### Interactive Elements
- **Date Picker**: Select any date to view historical fire data
- **Hover Popups**: Detailed information on fire location, area, and date
- **Statistics Panel**: Real-time count of fires and total area affected
- **Legend**: Visual guide for fire size classification

### Error Handling
- **Loading States**: Visual feedback during data fetching
- **Error Recovery**: Retry functionality for failed requests
- **Graceful Degradation**: Handles API failures gracefully

## Data Collection Strategy

The application implements an automated data collection system that runs independently of frontend requests:

### 📊 **Data Storage**
- **Historical Data**: JSON files stored in `backend/data/historical_fires.json`
- **Current Data**: JSON files stored in `backend/data/current_fires.json`
- **Automatic Collection**: Starts from June 1st, 2025 onwards

### ⏰ **Update Schedule**
- **Historical Data**: Collected once when service starts
- **Current Data**: Updated every hour automatically
- **Independent Operation**: Runs in background regardless of frontend usage

### 🛠️ **Manual Data Collection**

```bash
# Collect data manually
cd backend && npm run collect-data

# Start data collection service
curl -X POST http://localhost:3001/api/fires/collection/start

# Check collection status
curl http://localhost:3001/api/fires/collection/status

# Stop collection service
curl -X POST http://localhost:3001/api/fires/collection/stop
```

## Development

### Building for Production

```bash
# Build both frontend and backend
npm run build

# Build separately
npm run build:frontend
npm run build:backend
```

### Code Quality

```bash
# Lint frontend code
cd frontend && npm run lint
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Acknowledgments

- [Copernicus Emergency Management Service](https://emergency.copernicus.eu/) for providing the fire data
- [MapLibre GL JS](https://maplibre.org/) for the mapping library
- [VersaTiles](https://docs.versatiles.org/basics/frontend.html) for free, open-source vector tiles
- [H3](https://h3geo.org/) for the hexagonal geospatial indexing system
