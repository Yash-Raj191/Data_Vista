import { useState } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
// Import autoTable as a separate import
import autoTable from 'jspdf-autotable';

const ExportOptions = ({ data, selectedColumns, chartRef }) => {
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [exportOptions, setExportOptions] = useState({
    includeHeaders: true,
    includeStats: true,
    includeChart: true,
    orientation: 'portrait',
    theme: 'striped'
  });

  const calculateStats = (columnData) => {
    const numbers = columnData.map(Number).filter(n => !isNaN(n));
    if (numbers.length === 0) return null;

    return {
      min: Math.min(...numbers),
      max: Math.max(...numbers),
      avg: numbers.reduce((a, b) => a + b, 0) / numbers.length,
      count: numbers.length
    };
  };

  const exportToPdf = async () => {
    try {
      // Initialize jsPDF
      const doc = new jsPDF({
        orientation: exportOptions.orientation,
        unit: 'pt',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.width;
      let yOffset = 20;

      // Add title
      doc.setFontSize(16);
      doc.text('Data Export Report', pageWidth / 2, yOffset, { align: 'center' });
      yOffset += 30;

      // Add chart if selected and available
      if (exportOptions.includeChart && chartRef?.current) {
        try {
          const canvas = chartRef.current.canvas;
          if (canvas) {
            const imgData = canvas.toDataURL('image/png', 1.0);
            const imgWidth = pageWidth - 80;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            doc.addImage(imgData, 'PNG', 40, yOffset, imgWidth, imgHeight);
            yOffset += imgHeight + 30;
          }
        } catch (error) {
          console.error('Chart export failed:', error);
        }
      }

      // Add data table
      if (exportOptions.includeHeaders) {
        const tableData = data.map(row => 
          selectedColumns.map(col => row[col])
        );

        try {
          // Use autoTable function directly
          autoTable(doc, {
            head: [selectedColumns],
            body: tableData,
            startY: yOffset,
            theme: exportOptions.theme,
            styles: {
              fontSize: 10,
              cellPadding: 5
            },
            headStyles: {
              fillColor: [108, 99, 255],
              textColor: [255, 255, 255]
            },
            margin: { top: 30 }
          });

          yOffset = doc.lastAutoTable.finalY + 20;

        } catch (error) {
          console.error('Table export failed:', error);
        }
      }

      // Add statistics if selected
      if (exportOptions.includeStats) {
        doc.setFontSize(14);
        doc.text('Statistical Summary', 40, yOffset);
        yOffset += 20;

        const statsData = selectedColumns.map(column => {
          const stats = calculateStats(data.map(row => row[column]));
          return stats ? [
            column,
            stats.min.toFixed(2),
            stats.max.toFixed(2),
            stats.avg.toFixed(2),
            stats.count
          ] : [column, 'N/A', 'N/A', 'N/A', 'N/A'];
        });

        try {
          // Use autoTable function directly
          autoTable(doc, {
            head: [['Column', 'Min', 'Max', 'Average', 'Count']],
            body: statsData,
            startY: yOffset,
            theme: 'grid',
            styles: {
              fontSize: 10,
              cellPadding: 5
            }
          });
        } catch (error) {
          console.error('Stats table export failed:', error);
        }
      }

      // Save the PDF
      doc.save('data-export.pdf');
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const exportToExcel = () => {
    const exportData = data.map(row => {
      const newRow = {};
      selectedColumns.forEach(col => {
        newRow[col] = row[col];
      });
      return newRow;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Data");

    // Add statistics sheet if selected
    if (exportOptions.includeStats) {
      const statsData = selectedColumns.map(column => {
        const stats = calculateStats(data.map(row => row[column]));
        return {
          Column: column,
          Min: stats?.min || 'N/A',
          Max: stats?.max || 'N/A',
          Average: stats?.avg || 'N/A',
          Count: stats?.count || 'N/A'
        };
      });
      const statsSheet = XLSX.utils.json_to_sheet(statsData);
      XLSX.utils.book_append_sheet(wb, statsSheet, "Statistics");
    }

    XLSX.writeFile(wb, "exported-data.xlsx");
  };

  const handleExport = () => {
    if (exportFormat === 'pdf') {
      exportToPdf();
    } else {
      exportToExcel();
    }
  };

  return (
    <div className="export-options">
      <div className="export-format">
        <select 
          value={exportFormat} 
          onChange={(e) => setExportFormat(e.target.value)}
        >
          <option value="xlsx">Excel (.xlsx)</option>
          <option value="pdf">PDF Document</option>
        </select>
      </div>

      <div className="export-settings">
        <label className="export-checkbox">
          <input
            type="checkbox"
            checked={exportOptions.includeHeaders}
            onChange={(e) => setExportOptions(prev => ({
              ...prev,
              includeHeaders: e.target.checked
            }))}
          />
          <span>Include Headers</span>
        </label>

        <label className="export-checkbox">
          <input
            type="checkbox"
            checked={exportOptions.includeStats}
            onChange={(e) => setExportOptions(prev => ({
              ...prev,
              includeStats: e.target.checked
            }))}
          />
          <span>Include Statistics</span>
        </label>

        {chartRef && (
          <label className="export-checkbox">
            <input
              type="checkbox"
              checked={exportOptions.includeChart}
              onChange={(e) => setExportOptions(prev => ({
                ...prev,
                includeChart: e.target.checked
              }))}
            />
            <span>Include Chart</span>
          </label>
        )}

        {exportFormat === 'pdf' && (
          <>
            <select
              value={exportOptions.orientation}
              onChange={(e) => setExportOptions(prev => ({
                ...prev,
                orientation: e.target.value
              }))}
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>

            <select
              value={exportOptions.theme}
              onChange={(e) => setExportOptions(prev => ({
                ...prev,
                theme: e.target.value
              }))}
            >
              <option value="striped">Striped</option>
              <option value="grid">Grid</option>
              <option value="plain">Plain</option>
            </select>
          </>
        )}
      </div>

      <button 
        onClick={handleExport}
        disabled={!selectedColumns.length}
        className="export-button"
      >
        Export Data
      </button>
    </div>
  );
};

export default ExportOptions;