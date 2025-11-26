import React, { useState } from 'react';
import { AppConfig, SparkShape, VideoFilter } from '../types';
import { VIDEO_FILTERS } from '../constants';

interface ControlPanelProps {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ config, setConfig }) => {
  const [expanded, setExpanded] = useState(false);

  const handleChange = <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end select-none pointer-events-auto">
      {/* Toggle Header Button */}
      <button 
        onClick={() => setExpanded(!expanded)}
        className="group flex items-center gap-3 bg-black/80 border-2 border-green-500 px-4 py-2 shadow-[0_0_10px_rgba(0,255,0,0.3)] hover:bg-green-900/40 transition-all backdrop-blur-sm active:translate-y-0.5"
      >
        <div className={`w-2 h-2 bg-green-500 rounded-full ${expanded ? 'animate-pulse' : 'opacity-50'}`}></div>
        <span className="font-mono text-green-400 font-bold tracking-wider text-sm">
          {expanded ? ':: CLOSE_SYSTEM ::' : ':: OPEN_CONTROLS ::'}
        </span>
        <span className="font-mono text-green-600 text-xs">
          {expanded ? '[-]' : '[+]'}
        </span>
      </button>

      {/* Expanded Horizontal Dashboard */}
      {expanded && (
        <div className="mt-2 bg-black/90 border-2 border-green-500 p-4 shadow-[0_0_25px_rgba(0,255,0,0.2)] backdrop-blur-md max-w-[95vw] animate-in fade-in slide-in-from-top-2 duration-200">
          
          <div className="flex flex-col md:flex-row gap-6 text-xs font-mono">
            
            {/* COLUMN 1: SPARKS */}
            <div className="w-56 space-y-3 flex-shrink-0">
              <div className="border-b border-green-500/50 pb-1 mb-2 text-yellow-300 font-bold uppercase tracking-wider flex justify-between">
                <span>[A] Emitter</span>
                <span className="text-[10px] opacity-70">SPARK</span>
              </div>
              
              <div className="grid grid-cols-[60px_1fr] gap-2 items-center">
                <label className="text-green-400/80">COLOR</label>
                <div className="flex items-center gap-2">
                   <input 
                    type="color" 
                    value={config.sparkColor}
                    onChange={(e) => handleChange('sparkColor', e.target.value)}
                    className="w-full h-5 bg-transparent border border-green-500/50 cursor-pointer"
                  />
                </div>

                <label className="text-green-400/80">SIZE</label>
                <input 
                  type="range" 
                  min="1" max="10" 
                  value={config.sparkSize}
                  onChange={(e) => handleChange('sparkSize', Number(e.target.value))}
                  className="accent-green-500 h-1.5 bg-gray-800 w-full"
                />

                <label className="text-green-400/80">SHAPE</label>
                <select 
                  value={config.sparkShape}
                  onChange={(e) => handleChange('sparkShape', e.target.value as SparkShape)}
                  className="bg-gray-900 border border-green-500/50 text-green-300 text-[10px] px-1 py-0.5 focus:outline-none focus:border-green-400 w-full"
                >
                  <option value="circle">CIRCLE</option>
                  <option value="star">STAR</option>
                  <option value="heart">HEART</option>
                  <option value="spray">SPRAY</option>
                </select>
              </div>
            </div>

            {/* Vertical Divider (Desktop) */}
            <div className="hidden md:block w-px bg-green-500/30"></div>
            {/* Horizontal Divider (Mobile) */}
            <div className="md:hidden h-px bg-green-500/30 w-full"></div>

            {/* COLUMN 2: LINES */}
            <div className="w-64 space-y-3 flex-shrink-0">
              <div className="border-b border-green-500/50 pb-1 mb-2 text-cyan-300 font-bold uppercase tracking-wider flex justify-between">
                <span>[B] Tracer</span>
                <span className="text-[10px] opacity-70">LINE</span>
              </div>

              <div className="grid grid-cols-[60px_1fr] gap-2 items-center">
                <label className="text-green-400/80">COLOR</label>
                <input 
                  type="color" 
                  value={config.lineColor}
                  onChange={(e) => handleChange('lineColor', e.target.value)}
                  className="w-full h-5 bg-transparent border border-cyan-500/50 cursor-pointer"
                />

                <label className="text-green-400/80">WIDTH</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="range" 
                    min="1" max="20" 
                    value={config.lineWidth}
                    onChange={(e) => handleChange('lineWidth', Number(e.target.value))}
                    className="accent-cyan-500 h-1.5 bg-gray-800 w-full"
                  />
                  <span className="text-[10px] w-4">{config.lineWidth}</span>
                </div>

                <label className="text-green-400/80">GLOW</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="range" 
                    min="0" max="50" 
                    value={config.lineGlow}
                    onChange={(e) => handleChange('lineGlow', Number(e.target.value))}
                    className="accent-cyan-500 h-1.5 bg-gray-800 w-full"
                  />
                  <input 
                    type="checkbox" 
                    checked={config.glowEnabled}
                    onChange={(e) => handleChange('glowEnabled', e.target.checked)}
                    className="accent-cyan-500 w-3 h-3"
                  />
                </div>

                <div className="col-span-2 pt-1">
                   <label className="flex items-center gap-2 cursor-pointer hover:text-cyan-200 transition-colors">
                    <div className={`w-3 h-3 border border-cyan-500 flex items-center justify-center ${config.persistentLine ? 'bg-cyan-500/20' : ''}`}>
                        {config.persistentLine && <div className="w-1.5 h-1.5 bg-cyan-400"></div>}
                    </div>
                    <input 
                      type="checkbox" 
                      checked={config.persistentLine}
                      onChange={(e) => handleChange('persistentLine', e.target.checked)}
                      className="hidden"
                    />
                    <span className="text-[10px] text-cyan-300">PERSISTENT_TRAIL (PAINT MODE)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="hidden md:block w-px bg-green-500/30"></div>
            <div className="md:hidden h-px bg-green-500/30 w-full"></div>

            {/* COLUMN 3: VISUAL FX */}
            <div className="w-48 space-y-3 flex-shrink-0">
               <div className="border-b border-green-500/50 pb-1 mb-2 text-purple-300 font-bold uppercase tracking-wider flex justify-between">
                <span>[C] Visuals</span>
                <span className="text-[10px] opacity-70">VFX</span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                    <label className="text-green-400/80 block text-[10px]">FILTER PRESET</label>
                    <select 
                      value={config.activeFilter}
                      onChange={(e) => handleChange('activeFilter', e.target.value as VideoFilter)}
                      className="w-full bg-gray-900 border border-purple-500/50 text-purple-300 text-[10px] px-2 py-1 focus:outline-none focus:border-purple-400"
                    >
                      {Object.keys(VIDEO_FILTERS).map(filterKey => (
                        <option key={filterKey} value={filterKey}>{filterKey}</option>
                      ))}
                    </select>
                </div>
              </div>
            </div>

          </div>
          
          <div className="mt-3 text-[9px] text-green-900/40 text-right font-sans">
            SYS.V.2.1.0 // HAND_TRACK_OK
          </div>
        </div>
      )}
    </div>
  );
};