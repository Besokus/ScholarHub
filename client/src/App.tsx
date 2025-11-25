import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';

const App: React.FC = () => {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<h1>Welcome to ULEP</h1>} />
        <Route path="/resources" element={<h1>Resources Page</h1>} />
        <Route path="/questions" element={<h1>Questions Page</h1>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<h1>Profile Page</h1>} />
      </Routes>
    </Router>
  );
};

export default App;
