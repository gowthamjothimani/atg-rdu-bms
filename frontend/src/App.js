import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DeviceConfig from './components/DeviceConfig';
import DataLog from './components/DataLog';
import './styles/App.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [devices, setDevices] = useState([]);
  const [systemStatus, setSystemStatus] = useState({});

  useEffect(() => {
    const fetchData = () => {
      // Fetch devices and status
      fetch('http://localhost:5000/api/devices')
        .then(res => res.json())
        .then(data => setDevices(data))
        .catch(err => console.error('Error fetching devices:', err));

      fetch('http://localhost:5100/api/status')
        .then(res => res.json())
        .then(data => setSystemStatus(data))
        .catch(err => console.error('Error fetching status:', err));
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Router>
      <div className="app-container">
        <Sidebar isOpen={sidebarOpen} />
        <div className={`main-content ${sidebarOpen ? 'with-sidebar' : 'without-sidebar'}`}>
          <div className="navbar">
            <button className="sidebar-toggle" onClick={toggleSidebar}>
              ☰
            </button>
            <div className="navbar-brand">
              <img src="/visics-logo.png" alt="VISICS" className="navbar-logo" />
              <h1 className="app-title">VISICS RDU</h1>
            </div>
            <div className="status-indicators">
              <span className="status-item">
                <span className="status-dot active"></span>
                Active: {systemStatus.active_devices || 0}
              </span>
              <span className="status-item">
                <span className="status-dot"></span>
                Logging: {systemStatus.logging_devices || 0}
              </span>
            </div>
          </div>
          <div className="content-area">
            <Routes>
              <Route path="/" element={<Dashboard devices={devices} setDevices={setDevices} />} />
              <Route path="/device-config" element={<DeviceConfig devices={devices} setDevices={setDevices} />} />
              <Route path="/data-log" element={<DataLog devices={devices} />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
