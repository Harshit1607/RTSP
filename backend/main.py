import subprocess
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from models import OverlayModel, UpdateOverlayModel

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

# ---------------- RTSP STREAM ----------------

def mjpeg_stream(rtsp_url: str):
    command = [
        "ffmpeg",
        "-rtsp_transport", "tcp",
        "-i", rtsp_url,
        "-vf", "fps=20",
        "-f", "image2pipe",
        "-vcodec", "mjpeg",
        "-q:v", "5",
        "-"
    ]

    process = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        bufsize=10**8
    )

    try:
        while True:
            frame = process.stdout.read(1024)

            if not frame:
                break

            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" +
                frame +
                b"\r\n"
            )
    finally:
        process.kill()


@app.get("/video_feed")
async def video_feed(url: str):
    return StreamingResponse(
        mjpeg_stream(url),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

# ---------------- CRUD ----------------

@app.post("/overlays")
async def create_overlay(overlay: OverlayModel):
    result = await overlays_collection.insert_one(overlay.dict())
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
    data = overlay.dict(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No update data")

    result = await overlays_collection.update_one(
        {"_id": ObjectId(id)},
        {"$set": data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Overlay not found")

    return {"status": "success"}

@app.delete("/overlays/{id}")
async def delete_overlay(id: str):
    result = await overlays_collection.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Overlay not found")
    return {"status": "deleted"}
