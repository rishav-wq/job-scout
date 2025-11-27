import React from 'react';
import { Outlet } from 'react-router-dom';
import { Link } from 'react-router-dom';
import './App.css';

function App() {
  return (
    <div className="app-container">
      <nav className="main-nav">
        <div className="nav-content">
          <Link to="/" className="nav-logo">
            <span>🎯</span> Job Scout
          </Link>
          <div className="nav-links">
            <Link to="/">Find Jobs</Link>
            <Link to="/my-matches">My Matches</Link>
            <Link to="/profile">My Profile</Link>
          </div>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default App;