import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import { Trash2, Edit2, Check, Move, Lock } from 'lucide-react';

const OverlayItem = ({ overlay, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(overlay.content);

  const save = (e) => {
    e.stopPropagation();
    setIsEditing(false);
    onUpdate(
      overlay.id,
      { x: overlay.x, y: overlay.y },
      { width: overlay.width, height: overlay.height },
      tempValue
    );
  };

  return (
    <Rnd
      size={{ width: overlay.width, height: overlay.height }}
      position={{ x: overlay.x, y: overlay.y }}
      bounds="parent"
      disableDragging={isEditing}
      enableResizing={!isEditing}
      cancel="button, input"
      onDragStop={(e, d) =>
        onUpdate(overlay.id, d, {
          width: overlay.width,
          height: overlay.height,
        })
      }
      onResizeStop={(e, dir, ref, delta, pos) =>
        onUpdate(overlay.id, pos, {
          width: parseInt(ref.style.width),
          height: parseInt(ref.style.height),
        })
      }
    >
      <div
        className={`w-full h-full relative flex items-center justify-center rounded-lg border-2
        ${
          isEditing
            ? 'border-yellow-400 bg-slate-900'
            : 'border-blue-500 bg-blue-500/40 backdrop-blur-md'
        }`}
      >
        {/* EDIT / SAVE */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            isEditing ? save(e) : setIsEditing(true);
          }}
          className="absolute bottom-2 right-2 bg-blue-600 hover:bg-blue-500 p-1.5 rounded-full z-50 transition-colors"
        >
          {isEditing ? <Check size={16} /> : <Edit2 size={16} />}
        </button>

        {/* DELETE */}
        {!isEditing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(overlay.id);
            }}
            className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 p-1.5 rounded-full z-50 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        )}

        {/* CONTENT */}
        {overlay.type === 'text' && (
          isEditing ? (
            <input
              autoFocus
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save(e)}
              className="w-full mx-8 bg-slate-700 text-white text-xs p-2 rounded border border-slate-600 focus:outline-none focus:border-blue-500"
            />
          ) : (
            <p className="text-white text-xs font-bold select-none px-2 text-center">
              {overlay.content}
            </p>
          )
        )}

        {overlay.type === 'image' && (
          isEditing ? (
            <input
              autoFocus
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save(e)}
              className="w-full mx-8 bg-slate-700 text-white text-[10px] p-2 rounded border border-slate-600 focus:outline-none focus:border-blue-500"
              placeholder="Paste image URL"
            />
          ) : (
            <img
              src={overlay.content}
              alt="Overlay"
              className="max-h-full max-w-full pointer-events-none object-contain"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/100?text=Invalid+Image';
              }}
            />
          )
        )}

        {/* STATUS */}
        <div className="absolute bottom-1 left-1 text-white/40">
          {isEditing ? <Lock size={12} /> : <Move size={12} />}
        </div>
      </div>
    </Rnd>
  );
};

export default OverlayItem;