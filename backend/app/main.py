# backend/app/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import cv2
import base64
import asyncio
import traceback
import logging
from ultralytics import YOLO
import time
from datetime import datetime
from typing import List, Set
from contextlib import asynccontextmanager

from config import settings
from models import (
    WebSocketMessage,
    HealthResponse,
    StatsResponse,
    ConfigUpdateRequest
)

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global statistics
stats = {
    "total_frames_processed": 0,
    "total_vehicles_detected": 0,
    "total_people_detected": 0,
    "emergency_vehicles_detected": 0,
    "processing_times": [],
    "start_time": time.time(),
    "active_connections": 0
}

# Active WebSocket connections
active_connections: Set[WebSocket] = set()

# Emergency vehicle classes (ambulance, police car, fire truck)
EMERGENCY_VEHICLE_CLASSES = ["ambulance", "police car", "fire truck"]

# Load YOLO model
try:
    model = YOLO(settings.model_path)
    logger.info(f"YOLO model loaded successfully from {settings.model_path}")
except Exception as e:
    logger.error(f"Failed to load YOLO model: {e}")
    raise

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    logger.info("🚀 Starting AI Traffic Light System")
    logger.info(f"Configuration: {settings.model_dump()}")
    yield
    logger.info("🛑 Shutting down AI Traffic Light System")

app = FastAPI(
    title="AI Traffic Light System",
    version="2.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lane pairs that can be green together: (0,2) and (1,3)
LANE_PAIRS = [(0, 2), (1, 3)]

# Helper: run model inference asynchronously
async def infer_async(frame):
    """Run YOLO inference in thread pool to avoid blocking"""
    loop = asyncio.get_event_loop()
    try:
        # Call model with frame only, filter by confidence later
        results = await loop.run_in_executor(None, lambda: model(frame, conf=settings.confidence_threshold))
        return results
    except Exception as e:
        logger.error(f"Inference error: {e}")
        return None

async def process_frame(cap, idx: int, frame_count: int):
    """Process a single camera frame"""
    try:
        # Read frame
        ret, frame = cap.read()
        if not ret:
            # Loop video
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = cap.read()

        if not ret:
            logger.warning(f"Failed to read frame from camera {idx+1}")
            return "", 0, 0, False

        # Resize frame for faster processing
        h, w = frame.shape[:2]
        if w > settings.frame_width:
            new_h = int(h * (settings.frame_width / w))
            frame = cv2.resize(frame, (settings.frame_width, new_h))

        # Skip frames if configured
        if frame_count % settings.process_every_n_frames != 0:
            _, buffer = cv2.imencode('.jpg', frame)
            return base64.b64encode(buffer).decode('utf-8'), 0, 0, False

        # Run inference
        start_time = time.time()
        results = await infer_async(frame)
        processing_time = time.time() - start_time

        stats["processing_times"].append(processing_time)
        if len(stats["processing_times"]) > 100:
            stats["processing_times"].pop(0)

        v_count = 0
        p_count = 0
        emergency_detected = False

        if results is not None and len(results) > 0:
            detections = results[0].boxes

            for box in detections:
                try:
                    cls = int(box.cls[0])
                    conf = float(box.conf[0])

                    # Skip low confidence detections
                    if conf < settings.confidence_threshold:
                        continue

                    label = model.names[cls]
                    x1, y1, x2, y2 = map(int, box.xyxy[0])

                    # Check for emergency vehicles
                    if label.lower() in EMERGENCY_VEHICLE_CLASSES:
                        emergency_detected = True
                        stats["emergency_vehicles_detected"] += 1
                        color = (255, 0, 255)  # Magenta for emergency
                        logger.warning(f"🚨 Emergency vehicle detected in lane {idx+1}: {label}")
                    elif label in ["car", "truck", "bus", "motorbike", "bicycle"]:
                        v_count += 1
                        stats["total_vehicles_detected"] += 1
                        color = (0, 0, 255)  # Red for vehicles
                    elif label == "person":
                        p_count += 1
                        stats["total_people_detected"] += 1
                        color = (0, 255, 0)  # Green for people
                    else:
                        continue

                    # Draw bounding box and label
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                    label_text = f"{label} {conf:.2f}"
                    cv2.putText(frame, label_text, (x1, y1 - 6),
                              cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1)

                except Exception as e:
                    logger.error(f"Error processing detection: {e}")
                    continue

        # Encode frame to base64
        _, buffer = cv2.imencode('.jpg', frame)
        frame_b64 = base64.b64encode(buffer).decode('utf-8')

        stats["total_frames_processed"] += 1

        return frame_b64, v_count, p_count, emergency_detected

    except Exception as e:
        logger.error(f"Error processing frame from camera {idx+1}: {e}")
        return "", 0, 0, False

def calculate_green_timing(vehicle_count: int, people_count: int, emergency: bool) -> int:
    """
    Calculate optimal green light duration based on traffic conditions

    Enhanced algorithm that considers:
    - Vehicle density
    - Pedestrian count
    - Emergency vehicle priority
    """
    if emergency:
        return settings.emergency_vehicle_priority_time

    # Base time + vehicle weight + pedestrian weight
    timing = settings.base_green_time + \
             (vehicle_count * settings.vehicle_time_weight) + \
             (people_count * settings.person_time_weight)

    # Apply min/max constraints
    timing = max(settings.min_green_time, min(int(timing), settings.max_green_time))

    return timing

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "message": "AI Traffic Light System API",
        "version": "2.0.0",
        "endpoints": {
            "websocket": "/ws",
            "health": "/health",
            "stats": "/stats",
            "config": "/config"
        }
    }

@app.get("/health", response_model=HealthResponse, tags=["Monitoring"])
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(),
        version="2.0.0"
    )

@app.get("/stats", response_model=StatsResponse, tags=["Monitoring"])
async def get_stats():
    """Get system statistics"""
    avg_processing_time = (
        sum(stats["processing_times"]) / len(stats["processing_times"])
        if stats["processing_times"] else 0
    )

    return StatsResponse(
        total_frames_processed=stats["total_frames_processed"],
        total_vehicles_detected=stats["total_vehicles_detected"],
        total_people_detected=stats["total_people_detected"],
        emergency_vehicles_detected=stats["emergency_vehicles_detected"],
        average_processing_time=avg_processing_time,
        uptime_seconds=time.time() - stats["start_time"],
        active_connections=stats["active_connections"]
    )

@app.post("/config", tags=["Configuration"])
async def update_config(config: ConfigUpdateRequest):
    """Update configuration dynamically"""
    try:
        if config.confidence_threshold is not None:
            if 0.0 <= config.confidence_threshold <= 1.0:
                settings.confidence_threshold = config.confidence_threshold
            else:
                raise HTTPException(status_code=400, detail="Confidence threshold must be between 0 and 1")

        if config.yellow_duration is not None:
            settings.yellow_duration = config.yellow_duration

        if config.min_green_time is not None:
            settings.min_green_time = config.min_green_time

        if config.max_green_time is not None:
            settings.max_green_time = config.max_green_time

        logger.info(f"Configuration updated: {config.model_dump(exclude_none=True)}")

        return {"status": "success", "message": "Configuration updated", "config": config}
    except Exception as e:
        logger.error(f"Error updating configuration: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Main WebSocket endpoint for real-time traffic monitoring"""
    await websocket.accept()
    active_connections.add(websocket)
    stats["active_connections"] = len(active_connections)

    logger.info(f"✅ WebSocket connection established. Active connections: {stats['active_connections']}")

    # Create video captures
    caps = []
    for src in settings.camera_sources_list:
        try:
            cap = cv2.VideoCapture(src)
            if not cap.isOpened():
                logger.error(f"Failed to open video source: {src}")
            caps.append(cap)
        except Exception as e:
            logger.error(f"Error creating VideoCapture for {src}: {e}")
            caps.append(None)

    try:
        current_pair_idx = 0
        phase = "green"
        phase_remaining = settings.base_green_time
        last_tick = time.time()
        frame_count = 0
        emergency_override = False
        emergency_lane = None

        while True:
            frame_count += 1

            # Process all cameras in parallel
            tasks = []
            for idx, cap in enumerate(caps):
                if cap is not None:
                    tasks.append(process_frame(cap, idx, frame_count))
                else:
                    tasks.append(asyncio.sleep(0))

            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Parse results
            frames_b64 = []
            vehicle_counts = []
            people_counts = []
            emergency_vehicles = []

            for idx, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"Error processing camera {idx+1}: {result}")
                    frames_b64.append("")
                    vehicle_counts.append(0)
                    people_counts.append(0)
                    emergency_vehicles.append(False)
                elif isinstance(result, tuple):
                    frame_b64, v_count, p_count, emergency = result
                    frames_b64.append(frame_b64)
                    vehicle_counts.append(v_count)
                    people_counts.append(p_count)
                    emergency_vehicles.append(emergency)

                    # Check for emergency vehicle
                    if emergency and not emergency_override:
                        emergency_override = True
                        emergency_lane = idx
                        logger.warning(f"🚨 Emergency override activated for lane {idx+1}")
                else:
                    frames_b64.append("")
                    vehicle_counts.append(0)
                    people_counts.append(0)
                    emergency_vehicles.append(False)

            # Calculate desired green timings per lane
            timings = [
                calculate_green_timing(v, p, e)
                for v, p, e in zip(vehicle_counts, people_counts, emergency_vehicles)
            ]

            # Traffic light state machine
            now = time.time()
            elapsed = now - last_tick
            last_tick = now
            phase_remaining -= elapsed

            # Emergency vehicle override logic
            if emergency_override and emergency_lane is not None:
                # Give immediate green to emergency lane
                current_pair_idx = 0 if emergency_lane in [0, 2] else 1
                phase = "green"
                phase_remaining = settings.emergency_vehicle_priority_time
                emergency_override = False
                logger.info(f"Emergency green activated for lane pair {LANE_PAIRS[current_pair_idx]}")

            # Normal state transitions
            elif phase == "green" and phase_remaining <= 0:
                phase = "yellow"
                phase_remaining = settings.yellow_duration
                logger.info(f"Phase transition: GREEN -> YELLOW for pair {LANE_PAIRS[current_pair_idx]}")

            elif phase == "yellow" and phase_remaining <= 0:
                # Switch to next pair
                current_pair_idx = (current_pair_idx + 1) % len(LANE_PAIRS)
                pair = LANE_PAIRS[current_pair_idx]
                # Choose max timing of the pair
                pair_green = max(timings[pair[0]], timings[pair[1]])
                phase = "green"
                phase_remaining = pair_green
                logger.info(f"Phase transition: YELLOW -> GREEN for pair {pair}, duration: {pair_green}s")

            # Build light status for each lane
            light_status = ["red"] * len(caps)
            active_pair = LANE_PAIRS[current_pair_idx]

            if phase == "green":
                for i in active_pair:
                    light_status[i] = "green"
            elif phase == "yellow":
                for i in active_pair:
                    light_status[i] = "yellow"

            # Phase remaining (rounded)
            phase_remaining_int = max(0, int(round(phase_remaining)))

            # Per-lane remaining time
            lane_remaining = [
                phase_remaining_int if i in active_pair else 0
                for i in range(len(caps))
            ]

            # Create message
            message = WebSocketMessage(
                frames=frames_b64,
                vehicle_counts=vehicle_counts,
                people_counts=people_counts,
                emergency_vehicles=emergency_vehicles,
                timings=timings,
                light_status=light_status,
                phase=phase,
                phase_remaining=phase_remaining_int,
                lane_remaining=lane_remaining,
                timestamp=datetime.now()
            )

            # Send to frontend
            await websocket.send_json(message.model_dump(mode='json'))

            # Control loop speed
            await asyncio.sleep(0.06)

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected by client")
    except Exception as e:
        logger.error(f"❌ Error in WebSocket loop: {e}")
        logger.error(traceback.format_exc())
    finally:
        # Cleanup
        active_connections.discard(websocket)
        stats["active_connections"] = len(active_connections)

        for cap in caps:
            if cap is not None:
                try:
                    cap.release()
                except Exception as e:
                    logger.error(f"Error releasing camera: {e}")

        try:
            await websocket.close()
        except Exception as e:
            logger.error(f"Error closing websocket: {e}")

        logger.info(f"❌ WebSocket connection closed. Active connections: {stats['active_connections']}")
