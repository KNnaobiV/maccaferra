import React from 'react';
import StatusBadge from './StatusBadge';
import { Calendar, CheckCircle2, ArrowRight, MapPin } from 'lucide-react';

const WorkItemCard = ({ item, onClick }) => {
  return (
    <div className="card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <StatusBadge status={item.work_status} />
      </div>

      <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>{item.name}</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--brand-orange)', marginBottom: '12px' }}>
        <MapPin size={14} />
        <span>{item.construction_plot_name || 'Plot N/A'}</span>
      </div>
      <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginBottom: '20px', lineHeight: 1.5 }}>
        {item.description || 'Phase description goes here...'}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <Calendar size={14} />
          <span>Proposed end: {item.proposed_end_date || '30 Sep 2026'}</span>
        </div>
        {item.is_approved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#edf5ed', color: '#2d5a27', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
            <CheckCircle2 size={12} />
            <span>Approved</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: '8px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '12px' }}>
          <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>Progress</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{Math.max(0, Math.min(100, Number(item.progress ?? 0)))}%</span>
        </div>
        <div style={{ height: '6px', background: 'var(--bg-raised)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.max(0, Math.min(100, Number(item.progress ?? 0)))}%`,
            background: 'var(--brand-orange)',
            borderRadius: '3px',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--brand-orange)', fontWeight: 600, fontSize: '14px' }}>
        <span>View details</span>
        <ArrowRight size={16} style={{ marginLeft: '4px' }} />
      </div>
    </div>
  );
};

export default WorkItemCard;
