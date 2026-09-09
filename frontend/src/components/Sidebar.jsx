import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  Map as MapIcon,
  CheckSquare,
  ClipboardList,
  UserPlus,
  Bell,
  Menu,
  HardHat,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';

const Sidebar = ({ isOpen, toggleSidebar, isMobile }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects', icon: Briefcase, label: 'Projects' },
    { to: '/plots', icon: MapIcon, label: 'Plots' },
    { to: '/work-items', icon: CheckSquare, label: 'Work Items' },
    { to: '/job-items', icon: ClipboardList, label: 'Job Items' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
  ];

  return (
    <div style={{
      width: isMobile ? (isOpen ? '280px' : '0px') : (isOpen ? '280px' : '80px'),
      height: '100dvh',
      background: 'var(--bg-sidebar)',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      padding: isMobile ? (!isOpen ? '0' : '32px 20px') : (isOpen ? '32px 20px' : '32px 14px'),
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      zIndex: 100,
      transition: 'width 0.3s ease, padding 0.3s ease',
      overflowX: 'hidden',
      boxSizing: 'border-box'
    }}>
      {/* Brand & Hamburger Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: (!isOpen && !isMobile) ? 'center' : 'space-between',
        marginBottom: '40px',
        width: '100%'
      }}>
        {!isOpen && !isMobile ? (
          /* Desktop Collapsed View: Centered HardHat logo button to expand */
          <button
            onClick={toggleSidebar}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Expand sidebar"
          >
            <div style={{
              width: '40px',
              height: '40px',
              background: 'var(--brand-orange)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(193, 74, 30, 0.4)',
              transition: 'transform 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.06)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <HardHat size={22} color="#fff" />
            </div>
          </button>
        ) : (
          /* Expanded View (Desktop & Mobile): Brand on Left, Hamburger on Right */
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <div style={{
                width: '38px',
                height: '38px',
                background: 'var(--brand-orange)',
                borderRadius: '9px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(193, 74, 30, 0.35)'
              }}>
                <HardHat size={22} color="#fff" />
              </div>

              <h2 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '26px',
                margin: 0,
                color: '#fff',
                whiteSpace: 'nowrap',
                lineHeight: 1
              }}>
                Iron<em style={{ color: "var(--brand-orange-light)", fontStyle: 'italic' }}>Work</em>
              </h2>
            </div>

            {!isMobile && (
              <button
                onClick={toggleSidebar}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  cursor: 'pointer',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  padding: 0,
                  flexShrink: 0,
                  transition: 'all 0.2s ease'
                }}
                title="Collapse sidebar"
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
              >
                <Menu size={18} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1 }}>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {navItems.map((item) => (
            <li key={item.label} style={{ marginBottom: '8px' }}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: isOpen ? '12px' : '0px',
                  padding: isOpen ? '12px 16px' : '12px 0px',
                  borderRadius: '12px',
                  color: isActive ? '#fff' : 'var(--text-tertiary)',
                  background: isActive ? 'rgba(193, 74, 30, 0.15)' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '15px',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  justifyContent: isOpen ? 'flex-start' : 'center',
                  width: '100%'
                })}
                title={!isOpen ? item.label : undefined}
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={20} color={isActive ? 'var(--brand-orange)' : 'currentColor'} style={{ flexShrink: 0 }} />
                    {isOpen && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Profile */}
      <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <NavLink
          to="/profile"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: isOpen ? '12px' : '0px',
            textDecoration: 'none',
            background: isActive ? 'rgba(193, 74, 30, 0.15)' : 'transparent',
            borderRadius: '12px',
            padding: isOpen ? '16px' : '8px 0px',
            transition: 'all 0.2s',
            justifyContent: isOpen ? 'flex-start' : 'center',
            width: '100%'
          })}
          title={!isOpen ? 'Profile' : undefined}
        >
          <div style={{ flexShrink: 0 }}>
            <Avatar user={user} name={user?.display_name || user?.username} size={36} />
          </div>
          {isOpen && (
            <>
              <div style={{ overflow: 'hidden', minWidth: 0, flex: 1 }}>
                <p style={{
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {user?.display_name || user?.username}
                </p>
              </div>
              <ChevronRight size={16} color="var(--text-tertiary)" style={{ marginLeft: 'auto', flexShrink: 0 }} />
            </>
          )}
        </NavLink>

        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isOpen ? '12px' : '0px',
            padding: isOpen ? '12px 16px' : '12px 0px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: 500,
            transition: 'all 0.2s',
            width: '100%',
            justifyContent: isOpen ? 'flex-start' : 'center'
          }}
          title={!isOpen ? 'Sign Out' : undefined}
          onMouseOver={(e) => { e.currentTarget.style.color = '#EB5757'; e.currentTarget.style.background = 'rgba(235, 87, 87, 0.1)'; }}
          onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <LogOut size={20} style={{ flexShrink: 0 }} />
          {isOpen && <span style={{ whiteSpace: 'nowrap' }}>Sign Out</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
