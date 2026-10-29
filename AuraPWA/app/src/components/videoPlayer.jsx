import React from 'react';

function VideoPlayer() {
  const streamUrl = "http://192.168.0.220:81/stream";

  return (
    <div style={{ border: '1px solid #ddd', padding: '10px', margin: '20px 0' }}>
      <h3>Câmera ao Vivo</h3>
      {}
      <img 
        src={streamUrl} 
        alt="Live stream from ESP32-CAM" 
        width="100%" 
      />
    </div>
  );
}

export default VideoPlayer;