import React, { useState, useEffect, useRef } from 'react';

const SwipeableNotification = ({ notification, onDeleteRequest, onRead }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  
  const SWIPE_THRESHOLD = 100;

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (!isSwiping) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    
    // Allow swiping left or right, but add some resistance
    setOffsetX(diff);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (Math.abs(offsetX) > SWIPE_THRESHOLD) {
      onDeleteRequest(notification.id);
    }
    // Snap back
    setOffsetX(0);
  };

  // Icon based on type
  const getIcon = () => {
    if (notification.type === 'OFFER') return <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>;
    if (notification.type === 'ALERT') return <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"></path>;
    return <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></>;
  };

  const isUnread = !notification.isRead;

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px', marginBottom: '16px' }}>
      {/* Background for Delete Action */}
      {(isSwiping || offsetX !== 0) && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: '#ef4444',
          display: 'flex',
          justifyContent: offsetX > 0 ? 'flex-start' : 'flex-end',
          alignItems: 'center',
          padding: '0 24px',
          color: '#fff',
          borderRadius: '16px'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </div>
      )}

      {/* Foreground Notification Card */}
      <div 
        className="clay-card"
        onClick={() => onRead(notification.id)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          padding: '16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
          background: isUnread ? 'var(--color-surface)' : 'rgba(30,30,30,0.8)',
          opacity: isUnread ? 1 : 0.7,
          border: isUnread ? '1px solid var(--color-primary)' : '1px solid var(--color-outline)',
          position: 'relative',
          zIndex: 2,
          minHeight: '80px'
        }}
      >
        <div style={{
          background: isUnread ? 'rgba(58, 255, 21, 0.15)' : 'rgba(255,255,255,0.05)',
          color: isUnread ? 'var(--color-primary)' : 'var(--color-text-muted)',
          width: '40px', height: '40px',
          borderRadius: '50%',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          flexShrink: 0,
          marginTop: '4px'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {getIcon()}
          </svg>
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
            <h4 style={{ 
              fontSize: '16px', 
              fontWeight: isUnread ? 800 : 600, 
              margin: 0, 
              color: isUnread ? 'var(--color-text-main)' : 'var(--color-text-muted)' 
            }}>
              {notification.title}
            </h4>
            {isUnread && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0, marginTop: '6px' }}></div>}
          </div>
          <p style={{ 
            fontSize: '14px', 
            margin: 0, 
            color: isUnread ? 'var(--color-text-main)' : 'var(--color-text-muted)',
            lineHeight: 1.4
          }}>
            {notification.message}
          </p>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginTop: '8px' }}>
            {new Date(notification.createdAt).toLocaleDateString()} {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};

const NotificationsPage = ({ activeCampaigns = [] }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_URL}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRead = async (id) => {
    const notif = notifications.find(n => n.id === id);
    if (notif && !notif.isRead) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        await fetch(`${API_URL}/api/notifications/${id}/read`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      await fetch(`${API_URL}/api/notifications/${deletingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setNotifications(prev => prev.filter(n => n.id !== deletingId));
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="animate-slide-up-page" style={{
      position: 'absolute',
      top: 0, left: 0, width: '100%', height: '100%',
      background: 'var(--color-background)',
      zIndex: 40,
      display: 'flex', flexDirection: 'column',
      padding: 'var(--safe-area) 24px 100px 24px',
      overflowY: 'auto',
      overflowX: 'hidden'
    }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '24px', color: 'var(--color-primary)', marginTop: '24px' }}>Notifications</h1>
      
      {loading ? (
        <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--color-primary)' }}>Loading...</div>
      ) : notifications.length === 0 && activeCampaigns.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: '64px' }}>
          <div style={{ background: 'var(--color-surface)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '16px', border: '1px solid var(--color-outline)' }}>
             <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0', color: 'var(--color-text-main)' }}>No notifications yet</h3>
          <p style={{ fontSize: '14px', margin: 0, color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: '250px' }}>You're all caught up! New alerts and messages will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Render Live Campaigns First */}
          {activeCampaigns.map(camp => (
            <div key={camp.id} className="clay-card btn-touch" style={{
              padding: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '16px',
              marginBottom: '16px',
              border: '2px solid var(--color-accent)',
              background: 'var(--color-outline)'
            }}>
              <div style={{
                background: 'rgba(58, 255, 21, 0.15)',
                color: 'var(--color-primary)',
                width: '40px', height: '40px',
                borderRadius: '50%',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                flexShrink: 0,
                marginTop: '4px'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--color-primary)' }}>{camp.title}</h4>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-background)', background: 'var(--color-primary)', padding: '2px 8px', borderRadius: '12px' }}>LIVE</span>
                </div>
                <p style={{ fontSize: '14px', margin: 0, color: 'var(--color-text-main)' }}>{camp.description || camp.subtitle}</p>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginTop: '8px' }}>
                  {camp.businessName}
                </span>
              </div>
            </div>
          ))}

          {/* Render Database Notifications */}
          {notifications.map(notif => (
            <SwipeableNotification 
              key={notif.id} 
              notification={notif} 
              onDeleteRequest={(id) => setDeletingId(id)}
              onRead={handleRead}
            />
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {deletingId && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.8)',
          zIndex: 100,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '24px'
        }}>
          <div className="clay-card animate-scale-in" style={{
            background: 'var(--color-surface)',
            padding: '24px',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '320px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: 800, color: 'var(--color-text-main)' }}>Delete Notification?</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '15px', color: 'var(--color-text-muted)' }}>Are you sure you want to delete this notification? This cannot be undone.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setDeletingId(null)}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.1)', color: 'var(--color-text-main)',
                  border: 'none', fontWeight: 700, fontSize: '16px'
                }}
              >
                No
              </button>
              <button 
                onClick={confirmDelete}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px',
                  background: '#ef4444', color: '#fff',
                  border: 'none', fontWeight: 700, fontSize: '16px',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
