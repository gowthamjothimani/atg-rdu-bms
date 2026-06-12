import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../styles/DataLog.css';

function DataLog({ devices }) {
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    if (devices.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(devices[0].id);
    }
  }, [devices]);

  useEffect(() => {
    if (selectedDeviceId) {
      fetchLogs();
      const interval = setInterval(fetchLogs, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [selectedDeviceId]);

  const fetchLogs = () => {
    setLoading(true);
    fetch(`http://localhost:5100/api/logs/${selectedDeviceId}?limit=100`)
      .then(res => res.json())
      .then(data => {
        // Reverse to get chronological order
        const reversedData = [...data].reverse();
        setLogs(reversedData);
        
        // Prepare chart data
        const chartData = reversedData.map(log => ({
          timestamp: new Date(log.timestamp).toLocaleTimeString(),
          soc: log.soc_percent,
          voltage: log.voltage_v,
          current: log.pack_current_a,
          maxTemp: log.max_temp_c,
          minTemp: log.min_temp_c,
          chargerConnected: log.charger_connected ? 1 : 0,
        }));
        setChartData(chartData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching logs:', err);
        setLoading(false);
      });
  };

  const handleDownloadClick = () => {
    setShowConfirmDialog(true);
  };

  const confirmDownload = () => {
    setDownloadingId(selectedDeviceId);
    const deviceName = devices.find(d => d.id === selectedDeviceId)?.name || 'Battery';
    
    fetch(`http://localhost:5100/api/logs/${selectedDeviceId}/export`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Export failed');
        }
        return response.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${deviceName}_battery_logs.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setShowConfirmDialog(false);
        setDownloadingId(null);
      })
      .catch(err => {
        console.error('Error downloading logs:', err);
        alert('Failed to download logs. Please try again.');
        setShowConfirmDialog(false);
        setDownloadingId(null);
      });
  };

  const cancelDownload = () => {
    setShowConfirmDialog(false);
  };

  const selectedDevice = devices.find(d => d.id === selectedDeviceId);

  return (
    <div className="data-log">
      <h2>Data Logging & Analytics</h2>

      {devices.length === 0 ? (
        <div className="no-devices">
          <p>No devices configured. Please configure devices in Device Config.</p>
        </div>
      ) : (
        <>
          {/* Device Selector */}
          <div className="device-selector">
            <label>Select Device:</label>
            <select 
              value={selectedDeviceId || ''} 
              onChange={(e) => setSelectedDeviceId(e.target.value)}
            >
              {devices.map(device => (
                <option key={device.id} value={device.id}>
                  {device.name} ({device.is_active ? 'Connected' : 'Disconnected'})
                </option>
              ))}
            </select>
          </div>

          {selectedDevice && (
            <>
              {/* Live Chart */}
              <div className="chart-section">
                <h3>📈 Live Monitoring - {selectedDevice.name}</h3>
                <div className="chart-container">
                  {loading || chartData.length === 0 ? (
                    <div className="loading">
                      {loading ? 'Loading data...' : 'No data available yet'}
                    </div>
                  ) : (
                    <>
                      <div className="chart-wrapper">
                        <h4>State of Charge (%) & Voltage (V)</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                            <XAxis dataKey="timestamp" stroke="#999" />
                            <YAxis stroke="#999" />
                            <Tooltip 
                              contentStyle={{backgroundColor: '#222', border: '1px solid #555'}}
                              labelStyle={{color: '#fff'}}
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="soc" 
                              stroke="#4CAF50" 
                              name="SOC (%)"
                              dot={false}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="voltage" 
                              stroke="#2196F3" 
                              name="Voltage (V)"
                              yAxisId="right"
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="chart-wrapper">
                        <h4>Current (A) & Temperature (°C)</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                            <XAxis dataKey="timestamp" stroke="#999" />
                            <YAxis stroke="#999" />
                            <Tooltip 
                              contentStyle={{backgroundColor: '#222', border: '1px solid #555'}}
                              labelStyle={{color: '#fff'}}
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="current" 
                              stroke="#FF9800" 
                              name="Current (A)"
                              dot={false}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="maxTemp" 
                              stroke="#F44336" 
                              name="Max Temp (°C)"
                              dot={false}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="minTemp" 
                              stroke="#00BCD4" 
                              name="Min Temp (°C)"
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Data Logs Table */}
              <div className="logs-section">
                <div className="logs-header">
                  <h3>📋 Historical Data</h3>
                  <button 
                    className="download-btn"
                    onClick={handleDownloadClick}
                    disabled={downloadingId === selectedDeviceId || logs.length === 0}
                  >
                    {downloadingId === selectedDeviceId ? '⏳ Downloading...' : '⬇️ Download CSV'}
                  </button>
                </div>
                <div className="logs-container">
                  {logs.length === 0 ? (
                    <div className="no-logs">
                      <p>No logs available for this device</p>
                    </div>
                  ) : (
                    <div className="logs-table">
                      <div className="table-header">
                        <div className="col">Timestamp</div>
                        <div className="col">SOC (%)</div>
                        <div className="col">Voltage (V)</div>
                        <div className="col">Current (A)</div>
                        <div className="col">Max Temp (°C)</div>
                        <div className="col">Min Temp (°C)</div>
                        <div className="col">Charger</div>
                        <div className="col">State</div>
                      </div>
                      {logs.slice(0, 50).map((log, idx) => (
                        <div key={idx} className="table-row">
                          <div className="col">{new Date(log.timestamp).toLocaleString()}</div>
                          <div className="col">{log.soc_percent?.toFixed(1) || '-'}%</div>
                          <div className="col">{log.voltage_v?.toFixed(2) || '-'}V</div>
                          <div className="col">{log.pack_current_a?.toFixed(2) || '-'}A</div>
                          <div className="col">{log.max_temp_c?.toFixed(1) || '-'}°C</div>
                          <div className="col">{log.min_temp_c?.toFixed(1) || '-'}°C</div>
                          <div className="col">{log.charger_connected ? '✓' : '✗'}</div>
                          <div className="col">{log.battery_state || '-'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="modal-overlay">
          <div className="confirm-dialog">
            <h3>Confirm Download</h3>
            <p>Download all battery logs for:</p>
            <p className="battery-name">
              {devices.find(d => d.id === selectedDeviceId)?.name}
            </p>
            <p className="dialog-message">
              This will download all available historical data as a CSV file.
            </p>
            <div className="dialog-buttons">
              <button 
                className="confirm-btn" 
                onClick={confirmDownload}
                disabled={downloadingId === selectedDeviceId}
              >
                {downloadingId === selectedDeviceId ? 'Downloading...' : 'Confirm & Download'}
              </button>
              <button 
                className="cancel-btn" 
                onClick={cancelDownload}
                disabled={downloadingId === selectedDeviceId}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataLog;
