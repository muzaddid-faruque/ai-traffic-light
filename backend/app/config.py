# backend/app/config.py
import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: str = "*"

    # Model Configuration
    model_path: str = "yolov8n.pt"
    confidence_threshold: float = 0.4

    # Video Sources
    camera_sources: str = "../../data/sample_videos/lane1.mp4,../../data/sample_videos/lane2.mp4,../../data/sample_videos/lane3.mp4,../../data/sample_videos/lane4.mp4"

    # Traffic Light Configuration
    yellow_duration: int = 2
    min_green_time: int = 5
    max_green_time: int = 45
    base_green_time: int = 6

    # Detection Configuration
    vehicle_time_weight: float = 0.5
    person_time_weight: float = 1.0
    emergency_vehicle_priority_time: int = 30

    # Frame Processing
    frame_width: int = 640
    process_every_n_frames: int = 1

    # Logging
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = False

    @property
    def camera_sources_list(self) -> List[str]:
        """Parse comma-separated camera sources into list"""
        return [src.strip() for src in self.camera_sources.split(",")]

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins"""
        if self.cors_origins == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",")]

settings = Settings()
