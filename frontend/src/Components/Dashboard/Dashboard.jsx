import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../Services/api';
import './Dashboard.css';
import { Line, Pie } from 'react-chartjs-2';

const Dashboard = () => {
  const [recentFiles, setRecentFiles] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [chartUsage, setChartUsage] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/excel/stats');
        const data = response.data;

        setStats({
          totalSize: data.storage.used || 0,
          storageLimit: data.storage.limit || 5 * 1024 * 1024,
          chartUsage: data.chartUsage || [],
          totalFiles: data.recentFiles?.length || 0
        });

        setRecentFiles(data.recentFiles || []);

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleFilePreview = async (filename) => {
    try {
      const response = await api.post('/excel/preview', { filename });
      setFilePreview(response.data.preview);
      setSelectedFile(filename);
    } catch (error) {
      console.error('Failed to fetch file preview:', error);
    }
  };

  if (loading) return <div className="loading-spinner" />;

  return (
    <div className="dashboard-content">
      <div className="dashboard-header">
        <h2>Launch into your data universe., {localStorage.getItem('user')?.username}</h2>
        <div className="quick-actions">
          <Link to="/upload" className="action-button">
            <span className="icon">📁</span>
            Upload New File
          </Link>
          <Link to="/analyze" className="action-button">
            <span className="icon">📊</span>
            Create Chart
          </Link>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Storage Usage Card */}
        <div className="dashboard-widget storage-widget">
          <h3>Storage Usage</h3>
          <div className="storage-info">
            <div className="storage-icon">💾</div>
            <div className="storage-details">
              <div className="storage-meter">
                <div 
                  className="storage-progress" 
                  style={{ 
                    width: `${((stats.totalSize || 0) / (stats.storageLimit || 1)) * 100}%` 
                  }}
                />
              </div>
              <div className="storage-text">
                <p className="storage-amount">
                  {Math.round((stats.totalSize || 0) / 1024)} KB
                  <span className="storage-limit"> of {Math.round((stats.storageLimit || 0) / 1024)} KB</span>
                </p>
                <p className="storage-percentage">
                  {Math.round(((stats.totalSize || 0) / (stats.storageLimit || 1)) * 100)}% used
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Chart Usage Statistics */}
        <div className="dashboard-widget chart-stats">
          <h3>Chart Analytics</h3>
          {stats.chartUsage && stats.chartUsage.length > 0 ? (
            <div className="chart-analytics-content">
              <div className="chart-container">
                <Pie 
                  data={{
                    labels: stats.chartUsage.map(c => c._id),
                    datasets: [{
                      data: stats.chartUsage.map(c => c.count),
                      backgroundColor: [
                        '#8B5CF6',
                        '#F472B6',
                        '#FBBF24',
                        '#34D399',
                        '#60A5FA',
                        '#A78BFA'
                      ]
                    }]
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: {
                          boxWidth: 15,
                          padding: 15
                        }
                      }
                    }
                  }}
                />
              </div>
              <div className="chart-stats-grid">
                {stats.chartUsage.map(chart => (
                  <div key={chart._id} className="chart-stat-card">
                    <div className="chart-type-icon">
                      {chart._id === 'bar' ? '📊' : 
                       chart._id === 'line' ? '📈' : 
                       chart._id === 'pie' ? '🥧' : 
                       chart._id === 'scatter' ? '📍' : '📉'}
                    </div>
                    <div className="chart-type-info">
                      <h4>{chart._id} Chart</h4>
                      <p>{chart.count} uses</p>
                    </div>
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
          ) : (
            <div className="no-data">
              <p>No charts created yet</p>
              <Link to="/analyze" className="create-chart-btn">
                Create Your First Chart
              </Link>
            </div>
          )}
        </div>

        {/* Recent Files with Preview */}
        <div className="dashboard-widget files-widget">
          <h3>Recent Files</h3>
          <div className="files-grid">
            {recentFiles.map(file => (
              <div 
                key={file.filename} 
                className={`file-card ${selectedFile === file.filename ? 'selected' : ''}`}
                onClick={() => handleFilePreview(file.filename)}
              >
                <div className="file-icon">📊</div>
                <div className="file-info">
                  <span className="file-name">{file.filename}</span>
                  <span className="file-date">
                    {new Date(file.uploadedAt).toLocaleDateString()}
                  </span>
                  <span className="file-size">
                    {Math.round(file.size / 1024)} KB
                  </span>
                </div>
                <div className="file-actions">
                  <button
                    className="analyze-button"
                    onClick={e => {
                      e.stopPropagation();
                      navigate('/analyze', { state: { filename: file.filename } });
                    }}
                  >
                    Analyze
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* File Preview Section */}
        {selectedFile && filePreview && (
          <div className="dashboard-widget preview-widget">
            <h3>File Preview: {selectedFile}</h3>
            <div className="preview-table">
              <table>
                <thead>
                  <tr>
                    {Object.keys(filePreview[0] || {}).map(header => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filePreview.map((row, index) => (
                    <tr key={index}>
                      {Object.values(row).map((cell, i) => (
                        <td key={i}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;