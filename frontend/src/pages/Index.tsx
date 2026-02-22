import React, { useEffect } from 'react';
import { Whiteboard } from '@/components/canvas/Whiteboard';
import { Toolbar } from '@/components/toolbar/Toolbar';
import { v4 as uuidv4 } from 'uuid';

// Simple room generation or retrieval for demo purposes
// In a real app, this would be determined by the URL or a routing parameter
const getOrCreateRoom = () => {
  let roomId = localStorage.getItem('whiteboard_room_id');
  if (!roomId) {
    roomId = uuidv4();
    localStorage.setItem('whiteboard_room_id', roomId);
  }
  return roomId;
};

const Index: React.FC = () => {
  const roomId = getOrCreateRoom();

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-gray-50">
      <Toolbar />
      <Whiteboard roomId={roomId} />

      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none">
        <div className="bg-white px-3 py-1 rounded-md shadow-sm border border-gray-200 text-xs text-gray-500 font-medium pointer-events-auto">
          Room: {roomId.substring(0, 8)}
        </div>
      </div>
    </div>
  );
};

export default Index;
