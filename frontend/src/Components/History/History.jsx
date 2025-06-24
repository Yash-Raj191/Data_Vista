import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../Services/api';
import './History.css';

const History = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get('/excel/files');
        setFiles(response.data.files);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch history:', error);
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) {
    return <div className="loading-spinner" />;
  }

  return (
    <div className="history-container">
      <h2>File History</h2>
      
      <div className="history-table">
        <table>
          <thead>
            <tr>
              <th>File Name</th>
              <th>Upload Date</th>
              <th>Size</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map(file => (
              <tr key={file.filename}>
                <td>{file.filename}</td>
                <td>{new Date(file.uploadedAt).toLocaleDateString()}</td>
                <td>{Math.round(file.size / 1024)} KB</td>
                <td>
                  <button onClick={() => navigate('/analyze', { state: { filename: file.filename } })}>
                    Analyze
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

export default History;