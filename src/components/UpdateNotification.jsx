import { useState, useEffect } from 'react';

const UpdateNotification = () => {
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [version, setVersion] = useState('');

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    const unsubAvailable = typeof api.onUpdateAvailable === 'function'
      ? api.onUpdateAvailable((info) => {
        setVersion(info?.version ?? '');
        setStatus('available');
      })
      : null;

    const unsubProgress = typeof api.onDownloadProgress === 'function'
      ? api.onDownloadProgress((prog) => {
        setProgress(Math.round(prog?.percent ?? 0));
        setStatus('downloading');
      })
      : null;

    const unsubDownloaded = typeof api.onUpdateDownloaded === 'function'
      ? api.onUpdateDownloaded(() => {
        setStatus('downloaded');
      })
      : null;

    const unsubNotAvailable = typeof api.onUpdateNotAvailable === 'function'
      ? api.onUpdateNotAvailable(() => {
        setStatus(null);
      })
      : null;

    return () => {
      if (typeof unsubAvailable === 'function') unsubAvailable();
      if (typeof unsubProgress === 'function') unsubProgress();
      if (typeof unsubDownloaded === 'function') unsubDownloaded();
      if (typeof unsubNotAvailable === 'function') unsubNotAvailable();
    };
  }, []);

  if (!status) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: '#1e40af',
      color: 'white',
      padding: '16px 20px',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      zIndex: 9999,
      minWidth: '300px'
    }}>

      {status === 'available' && (
        <div>
          <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            🔄 नवीन Update Available!
          </p>
          <p style={{ fontSize: '13px', marginBottom: '12px' }}>
            Version {version} available
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => api.downloadUpdate?.()}
              style={{
                backgroundColor: 'white',
                color: '#1e40af',
                border: 'none',
                padding: '6px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Update करा
            </button>
            <button
              onClick={() => setStatus(null)}
              style={{
                backgroundColor: 'transparent',
                color: 'white',
                border: '1px solid white',
                padding: '6px 16px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              नंतर
            </button>
          </div>
        </div>
      )}

      {status === 'downloading' && (
        <div>
          <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            ⬇️ Download होतोय...
          </p>
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.3)',
            borderRadius: '4px',
            height: '8px',
            marginBottom: '8px'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '4px',
              height: '8px',
              width: `${progress}%`,
              transition: 'width 0.3s'
            }} />
          </div>
          <p style={{ fontSize: '13px' }}>{progress}% complete</p>
        </div>
      )}

      {status === 'downloaded' && (
        <div>
          <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            ✅ Update Ready!
          </p>
          <p style={{ fontSize: '13px', marginBottom: '12px' }}>
            Restart करा आणि Update Install होईल
          </p>
          <button
            onClick={() => api.installUpdate?.()}
            style={{
              backgroundColor: 'white',
              color: '#1e40af',
              border: 'none',
              padding: '6px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Restart & Install
          </button>
        </div>
      )}
    </div>
  );
};

export default UpdateNotification;
