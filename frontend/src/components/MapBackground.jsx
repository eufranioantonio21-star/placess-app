import React from 'react';

const MapBackground = () => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundImage: 'url("/map_bg.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        zIndex: -1,
      }}
    />
  );
};

export default MapBackground;
