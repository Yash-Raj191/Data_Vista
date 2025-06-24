import { useState, useEffect } from 'react';
import './Statistics.css';

const Statistics = ({ data, selectedColumns }) => {
  const [stats, setStats] = useState({});

  const calculateStats = () => {
    const newStats = {};
    selectedColumns.forEach(column => {
      const numbers = data.map(row => Number(row[column])).filter(num => !isNaN(num));
      
      if (numbers.length > 0) {
        const sum = numbers.reduce((a, b) => a + b, 0);
        const mean = sum / numbers.length;
        const sorted = numbers.sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const max = Math.max(...numbers);
        const min = Math.min(...numbers);

        newStats[column] = {
          mean: mean.toFixed(2),
          median: median.toFixed(2),
          max: max.toFixed(2),
          min: min.toFixed(2),
          count: numbers.length
        };
      }
    });
    setStats(newStats);
  };

  useEffect(() => {
    if (data && selectedColumns) {
      calculateStats();
    }
  }, [data, selectedColumns]);

  return (
    <div className="statistics-container">
      <h3>Statistical Analysis</h3>
      {Object.entries(stats).map(([column, columnStats]) => (
        <div key={column} className="stat-card">
          <h4>{column}</h4>
          <div className="stat-grid">
            <div className="stat-item">
              <label>Mean:</label>
              <span>{columnStats.mean}</span>
            </div>
            <div className="stat-item">
              <label>Median:</label>
              <span>{columnStats.median}</span>
            </div>
            <div className="stat-item">
              <label>Max:</label>
              <span>{columnStats.max}</span>
            </div>
            <div className="stat-item">
              <label>Min:</label>
              <span>{columnStats.min}</span>
            </div>
            <div className="stat-item">
              <label>Count:</label>
              <span>{columnStats.count}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Statistics;