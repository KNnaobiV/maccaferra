import React from 'react';
import StatusBadge from './StatusBadge';
import Avatar from './Avatar';
import { Calendar } from 'lucide-react';

const formatDate = (val) => {
  if (!val) return 'TBD';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return val;
};

const ProjectCard = ({ project, onClick }) => {
  const progress = project.progress || 0;
  const dueDate = formatDate(project.target_end_date || project.proposed_end_date);
  const clientName = project.client?.display_name || project.client?.username || project.client_name || 'N/A';

  // Gather real project participants (max 7)
  const projectUsers = (project.users && Array.isArray(project.users) && project.users.length > 0)
    ? project.users
    : (() => {
        const list = [];
        const seen = new Set();
        const add = (u) => {
          if (u && (u.id || u.username) && !seen.has(u.id || u.username)) {
            seen.add(u.id || u.username);
            list.push(u);
          }
        };
        add(project.project_manager);
        add(project.client);
        add(project.created_by);
        (project.consultants || []).forEach(add);
        return list;
      })();

  const displayedUsers = projectUsers.slice(0, 7);

  return (
    <div className="card" onClick={onClick} style={{ cursor: 'pointer', padding: 0, overflow: 'hidden' }}>
      {/* Thumbnail */}
      {(() => {
        const coverUrl = project.cover_image?.img || (typeof project.cover_image === 'string' ? project.cover_image : null) || 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=800';
        return (
          <div style={{ 
            height: '160px', 
            background: 'var(--bg-raised)', 
            position: 'relative',
            backgroundImage: `url(${coverUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}>
            <div style={{ position: 'absolute', top: '16px', left: '16px' }}>
              <StatusBadge status={project.project_status} />
            </div>
          </div>
        );
      })()}

      <div style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>{project.project_name}</h3>
        <p style={{ fontSize: '14px', marginBottom: '16px' }}>Client: <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{clientName}</span></p>
        
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-tertiary)' }}>Overall Progress</span>
            <span style={{ fontWeight: 600 }}>{progress}%</span>
          </div>
          <div style={{ height: '6px', background: 'var(--bg-raised)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ 
              width: `${progress}%`, 
              height: '100%', 
              background: 'var(--brand-orange)',
              borderRadius: '3px'
            }} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-tertiary)', fontSize: '12px', flexShrink: 0 }}>
            <Calendar size={14} />
            <span>Due: {dueDate}</span>
          </div>

          {displayedUsers.length > 0 && (
            <div style={{ display: 'flex', marginLeft: 'auto', alignItems: 'center' }}>
              {displayedUsers.map((u, i) => {
                const displayName = u.display_name || u.username || `${u.first_name || ''} ${u.last_name || ''}`.trim() || `User ${i + 1}`;
                return (
                  <div
                    key={u.id || u.username || i}
                    style={{
                      marginLeft: i === 0 ? 0 : -8,
                      border: '2px solid var(--bg-card, #fff)',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      zIndex: displayedUsers.length - i,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                    title={displayName}
                  >
                    <Avatar
                      user={u}
                      name={displayName}
                      size={28}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
