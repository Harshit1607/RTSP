import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Play, Settings } from 'lucide-react';
import OverlayItem from './components/OverlayItem';

const API_URL = 'http://localhost:8000';

export default function App() {
  const [url, setUrl] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [overlays, setOverlays] = useState([]);

  useEffect(() => {
    fetchOverlays();
  }, []);

  const fetchOverlays = async () => {
    try {
      const res = await axios.get(`${API_URL}/overlays`);
      setOverlays(res.data);
    } catch (err) {
      console.error('Fetch overlays failed:', err);
    }
  };

  const addOverlay = async (type) => {
    const newOverlay = {
      type,
      content: type === 'text' ? 'New Label' : 'https://via.placeholder.com/100',
      x: 100,
      y: 100,
      width: 160,
      height: 50,
    };

    try {
      const res = await axios.post(`${API_URL}/overlays`, newOverlay);
      setOverlays((prev) => [...prev, { ...newOverlay, id: res.data.id }]);
    } catch (err) {
      console.error('Add overlay failed:', err);
    }
  };

  const handleUpdate = async (id, pos, size, newContent = null) => {
    const updated = {
      x: Math.round(pos.x),
      y: Math.round(pos.y),
      width: Math.round(size.width),
      height: Math.round(size.height),
    };

    if (newContent !== null) updated.content = newContent;

    // Update UI instantly
    setOverlays((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...updated } : o))
    );

    // Sync DB
    try {
      await axios.put(`${API_URL}/overlays/${id}`, updated);
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const deleteOverlay = async (id) => {
    try {
      await axios.delete(`${API_URL}/overlays/${id}`);
      setOverlays((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      {/* HEADER */}
      <header className="mb-8 flex justify-between items-center border-b border-slate-700 pb-4">
        <h1 className="text-2xl font-bold text-blue-400">
          RTSP Stream Overlay Manager
        </h1>

        <div className="flex gap-4">
          <input
            className="bg-slate-800 border border-slate-600 px-4 py-2 rounded-lg w-96"
            placeholder="Enter RTSP URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            onClick={() => setStreamUrl(url)}
            className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg flex items-center gap-2"
          >
            <Play size={18} /> Play
          </button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        {/* VIDEO AREA */}
        <div className="col-span-9 relative bg-black rounded-xl border border-slate-700 overflow-hidden h-[500px]">
          {streamUrl ? (
            <img
              src={`${API_URL}/video_feed?url=${encodeURIComponent(streamUrl)}`}
              className="w-full h-full object-contain"
              alt="Stream"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              No stream active
            </div>
          )}

          {/* OVERLAYS */}
          {overlays.map((ov) => (
            <OverlayItem
              key={ov.id}
              overlay={ov}
              onUpdate={handleUpdate}
              onDelete={deleteOverlay}
            />
          ))}
        </div>

        {/* SIDEBAR */}
        <aside className="col-span-3">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings size={20} /> Controls
            </h3>

            <button
              onClick={() => addOverlay('text')}
              className="w-full mb-3 bg-slate-700 hover:bg-slate-600 py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Add Text Overlay
            </button>

            <button
              onClick={() => addOverlay('image')}
              className="w-full bg-slate-700 hover:bg-slate-600 py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Add Image Overlay
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
