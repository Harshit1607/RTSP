import sys
import asyncio
import threading
import cv2
import numpy as np
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pydantic import BaseModel, Field
from typing import Optional
import requests
from io import BytesIO

# ---------------- APP SETUP ----------------

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- DATABASE ----------------

client = AsyncIOMotorClient("mongodb://localhost:27017")
db = client.rtsp_database
overlays_collection = db.overlays

# ---------------- GLOBAL STATE ----------------

current_rtsp_url = None
current_overlays = []
stream_lock = threading.Lock()
stream_active = False

# ---------------- MODELS ----------------

class OverlayModel(BaseModel):
    type: str = Field(..., description="text or image")
    content: str = Field(..., description="Text content or Image URL")
    x: int = Field(0, description="X coordinate")
    y: int = Field(0, description="Y coordinate")
    width: int = Field(100, description="Width of overlay")
    height: int = Field(50, description="Height of overlay")
    font_size: int = Field(20, description="Font size for text")
    color: str = Field("#FFFFFF", description="Text color in hex")


class UpdateOverlayModel(BaseModel):
    type: Optional[str] = None
    content: Optional[str] = None
    x: Optional[int] = None
    y: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    font_size: Optional[int] = None
    color: Optional[str] = None


# ---------------- OVERLAY RENDERING ----------------

def hex_to_bgr(hex_color):
    """Convert hex color to BGR tuple for OpenCV"""
    hex_color = hex_color.lstrip('#')
    try:
        rgb = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
        return (rgb[2], rgb[1], rgb[0])  # BGR format
    except:
        return (255, 255, 255)  # Default white


# Cache for overlay images
overlay_image_cache = {}

def load_overlay_image(img_url, width, height):
    """Load and cache overlay images"""
    cache_key = f"{img_url}_{width}_{height}"
    
    if cache_key in overlay_image_cache:
        return overlay_image_cache[cache_key]
    
    try:
        if img_url.startswith('http'):
            response = requests.get(img_url, timeout=3)
            img_array = np.asarray(bytearray(response.content), dtype=np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_UNCHANGED)
        else:
            img = cv2.imread(img_url, cv2.IMREAD_UNCHANGED)
        
        if img is not None:
            img = cv2.resize(img, (width, height))
            overlay_image_cache[cache_key] = img
            return img
    except Exception as e:
        print(f"[ERROR] Failed to load image {img_url}: {e}", file=sys.stderr)
    
    return None


def apply_overlays(frame, overlays):
    """Apply all overlays to a frame"""
    if frame is None or len(frame.shape) != 3:
        return frame
    
    h, w = frame.shape[:2]
    
    for overlay in overlays:
        try:
            overlay_type = overlay.get('type', 'text')
            x = max(0, min(overlay.get('x', 0), w - 10))
            y = max(20, min(overlay.get('y', 20), h - 10))
            
            if overlay_type == 'text':
                # Draw text overlay
                text = overlay.get('content', 'Text')
                font_size = overlay.get('font_size', 20)
                color = overlay.get('color', '#FFFFFF')
                
                bgr_color = hex_to_bgr(color)
                font_scale = font_size / 30.0
                thickness = max(1, int(font_size / 15))
                font = cv2.FONT_HERSHEY_SIMPLEX
                
                # Get text size
                (text_width, text_height), baseline = cv2.getTextSize(
                    text, font, font_scale, thickness
                )
                
                # Draw background rectangle
                padding = 5
                bg_x1 = max(0, x - padding)
                bg_y1 = max(0, y - text_height - padding)
                bg_x2 = min(w, x + text_width + padding)
                bg_y2 = min(h, y + baseline + padding)
                
                # Semi-transparent background
                overlay_rect = frame.copy()
                cv2.rectangle(overlay_rect, (bg_x1, bg_y1), (bg_x2, bg_y2), (0, 0, 0), -1)
                cv2.addWeighted(overlay_rect, 0.6, frame, 0.4, 0, frame)
                
                # Draw text
                cv2.putText(frame, text, (x, y), font, font_scale, bgr_color, thickness, cv2.LINE_AA)
                
            elif overlay_type == 'image':
                # Draw image overlay
                img_url = overlay.get('content', '')
                img_width = overlay.get('width', 100)
                img_height = overlay.get('height', 100)
                
                overlay_img = load_overlay_image(img_url, img_width, img_height)
                
                if overlay_img is not None:
                    # Calculate safe region
                    y1 = max(0, y)
                    y2 = min(h, y + img_height)
                    x1 = max(0, x)
                    x2 = min(w, x + img_width)
                    
                    oh = y2 - y1
                    ow = x2 - x1
                    
                    if oh > 0 and ow > 0:
                        # Handle alpha channel if present
                        if overlay_img.shape[2] == 4:
                            # Has alpha channel
                            alpha = overlay_img[:oh, :ow, 3] / 255.0
                            overlay_rgb = overlay_img[:oh, :ow, :3]
                            
                            for c in range(3):
                                frame[y1:y2, x1:x2, c] = (
                                    alpha * overlay_rgb[:, :, c] +
                                    (1 - alpha) * frame[y1:y2, x1:x2, c]
                                )
                        else:
                            # No alpha, direct paste
                            frame[y1:y2, x1:x2] = overlay_img[:oh, :ow]
                            
        except Exception as e:
            print(f"[ERROR] Failed to apply overlay: {e}", file=sys.stderr)
    
    return frame


def generate_video_stream():
    """Generate video frames with overlays using OpenCV"""
    global current_rtsp_url, current_overlays, stream_active
    
    with stream_lock:
        rtsp_url = current_rtsp_url
    
    if not rtsp_url:
        print("[ERROR] No RTSP URL set", file=sys.stderr)
        return
    
    print(f"[INFO] Starting OpenCV stream for: {rtsp_url}", file=sys.stderr)
    
    # Open video capture
    cap = cv2.VideoCapture(rtsp_url)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Reduce latency
    
    if not cap.isOpened():
        print(f"[ERROR] Failed to open RTSP stream: {rtsp_url}", file=sys.stderr)
        return
    
    frame_count = 0
    error_count = 0
    max_errors = 10
    
    try:
        while stream_active:
            ret, frame = cap.read()
            
            if not ret:
                error_count += 1
                print(f"[WARNING] Failed to read frame (error {error_count}/{max_errors})", file=sys.stderr)
                
                if error_count >= max_errors:
                    print("[ERROR] Too many errors, stopping stream", file=sys.stderr)
                    break
                
                continue
            
            error_count = 0  # Reset error count on successful read
            
            # Apply overlays
            with stream_lock:
                overlays = current_overlays.copy()
            
            frame = apply_overlays(frame, overlays)
            
            # Encode frame as JPEG
            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 85]
            ret, buffer = cv2.imencode('.jpg', frame, encode_param)
            
            if not ret:
                continue
            
            frame_count += 1
            
            # Yield frame in multipart format
            yield (
                b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n' +
                buffer.tobytes() +
                b'\r\n'
            )
            
    except GeneratorExit:
        print("[INFO] Client disconnected", file=sys.stderr)
    except Exception as e:
        print(f"[ERROR] Stream error: {e}", file=sys.stderr)
    finally:
        cap.release()
        print(f"[INFO] Stream ended. Total frames: {frame_count}", file=sys.stderr)


# ---------------- STREAM ENDPOINTS ----------------

@app.post("/start_stream")
async def start_stream(url: str):
    """Start streaming with overlays"""
    global current_rtsp_url, current_overlays, stream_active
    
    if not url:
        raise HTTPException(status_code=400, detail="RTSP URL required")
    
    # Load current overlays from database
    overlays = []
    async for doc in overlays_collection.find():
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        overlays.append(doc)
    
    with stream_lock:
        current_rtsp_url = url
        current_overlays = overlays
        stream_active = True
    
    print(f"[INFO] Stream initialized with {len(overlays)} overlays", file=sys.stderr)
    
    return {
        "status": "success",
        "message": "Stream started",
        "overlays_count": len(overlays)
    }


@app.post("/stop_stream")
async def stop_stream():
    """Stop streaming"""
    global stream_active
    
    with stream_lock:
        stream_active = False
    
    print("[INFO] Stream stopped", file=sys.stderr)
    
    return {"status": "stopped"}


@app.get("/video_feed")
async def video_feed():
    """Video feed endpoint with overlays"""
    global stream_active
    
    if not stream_active:
        raise HTTPException(status_code=400, detail="No active stream. Call /start_stream first.")
    
    return StreamingResponse(
        generate_video_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@app.get("/stream_status")
async def stream_status():
    """Get current stream status"""
    global current_rtsp_url, stream_active, current_overlays
    
    with stream_lock:
        return {
            "active": stream_active,
            "url": current_rtsp_url,
            "overlays_count": len(current_overlays)
        }


# ---------------- OVERLAY CRUD ----------------

@app.post("/overlays")
async def create_overlay(overlay: OverlayModel):
    global current_overlays
    
    result = await overlays_collection.insert_one(overlay.dict())
    new_overlay = overlay.dict()
    new_overlay["id"] = str(result.inserted_id)
    
    # Update current overlays in real-time
    with stream_lock:
        current_overlays.append(new_overlay)
    
    print(f"[INFO] Overlay created: {new_overlay['type']}", file=sys.stderr)
    
    return {"id": str(result.inserted_id)}


@app.get("/overlays")
async def get_overlays():
    overlays = []
    async for doc in overlays_collection.find():
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        overlays.append(doc)
    return overlays


@app.put("/overlays/{id}")
async def update_overlay(id: str, overlay: UpdateOverlayModel):
    global current_overlays
    
    data = overlay.dict(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No update data")

    result = await overlays_collection.update_one(
        {"_id": ObjectId(id)},
        {"$set": data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Overlay not found")

    # Update current overlays in real-time
    with stream_lock:
        for i, ov in enumerate(current_overlays):
            if ov.get("id") == id:
                current_overlays[i].update(data)
                break
    
    return {"status": "success"}


@app.delete("/overlays/{id}")
async def delete_overlay(id: str):
    global current_overlays
    
    result = await overlays_collection.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Overlay not found")
    
    # Remove from current overlays in real-time
    with stream_lock:
        current_overlays = [ov for ov in current_overlays if ov.get("id") != id]
    
    print(f"[INFO] Overlay deleted: {id}", file=sys.stderr)
    
    return {"status": "deleted"}


# ---------------- TESTING ENDPOINTS ----------------

@app.get("/test_stream")
async def test_stream(url: str):
    """Test if OpenCV can connect to the RTSP stream"""
    try:
        cap = cv2.VideoCapture(url)
        
        if not cap.isOpened():
            return {"status": "error", "message": "Failed to open stream"}
        
        ret, frame = cap.read()
        cap.release()
        
        if ret and frame is not None:
            h, w = frame.shape[:2]
            return {
                "status": "success",
                "width": w,
                "height": h,
                "message": "Successfully connected to stream"
            }
        else:
            return {"status": "error", "message": "Failed to read frame"}
            
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ---------------- MAIN ----------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)