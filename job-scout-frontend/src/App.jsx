import React from 'react';
import { Outlet } from 'react-router-dom';
import { Link } from 'react-router-dom';
import './App.css';

function App() {
  return (
    <div className="app-container">
        <nav className="main-nav">
          <Link to="/" className="nav-logo">Job Scout</Link>
          <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/profile">Profile</Link>
        </div>
      </nav>
      <main>
        {/* The Outlet is a placeholder where React Router will render our page components */}
        <Outlet />
      </main>
    </div>
  );
}

export default App;