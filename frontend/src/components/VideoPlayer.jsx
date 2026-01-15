import React, { useRef, useEffect, useState } from 'react';
import { Video, AlertCircle } from 'lucide-react';

const VideoPlayer = ({ streamUrl, hlsUrl, apiBase, streamMode = 'mjpeg' }) => {
  const videoRef = useRef(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!hlsUrl || streamMode !== 'hls') return;

    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setError('');

    // Check if browser supports HLS natively (Safari)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      video.play()
        .then(() => setIsLoading(false))
        .catch(err => {
          console.error('Native HLS playback error:', err);
          setError('Playback failed. Try MJPEG mode.');
          setIsLoading(false);
        });
    } 
    // For other browsers, use hls.js
    else if (window.Hls && window.Hls.isSupported()) {
      const hls = new window.Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        video.play()
          .then(() => setIsLoading(false))
          .catch(err => {
            console.error('HLS.js playback error:', err);
            setError('Playback failed');
            setIsLoading(false);
          });
      });

      hls.on(window.Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
        if (data.fatal) {
          setError(`HLS Error: ${data.type}`);
          setIsLoading(false);
        }
      });

      return () => {
        hls.destroy();
      };
    } else {
      setError('HLS not supported in this browser. Switch to MJPEG mode.');
      setIsLoading(false);
    }
  }, [hlsUrl, streamMode]);

  // Render HLS video player
  if (streamMode === 'hls' && hlsUrl) {
    return (
      <div className="relative w-full h-[500px] bg-black rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
        <video
          ref={videoRef}
          className="w-full h-full object-contain bg-black"
          controls
          muted
          playsInline
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Loading stream...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute top-4 left-4 right-4 bg-red-900/90 text-white px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  // Render MJPEG image player
  if (streamMode === 'mjpeg' && streamUrl) {
    return (
      <div className="relative w-full h-[500px] bg-black rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
        <img 
          src={`${apiBase}/video_feed?url=${encodeURIComponent(streamUrl)}`} 
          className="w-full h-full object-contain"
          alt="Live RTSP Feed"
          onError={() => setError('Failed to load MJPEG stream')}
        />
        {error && (
          <div className="absolute top-4 left-4 right-4 bg-red-900/90 text-white px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  // No stream active
  return (
    <div className="relative w-full h-[500px] bg-black rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
      <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
        <Video size={64} className="animate-pulse" />
        <p className="text-lg font-medium">No active stream</p>
        <p className="text-sm text-slate-600">Enter an RTSP URL and click Start</p>
      </div>
    </div>
  );
};

export default VideoPlayer;