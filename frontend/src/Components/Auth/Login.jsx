import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../Services/api';
import '../../styles/common.css';

const Login = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    adminCode: '' // Added adminCode field
  });
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false); // Added admin mode toggle

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      // If admin mode is enabled but no admin code provided
      if (isAdmin && !formData.adminCode) {
        setError('Admin code is required for admin login');
        return;
      }

      const response = await api.post('/users/login', {
        email: formData.email,
        password: formData.password,
        adminCode: isAdmin ? formData.adminCode : undefined
      });
      
      // Check if the logged-in user is an admin
      if (isAdmin && response.data.user.role !== 'admin') {
        setError('Not authorized as admin');
        return;
      }
      
      // Store user data and token
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setIsAuthenticated(true);
      
      // Redirect based on role
      navigate(response.data.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <h1>DataVista</h1>
        <p>Transform your Excel data into meaningful insights with powerful analytics and visualization tools.</p>
      </div>
      <div className="auth-right">
        <div className="auth-container">
          <h2 className="auth-title">Welcome Back</h2>
          {error && <div className="error-message">{error}</div>}
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>

            {/* Admin mode toggle */}
            <div className="form-group admin-toggle">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isAdmin}
                  onChange={(e) => {
                    setIsAdmin(e.target.checked);
                    if (!e.target.checked) {
                      setFormData({...formData, adminCode: ''});
                    }
                  }}
                />
                Login as Administrator
              </label>
            </div>

            {/* Conditional admin code field */}
            {isAdmin && (
              <div className="form-group">
                <label className="form-label">Admin Code</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter admin code"
                  value={formData.adminCode}
                  onChange={(e) => setFormData({...formData, adminCode: e.target.value})}
                  required={isAdmin}
                />
              </div>
            )}

            <button type="submit" className="submit-button">
              {isAdmin ? 'Admin Login' : 'Login'}
            </button>
          </form>
          <p className="auth-link">
            Don't have an account? <Link to="/register">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;