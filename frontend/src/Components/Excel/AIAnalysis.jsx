import { useState, useEffect } from 'react';
import api from '../Services/api';
import './AIAnalysis.css';

const AIAnalysis = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [data, setData] = useState(null);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;

  // Fetch files with error handling
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await api.get('/excel/files');
        setFiles(response.data.files);
      } catch (error) {
        setError('Failed to fetch files. Please refresh the page.');
        console.error('Failed to fetch files:', error);
      }
    };
    fetchFiles();
  }, []);

  // File selection with validation
  const handleFileSelect = async (filename) => {
    try {
      setError(null);
      setLoading(true);
      const response = await api.post('/excel/analyze', { filename });
      if (!response.data?.data) {
        throw new Error('Invalid file data received');
      }
      setData(response.data.data);
      setSelectedFile(filename);
      setSelectedColumns([]);
      setInsights([]); // Clear previous insights
    } catch (error) {
      setError('Failed to analyze file. Please try again.');
      console.error('File analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Column selection with validation
  const handleColumnSelect = (column) => {
    if (selectedColumns.length >= 5 && !selectedColumns.includes(column)) {
      setError('Maximum 5 columns can be selected for analysis');
      return;
    }
    setSelectedColumns(prev => 
      prev.includes(column) 
        ? prev.filter(col => col !== column)
        : [...prev, column]
    );
    setError(null);
  };

  // Generate insights with retry logic and caching
  const generateInsights = async () => {
    setLoading(true);
    setError(null);

    try {
      // Input validation
      if (!data || !selectedColumns.length) {
        throw new Error('Please select data and columns for analysis');
      }

      if (selectedColumns.length > 5) {
        throw new Error('Maximum 5 columns can be analyzed at once');
      }

      const dataSummary = {
        columns: selectedColumns,
        rowCount: data.length,
        sampleData: data.slice(0, 5),
        statistics: selectedColumns.map(column => {
          const values = data.map(row => parseFloat(row[column]))
                            .filter(val => !isNaN(val));
          if (values.length === 0) {
            return { column, mean: 0, min: 0, max: 0 };
          }
          return {
            column,
            mean: values.reduce((a, b) => a + b, 0) / values.length,
            min: Math.min(...values),
            max: Math.max(...values)
          };
        })
      };

      // Retry logic for API calls
      const makeRequest = async (retryCount = 0) => {
        try {
          const response = await api.post('/excel/generate-insights', dataSummary);
          if (!response.data?.insights) {
            throw new Error('Invalid response from AI service');
          }
          return response.data.insights;
        } catch (error) {
          if (retryCount < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return makeRequest(retryCount + 1);
          }
          throw error;
        }
      };

      const insights = await makeRequest();
      setInsights(insights);

    } catch (error) {
      setError(error.message || 'Failed to generate insights');
      console.error('AI Analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-analysis-container">
      <h2>AI Data Analysis</h2>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* File Selection */}
      <div className="file-selection">
        <h3>Select File</h3>
        <div className="files-grid">
          {files.map(file => (
            <div 
              key={file.filename}
              className={`file-card ${selectedFile === file.filename ? 'selected' : ''}`}
              onClick={() => handleFileSelect(file.filename)}
            >
              <span className="file-icon">📊</span>
              <span className="file-name">{file.filename}</span>
              <span className="file-date">
                {new Date(file.uploadedAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Column Selection */}
      {data && (
        <div className="column-selection">
          <h3>Select Columns for Analysis</h3>
          <div className="columns-grid">
            {Object.keys(data[0] || {}).map(column => (
              <label key={column} className="column-checkbox">
                <input
                  type="checkbox"
                  checked={selectedColumns.includes(column)}
                  onChange={() => handleColumnSelect(column)}
                />
                {column}
              </label>
            ))}
          </div>
          <button 
            className="generate-button"
            onClick={generateInsights}
            disabled={!selectedColumns.length || loading}
          >
            {loading ? 'Generating...' : 'Generate AI Insights'}
          </button>
        </div>
      )}

      {/* Insights Display */}
      {insights.length > 0 && (
        <div className="insights-grid">
          {insights.map((insight, index) => (
            <div key={index} className="insight-card">
              <div className="insight-icon">
                {insight.type === 'trend' ? '📈' :
                 insight.type === 'correlation' ? '🔄' :
                 insight.type === 'anomaly' ? '⚠️' :
                 insight.type === 'data_quality' ? '🔍' : '💡'}
              </div>
              <div className="insight-content">
                <h4>{insight.title}</h4>
                <p>{insight.description}</p>
                {insight.recommendation && (
                  <div className="insight-recommendation">
                    <strong>Recommendation:</strong> {insight.recommendation}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIAnalysis;