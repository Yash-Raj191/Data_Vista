import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei'; // Added Html import
import { useState, useMemo } from 'react';
import * as THREE from 'three';
import './ThreeDVisualization.css';

const ThreeDVisualization = ({ data, selectedColumns }) => {
  const [selectedAxis, setSelectedAxis] = useState({
    x: selectedColumns[0],
    y: selectedColumns[1],
    z: selectedColumns[2]
  });

  // Scale factors for normalization
  const scales = useMemo(() => {
    if (!data || !selectedAxis.x || !selectedAxis.y || !selectedAxis.z) return {};

    const getScale = (column) => {
      const values = data.map(row => Number(row[column])).filter(num => !isNaN(num));
      const max = Math.max(...values);
      const min = Math.min(...values);
      const range = max - min;
      return {
        min,
        max,
        scale: range > 0 ? 10 / range : 1,
        offset: min
      };
    };

    return {
      x: getScale(selectedAxis.x),
      y: getScale(selectedAxis.y),
      z: getScale(selectedAxis.z)
    };
  }, [data, selectedAxis]);

  const points = useMemo(() => {
    if (!data || !selectedAxis.x || !selectedAxis.y || !selectedAxis.z || !scales.x) return [];

    return data.map(row => ({
      position: [
        (Number(row[selectedAxis.x]) - scales.x.offset) * scales.x.scale,
        (Number(row[selectedAxis.y]) - scales.y.offset) * scales.y.scale,
        (Number(row[selectedAxis.z]) - scales.z.offset) * scales.z.scale
      ],
      originalValues: {
        x: row[selectedAxis.x],
        y: row[selectedAxis.y],
        z: row[selectedAxis.z]
      }
    }));
  }, [data, selectedAxis, scales]);

  const Points = () => {
    return points.map((point, i) => (
      <group key={i}>
        <mesh position={point.position}>
          <sphereGeometry args={[0.1]} />
          <meshStandardMaterial color="#6C63FF" />
          <Html
            position={[0, 0.2, 0]}
            style={{
              display: 'none',
              background: 'rgba(0,0,0,0.8)',
              padding: '6px',
              color: 'white',
              borderRadius: '4px',
              fontSize: '12px',
              pointerEvents: 'none',
              whiteSpace: 'nowrap'
            }}
            className="point-tooltip"
          >
            <div>
              {`${selectedAxis.x}: ${point.originalValues.x}`}<br />
              {`${selectedAxis.y}: ${point.originalValues.y}`}<br />
              {`${selectedAxis.z}: ${point.originalValues.z}`}
            </div>
          </Html>
        </mesh>
      </group>
    ));
  };

  const AxisLabel = ({ position, text }) => (
    <Text
      position={position}
      fontSize={0.5}
      color="#000000"
      anchorX="center"
      anchorY="middle"
    >
      {text}
    </Text>
  );

  return (
    <div className="three-d-container">
      <div className="axis-selectors">
        {['x', 'y', 'z'].map(axis => (
          <select
            key={axis}
            value={selectedAxis[axis]}
            onChange={(e) => setSelectedAxis({
              ...selectedAxis,
              [axis]: e.target.value
            })}
          >
            <option value="">Select {axis.toUpperCase()}-Axis</option>
            {selectedColumns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        ))}
      </div>

      <div className="canvas-container" style={{ height: '500px' }}>
        <Canvas 
          camera={{ position: [10, 10, 10], fov: 60 }}
          style={{ background: '#f5f5f5' }}
        >
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <Points />
          <OrbitControls 
            enablePan={true} 
            enableZoom={true} 
            enableRotate={true}
            makeDefault
          />
          
          {/* Axes */}
          <axesHelper args={[5]} />
          
          {/* Axis Labels */}
          <AxisLabel position={[6, 0, 0]} text={selectedAxis.x} />
          <AxisLabel position={[0, 6, 0]} text={selectedAxis.y} />
          <AxisLabel position={[0, 0, 6]} text={selectedAxis.z} />
          
          {/* Grid Helpers */}
          <gridHelper args={[10, 10]} rotation={[0, 0, 0]} />
          <gridHelper args={[10, 10]} rotation={[Math.PI / 2, 0, 0]} />
          <gridHelper args={[10, 10]} rotation={[0, 0, Math.PI / 2]} />
        </Canvas>
      </div>

      <div className="visualization-controls">
        <div className="instructions">
          <h4>Controls:</h4>
          <ul>
            <li>Left Click + Drag: Rotate view</li>
            <li>Right Click + Drag: Pan view</li>
            <li>Scroll: Zoom in/out</li>
            <li>Hover over points to see values</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ThreeDVisualization;