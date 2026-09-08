import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Check, CheckCircle2, Image as ImageIcon, Edit2, X, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, unwrapList, formatApiError, getMediaUrl } from '../api/client';
import { Breadcrumb, Tabs, Avatar, Spinner, ProgressDonut, MaterialsEditor, ImageUploader } from '../components';
import { showSuccessMessage } from '../utils/successMessage';

const statusColors = {
  'Planned': { bg: '#e8e8e8', text: '#555' },
  'In Progress': { bg: '#fef3ec', text: '#c14a1e' },
  'Completed': { bg: '#e8f5e9', text: '#2d5a27' },
  'On Hold': { bg: '#fff3e0', text: '#e65100' },
  'Delayed': { bg: '#fce4ec', text: '#a32a2a' },
  'Cancelled': { bg: '#f5f5f5', text: '#9e9e9e' },
};
const StatusPill = ({ status }) => {
  const c = statusColors[status] || statusColors['Planned'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 14px', borderRadius: '100px', background: c.bg, color: c.text, fontWeight: 600, fontSize: '13px' }}>
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: c.text, flexShrink: 0 }} />{status}
    </span>
  );
};

const FormOverlay = ({ children, onClose }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' }}
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}>{children}</div>
);

const inputStyle = { width: '100%', padding: '16px', borderRadius: '14px', border: '1px solid var(--border-default)', background: 'var(--bg-raised)', color: 'var(--text-primary)', fontSize: '15px', fontFamily: 'var(--font-sans)' };
const labelStyle = { display: 'block', marginBottom: '10px', fontWeight: 600, fontSize: '14px', color: 'var(--text-secondary)', letterSpacing: '0.04em' };

const ARTISANS = ['Mason', 'Plumber', 'Electrician', 'Carpenter', 'Painter', 'Roofer', 'Iron Bender', 'Tiler', 'Glass Worker', 'Aluminium Worker', 'Other'];

// ─── New Job Item Form ─────────────────────────────────────────────────────────
const NewJobItemForm = ({ projectId, plotId, workItemId, token, onSuccess, onClose }) => {
  const [form, setForm] = useState({
    job_name: '', job_description: '', job_artisan: '', job_status: 'Planned',
    priority: 'Medium',
    start_date: new Date().toISOString().split('T')[0],
    target_end_date: '',
    estimated_hours: '',
  });
  const [materials, setMaterials] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(null);
    const payload = {
      job_name: form.job_name, job_description: form.job_description,
      job_artisan: form.job_artisan, job_status: form.job_status,
      priority: form.priority,
      start_date: form.start_date,
      target_end_date: form.target_end_date,
    };
    if (form.actual_start_date) payload.actual_start_date = form.actual_start_date;
    if (form.actual_end_date) payload.actual_end_date = form.actual_end_date;
    if (form.estimated_hours) payload.estimated_hours = parseFloat(form.estimated_hours);
    if (materials.length) payload.material_requirements = materials;

    try {
      const res = await apiFetch(`/projects/${projectId}/plots/${plotId}/workitems/${workItemId}/jobitems/`, { method: 'POST', token, body: JSON.stringify(payload) });
      if (res.ok) { showSuccessMessage('Job item created ✅'); onSuccess(); onClose(); }
      else { const d = await res.json(); setError(formatApiError(d)); }
    } catch { setError('Connection error.'); } finally { setSaving(false); }
  };

  return (
    <div className="fade-in" style={{ background: 'var(--bg-card)', borderRadius: '24px', padding: '44px', maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.15)' }}>
      <h2 style={{ fontSize: '32px', marginBottom: '6px' }}>New Job Item</h2>
      <p style={{ color: 'var(--text-tertiary)', marginBottom: '32px' }}>Define a specific task for this work item.</p>
      {error && <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626', padding: '12px 16px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px' }}>{error}</div>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Job Name *</label>
            <input type="text" required value={form.job_name} onChange={e => set('job_name', e.target.value)} placeholder="e.g. Install Conduit" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Artisan Type *</label>
            <select required value={form.job_artisan} onChange={e => set('job_artisan', e.target.value)} style={inputStyle}>
              <option value="">Select artisan...</option>
              {ARTISANS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Description</label>
          <textarea value={form.job_description} onChange={e => set('job_description', e.target.value)} placeholder="Describe scope of work..." style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }} />
        </div>
        <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Status *</label>
            <select required value={form.job_status} onChange={e => set('job_status', e.target.value)} style={inputStyle}>
              {['Planned', 'In Progress', 'Completed', 'On Hold', 'Delayed', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Priority *</label>
            <select required value={form.priority} onChange={e => set('priority', e.target.value)} style={inputStyle}>
              {['Low', 'Medium', 'High', 'Urgent'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Estimated Hours <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span></label>
            <input type="number" step="0.5" min="0" value={form.estimated_hours} onChange={e => set('estimated_hours', e.target.value)} placeholder="e.g. 12.5" style={inputStyle} />
          </div>
        </div>
        <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Start Date *</label>
            <input type="date" required value={form.start_date} onChange={e => set('start_date', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Target End Date *</label>
            <input type="date" required value={form.target_end_date} onChange={e => set('target_end_date', e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Actual Start <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span></label>
            <input type="date" value={form.actual_start_date} onChange={e => set('actual_start_date', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Actual End <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span></label>
            <input type="date" value={form.actual_end_date} onChange={e => set('actual_end_date', e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* Material Requirements */}
        <div>
          <label style={{ ...labelStyle, marginBottom: '14px' }}>
            Material Requirements <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span>
          </label>
          <MaterialsEditor items={materials} onChange={setMaterials} />
        </div>

        <div style={{ display: 'flex', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
          <button type="button" className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
            {saving ? (typeof window !== 'undefined' && window.location.pathname.includes('/edit') ? 'Editing...' : 'Creating...') : (typeof window !== 'undefined' && window.location.pathname.includes('/edit') ? 'Edit' : '+ Create Job Item')}
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── Attach Photos Modal ───────────────────────────────────────────────────────
const AttachPhotosModal = ({ projectId, plotId, workItemId, token, onSuccess, onClose }) => {
  const [stagedFiles, setStagedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpload = async (filesToUpload = stagedFiles) => {
    if (!filesToUpload || filesToUpload.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of filesToUpload) {
        const fd = new FormData();
        fd.append('image', file);
        const res = await apiFetch(`/projects/${projectId}/plots/${plotId}/workitems/${workItemId}/images/`, {
          method: 'POST',
          token,
          body: fd,
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(formatApiError(errData, 'Failed to upload photo'));
        }
      }
      showSuccessMessage(`Photo${filesToUpload.length > 1 ? 's' : ''} added successfully ✅`);
      setStagedFiles([]);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error saving photos');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fade-in" style={{ background: 'var(--bg-card)', borderRadius: '24px', padding: '36px', maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.15)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <h2 style={{ fontSize: '24px', margin: 0 }}>Attach Photos</h2>
        <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
          <X size={20} />
        </button>
      </div>
      <p style={{ color: 'var(--text-tertiary)', marginBottom: '24px', fontSize: '14px' }}>Select pictures from your gallery to attach to this work item.</p>

      {error && <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626', padding: '12px 16px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px' }}>{error}</div>}

      <ImageUploader
        files={stagedFiles}
        onChange={setStagedFiles}
        label="Select Photos"
        max={10}
        onUpload={handleUpload}
        uploading={uploading}
        uploadButtonText="Upload"
      />

      <div style={{ display: 'flex', gap: '12px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)', marginTop: '24px' }}>
        <button type="button" className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Close</button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const WorkItemDetailPage = () => {
  const { projectId: pidFromUrl, plotId: plidFromUrl, workItemId } = useParams();
  const id = workItemId;
  const [projectId, setProjectId] = useState(pidFromUrl);
  const [plotId, setPlotId] = useState(plidFromUrl);
  const { token } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [plot, setPlot] = useState(null);
  const [workItem, setWorkItem] = useState(null);
  const [jobItems, setJobItems] = useState([]);
  const [images, setImages] = useState([]);
  const [stagedPhotos, setStagedPhotos] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNewJobItem, setShowNewJobItem] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { fetchAll(); }, [projectId, plotId, id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const wiRes = await apiFetch(`/workitems/${id}/`, { token });
      if (wiRes.ok) {
        const wiData = await wiRes.json();
        setWorkItem(wiData);

        const pid = pidFromUrl || wiData.construction_project;
        const plid = plidFromUrl || wiData.construction_plot;
        setProjectId(pid);
        setPlotId(plid);

        const [projRes, plotRes, jiRes] = await Promise.all([
          apiFetch(`/projects/${pid}/`, { token }),
          apiFetch(`/projects/${pid}/plots/${plid}/`, { token }),
          apiFetch(`/projects/${pid}/plots/${plid}/workitems/${id}/jobitems/`, { token }),
        ]);
        if (projRes.ok) setProject(await projRes.json());
        if (plotRes.ok) setPlot(await plotRes.json());
        if (jiRes.ok) setJobItems(unwrapList(await jiRes.json()));
      }
    } catch (e) {
      console.error("WorkItemDetailPage fetch error:", e);
    } finally { setLoading(false); }
  };

  const handleApprove = async () => {
    try {
      const res = await apiFetch(`/projects/${projectId}/plots/${plotId}/workitems/${id}/approve/`, {
        method: 'POST',
        token,
      });
      if (res.ok) {
        showSuccessMessage("Work Item approved!");
        fetchAll();
      } else {
        const data = await res.json();
        console.error("Failed to approve work item:", data);
        alert(data.detail || "Failed to approve work item");
      }
    } catch (err) { console.error(err); }
  };

  const handleSavePhotos = async (filesToUpload = stagedPhotos) => {
    if (!filesToUpload || filesToUpload.length === 0) return;
    setUploadingPhotos(true);
    try {
      for (const file of filesToUpload) {
        const fd = new FormData();
        fd.append('image', file);
        const res = await apiFetch(`/projects/${projectId}/plots/${plotId}/workitems/${id}/images/`, {
          method: 'POST',
          token,
          body: fd,
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(formatApiError(errData, 'Failed to upload photo'));
        }
      }
      showSuccessMessage(`Photo${filesToUpload.length > 1 ? 's' : ''} added successfully ✅`);
      setStagedPhotos([]);
      fetchAll();
    } catch (err) {
      console.error('Failed to upload photos:', err);
      alert(err.message || 'Error uploading photos');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm("Are you sure you want to delete this photo?")) return;
    try {
      const url = projectId && plotId
        ? `/projects/${projectId}/plots/${plotId}/workitems/${id}/images/${photoId}/`
        : `/workitems/${id}/images/${photoId}/`;
      const res = await apiFetch(url, {
        method: 'DELETE',
        token,
      });
      if (res.ok) {
        showSuccessMessage("Photo deleted successfully ✅");
        fetchAll();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(formatApiError(errData, "Failed to delete photo"));
      }
    } catch (err) {
      console.error('Failed to delete photo:', err);
      alert("Error deleting photo");
    }
  };

  const completedJobs = jobItems.filter(j => j.job_status === 'Completed').length;
  const progress = jobItems.length ? Math.round((completedJobs / jobItems.length) * 100) : 0;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'jobitems', label: `Job Items (${jobItems.length})` },
    { id: 'photos', label: 'Photos' },
  ];

  if (loading) return <div style={{ padding: '60px', display: 'flex', justifyContent: 'center' }}><Spinner /></div>;
  if (!workItem) return <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-tertiary)' }}>Work item not found.</div>;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 0 60px' }}>
      <Breadcrumb items={[
        { label: 'Projects', to: '/projects' },
        { label: project?.project_name || '...', to: `/projects/${projectId}` },
        { label: plot?.address || '...', to: `/plots/${plotId}` },
        { label: workItem.name },
      ]} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(26px,4vw,44px)', marginBottom: '10px', lineHeight: 1.05 }}>{workItem.name}</h1>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <StatusPill status={workItem.work_status} />
              {workItem.is_approved && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#edf5ed', color: '#2d5a27', padding: '5px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: 600 }}>
                  <CheckCircle2 size={14} /> Approved
                </span>
              )}
            </div>
          </div>
          <ProgressDonut percent={progress} size={100} strokeWidth={9} />
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {(plot?.role === 'owner' || plot?.role === 'project_manager' || plot?.role === 'foreman') && (
            <button className="btn-ghost" onClick={() => navigate(`/work-items/${id}/edit`)}>
              <Edit2 size={16} /> Edit Work
            </button>
          )}
          {!workItem.is_approved && (
            <button className="btn-ghost" onClick={handleApprove} style={{ color: '#2d5a27', borderColor: '#2d5a27' }}>
              <CheckCircle2 size={16} /> Approve Work
            </button>
          )}
          <button className="btn-ghost" onClick={() => setShowAttachModal(true)}>
            <ImageIcon size={16} /> Attach Photos
          </button>
          {(plot?.role === 'owner' || plot?.role === 'project_manager' || plot?.role === 'foreman') && workItem.work_status !== 'Completed' && (
            <button className="btn-primary" onClick={() => navigate(`/work-items/${id}/job-items/new`)}>
              <Plus size={16} /> Add Job Item
            </button>
          )}
        </div>
      </div>

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} style={{ marginBottom: '36px', marginTop: '24px' }} />

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Description */}
            {workItem.description && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '20px', padding: '24px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-tertiary)', textTransform: 'uppercase', margin: '0 0 12px' }}>Description</p>
                <p style={{ margin: 0, lineHeight: 1.7, color: 'var(--text-secondary)', fontSize: '15px' }}>{workItem.description}</p>
              </div>
            )}

            {/* Dates */}
            <div className="mobile-grid-1" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '20px', padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Start Date</p>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>{workItem.start_date}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Target End Date</p>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>{workItem.target_end_date}</p>
              </div>
            </div>
          </div>

          {/* Job Items sidebar preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-tertiary)', textTransform: 'uppercase', margin: 0 }}>Job Items ({jobItems.length})</p>
              <button onClick={() => setActiveTab('jobitems')} style={{ background: 'none', border: 'none', fontSize: '13px', color: 'var(--brand-orange)', cursor: 'pointer' }}>View all →</button>
            </div>
            {jobItems.slice(0, 4).map(ji => (
              <div
                key={ji.id}
                onClick={() => navigate(`/job-items/${ji.id}`)}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '16px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-orange)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
              >
                <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{ji.job_name}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{ji.job_artisan}</span>
                  <StatusPill status={ji.job_status} />
                </div>
              </div>
            ))}
            {(plot?.role === 'owner' || plot?.role === 'project_manager' || plot?.role === 'foreman') && workItem.work_status !== 'Completed' && (
              <button className="btn-ghost" onClick={() => setShowNewJobItem(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}>
                <Plus size={14} /> Add Job Item
              </button>
            )}
          </div>
        </div>
      )}

      {/* Job Items Tab */}
      {activeTab === 'jobitems' && (
        <div>
          {jobItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-tertiary)' }}>
              <p style={{ fontWeight: 600 }}>No job items yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {jobItems.map(ji => (
                <div
                  key={ji.id}
                  onClick={() => navigate(`/job-items/${ji.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '18px 22px', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-orange)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 3px', fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{ji.job_name}</p>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{ji.start_date} → {ji.target_end_date}</p>
                  </div>
                  {ji.estimated_hours && <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>{ji.estimated_hours}h</span>}
                  <StatusPill status={ji.job_status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Photos Tab */}
      {activeTab === 'photos' && (
        <div>
          <div style={{ marginBottom: '28px', background: 'var(--bg-card)', padding: '24px', borderRadius: '18px', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '17px', margin: '0 0 16px', fontWeight: 600 }}>Add Photos</h3>
            <ImageUploader
              files={stagedPhotos}
              onChange={setStagedPhotos}
              label="Select Photos"
              max={20}
              onUpload={handleSavePhotos}
              uploading={uploadingPhotos}
              uploadButtonText="Upload"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', margin: 0 }}>Gallery ({workItem.images?.length || 0})</h3>
          </div>

          {workItem.images?.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px' }}>
              {workItem.images.map(img => (
                <div key={img.id} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
                  <img src={getMediaUrl(img.image || img.img)} alt={img.caption || ''} style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }} />
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(img.id)}
                    title="Delete photo"
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(0, 0, 0, 0.65)',
                      border: 'none',
                      borderRadius: '8px',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#fff',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.65)'; }}
                  >
                    <Trash2 size={14} />
                  </button>
                  {img.caption && <p style={{ margin: 0, padding: '8px 10px', fontSize: '12px', color: 'var(--text-secondary)' }}>{img.caption}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
              <ImageIcon size={36} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
              <p style={{ fontWeight: 600, margin: '0 0 4px' }}>No photos yet</p>
              <p style={{ fontSize: '13px', margin: 0 }}>Select photos above and click "Add Photo" to save them to this work item.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showNewJobItem && (
        <FormOverlay onClose={() => setShowNewJobItem(false)}>
          <NewJobItemForm projectId={projectId} plotId={plotId} workItemId={id} token={token} onSuccess={fetchAll} onClose={() => setShowNewJobItem(false)} />
        </FormOverlay>
      )}

      {showAttachModal && (
        <FormOverlay onClose={() => setShowAttachModal(false)}>
          <AttachPhotosModal
            projectId={projectId}
            plotId={plotId}
            workItemId={id}
            token={token}
            onSuccess={fetchAll}
            onClose={() => setShowAttachModal(false)}
          />
        </FormOverlay>
      )}
    </div>
  );
};

export default WorkItemDetailPage;
