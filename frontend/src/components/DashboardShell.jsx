import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Menu, HardHat } from 'lucide-react';

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
          marginLeft: isMobile ? '0px' : (isSidebarOpen ? '280px' : '80px'), 
          padding: '48px 64px',
          minHeight: '100vh',
          transition: 'margin-left 0.3s ease',
          width: '100%',
          overflowX: 'hidden',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {/* Mobile Header: only shown on mobile (<=768px) where sidebar is an off-canvas drawer */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', justifyContent: 'space-between' }}>
            <button 
              onClick={() => setIsSidebarOpen(true)}
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
              }}
              title="Open menu"
            >
              <Menu size={26} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                background: 'var(--brand-orange)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <HardHat size={16} color="#fff" />
              </div>
              <h2 style={{ margin: 0, fontSize: '22px', fontFamily: 'var(--font-serif)', lineHeight: 1 }}>
                Iron<em style={{ color: "var(--brand-orange-light)", fontStyle: 'italic' }}>Work</em>
              </h2>
            </div>
            <div style={{ width: '42px' }}></div>
          </div>
        )}
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
