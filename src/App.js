import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Signup from './components/Signup';
import Login from './components/Login';
import Main from './components/Main';
import Home from './components/Home';
import './App.css';

function App() {

  return (
    <Router>
      <div className="app-background">
        <header className="app-header">
          <h1>Mini GitHub</h1>
        </header>
        <div className="app-container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/main"
              element={localStorage.getItem('token') ? <Main /> : <Navigate to="/login" />}
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
export default App;
