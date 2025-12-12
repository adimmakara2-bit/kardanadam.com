import React, { useEffect, useRef, useState } from 'react';

interface VisualizerProps {
  isConnected: boolean;
  inputAnalyzerRef: React.RefObject<AnalyserNode | null>;
  outputAnalyzerRef: React.RefObject<AnalyserNode | null>;
  isNoelMode: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ isConnected, inputAnalyzerRef, outputAnalyzerRef, isNoelMode }) => {
  const [scale, setScale] = useState(1);
  const [activeMode, setActiveMode] = useState<'idle' | 'user' | 'ai'>('idle');
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!isConnected) {
      setScale(1);
      setActiveMode('idle');
      return;
    }

    const update = () => {
      let inputVol = 0;
      let outputVol = 0;

      // Get Input Volume
      if (inputAnalyzerRef.current) {
        const data = new Uint8Array(inputAnalyzerRef.current.frequencyBinCount);
        inputAnalyzerRef.current.getByteFrequencyData(data);
        const sum = data.reduce((a, b) => a + b, 0);
        inputVol = sum / data.length;
      }

      // Get Output Volume
      if (outputAnalyzerRef.current) {
        const data = new Uint8Array(outputAnalyzerRef.current.frequencyBinCount);
        outputAnalyzerRef.current.getByteFrequencyData(data);
        const sum = data.reduce((a, b) => a + b, 0);
        outputVol = sum / data.length;
      }

      // Determine State and Scale
      if (outputVol > 10) {
        setActiveMode('ai');
        setScale(1 + (outputVol / 255) * 0.8);
      } else if (inputVol > 10) {
        setActiveMode('user');
        setScale(1 + (inputVol / 255) * 0.5);
      } else {
        setActiveMode('idle');
        setScale(1);
      }

      frameRef.current = requestAnimationFrame(update);
    };

    update();

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [isConnected, inputAnalyzerRef, outputAnalyzerRef]);

  // Dynamic Styles
  const getOrbColor = () => {
    if (!isConnected) return 'bg-slate-700 shadow-[0_0_30px_rgba(51,65,85,0.5)]';
    
    if (isNoelMode) {
      // Noel Mode Colors
      switch (activeMode) {
        case 'ai': return 'bg-gradient-to-br from-red-500 to-green-600 shadow-[0_0_60px_rgba(220,38,38,0.8)]'; // Christmas Red/Green
        case 'user': return 'bg-gradient-to-br from-white to-blue-200 shadow-[0_0_60px_rgba(255,255,255,0.8)]'; // Snow White
        default: return 'bg-gradient-to-br from-green-800 to-red-900 shadow-[0_0_30px_rgba(255,255,255,0.2)]';
      }
    } else {
      // Normal Mode Colors
      switch (activeMode) {
        case 'ai': return 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-[0_0_60px_rgba(168,85,247,0.8)]'; 
        case 'user': return 'bg-gradient-to-br from-cyan-400 to-blue-500 shadow-[0_0_60px_rgba(34,211,238,0.8)]'; 
        default: return 'bg-slate-600 shadow-[0_0_30px_rgba(255,255,255,0.1)]';
      }
    }
  };

  const getRingColor = (layer: 'outer' | 'inner') => {
    if (!isConnected) return 'border-slate-600';
    
    if (isNoelMode) {
      if (activeMode === 'ai') return layer === 'outer' ? 'border-red-400' : 'border-green-300';
      if (activeMode === 'user') return 'border-white';
      return 'border-green-800';
    } else {
      if (activeMode === 'ai') return layer === 'outer' ? 'border-purple-400' : 'border-purple-300';
      if (activeMode === 'user') return layer === 'outer' ? 'border-cyan-400' : 'border-cyan-300';
      return 'border-white';
    }
  }

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Outer Rotating Ring */}
      <div 
        className={`absolute inset-0 rounded-full border-2 border-dashed transition-colors duration-500 opacity-30 animate-[spin_10s_linear_infinite]
          ${getRingColor('outer')}
        `}
      />
      
      {/* Second Reverse Rotating Ring */}
      <div 
        className={`absolute inset-4 rounded-full border border-dotted transition-colors duration-500 opacity-20 animate-[spin_15s_linear_infinite_reverse]
          ${getRingColor('inner')}
        `}
      />

      {/* Main Orb */}
      <div 
        className={`w-32 h-32 rounded-full transition-all duration-100 ease-out z-10 ${getOrbColor()}`}
        style={{ transform: `scale(${scale})` }}
      >
        {/* Shine effect */}
        <div className="absolute top-0 right-0 w-full h-full rounded-full bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none"></div>
      </div>

      {/* Connection Pulse */}
      {isConnected && activeMode === 'idle' && (
        <div className={`absolute w-32 h-32 rounded-full border animate-ping ${isNoelMode ? 'border-green-500/30' : 'border-white/20'}`}></div>
      )}
    </div>
  );
};

export default Visualizer;