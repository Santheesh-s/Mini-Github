import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Main() {
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [newRepo, setNewRepo] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [editingRepo, setEditingRepo] = useState('');
  const [editRepoName, setEditRepoName] = useState('');
  const [editingFileId, setEditingFileId] = useState(null);
  const navigate = useNavigate();

  // Fetch repositories on mount
  useEffect(() => {
    const fetchRepos = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      try {
        const res = await fetch('/api/repos', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setRepos(data);
          if (data.length > 0) setSelectedRepo(data[0].name);
        }
      } catch {}
    };
    fetchRepos();
  }, [navigate]);

  // Fetch files when selectedRepo changes
  useEffect(() => {
    const fetchFiles = async () => {
      const token = localStorage.getItem('token');
      if (!token || !selectedRepo) return;
      try {
        const res = await fetch(`/api/files?repo=${encodeURIComponent(selectedRepo)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setFiles(data);
        } else {
          setFiles([]);
        }
      } catch {
        setFiles([]);
      }
    };
    fetchFiles();
  }, [selectedRepo, navigate]);

  const handleRepoChange = (e) => {
    setSelectedRepo(e.target.value);
    setError('');
  };

  const handleNewRepo = async (e) => {
    e.preventDefault();
    setError('');
    const repoName = newRepo.trim();
    if (!repoName) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/repos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: repoName })
      });
      if (res.ok) {
        // Refresh repo list from backend after creation
        const repoRes = await fetch('/api/repos', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (repoRes.ok) {
          const repoData = await repoRes.json();
          setRepos(repoData);
          setSelectedRepo(repoName);
        }
        setNewRepo('');
      } else {
        const data = await res.json();
        setError(data.error || 'Could not create repository');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const handleFileChange = async (e) => {
    setError('');
    setUploading(true);
    const token = localStorage.getItem('token');
    if (!token || !selectedRepo) {
      setUploading(false);
      return;
    }
    const fileList = Array.from(e.target.files);
    for (const file of fileList) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('repo', selectedRepo);
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Upload failed');
        }
      } catch {
        setError('Network error');
      }
    }
    // Refresh file list after upload
    try {
      const res = await fetch(`/api/files?repo=${encodeURIComponent(selectedRepo)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch {}
    setUploading(false);
  };

  // Delete repository
  const handleDeleteRepo = async (repoName) => {
    if (!window.confirm(`Delete repository "${repoName}" and all its files?`)) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/repos/${encodeURIComponent(repoName)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const repoRes = await fetch('/api/repos', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (repoRes.ok) {
          const repoData = await repoRes.json();
          setRepos(repoData);
          setSelectedRepo(repoData.length > 0 ? repoData[0].name : '');
        }
      }
    } catch {}
  };

  // Start editing repo name
  const startEditRepo = (repoName) => {
    setEditingRepo(repoName);
    setEditRepoName(repoName);
  };

  // Save edited repo name
  const handleEditRepo = async (e) => {
    e.preventDefault();
    if (!editRepoName.trim() || editingRepo === editRepoName.trim()) {
      setEditingRepo('');
      setEditRepoName('');
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/repos/${encodeURIComponent(editingRepo)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ newName: editRepoName.trim() })
      });
      if (res.ok) {
        const repoRes = await fetch('/api/repos', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (repoRes.ok) {
          const repoData = await repoRes.json();
          setRepos(repoData);
          setSelectedRepo(editRepoName.trim());
        }
        setEditingRepo('');
        setEditRepoName('');
      }
    } catch {}
  };

  // Delete file
  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Delete this file?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setFiles(files.filter(f => f._id !== fileId));
      }
    } catch {}
  };

  // Download file
  const handleDownloadFile = async (fileId, fileName) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/files/${fileId}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch {}
  };

  // Start editing file (replace)
  const startEditFile = (fileId) => {
    setEditingFileId(fileId);
  };

  // Update (replace) file
  const handleUpdateFile = async (fileId, e) => {
    const token = localStorage.getItem('token');
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        // Refresh file list
        const filesRes = await fetch(`/api/files?repo=${encodeURIComponent(selectedRepo)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (filesRes.ok) {
          const data = await filesRes.json();
          setFiles(data);
        }
        setEditingFileId(null);
      }
    } catch {}
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div>
      <button className="logout-btn" onClick={handleLogout}>Logout</button>
      <div className="form-title">Welcome to Mini GitHub</div>
      <div className="upload-section">
        <form onSubmit={handleNewRepo} style={{marginBottom: 16}}>
          <input
            type="text"
            placeholder="New repository name"
            value={newRepo}
            onChange={e => setNewRepo(e.target.value)}
            style={{marginRight: 8}}
          />
          <button type="submit" disabled={!newRepo.trim()}>Create Repo</button>
        </form>
        <div style={{marginBottom: 16}}>
          <label style={{fontWeight: 500}}>Select Repository: </label>
          <select value={selectedRepo} onChange={handleRepoChange}>
            {repos.map(repo => (
              <option key={repo.name} value={repo.name}>{repo.name}</option>
            ))}
          </select>
          {selectedRepo && (
            <>
              {editingRepo === selectedRepo ? (
                <form onSubmit={handleEditRepo} style={{display: 'inline'}}>
                  <input
                    type="text"
                    value={editRepoName}
                    onChange={e => setEditRepoName(e.target.value)}
                    style={{marginLeft: 8, marginRight: 8}}
                  />
                  <button type="submit">Save</button>
                  <button type="button" onClick={() => setEditingRepo('')}>Cancel</button>
                </form>
              ) : (
                <>
                  <button style={{marginLeft: 8}} onClick={() => startEditRepo(selectedRepo)}>Edit</button>
                  <button style={{marginLeft: 8}} onClick={() => handleDeleteRepo(selectedRepo)}>Delete</button>
                </>
              )}
            </>
          )}
        </div>
        <label htmlFor="file-upload" style={{fontWeight: 500, fontSize: '1.1rem'}}>Upload Files</label>
        <input
          id="file-upload"
          type="file"
          multiple
          onChange={handleFileChange}
          style={{marginTop: '12px'}}
          disabled={uploading || !selectedRepo}
        />
        {uploading && <div style={{color: '#0366d6', marginTop: 10}}>Uploading...</div>}
        {error && <div className="error-message">{error}</div>}
      </div>
      <h3 style={{marginTop: '32px', color: '#24292f'}}>Files in "{selectedRepo}"</h3>
      <ul className="uploaded-files-list">
        {files.map((file, idx) => (
          <li key={file._id || idx}>
            <span role="img" aria-label="file">📄</span> {file.originalname}
            <button style={{marginLeft: 8}} onClick={() => handleDownloadFile(file._id, file.originalname)}>Download</button>
            <button style={{marginLeft: 8}} onClick={() => handleDeleteFile(file._id)}>Delete</button>
            
            {editingFileId === file._id ? (
              <>
              <label style={{
                display: 'inline-block',
                marginLeft: 8,
                padding: '6px 12px',
                background: '#0366d6',
                color: '#fff',
                borderRadius: 4,
                cursor: 'pointer'
                }}>
              Browse
                <input
                  type="file"
                  onChange={e => handleUpdateFile(file._id, e)}
                  style={{ display: 'none' }}
                />
                </label>
                <button style={{marginLeft: 8}} onClick={() => setEditingFileId(null)}>Cancel</button>
              </>
            ) : (
              <button style={{marginLeft: 8}} onClick={() => startEditFile(file._id)}>Update</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Main;

