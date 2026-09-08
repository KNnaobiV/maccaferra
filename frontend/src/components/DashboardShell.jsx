import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

const DashboardShell = ({ children }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      if (mobile !== isMobile) {
        setIsMobile(mobile);
        if (mobile) {
          setIsSidebarOpen(false);
        } else {
          setIsSidebarOpen(true);
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-canvas)' }}>
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isMobile={isMobile} />
      <main 
        className="mobile-padding mobile-no-margin"
        style={{ 
          flex: 1, 
          marginLeft: isMobile ? '0px' : (isSidebarOpen ? '280px' : '0px'), 
          padding: '48px 64px',
          minHeight: '100vh',
          transition: 'margin-left 0.3s ease',
          width: '100%',
          overflowX: 'hidden',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', justifyContent: isMobile ? 'space-between' : 'flex-start' }}>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
              borderRadius: '8px',
              transition: 'background 0.2s',
            }}
            title={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            <Menu size={28} />
          </button>
          {isMobile && (
            <>
              <h2 style={{ margin: 0, fontSize: '24px', fontFamily: 'var(--font-serif)' }}>Iron<em style={{ color: "var(--brand-orange)" }}>Work</em></h2>
              <div style={{ width: '44px' }}></div>
            </>
          )}
        </div>
        {children}
      </main>
      
      {isMobile && isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 90
          }}
        />
      )}
    </div>
  );
};

export default DashboardShell;
