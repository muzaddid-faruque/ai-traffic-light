# backend/app/models.py
from pydantic import BaseModel
from typing import List, Literal
from datetime import datetime

class DetectionStats(BaseModel):
    """Statistics for a single lane"""
    lane_id: int
    vehicle_count: int
    people_count: int
    emergency_vehicle_detected: bool
    timing: int

class TrafficLightStatus(BaseModel):
    """Traffic light status for a single lane"""
    lane_id: int
    status: Literal["green", "yellow", "red"]
    remaining_time: int

class WebSocketMessage(BaseModel):
    """Message sent to frontend via WebSocket"""
    frames: List[str]
    vehicle_counts: List[int]
    people_counts: List[int]
    emergency_vehicles: List[bool]
    timings: List[int]
    light_status: List[str]
    phase: str
    phase_remaining: int
    lane_remaining: List[int]
    timestamp: datetime

class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    timestamp: datetime
    version: str

class StatsResponse(BaseModel):
    """Statistics response"""
    total_frames_processed: int
    total_vehicles_detected: int
    total_people_detected: int
    emergency_vehicles_detected: int
    average_processing_time: float
    uptime_seconds: float
    active_connections: int

class ConfigUpdateRequest(BaseModel):
    """Request to update configuration"""
    confidence_threshold: float | None = None
    yellow_duration: int | None = None
    min_green_time: int | None = None
    max_green_time: int | None = None
