import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../Services/api';
import DataVisualization from './DataVisualization';
import Statistics from './Statistics';
import ExportOptions from './ExportOptions';
import ThreeDVisualization from './ThreeDVisualization';
import './Analyze.css';

const Analyze = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [excelData, setExcelData] = useState(null);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [filters, setFilters] = useState({});
  const [filteredData, setFilteredData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAllRows, setShowAllRows] = useState(false);
  const rowsToShow = 5;

  // Fetch user's uploaded files
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await api.get('/excel/files');
        setFiles(response.data.files);
        setLoading(false);

        // If a file was passed through navigation state, analyze it
        if (location.state?.filename) {
          handleFileSelect(location.state.filename);
        }
      } catch (error) {
        console.error('Failed to fetch files:', error);
        setLoading(false);
      }
    };
    fetchFiles();
    // eslint-disable-next-line
  }, []);

  const handleFileSelect = async (filename) => {
    try {
      setError(''); // Clear any previous errors
      const response = await api.post('/excel/analyze', { filename });
      
      if (response.data && response.data.data) {
        setExcelData(response.data.data);
        setSelectedFile(filename);
        setSelectedColumns([]);
        setFilters({});
      }
    } catch (error) {
      console.error('Failed to analyze file:', error);
      setError(error.response?.data?.message || 'Failed to analyze file');
    }
  };

  const handleColumnSelect = (column) => {
    setSelectedColumns(prev => 
      prev.includes(column) 
        ? prev.filter(col => col !== column)
        : [...prev, column]
    );
  };

  const handleFilterChange = (column, value) => {
    setFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  useEffect(() => {
    if (!excelData) return;
    
    const filtered = excelData.filter(row => {
      return Object.entries(filters).every(([column, value]) => {
        if (!value) return true;
        return String(row[column]).toLowerCase().includes(value.toLowerCase());
      });
    });
    
    setFilteredData(filtered);
  }, [filters, excelData]);

  const displayData = showAllRows ? (filteredData || excelData) : (filteredData || excelData)?.slice(0, rowsToShow);
  const hasMoreRows = (filteredData || excelData)?.length > rowsToShow;

  return (
    <div className="analyze-container">
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="file-selection">
        <h2>Select File to Analyze</h2>
        <div className="files-grid">
          {files.map(file => (
            <div 
              key={file.filename}
              className={`file-card ${selectedFile === file.filename ? 'selected' : ''}`}
              onClick={() => handleFileSelect(file.filename)}
            >
              <span className="file-icon">📊</span>
              <span className="file-name">{file.filename}</span>
              <span className="file-date">{new Date(file.uploadedAt).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </div>

      {excelData && (
        <>
          <div className="data-table-section">
            <h3>Data Preview</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    {Object.keys(excelData[0] || {}).map(header => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayData?.map((row, index) => (
                    <tr key={index}>
                      {Object.values(row).map((cell, cellIndex) => (
                        <td key={cellIndex}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {hasMoreRows && (
                <div className="read-more-container">
                  <button 
                    className="read-more-button"
                    onClick={() => setShowAllRows(!showAllRows)}
                  >
                    {showAllRows ? 'Show Less' : 'Read More'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Existing analysis content */}
          <div className="analysis-content">
            <div className="column-selection">
              <h3>Select Columns for Analysis</h3>
              <div className="column-grid">
                {Object.keys(excelData[0] || {}).map(column => (
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
            </div>

            <div className="filters-section">
              <h3>Filter Data</h3>
              <div className="filters-container">
                {Object.keys(excelData[0] || {}).map(column => (
                  <div key={column} className="filter-item">
                    <label>{column}</label>
                    <input
                      type="text"
                      placeholder={`Filter ${column}`}
                      onChange={(e) => handleFilterChange(column, e.target.value)}
                      value={filters[column] || ''}
                    />
                  </div>
                ))}
              </div>
            </div>

            {selectedColumns.length > 0 && (
              <>
                <div className="visualization-section">
                  <h3>Data Visualization</h3>
                  <DataVisualization 
                    data={filteredData || excelData}
                    selectedColumns={selectedColumns}
                    selectedFile={selectedFile} // Add this prop
                  />
                </div>

                {selectedColumns.length >= 3 && (
                  <div className="visualization-section">
                    <h3>3D Visualization</h3>
                    <ThreeDVisualization 
                      data={filteredData || excelData}
                      selectedColumns={selectedColumns}
                    />
                  </div>
                )}

                <Statistics 
                  data={filteredData || excelData}
                  selectedColumns={selectedColumns}
                />

                <div className="export-section">
                  <h3>Export Data</h3>
                  <ExportOptions 
                    data={filteredData || excelData}
                    selectedColumns={selectedColumns}
                  />
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Analyze;