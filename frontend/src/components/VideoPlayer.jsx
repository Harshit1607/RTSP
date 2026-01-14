import React from 'react';
import { Video } from 'lucide-react';

const VideoPlayer = ({ streamUrl, apiBase }) => {
  return (
    <div className="relative w-full h-[500px] bg-black rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
      {streamUrl ? (
        <img 
          src={`${apiBase}/video_feed?url=${encodeURIComponent(streamUrl)}`} 
          className="w-full h-full object-contain"
          alt="Live RTSP Feed"
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
          <Video size={64} className="animate-pulse" />
          <p className="text-lg font-medium">No active stream. Enter an RTSP URL above.</p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;