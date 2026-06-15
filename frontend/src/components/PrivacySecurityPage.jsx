import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const Toggle = ({ label, description, checked, onChange, disabled = false }) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', background: 'var(--color-surface)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-outline)' }}>
      <div style={{ flex: 1, paddingRight: '16px' }}>
        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-text-main)' }}>{label}</h4>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>{description}</p>
      </div>
      <div 
        onClick={() => { if (!disabled) onChange(!checked); }}
        style={{
          width: '44px', height: '24px', background: checked ? 'var(--color-primary)' : '#e5e7eb',
          opacity: disabled ? 0.5 : 1,
          borderRadius: '12px', position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer', transition: 'background 0.3s', flexShrink: 0
        }}
      >
        <div style={{
          position: 'absolute', top: '2px', left: checked ? '22px' : '2px', width: '20px', height: '20px',
          background: 'white', borderRadius: '50%', transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }} />
      </div>
    </div>
  );
};

const PrivacySecurityPage = ({ onBack }) => {
  const { user, updateUser, deleteAccount } = useAuth();
  const prefs = user?.preferences || {};
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0);

  const handleToggle = async (key, value) => {
    const newPrefs = { ...prefs, [key]: value };
    await updateUser({ preferences: newPrefs });
  };

  const handleGenerateDataArchive = () => {
    setIsGeneratingPdf(true);
    
    setTimeout(() => {
      try {
        const doc = new jsPDF();
        
        doc.setFontSize(22);
        doc.text("Personal Data Archive", 14, 20);
        
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
        doc.text(`Account ID: ${user.id} | User: ${user.name}`, 14, 34);

        // Section 1: Account Information
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("1. Account Information", 14, 46);
        autoTable(doc, {
          startY: 50,
          head: [['Field', 'Value']],
          body: [
            ['Full Name', user.name || 'N/A'],
            ['Email', user.email || 'N/A'],
            ['Phone Number', user.phoneNumber || 'N/A'],
            ['Role', user.role || 'N/A'],
          ],
          theme: 'striped',
          headStyles: { fillColor: [58, 255, 21], textColor: [17,17,17] }
        });

        // Section 2: Privacy Preferences
        let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 14 : 90;
        doc.text("2. Privacy Preferences & Cookies", 14, finalY);
        autoTable(doc, {
          startY: finalY + 4,
          head: [['Setting', 'Status']],
          body: [
            ['Precise Live Location', prefs.preciseLocation !== false ? 'Enabled' : 'Disabled'],
            ['Background Location', prefs.backgroundLocation !== false ? 'Enabled' : 'Disabled'],
            ['Marketing & Analytics', prefs.marketingAnalytics === true ? 'Enabled' : 'Disabled'],
            ['Partner Sharing', prefs.partnerSharing !== false ? 'Enabled' : 'Disabled'],
            ['Essential Cookies', 'Required & Active'],
          ],
          theme: 'striped',
          headStyles: { fillColor: [58, 255, 21], textColor: [17,17,17] }
        });

        // Section 3: App Usage Statistics
        finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 14 : 150;
        doc.text("3. App Usage & Interactions", 14, finalY);
        autoTable(doc, {
          startY: finalY + 4,
          head: [['Metric', 'Value / Details']],
          body: [
            ['Total Time Logged In', '142 Hours, 12 Mins'],
            ['Places Visited / Viewed', '47 Unique Places'],
            ['Pages Interacted', 'Search (342), Map (128), Dashboard (45)'],
            ['Ads Clicked', '12 Sponsored Places'],
            ['Total Purchases', '24 Orders'],
            ['Last Known IP Address', '192.168.1.144'],
          ],
          theme: 'striped',
          headStyles: { fillColor: [58, 255, 21], textColor: [17,17,17] }
        });

        doc.save(`${user.name.replace(/\s+/g, '_')}_Data_Archive.pdf`);
      } catch (e) {
        console.error("PDF Generation Error:", e);
        alert("Failed to generate PDF");
      } finally {
        setIsGeneratingPdf(false);
      }
    }, 800);
  };

  const handleDeleteClick = async () => {
    if (deleteStep === 0) setDeleteStep(1);
    else if (deleteStep === 1) setDeleteStep(2);
    else if (deleteStep === 2) {
      const res = await deleteAccount();
      if (!res.success) alert(res.error);
    }
  };

  return (
    <div className="animate-slide-up-page" style={{
      position: 'absolute',
      top: 0, left: 0, width: '100%', height: '100%',
      background: 'var(--color-background)',
      zIndex: 60,
      display: 'flex', flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: 'calc(var(--safe-area) + 16px) 24px 16px 24px',
        display: 'flex', alignItems: 'center',
        background: 'rgba(17,17,17,0.9)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--color-outline)',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <button className="btn-touch" onClick={onBack} style={{
          background: 'var(--color-outline)', border: 'none', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '16px'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-main)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--color-text-main)' }}>Privacy & Security</h1>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        
        <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '16px', marginLeft: '8px' }}>Location Services</h3>
        <Toggle 
          label="Precise Live Location" 
          description="Allows restaurants to see your ETA when you order take-away."
          checked={prefs.preciseLocation !== false}
          onChange={(val) => handleToggle('preciseLocation', val)}
        />
        <Toggle 
          label="Background Location" 
          description="Receive live offers from nearby businesses even when the app is closed."
          checked={prefs.backgroundLocation !== false}
          onChange={(val) => handleToggle('backgroundLocation', val)}
        />

        <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '16px', marginTop: '24px', marginLeft: '8px' }}>Data & Cookies</h3>
        <Toggle 
          label="Essential Cookies" 
          description="Required for the app to function properly. Cannot be disabled."
          checked={true}
          disabled={true}
          onChange={() => {}}
        />
        <Toggle 
          label="Marketing & Analytics" 
          description="Help us improve the app and show you relevant content."
          checked={prefs.marketingAnalytics === true}
          onChange={(val) => handleToggle('marketingAnalytics', val)}
        />
        <Toggle 
          label="Partner Sharing" 
          description="Share anonymous footfall data with business partners to improve local offers."
          checked={prefs.partnerSharing !== false}
          onChange={(val) => handleToggle('partnerSharing', val)}
        />

        <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '16px', marginTop: '24px', marginLeft: '8px' }}>Data Control</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            className="btn-touch" 
            onClick={handleGenerateDataArchive}
            disabled={isGeneratingPdf}
            style={{
              width: '100%', padding: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-outline)', color: 'var(--color-text-main)', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '14px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}
          >
            {isGeneratingPdf ? 'Generating PDF...' : 'Request Data Archive'}
            {!isGeneratingPdf && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            )}
          </button>
          <button className="btn-touch" onClick={() => setDeleteStep(1)} style={{
            width: '100%', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '14px', textAlign: 'left'
          }}>
            Delete Account
          </button>
        </div>

        <div style={{ height: '120px' }}></div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteStep > 0 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px' }}>
          <div style={{ background: 'var(--color-surface)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-outline)', width: '100%', maxWidth: '400px', animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--color-text-main)', fontSize: '18px', fontWeight: 800 }}>
              {deleteStep === 1 ? 'Delete Account?' : 'Final Warning'}
            </h3>
            <p style={{ margin: '0 0 24px 0', color: 'var(--color-text-muted)', fontSize: '15px', lineHeight: 1.5 }}>
              {deleteStep === 1 
                ? 'Are you sure you want to delete your account?' 
                : 'Once you choose to delete, there is no way to recover the deleted data or account. Are you absolutely sure?'}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-touch" onClick={() => setDeleteStep(0)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--color-outline)', color: 'var(--color-text-main)', borderRadius: 'var(--radius-md)', fontWeight: 700 }}>
                {deleteStep === 1 ? 'No, Cancel' : 'Not'}
              </button>
              <button className="btn-touch" onClick={handleDeleteClick} style={{ flex: 1, padding: '12px', background: '#ef4444', border: 'none', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 700 }}>
                {deleteStep === 1 ? 'Yes' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivacySecurityPage;
