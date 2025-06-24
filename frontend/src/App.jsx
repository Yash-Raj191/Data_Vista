// filepath: frontend/src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Login from './Components/Auth/Login';
import Register from './Components/Auth/Register';
import FileUpload from './Components/Excel/FileUpload';
import Analyze from './Components/Excel/Analyze';
import Dashboard from './Components/Dashboard/Dashboard';
import History from './Components/History/History';
import DashboardLayout from './Components/Layout/DashboardLayout';
import AdminDashboard from './Components/Admin/AdminDashboard';
import AIAnalysis from './Components/Excel/AIAnalysis'; // Updated import path
import './styles/common.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  if (isAuthenticated === null) {
    return <div className="loading-container"><div className="loading-spinner" /></div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        <Route path="/login" element={
          isAuthenticated ? 
          <Navigate to="/dashboard" replace /> : 
          <Login setIsAuthenticated={setIsAuthenticated} />
        } />
        
        <Route path="/register" element={
          isAuthenticated ? 
          <Navigate to="/dashboard" replace /> : 
          <Register setIsAuthenticated={setIsAuthenticated} />
        } />

        <Route path="/dashboard/*" element={
          isAuthenticated ? (
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        <Route path="/upload/*" element={
          isAuthenticated ? (
            <DashboardLayout>
              <FileUpload />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        <Route path="/analyze/*" element={
          isAuthenticated ? (
            <DashboardLayout>
              <Analyze />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        <Route path="/history/*" element={
          isAuthenticated ? (
            <DashboardLayout>
              <History />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        <Route path="/admin" element={
          isAuthenticated ? (
            <DashboardLayout>
              <AdminDashboard />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        <Route path="/ai-analysis" element={
          isAuthenticated ? (
            <DashboardLayout>
              <AIAnalysis />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />
      </Routes>
    </Router>
  );
}

export default App;
