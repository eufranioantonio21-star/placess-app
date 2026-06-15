import React from 'react';

const MapPins = ({ places, onPinClick }) => {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
      {places.map(pin => (
        <div 
          key={pin.id}
          className="btn-touch"
          onClick={() => onPinClick(pin)}
          style={{
            position: 'absolute',
            top: pin.top,
            left: pin.left,
            pointerEvents: 'auto',
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div 
            className="animate-float"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              animationDelay: `${pin.id * 0.35}s`
            }}
          >
            {/* Map Pin Bubble */}
            <div style={{
              background: pin.color,
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15), inset 0 -2px 4px rgba(0,0,0,0.2)',
              border: '2px solid white',
              fontSize: '18px'
            }}>
              {pin.icon}
            </div>
            {/* Map Pin Tail */}
            <div style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `8px solid ${pin.color}`,
              marginTop: '-2px',
              filter: 'drop-shadow(0 4px 2px rgba(0,0,0,0.1))'
            }} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default MapPins;
