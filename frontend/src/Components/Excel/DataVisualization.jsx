import { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { Line, Bar, Scatter, Pie, Bubble, Radar } from 'react-chartjs-2';
import './DataVisualization.css';
import ExportOptions from './ExportOptions';
import api from '../Services/api';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  zoomPlugin
);

const DataVisualization = ({ data, selectedColumns, selectedFile }) => {
  const [chartType, setChartType] = useState('line');
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');
  const chartRef = useRef(null);
  const [chartConfig, setChartConfig] = useState({
    title: '',
    backgroundColor: '#ffffff',
    borderColor: '#6C63FF',
    tension: 0.4,
    pointRadius: 4
  });

  // Clean up chart instance when unmounting
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  const prepareChartData = () => {
    if (!xAxis || !yAxis || !data) return null;

    return {
      labels: data.map(row => row[xAxis]),
      datasets: [{
        label: yAxis,
        data: data.map(row => row[yAxis]),
        borderColor: chartConfig.borderColor,
        backgroundColor: chartConfig.backgroundColor,
        tension: chartConfig.tension,
        pointRadius: chartConfig.pointRadius
      }]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart'
    },
    plugins: {
      legend: {
        position: 'top'
      },
      title: {
        display: true,
        text: chartConfig.title || `${yAxis} vs ${xAxis}`
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'xy'
        },
        zoom: {
          wheel: {
            enabled: true
          },
          pinch: {
            enabled: true
          },
          mode: 'xy'
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: xAxis
        }
      },
      y: {
        title: {
          display: true,
          text: yAxis
        }
      }
    }
  };

  const renderChart = () => {
    const chartData = prepareChartData();
    if (!chartData) return null;

    const chartStyle = { height: '100%', width: '100%' };

    switch (chartType) {
      case 'line':
        return <Line data={chartData} options={chartOptions} ref={chartRef} style={chartStyle} />;
      case 'bar':
        return <Bar data={chartData} options={chartOptions} ref={chartRef} style={chartStyle} />;
      case 'scatter':
        return <Scatter data={chartData} options={chartOptions} ref={chartRef} style={chartStyle} />;
      case 'pie':
        return <Pie data={chartData} options={chartOptions} ref={chartRef} style={chartStyle} />;
      case 'bubble':
        return <Bubble data={chartData} options={chartOptions} ref={chartRef} style={chartStyle} />;
      case 'radar':
        return <Radar data={chartData} options={chartOptions} ref={chartRef} style={chartStyle} />;
      default:
        return null;
    }
  };

  const trackChartCreation = async () => {
    try {
      if (!selectedFile || !chartType || !xAxis || !yAxis) {
        console.log('Missing required data:', { selectedFile, chartType, xAxis, yAxis });
        return;
      }

      console.log('Tracking chart creation:', {
        filename: selectedFile,
        chartType,
        xAxis,
        yAxis
      });

      const response = await api.post('/excel/track-analysis', {
        filename: selectedFile,
        analysis: {
          chartType,
          xAxis,
          yAxis
        }
      });

      console.log('Analysis tracked:', response.data);
    } catch (error) {
      console.error('Failed to track analysis:', error);
    }
  };

  // Update useEffect to track when chart parameters change
  useEffect(() => {
    const trackChanges = async () => {
      if (chartType && xAxis && yAxis && selectedFile) {
        await trackChartCreation();
      }
    };
    trackChanges();
  }, [chartType, xAxis, yAxis, selectedFile]); // Dependencies

  return (
    <div className="visualization-container">
      <div className="controls">
        <select value={chartType} onChange={(e) => setChartType(e.target.value)}>
          <option value="line">Line Chart</option>
          <option value="bar">Bar Chart</option>
          <option value="scatter">Scatter Plot</option>
          <option value="pie">Pie Chart</option>
          <option value="radar">Radar Chart</option>
        </select>

        <select value={xAxis} onChange={(e) => setXAxis(e.target.value)}>
          <option value="">Select X-Axis</option>
          {selectedColumns.map(col => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>

        <select value={yAxis} onChange={(e) => setYAxis(e.target.value)}>
          <option value="">Select Y-Axis</option>
          {selectedColumns.map(col => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>
      </div>

      <div className="chart-customization">
        <input
          type="text"
          placeholder="Chart Title"
          value={chartConfig.title}
          onChange={(e) => setChartConfig(prev => ({
            ...prev,
            title: e.target.value
          }))}
        />
        <input
          type="color"
          value={chartConfig.backgroundColor}
          onChange={(e) => setChartConfig(prev => ({
            ...prev,
            backgroundColor: e.target.value
          }))}
        />
      </div>

      <div className="chart-container">
        {renderChart()}
      </div>

      <ExportOptions 
        data={data}
        selectedColumns={selectedColumns}
        chartRef={chartRef}
      />
    </div>
  );
};

export default DataVisualization;