import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Breadcrumb, Spinner, SearchableSelect } from '../components';
import { Upload, X, ArrowLeft, Camera, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, formatApiError } from '../api/client';
import { showSuccessMessage } from '../utils/successMessage';

const CreateProjectPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const isEditing = !!projectId;
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [clientUpdated, setClientUpdated] = useState(false);

  const [coverImageFile, setCoverImageFile] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState(null);
  const [existingCoverImage, setExistingCoverImage] = useState(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [formData, setFormData] = useState({
    project_name: '',
    client: '',
    project_description: '',
    start_date: new Date().toISOString().split('T')[0],
    target_end_date: '',
    project_manager: '',
    address: '',
    project_status: 'Planned'
  });

  useEffect(() => {
    if (isEditing) {
      fetchProject();
    }
  }, []);

  const fetchProject = async () => {
    try {
      const res = await apiFetch(`/projects/${projectId}/`, { token });
      if (res.ok) {
        const project = await res.json();
        const hasClient = !!project.client;
        setFormData({
          project_name: project.project_name || '',
          client: project.client?.id || '',
          project_description: project.project_description || '',
          project_status: project.project_status || 'Planned',
          start_date: project.start_date || new Date().toISOString().split('T')[0],
          target_end_date: project.target_end_date || '',
          project_manager: project.project_manager?.id || '',
          address: project.address || ''
        });

        if (project.cover_image?.img) {
          setExistingCoverImage(project.cover_image.img);
        } else if (typeof project.cover_image === 'string') {
          setExistingCoverImage(project.cover_image);
        }

        // Ensure the selected users are prepopulated in the searchable options
        const initialUsers = [];
        if (project.client) {
          initialUsers.push({ id: project.client.id, label: project.client.username, avatar: project.client.avatar_url || null });
        }
        if (project.project_manager) {
          initialUsers.push({ id: project.project_manager.id, label: project.project_manager.username, avatar: project.project_manager.avatar_url || null });
        }
        if (initialUsers.length > 0) {
          setUsers(initialUsers);
        }
        setClientUpdated(hasClient);
      } else {
        setError('Failed to load project for editing.');
      }
    } catch (err) {
      setError('Connection error while loading project.');
    } finally {
      setFetching(false);
    }
  };

  const handleCoverSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImageFile(file);
      setCoverImagePreview(URL.createObjectURL(file));
    }
  };

  const handleUploadCoverImage = async () => {
    if (!coverImageFile || !isEditing) return;
    setUploadingCover(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('cover_image', coverImageFile);
      const res = await apiFetch(`/projects/${projectId}/`, {
        method: 'PATCH',
        token,
        body: fd
      });
      if (res.ok) {
        const updated = await res.json();
        setExistingCoverImage(updated.cover_image?.img || coverImagePreview);
        setCoverImageFile(null);
        setCoverImagePreview(null);
        showSuccessMessage("Cover image uploaded successfully ✅");
      } else {
        const data = await res.json();
        setError(formatApiError(data));
      }
    } catch (err) {
      setError("Failed to upload cover image.");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleRemoveCoverImage = async () => {
    if (coverImageFile) {
      setCoverImageFile(null);
      setCoverImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (isEditing && existingCoverImage) {
      setUploadingCover(true);
      try {
        const fd = new FormData();
        fd.append('cover_image', '');
        await apiFetch(`/projects/${projectId}/`, {
          method: 'PATCH',
          token,
          body: fd
        });
        setExistingCoverImage(null);
        showSuccessMessage("Cover image removed");
      } catch (err) {
        console.error(err);
      } finally {
        setUploadingCover(false);
      }
    }
  };

  const handleSearchUsers = async (query) => {
    try {
      const res = await apiFetch(`/auth/users/search/?q=${encodeURIComponent(query)}`, { token });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.map(u => ({ id: u.id, label: u.username, avatar: u.avatar_url || null })));
      }
    } catch (err) {
      console.error("Failed to search users", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      project_name: formData.project_name,
      project_description: formData.project_description,
      project_status: formData.project_status,
      start_date: formData.start_date,
      target_end_date: formData.target_end_date,
      address: formData.address,
      project_manager_id: formData.project_manager || null,
      client_id: formData.client || null,
    };

    let bodyData;
    if (coverImageFile) {
      bodyData = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== null && v !== undefined) bodyData.append(k, v);
      });
      bodyData.append('cover_image', coverImageFile);
    } else {
      bodyData = JSON.stringify(payload);
    }

    try {
      const res = await apiFetch(isEditing ? `/projects/${projectId}/` : '/projects/', {
        method: isEditing ? 'PUT' : 'POST',
        token,
        body: bodyData,
      });

      if (res.ok) {
        showSuccessMessage(isEditing ? "Project updated successfully!" : "Project created successfully!");
        navigate('/projects');
      } else {
        const data = await res.json();
        setError(formatApiError(data));
      }
    } catch (err) {
      setError("A connection error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Spinner /></div>;

  return (
    <div className="fade-up" style={{ padding: '0 0 80px' }}>
      <div style={{ marginBottom: '32px' }}>
        <Breadcrumb items={[{ label: 'Projects', path: '/projects' }, { label: isEditing ? 'Edit Project' : 'New Project' }]} />
        <h1 style={{ fontSize: '64px', marginTop: '12px' }}>{isEditing ? 'Edit Project' : 'Create Project'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="mobile-padding" style={{
        background: 'var(--bg-card)',
        borderRadius: '24px',
        border: '1px solid var(--border-default)',
        padding: '48px',
        maxWidth: '1200px'
      }}>
        <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={labelStyle}>Project Name</label>
              <input
                type="text"
                placeholder="Enter project name"
                required
                value={formData.project_name}
                onChange={e => setFormData({ ...formData, project_name: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Address</label>
              <textarea
                placeholder="Enter project address"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                disabled={isEditing && clientUpdated}
                style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
              />
            </div>

            <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Start Date *</label>
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                  disabled={isEditing && clientUpdated}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Target End Date *</label>
                <input
                  type="date"
                  required
                  value={formData.target_end_date}
                  onChange={e => setFormData({ ...formData, target_end_date: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={formData.project_status}
                onChange={e => setFormData({ ...formData, project_status: e.target.value })}
                style={inputStyle}
              >
                {['Planned', 'In Progress', 'Completed', 'On Hold', 'Delayed', 'Cancelled'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={labelStyle}>
                Cover Image <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleCoverSelect}
                style={{ display: 'none' }}
              />
              <div style={{
                borderRadius: '16px',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-canvas)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '16px'
              }}>
                {(coverImagePreview || existingCoverImage) ? (
                  <div style={{ position: 'relative', width: '100%', height: '160px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                    <img
                      src={coverImagePreview || existingCoverImage}
                      alt="Project cover"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      height: '120px',
                      border: '2px dashed var(--border-default)',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      background: 'var(--bg-raised)'
                    }}
                  >
                    <ImageIcon size={28} color="var(--text-tertiary)" />
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Click to upload project cover image</span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                  >
                    <Camera size={14} /> {(coverImagePreview || existingCoverImage) ? 'Change Image' : 'Select Image'}
                  </button>

                  {coverImageFile && isEditing && (
                    <button
                      type="button"
                      onClick={handleUploadCoverImage}
                      disabled={uploadingCover}
                      className="btn-primary"
                      style={{ padding: '8px 18px', fontSize: '13px' }}
                    >
                      {uploadingCover ? <Spinner size={14} /> : <><Upload size={14} /> Upload</>}
                    </button>
                  )}

                  {(coverImageFile || existingCoverImage) && (
                    <button
                      type="button"
                      onClick={handleRemoveCoverImage}
                      disabled={uploadingCover}
                      className="btn-ghost"
                      style={{ padding: '8px 14px', fontSize: '13px', color: 'var(--status-delayed)' }}
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                placeholder="Enter project description"
                value={formData.project_description}
                onChange={e => setFormData({ ...formData, project_description: e.target.value })}
                style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
              />
            </div>

          </div>
        </div>

        {error && (
          <div style={{ marginTop: '24px', color: 'var(--status-delayed)', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '48px' }}>
          <button type="button" onClick={() => navigate('/projects')} className="btn-ghost" style={{ padding: '12px 32px' }}>Cancel</button>
          <button type="submit" className="btn-primary" style={{ padding: '12px 48px' }} disabled={loading}>
            {loading ? <Spinner size={20} /> : (isEditing ? 'Update Project' : 'Create Project')}
          </button>
        </div>
      </form>
    </div>
  );
};

const labelStyle = {
  display: 'block',
  marginBottom: '10px',
  fontWeight: 600,
  fontSize: '15px',
  color: 'var(--text-primary)'
};

const inputStyle = {
  width: '100%',
  padding: '16px',
  borderRadius: '12px',
  border: '1px solid var(--border-default)',
  background: 'var(--bg-raised)',
  color: 'var(--text-primary)',
  fontSize: '15px',
  outline: 'none',
  transition: 'border-color 0.2s'
};



export default CreateProjectPage;
