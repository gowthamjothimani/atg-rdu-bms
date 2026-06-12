import React, { useState } from 'react';
import '../styles/DeviceConfig.css';

function DeviceConfig({ devices, setDevices }) {
  const [formData, setFormData] = useState({
    name: '',
    ip: '',
    port: 502,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'port' ? parseInt(value) : value,
    }));
  };

  const handleAddDevice = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim() || !formData.ip.trim()) {
      setError('Please fill in all fields');
      return;
    }

    fetch('http://localhost:5000/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setSuccess(`Device "${data.name}" added successfully!`);
          setFormData({ name: '', ip: '', port: 502 });
          // Refresh devices list
          fetch('http://localhost:5000/api/devices')
            .then(res => res.json())
            .then(data => setDevices(data))
            .catch(err => console.error('Error fetching devices:', err));
        }
      })
      .catch(err => {
        setError('Error adding device: ' + err.message);
      });
  };

  const handleResetForm = () => {
    setFormData({ name: '', ip: '', port: 502 });
    setError('');
    setSuccess('');
  };

  const handleRemoveDevice = (deviceId) => {
    if (window.confirm('Are you sure you want to remove this device?')) {
      fetch(`http://localhost:5000/api/devices/${deviceId}`, {
        method: 'DELETE',
      })
        .then(res => res.json())
        .then(() => {
          setSuccess('Device removed successfully');
          setDevices(devices.filter(d => d.id !== deviceId));
        })
        .catch(err => setError('Error removing device: ' + err.message));
    }
  };

  return (
    <div className="device-config">
      <h2>Device Configuration</h2>

      {/* Add Device Form */}
      <div className="form-section">
        <div className="form-container">
          <h3>➕ Add New Device</h3>
          
          {error && <div className="alert error">{error}</div>}
          {success && <div className="alert success">{success}</div>}

          <form onSubmit={handleAddDevice}>
            <div className="form-group">
              <label>Device Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Battery Pack 1"
              />
            </div>

            <div className="form-group">
              <label>Device IP Address</label>
              <input
                type="text"
                name="ip"
                value={formData.ip}
                onChange={handleInputChange}
                placeholder="e.g., 10.90.2.10"
              />
            </div>

            <div className="form-group">
              <label>Port</label>
              <input
                type="number"
                name="port"
                value={formData.port}
                onChange={handleInputChange}
                min="1"
                max="65535"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Add Device
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleResetForm}>
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Devices List */}
      <div className="devices-section">
        <h3>Configured Devices</h3>
        
        {devices.length === 0 ? (
          <div className="no-devices">
            <p>No devices configured yet</p>
          </div>
        ) : (
          <div className="devices-list">
            {devices.map(device => (
              <div key={device.id} className={`device-item ${device.is_active ? 'active' : 'inactive'}`}>
                <div className="device-info">
                  <div className="device-name">
                    <span className={`status-indicator ${device.is_active ? 'connected' : 'disconnected'}`}></span>
                    <strong>{device.name}</strong>
                  </div>
                  <div className="device-details">
                    <span>IP: {device.ip}:{device.port}</span>
                    <span className="device-status">
                      {device.is_active ? '✓ Connected' : '✗ Disconnected'}
                    </span>
                  </div>
                </div>
                <div className="device-actions">
                  <span className={`log-status ${device.logging_enabled ? 'enabled' : 'disabled'}`}>
                    {device.logging_enabled ? '🔴 Logging' : '⚪ Not Logging'}
                  </span>
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleRemoveDevice(device.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DeviceConfig;
