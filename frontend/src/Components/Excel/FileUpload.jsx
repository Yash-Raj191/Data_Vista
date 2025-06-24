import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from "../Services/api";
import './FileUpload.css';
import uploadImage from '/upload.png';

const FileUpload = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const validateFileType = (file) => {
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    return validExtensions.includes(fileExtension);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!validateFileType(selectedFile)) {
        setMessage('Please select a valid Excel file (.xlsx or .xls)');
        e.target.value = ''; // Reset input
        return;
      }
      setFile(selectedFile);
      setMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage('Please select a file');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/excel/upload', formData);
      setMessage('File uploaded successfully');
      navigate('/analyze', { 
        state: { filename: response.data.filename }
      });
    } catch (error) {
      if (error.response?.status === 401) {
        setMessage('Session expired. Please login again');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setMessage(error.response?.data?.message || 'Upload failed');
      }
      console.error('Upload failed:', error.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-container">
      <div className="upload-image-container">
        <img src={uploadImage} alt="Upload illustration" className="upload-illustration" />
      </div>
      
      <h2>Upload Excel File</h2>
      
      {message && (
        <div className={`message ${message.includes('success') ? 'success-message' : 'error-message'}`}>
          {message}
        </div>
      )}
      
      <form className="file-upload-form" onSubmit={handleSubmit}>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
        />
        <button 
          type="submit" 
          className="upload-button"
          disabled={loading || !file}
        >
          {loading ? 'Uploading...' : 'Upload Excel File'}
        </button>
      </form>
    </div>
  );
};

export default FileUpload;