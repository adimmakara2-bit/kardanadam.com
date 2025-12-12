import React, { useEffect, useState } from 'react';
import { useGeminiLive } from './hooks/useGeminiLive';
import { ConnectionState } from './types';
import Visualizer from './components/Visualizer';

// Icons
const MicIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 1.5a3 3 0 013 3v4.5a3 3 0 01-3 3 3 3 0 01-3-3V4.5a3 3 0 013-3z" />
  </svg>
);

const PowerIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
  </svg>
);

const SnowflakeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1.001A3.75 3.75 0 0012 18z" />
  </svg>
);

const App: React.FC = () => {
  const apiKey = process.env.API_KEY || ''; 
  const [isNoelMode, setIsNoelMode] = useState(false);
  
  const { 
    connect, 
    disconnect, 
    connectionState, 
    error,
    inputAnalyzerRef,
    outputAnalyzerRef
  } = useGeminiLive(apiKey, isNoelMode);

  const [hasApiKey, setHasApiKey] = useState(!!apiKey);
  const [statusText, setStatusText] = useState("Başlamak için dokunun");

  useEffect(() => {
    setHasApiKey(!!apiKey);
  }, [apiKey]);

  useEffect(() => {
    switch (connectionState) {
      case ConnectionState.DISCONNECTED:
        setStatusText(isNoelMode ? "Hadi Kartopu Oynayalım!" : "Başlamak için dokunun");
        break;
      case ConnectionState.CONNECTING:
        setStatusText("Bağlanıyor...");
        break;
      case ConnectionState.CONNECTED:
        setStatusText(isNoelMode ? "Kardan Adam Dinliyor..." : "Dinliyorum...");
        break;
      case ConnectionState.ERROR:
        setStatusText("Bir hata oluştu");
        break;
    }
  }, [connectionState, isNoelMode]);

  const handleToggleConnection = () => {
    if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
      disconnect();
    } else {
      connect();
    }
  };

  const toggleNoelMode = async () => {
    const newMode = !isNoelMode;
    setIsNoelMode(newMode);
    
    // If connected, we need to reconnect to update the persona
    if (connectionState === ConnectionState.CONNECTED) {
      disconnect();
      // Give a tiny delay for state to settle
      setTimeout(() => {
         // Note: In a real React app, relying on this timeout to read new state inside hook isn't perfect,
         // but since we updated state above, the next render will pass the new mode to useGeminiLive.
         // However, connect() inside the hook uses a Ref for isNoelMode.
         // The user will likely just click start again, but let's just disconnect to be safe and clear state.
      }, 100);
    }
  };

  const isConnected = connectionState === ConnectionState.CONNECTED;

  return (
    <div className={`min-h-screen flex flex-col items-center justify-between p-6 relative overflow-hidden font-sans transition-colors duration-1000
      ${isNoelMode ? 'bg-slate-900' : 'bg-slate-950'}
    `}>
      
      {/* Background Gradients */}
      {!isNoelMode ? (
        <>
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-purple-900/10 to-transparent pointer-events-none"></div>
        </>
      ) : (
        <>
          {/* Christmas Gradients */}
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-green-900/20 to-transparent pointer-events-none transition-all duration-1000"></div>
          <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-red-900/20 to-transparent pointer-events-none transition-all duration-1000"></div>
          {/* Snow Effect */}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes snow {
              0% { transform: translateY(-10vh); opacity: 0; }
              10% { opacity: 1; }
              100% { transform: translateY(110vh); opacity: 0.3; }
            }
            .snowflake {
              position: absolute;
              top: -10px;
              color: white;
              font-size: 1.5rem;
              animation: snow 10s linear infinite;
              opacity: 0.8;
              pointer-events: none;
            }
          `}} />
          {[...Array(20)].map((_, i) => (
             <div key={i} className="snowflake" style={{
               left: `${Math.random() * 100}%`,
               animationDuration: `${5 + Math.random() * 5}s`,
               animationDelay: `${Math.random() * 5}s`,
               fontSize: `${Math.random() * 1.5 + 0.5}rem`
             }}>❄</div>
          ))}
        </>
      )}

      {/* Top Bar / Noel Toggle */}
      <div className="flex-1 w-full flex justify-end items-start z-30">
        <button 
          onClick={toggleNoelMode}
          className={`p-3 rounded-full transition-all duration-300 backdrop-blur-md border shadow-lg
            ${isNoelMode 
              ? 'bg-red-500/20 border-red-400 text-red-200 shadow-red-900/30' 
              : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          title={isNoelMode ? "Normal Moda Dön" : "Noel Modunu Aç"}
        >
           {isNoelMode ? (
             <span className="text-xl">⛄</span>
           ) : (
             <span className="text-xl">🎄</span>
           )}
        </button>
      </div>

      {/* Main Visualizer Area */}
      <div className="flex-none flex flex-col items-center justify-center z-10 space-y-12">
        <Visualizer 
          isConnected={isConnected} 
          inputAnalyzerRef={inputAnalyzerRef} 
          outputAnalyzerRef={outputAnalyzerRef} 
          isNoelMode={isNoelMode}
        />
        
        {/* Status Text Area */}
        <div className="text-center space-y-2 h-16">
           <h2 className={`text-2xl font-light tracking-wide transition-all duration-500 ${isConnected ? 'text-white' : 'text-slate-500'} ${isNoelMode && isConnected ? 'font-serif italic text-red-100' : ''}`}>
             {statusText}
           </h2>
           {error && (
             <p className="text-sm text-red-400 bg-red-900/20 px-3 py-1 rounded-full animate-pulse">{error}</p>
           )}
        </div>
      </div>

      {/* Bottom Spacer */}
      <div className="flex-1"></div>

      {/* Footer Controls */}
      <div className="w-full max-w-md z-20 pb-8 flex justify-center">
         {!hasApiKey ? (
            <div className="text-center p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg text-yellow-200 text-sm">
                API Anahtarı eksik
            </div>
         ) : (
           <button
             onClick={handleToggleConnection}
             disabled={connectionState === ConnectionState.CONNECTING}
             className={`rounded-full p-6 transition-all duration-500 transform hover:scale-105 active:scale-95 shadow-2xl 
               ${isConnected 
                 ? (isNoelMode 
                      ? 'bg-green-600/20 text-green-400 border border-green-500/50 hover:bg-green-600/30 shadow-green-900/30'
                      : 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20 shadow-red-900/20')
                 : (isNoelMode
                      ? 'bg-white/10 text-red-200 border border-red-200/20 hover:bg-white/20 shadow-white/5'
                      : 'bg-white/10 text-white border border-white/20 hover:bg-white/20 shadow-white/5')
               }`}
           >
             {isConnected ? <PowerIcon className="w-8 h-8" /> : <MicIcon className="w-8 h-8" />}
           </button>
         )}
      </div>

    </div>
  );
};

export default App;