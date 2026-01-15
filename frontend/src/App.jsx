import React, { useState, useEffect } from 'react';
import { Plus, Play, Settings, TestTube, AlertCircle, Square, Info, Edit2, Trash2, Check, X } from 'lucide-react';

const API_URL = 'http://localhost:8000';

const TEST_STREAMS = [
  { name: 'Local VLC', url: 'rtsp://localhost:8554/test' },
  { name: 'Pattern Stream', url: 'rtsp://rtsp.stream/pattern' },
  { name: 'Big Buck Bunny', url: 'rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mp4' },
];

// Overlay Item Component
const OverlayItem = ({ overlay, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(overlay.content);

  const handleSave = () => {
    onUpdate(overlay.id, { content });
    setIsEditing(false);
  };

  return (
    <div className="bg-slate-700 p-3 rounded-lg mb-2 hover:bg-slate-600 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            overlay.type === 'text' ? 'bg-blue-600' : 'bg-purple-600'
          }`}>
            {overlay.type}
          </span>
          <span className="text-xs text-slate-400">
            ({overlay.x}, {overlay.y})
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1 hover:bg-slate-500 rounded"
            title="Edit"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => onDelete(overlay.id)}
            className="p-1 hover:bg-red-600 rounded"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 px-2 py-1 rounded text-sm"
            placeholder={overlay.type === 'text' ? 'Enter text' : 'Enter image URL'}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={overlay.x}
              onChange={(e) => onUpdate(overlay.id, { x: parseInt(e.target.value) || 0 })}
              className="bg-slate-800 border border-slate-600 px-2 py-1 rounded text-sm"
              placeholder="X"
            />
            <input
              type="number"
              value={overlay.y}
              onChange={(e) => onUpdate(overlay.id, { y: parseInt(e.target.value) || 0 })}
              className="bg-slate-800 border border-slate-600 px-2 py-1 rounded text-sm"
              placeholder="Y"
            />
          </div>
          {overlay.type === 'text' && (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={overlay.font_size || 20}
                onChange={(e) => onUpdate(overlay.id, { font_size: parseInt(e.target.value) || 20 })}
                className="bg-slate-800 border border-slate-600 px-2 py-1 rounded text-sm"
                placeholder="Font size"
              />
              <input
                type="color"
                value={overlay.color || '#FFFFFF'}
                onChange={(e) => onUpdate(overlay.id, { color: e.target.value })}
                className="bg-slate-800 border border-slate-600 rounded h-8"
              />
            </div>
          )}
          {overlay.type === 'image' && (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={overlay.width || 100}
                onChange={(e) => onUpdate(overlay.id, { width: parseInt(e.target.value) || 100 })}
                className="bg-slate-800 border border-slate-600 px-2 py-1 rounded text-sm"
                placeholder="Width"
              />
              <input
                type="number"
                value={overlay.height || 100}
                onChange={(e) => onUpdate(overlay.id, { height: parseInt(e.target.value) || 100 })}
                className="bg-slate-800 border border-slate-600 px-2 py-1 rounded text-sm"
                placeholder="Height"
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 bg-green-600 hover:bg-green-500 py-1 rounded text-sm flex items-center justify-center gap-1"
            >
              <Check size={14} /> Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 bg-slate-600 hover:bg-slate-500 py-1 rounded text-sm flex items-center justify-center gap-1"
            >
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-300 truncate">{overlay.content}</p>
      )}
    </div>
  );
};

// Main App Component
export default function App() {
  const [url, setUrl] = useState('');
  const [overlays, setOverlays] = useState([]);
  const [error, setError] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [streamKey, setStreamKey] = useState(0);

  useEffect(() => {
    fetchOverlays();
    checkStreamStatus();
  }, []);

  const fetchOverlays = async () => {
    try {
      const res = await fetch(`${API_URL}/overlays`);
      const data = await res.json();
      setOverlays(data);
    } catch (err) {
      console.error('Fetch overlays failed:', err);
      setError('Failed to fetch overlays. Is the backend running on port 8000?');
    }
  };

  const checkStreamStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/stream_status`);
      const data = await res.json();
      setIsStreaming(data.active);
      if (data.active && data.url) {
        setUrl(data.url);
      }
    } catch (err) {
      console.error('Failed to check stream status:', err);
    }
  };

  const startStream = async (rtspUrl) => {
    if (!rtspUrl) {
      setError('Please enter an RTSP URL');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/start_stream?url=${encodeURIComponent(rtspUrl)}`, {
        method: 'POST'
      });
      const data = await res.json();

      if (data.status === 'success') {
        setIsStreaming(true);
        setStreamKey(prev => prev + 1);
        setError('');
      } else {
        setError('Failed to start stream');
      }
    } catch (err) {
      setError(`Stream error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const stopStream = async () => {
    setLoading(true);

    try {
      await fetch(`${API_URL}/stop_stream`, { method: 'POST' });
      setIsStreaming(false);
      setStreamKey(prev => prev + 1);
    } catch (err) {
      console.error('Stop stream error:', err);
    } finally {
      setLoading(false);
    }
  };

  const addOverlay = async (type) => {
    const newOverlay = {
      type,
      content: type === 'text' ? 'New Label' : 'https://via.placeholder.com/100',
      x: 50,
      y: 50,
      width: 100,
      height: 100,
      font_size: 24,
      color: '#FFFFFF',
    };

    try {
      const res = await fetch(`${API_URL}/overlays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOverlay)
      });
      const data = await res.json();
      setOverlays((prev) => [...prev, { ...newOverlay, id: data.id }]);
    } catch (err) {
      console.error('Add overlay failed:', err);
      setError('Failed to add overlay');
    }
  };

  const updateOverlay = async (id, updates) => {
    setOverlays((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...updates } : o))
    );

    try {
      await fetch(`${API_URL}/overlays/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (err) {
      console.error('Update failed:', err);
      setError('Failed to update overlay');
    }
  };

  const deleteOverlay = async (id) => {
    try {
      await fetch(`${API_URL}/overlays/${id}`, { method: 'DELETE' });
      setOverlays((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
      setError('Failed to delete overlay');
    }
  };

  const handleTestStream = (testUrl) => {
    setUrl(testUrl);
    startStream(testUrl);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <header className="mb-8 border-b border-slate-700 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-blue-400">
            🎥 RTSP Stream Overlay Manager (OpenCV)
          </h1>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Info size={16} />
            <span>Real-time overlay rendering with OpenCV</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded-lg flex items-center gap-2">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-300 hover:text-white">×</button>
          </div>
        )}

        <div className="flex gap-4 mb-4">
          <input
            className="bg-slate-800 border border-slate-600 px-4 py-2 rounded-lg flex-1 focus:outline-none focus:border-blue-500"
            placeholder="Enter RTSP URL (e.g., rtsp://localhost:8554/test)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isStreaming && startStream(url)}
          />

          {!isStreaming ? (
            <button
              onClick={() => startStream(url)}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Play size={18} />
              {loading ? 'Starting...' : 'Start Stream'}
            </button>
          ) : (
            <button
              onClick={stopStream}
              disabled={loading}
              className="bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Square size={18} />
              {loading ? 'Stopping...' : 'Stop Stream'}
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-slate-400 text-sm flex items-center gap-2 mr-2">
            <TestTube size={16} /> Quick Test:
          </span>
          {TEST_STREAMS.map((stream) => (
            <button
              key={stream.url}
              onClick={() => handleTestStream(stream.url)}
              disabled={isStreaming || loading}
              className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed px-3 py-1.5 rounded text-sm transition-colors"
            >
              {stream.name}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-9">
          <div className="relative w-full h-[600px] bg-black rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
            {isStreaming ? (
              <img
                key={streamKey}
                src={`${API_URL}/video_feed?t=${Date.now()}`}
                className="w-full h-full object-contain"
                alt="Live RTSP Stream with Overlays"
                onError={() => setError('Failed to load video stream. Check if the stream is active.')}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
                <div className="text-6xl">📹</div>
                <p className="text-lg font-medium">No active stream</p>
                <p className="text-sm text-slate-600">Enter an RTSP URL and click Start Stream</p>
              </div>
            )}
          </div>

          {isStreaming && (
            <div className="mt-4 bg-slate-800 p-4 rounded-lg border border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-400 font-medium">Live</span>
                  </div>
                  <span className="text-xs text-slate-400 truncate max-w-md">{url}</span>
                </div>
                <span className="text-xs text-slate-400">{overlays.length} overlays active</span>
              </div>
            </div>
          )}
        </div>

        <aside className="col-span-3">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings size={20} /> Add Overlays
            </h3>

            <button
              onClick={() => addOverlay('text')}
              className="w-full mb-3 bg-blue-600 hover:bg-blue-500 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Plus size={18} /> Add Text Overlay
            </button>

            <button
              onClick={() => addOverlay('image')}
              className="w-full bg-purple-600 hover:bg-purple-500 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Plus size={18} /> Add Image Overlay
            </button>
          </div>

          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 mb-6">
            <h4 className="text-sm font-semibold mb-3 text-slate-300">
              Active Overlays ({overlays.length})
            </h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {overlays.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No overlays yet</p>
              ) : (
                overlays.map((overlay) => (
                  <OverlayItem
                    key={overlay.id}
                    overlay={overlay}
                    onUpdate={updateOverlay}
                    onDelete={deleteOverlay}
                  />
                ))
              )}
            </div>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <h4 className="text-xs font-semibold mb-2 text-slate-400">💡 How to Use</h4>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• Enter RTSP URL and click Start</li>
              <li>• Add text/image overlays</li>
              <li>• Click edit to change position</li>
              <li>• Overlays render in real-time</li>
              <li>• Uses OpenCV for processing</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}