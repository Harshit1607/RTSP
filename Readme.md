# RTSP Livestream Overlay Web Application

[cite_start]A full-stack web application that plays a livestream video from an RTSP source and allows users to create, manage, and display custom draggable and resizable overlays (text/images) in real time[cite: 1, 2, 3].

## 🛠 Tech Stack
- [cite_start]**Frontend:** React [cite: 36]
- [cite_start]**Backend:** Python (FastAPI) [cite: 34]
- [cite_start]**Database:** MongoDB [cite: 35]
- [cite_start]**Streaming:** RTSP via OpenCV/MJPEG conversion [cite: 16, 37]

---

## 🚀 Setup & Installation

### 1. Prerequisites
- Python 3.9+
- Node.js & npm
- MongoDB (Running locally or via MongoDB Atlas)

### 2. Backend Setup (FastAPI)
1. Navigate to the backend folder:
   
   cd backend



2. Create and activate a virtual environment:

python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate




3. Install dependencies:

pip install -r requirements.txt




4. Run the server:

uvicorn main:app --reload




*The API will be live at `http://localhost:8000*`

### 3. Frontend Setup (React)

1. Navigate to the frontend folder:

cd frontend




2. Install dependencies:

npm install




3. Start the application:

npm start




*The application will open at `http://localhost:5173*`

---

## 📹 How to Provide or Change the RTSP URL

1. Upon landing on the page, you will see a field to enter an **RTSP URL**.


2. Provide a valid RTSP stream (e.g., `rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mp4`).
3. Click the **Play** button to initialize the livestream.


4. To change the stream, update the URL in the configuration panel and restart the playback.

---

## 📑 API Documentation (CRUD Endpoints)

The backend provides a RESTful API to manage overlay configurations.

| Method | Endpoint | Description |
| --- | --- | --- |
| **POST** | `/overlays` | Create a new overlay 

 |
| **GET** | `/overlays` | Retrieve all active overlays 

 |
| **PUT** | `/overlays/{id}` | Update position (x, y) or size (w, h) 

 |
| **DELETE** | `/overlays/{id}` | Delete an overlay 

 |

### Example Create Request (POST):


{
  "type": "text",
  "content": "Front Door Camera",
  "x": 50,
  "y": 50,
  "width": 200,
  "height": 50
}



---

## 📖 User Guide

### 1. Livestream Playback

* Enter your RTSP URL in the input field.


* Use the **Play**, **Pause**, and **Volume** controls to manage the video feed.



### 2. Managing Overlays

* 
**Add Overlay:** Choose between "Text" or "Image" (via URL).


* 
**Positioning:** Click and drag any overlay to move it anywhere on the video player.


* 
**Resizing:** Click and drag the corners of an overlay to adjust its dimensions.


* 
**Real-time Sync:** All changes are automatically saved to the database and updated in the view.


* 
**Delete:** Click the "Delete" button on an overlay's management card to remove it.



---

## 📂 Project Structure

/rtsp-overlay-app
[cite_start]├── backend/            # FastAPI + MongoDB logic 
│   ├── main.py
│   ├── models.py
│   └── requirements.txt
[cite_start]├── frontend/           # React Components & State 
│   ├── src/
│   │   ├── components/
│   │   └── App.js
[cite_start]└── README.md           # Documentation 

