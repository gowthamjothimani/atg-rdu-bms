import React, { useState, useEffect } from 'react';
import BatteryCard from './BatteryCard';
import '../styles/Dashboard.css';

function Dashboard({ devices, setDevices }) {
  const [mappedDevices, setMappedDevices] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);

  useEffect(() => {
    setMappedDevices(devices.filter(d => d.is_active));
    setAvailableDevices(devices.filter(d => !d.is_active));
  }, [devices]);

  const handleAddDevice = (device) => {
    // Device is already in the main devices list
    setShowAddModal(false);
  };

  const handleRemoveDevice = (deviceId) => {
    fetch(`http://localhost:5100/api/devices/${deviceId}`, {
      method: 'DELETE',
    })
      .then(res => res.json())
      .then(() => {
        setDevices(devices.filter(d => d.id !== deviceId));
      })
      .catch(err => console.error('Error removing device:', err));
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Dashboard</h2>
        <div className="header-info">
          <span className="info-item">🌍 Netherlands</span>
          <span className="info-item">🕐 {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="dashboard-content">
        {mappedDevices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>No Devices Added</h3>
            <p>Add a device to start monitoring</p>
            <button 
              className="add-btn primary"
              onClick={() => setShowAddModal(true)}
            >
              ➕ Add Device
            </button>
          </div>
        ) : (
          <>
            <div className="cards-grid">
              {mappedDevices.map(device => (
                <BatteryCard 
                  key={device.id} 
                  device={device}
                  onRemove={handleRemoveDevice}
                />
              ))}
            </div>
            <button 
              className="add-device-fab"
              onClick={() => setShowAddModal(true)}
              title="Add Device"
            >
              ➕
            </button>
          </>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Select Device to Add</h3>
            <div className="device-list">
              {availableDevices.length === 0 ? (
                <p>All devices are already added or no devices configured</p>
              ) : (
                availableDevices.map(device => (
                  <div key={device.id} className="device-item">
                    <div className="device-info">
                      <p><strong>{device.name}</strong></p>
                      <p>{device.ip}:{device.port}</p>
                    </div>
                    <button 
                      className="btn-small"
                      onClick={() => handleAddDevice(device)}
                    >
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
            <button 
              className="close-btn"
              onClick={() => setShowAddModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
