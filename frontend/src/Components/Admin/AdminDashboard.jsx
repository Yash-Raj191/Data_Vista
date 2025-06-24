import { useState, useEffect } from 'react';
import api from '../Services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [systemHealth, setSystemHealth] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        // Fetch users and basic stats
        const [usersResponse, statsResponse] = await Promise.all([
          api.get('/admin/users'),
          api.get('/admin/stats')
        ]);

        setUsers(usersResponse.data.users);
        setStats(statsResponse.data);

        // Calculate system health metrics
        const healthMetrics = {
          systemUptime: statsResponse.data.systemUptime,
          storageUsage: {
            total: statsResponse.data.files?.totalStorage || 0,
            perUser: calculateStoragePerUser(usersResponse.data.users),
            limit: 1024 * 1024 * 1024 // 1GB example limit
          },
          activeUsers: statsResponse.data.users?.active || 0,
          totalUploads: statsResponse.data.files?.total || 0
        };
        setSystemHealth(healthMetrics);
        
        setLoading(false);
      } catch (error) {
        setError('Failed to fetch admin data');
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  const calculateStoragePerUser = (users) => {
    return users.map(user => ({
      username: user.username,
      storage: user.totalStorage || 0,
      percentage: ((user.totalStorage || 0) / (1024 * 1024 * 100)) * 100 // Percentage of 100MB
    }));
  };

  const handleUserStatusChange = async (userId, isActive) => {
    try {
      // Call API to update user status
      await api.patch(`/admin/users/${userId}/status`, { isActive });
      // Update UI to reflect the change
      setUsers(users.map(user => 
        user._id === userId ? { ...user, isActive } : user
      ));
    } catch (error) {
      setError('Failed to update user status');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="admin-dashboard">
      {/* System Health Section */}
      <div className="system-health">
        <h2>System Health</h2>
        <div className="health-metrics">
          <div className="metric-card">
            <h3>Storage Usage</h3>
            <p>{Math.round((systemHealth.storageUsage?.total || 0) / (1024 * 1024))} MB / 1 GB</p>
            <div className="progress-bar">
              <div 
                className="progress" 
                style={{ 
                  width: `${(systemHealth.storageUsage?.total / systemHealth.storageUsage?.limit) * 100}%`
                }}
              />
            </div>
          </div>
          <div className="metric-card">
            <h3>Active Users</h3>
            <p>{systemHealth.activeUsers} / {users.length}</p>
          </div>
          <div className="metric-card">
            <h3>Total Uploads</h3>
            <p>{systemHealth.totalUploads}</p>
          </div>
        </div>
      </div>

      {/* Chart Usage Analytics */}
      <div className="chart-analytics">
        <h2>Chart Usage Analytics</h2>
        <div className="chart-stats-grid">
          {stats.chartUsage?.map(chart => (
            <div key={chart._id} className="chart-stat-card">
              <h3>{chart._id}</h3>
              <p>{chart.count} uses</p>
              <div className="usage-bar">
                <div 
                  className="usage" 
                  style={{ 
                    width: `${(chart.count / Math.max(...stats.chartUsage.map(c => c.count))) * 100}%`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Storage Usage */}
      <div className="storage-analytics">
        <h2>Storage Usage by User</h2>
        <div className="storage-table">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Storage Used</th>
                <th>Percentage</th>
                <th>Usage</th>
              </tr>
            </thead>
            <tbody>
              {systemHealth.storageUsage?.perUser.map(user => (
                <tr key={user.username}>
                  <td>{user.username}</td>
                  <td>{Math.round(user.storage / 1024)} KB</td>
                  <td>{user.percentage.toFixed(1)}%</td>
                  <td>
                    <div className="usage-bar">
                      <div 
                        className="usage" 
                        style={{ width: `${user.percentage}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Activity Log */}
      <div className="activity-log">
        <h2>Recent Activity</h2>
        <div className="activity-table">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentActivity?.map((activity, index) => (
                <tr key={index}>
                  <td>{activity.username}</td>
                  <td>Created {activity.analyses} charts</td>
                  <td>{activity.filename}</td>
                  <td>{new Date(activity.uploadedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Existing User Management Section */}
      <div className="users-section">
        <h2>User Management</h2>
        <table className="users-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Files</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.filesCount}</td>
                <td>
                  <span className={`status ${user.isActive ? 'active' : 'inactive'}`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => handleUserStatusChange(user._id, !user.isActive)}
                    className={user.isActive ? 'deactivate-btn' : 'activate-btn'}
                  >
                    {user.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;