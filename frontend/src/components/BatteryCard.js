import React, { useState, useEffect } from 'react';
import '../styles/BatteryCard.css';

function BatteryCard({ device, onRemove }) {
  const [data, setData] = useState(null);
  const [loggingEnabled, setLoggingEnabled] = useState(device.logging_enabled || false);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const fetchData = () => {
      fetch(`http://localhost:5100/api/devices/${device.id}/data`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setData(data.data);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching device data:', err);
          setLoading(false);
        });
    };

    const checkDeviceStatus = () => {
      fetch(`http://localhost:5100/api/devices/${device.id}/status`)
        .then(res => res.json())
        .then(status => {
          setIsOnline(status.is_online);
        })
        .catch(err => {
          console.error('Error checking device status:', err);
        });
    };

    fetchData();
    checkDeviceStatus();
    const interval = setInterval(fetchData, 5000); // Update every 5 seconds
    const statusInterval = setInterval(checkDeviceStatus, 10000); // Check status every 10 seconds
    return () => {
      clearInterval(interval);
      clearInterval(statusInterval);
    };
  }, [device.id]);

  const handleToggleLogging = () => {
    fetch(`http://localhost:5100/api/devices/${device.id}/logging`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enable: !loggingEnabled }),
    })
      .then(res => res.json())
      .then(result => {
        setLoggingEnabled(result.logging_enabled);
      })
      .catch(err => console.error('Error toggling logging:', err));
  };

  const getStateColor = (state) => {
    const colors = {
      'Charging': '#4CAF50',
      'Discharging': '#FF9800',
      'Standby': '#2196F3',
      'Ready': '#4CAF50',
      'Error': '#F44336',
    };
    return colors[state] || '#9E9E9E';
  };

  return (
    <div className="battery-card">
      <div className="card-header">
        <h3>{device.name}</h3>
        <div className="card-actions">
          <button 
            className={`log-btn ${loggingEnabled ? 'enabled' : ''}`}
            onClick={handleToggleLogging}
            title={loggingEnabled ? 'Logging enabled' : 'Logging disabled'}
          >
            {loggingEnabled ? '🔴' : '⚪'}
          </button>
          <button 
            className="remove-btn"
            onClick={() => onRemove(device.id)}
            title="Remove device"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="card-connection">
        <div className="status-section">
          <span className={`status ${device.is_active ? 'connected' : 'disconnected'}`}>
            {device.is_active ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
          <span className={`status ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? '📡 Online' : '📴 Offline'}
          </span>
        </div>
        <span className="ip">{device.ip}:{device.port}</span>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : data ? (
        <div className="card-content">
          <div className="metrics-grid">
            <div className="metric">
              <span className="label">SOC</span>
              <span className="value">{data.soc_all_percent}%</span>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{width: `${data.soc_all_percent}%`}}
                ></div>
              </div>
            </div>

            <div className="metric">
              <span className="label">Pack Voltage</span>
              <span className="value">{data.pack_voltage_v.toFixed(2)}V</span>
            </div>

            <div className="metric">
              <span className="label">Pack Current</span>
              <span className="value">{data.pack_current_a.toFixed(2)}A</span>
            </div>

            <div className="metric">
              <span className="label">Active Batteries</span>
              <span className="value">{data.active_battery_count}</span>
            </div>

            <div className="metric">
              <span className="label">Passive Batteries</span>
              <span className="value">{data.passive_battery_count}</span>
            </div>

            <div className="metric">
              <span className="label">State</span>
              <span className="value" style={{color: getStateColor(data.battery_state)}}>
                {data.battery_state}
              </span>
            </div>

            <div className="metric">
              <span className="label">Charger</span>
              <span className="value">
                {data.smart_charger_connected ? '✓ Yes' : '✗ No'}
              </span>
            </div>

            <div className="metric">
              <span className="label">Max Temp</span>
              <span className="value">{data.max_pack_temperature_c.toFixed(1)}°C</span>
            </div>

            <div className="metric">
              <span className="label">Min Temp</span>
              <span className="value">{data.min_pack_temperature_c.toFixed(1)}°C</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="no-data">No data available</div>
      )}
    </div>
  );
}

export default BatteryCard;
