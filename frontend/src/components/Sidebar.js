import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/Sidebar.css';

function Sidebar({ isOpen }) {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <h2>RDU Monitor</h2>
      </div>
      <nav className="sidebar-nav">
        <Link
          to="/"
          className={`nav-item ${isActive('/') ? 'active' : ''}`}
        >
          <span className="icon">📊</span>
          <span className="label">Dashboard</span>
        </Link>
        <Link
          to="/device-config"
          className={`nav-item ${isActive('/device-config') ? 'active' : ''}`}
        >
          <span className="icon">⚙️</span>
          <span className="label">Device Config</span>
        </Link>
        <Link
          to="/data-log"
          className={`nav-item ${isActive('/data-log') ? 'active' : ''}`}
        >
          <span className="icon">📈</span>
          <span className="label">Data Log</span>
        </Link>
      </nav>
      <div className="sidebar-footer">
        <p>v1.0.0</p>
      </div>
    </div>
  );
}

export default Sidebar;
