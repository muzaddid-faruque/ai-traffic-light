# AI Traffic Light System v2.0

An intelligent traffic light control system that uses computer vision (YOLOv8) to detect vehicles and pedestrians, then dynamically adjusts traffic light timing based on real-time traffic conditions.

## Features

### Backend (Python/FastAPI)
- **Real-time Object Detection**: YOLOv8 for vehicle and pedestrian detection
- **Emergency Vehicle Priority**: Automatic detection and priority green light
- **Adaptive Timing Algorithm**: Dynamic green light duration based on traffic density
- **Parallel Processing**: Concurrent frame processing for all cameras
- **REST API**: Health checks, statistics, and configuration endpoints
- **WebSocket**: Real-time data streaming to frontend
- **Structured Logging**: Comprehensive logging with configurable levels
- **Configuration Management**: Environment variable support via `.env`
- **Type Safety**: Pydantic models for data validation

### Frontend (React/Vite)
- **Real-time Camera Feeds**: 4 simultaneous video feeds with detection overlays
- **WebSocket Auto-Reconnection**: Automatic reconnection with retry logic
- **Connection Status Indicator**: Visual connection state monitoring
- **Historical Analytics**: Interactive charts showing traffic patterns
- **Emergency Vehicle Alerts**: Visual indicators for emergency vehicles
- **Responsive Design**: Mobile-friendly, adaptive layout
- **Accessibility**: ARIA labels, keyboard navigation support
- **Error Boundaries**: Graceful error handling
- **Performance Optimized**: Efficient rendering with React hooks

## Architecture

```
ai-traffic-light/
├── backend/app/
│   ├── main.py              # FastAPI server with WebSocket and REST endpoints
│   ├── models.py            # Pydantic models for type safety
│   ├── config.py            # Configuration management
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Example environment variables
│   └── yolov8n.pt          # YOLOv8 model (tracked with Git LFS)
├── data/sample_videos/      # Sample video files (4 lanes)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CameraView.jsx       # Main dashboard
│   │   │   ├── Analytics.jsx        # Analytics modal with charts
│   │   │   └── ErrorBoundary.jsx    # Error handling
│   │   ├── hooks/
│   │   │   └── useWebSocket.js      # WebSocket hook with reconnection
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── .env.example         # Example environment variables
└── README.md
```

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- Git LFS (for model file)

### 1. Backend Setup

```powershell
cd backend/app

# Create virtual environment
python -m venv venv
venv\Scripts\Activate.ps1  # On Windows
# source venv/bin/activate  # On Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment variables (optional)
copy .env.example .env
# Edit .env to customize settings

# Start the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be available at:
- WebSocket: `ws://localhost:8000/ws`
- API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`
- Statistics: `http://localhost:8000/stats`

### 2. Frontend Setup

```powershell
cd frontend

# Install dependencies
npm install

# Copy and configure environment variables (optional)
copy .env.example .env
# Edit .env to customize API URLs

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Configuration

### Backend Configuration (.env)

```bash
# Server
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=*

# Model
MODEL_PATH=yolov8n.pt
CONFIDENCE_THRESHOLD=0.4

# Video Sources (comma-separated)
CAMERA_SOURCES=../../data/sample_videos/lane1.mp4,../../data/sample_videos/lane2.mp4,../../data/sample_videos/lane3.mp4,../../data/sample_videos/lane4.mp4

# Traffic Light Timing
YELLOW_DURATION=2
MIN_GREEN_TIME=5
MAX_GREEN_TIME=45
BASE_GREEN_TIME=6
EMERGENCY_VEHICLE_PRIORITY_TIME=30

# Detection Weights
VEHICLE_TIME_WEIGHT=0.5
PERSON_TIME_WEIGHT=1.0

# Performance
FRAME_WIDTH=640
PROCESS_EVERY_N_FRAMES=1

# Logging
LOG_LEVEL=INFO
```

### Frontend Configuration (.env)

```bash
VITE_WS_URL=ws://localhost:8000/ws
VITE_API_URL=http://localhost:8000
```

## API Endpoints

### REST API

- `GET /` - API information
- `GET /health` - Health check
- `GET /stats` - System statistics
- `POST /config` - Update configuration

### WebSocket

- `WS /ws` - Real-time traffic data stream

## Features in Detail

### 1. Adaptive Traffic Light Control
The system calculates optimal green light duration based on:
- Number of vehicles detected
- Number of pedestrians waiting
- Emergency vehicle presence

Formula: `green_time = base_time + (vehicles × vehicle_weight) + (people × person_weight)`

### 2. Emergency Vehicle Priority
When an emergency vehicle (ambulance, police car, fire truck) is detected:
- Immediate green light for that lane
- Extended green time (30 seconds default)
- Visual alerts in the UI

### 3. Lane Pairing System
Lanes operate in pairs to prevent conflicts:
- Pair 1: Lanes 0 and 2 (opposite lanes)
- Pair 2: Lanes 1 and 3 (opposite lanes)

### 4. Historical Analytics
Track traffic patterns over time:
- Real-time traffic trends (line chart)
- Total vehicles by lane (bar chart)
- Total pedestrians by lane (bar chart)
- System performance metrics
- Detection statistics

### 5. WebSocket Reconnection
Automatic reconnection with:
- Max 10 retry attempts
- 3-second delay between retries
- Visual connection status indicator
- Manual retry option

## Development

### Build for Production

**Backend:**
```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
npm run build
npm run preview
```

### Linting
```bash
# Frontend
npm run lint
```

## Deployment

### Using Docker (Recommended)
*(Docker configuration to be added)*

### Manual Deployment
1. Deploy backend on a server with Python 3.8+
2. Build frontend and serve with nginx/Apache
3. Configure environment variables
4. Set up HTTPS for WebSocket (wss://)
5. Configure CORS for production domain

## Git LFS

This repository uses Git LFS to track the YOLOv8 model file (`yolov8n.pt`). To clone:

```bash
git lfs install
git clone <repo-url>
cd ai-traffic-light
git lfs pull
```

## Technologies Used

### Backend
- FastAPI - Modern web framework
- Ultralytics YOLOv8 - Object detection
- OpenCV - Computer vision
- Pydantic - Data validation
- uvicorn - ASGI server

### Frontend
- React 19 - UI framework
- Vite - Build tool
- Tailwind CSS - Styling
- Recharts - Data visualization
- React Icons - Icon library

## Performance

- **Frame Processing**: ~60ms per frame (4 cameras)
- **Detection Latency**: ~100-200ms with YOLOv8n
- **WebSocket Updates**: ~17 updates/second
- **Memory Usage**: ~500MB (with model loaded)

## Troubleshooting

### Backend won't start
- Ensure `yolov8n.pt` is present in `backend/app/`
- Check Python version (3.8+)
- Verify all dependencies are installed

### Frontend can't connect
- Ensure backend is running on port 8000
- Check CORS configuration
- Verify WebSocket URL in `.env`

### Low FPS / Slow performance
- Reduce `FRAME_WIDTH` in backend `.env`
- Increase `PROCESS_EVERY_N_FRAMES` to skip frames
- Use a GPU if available

### Videos not playing
- Verify video files exist in `data/sample_videos/`
- Check video paths in backend `.env`

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

*(Add your license here)*

## Acknowledgments

- YOLOv8 by Ultralytics
- FastAPI framework
- React team
- All open-source contributors

---

**Version 2.0** - Enhanced with emergency vehicle detection, analytics, and improved UI/UX
