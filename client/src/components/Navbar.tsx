import React from 'react';
import { Link } from 'react-router-dom';

const Navbar: React.FC = () => {
  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#f5f5f5' }}>
      <div>
        <Link to="/" style={{ marginRight: '1rem' }}>Home</Link>
        <Link to="/resources" style={{ marginRight: '1rem' }}>Resources</Link>
        <Link to="/questions">Questions</Link>
      </div>
      <div>
        <Link to="/login" style={{ marginRight: '1rem' }}>Login</Link>
        <Link to="/register" style={{ marginRight: '1rem' }}>Register</Link>
        <Link to="/profile">Profile</Link>
      </div>
    </nav>
  );
};

export default Navbar;
