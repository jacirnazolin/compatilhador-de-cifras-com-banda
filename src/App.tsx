/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  QrCode, 
  Settings, 
  Music, 
  Users, 
  Play, 
  Pause, 
  ChevronUp, 
  ChevronDown,
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
  RefreshCw,
  LogOut,
  Maximize,
  Upload
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLiveSync } from './hooks/useLiveSync';
import MediaOrchestrator from './components/MediaOrchestrator';
import QRScanner from './components/QRScanner';
import { Song, SongType, UserRole } from './types';
import { BluetoothService } from './services/bluetoothService';

export default function App() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [transpose, setTranspose] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isBluetoothConnected, setIsBluetoothConnected] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const { bandState, songs, updateState, addSong, isConnected } = useLiveSync(sessionId, role || 'band');
  const [personalNote, setPersonalNote] = useState('');

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Setup Bluetooth Pedal
  useEffect(() => {
    const bluetooth = BluetoothService.getInstance();
    const cleanup = bluetooth.setupPedalControl(
      () => handlePedalScroll(-20), // Scroll Up
      () => handlePedalScroll(20)   // Scroll Down
    );
    return cleanup;
  }, [bandState]);

  const handlePedalScroll = (delta: number) => {
    if (role === 'leader' && bandState) {
      const currentPos = bandState.scrollPosition;
      const newPos = Math.max(0, Math.min(100, currentPos + delta));
      updateState({ scrollPosition: newPos });
    } else {
      // In band mode, manual scroll only if allowed or just for local view
      const container = document.querySelector('.custom-scrollbar');
      if (container) {
        container.scrollBy({ top: delta * 5, behavior: 'smooth' });
      }
    }
  };

  const connectBluetooth = async () => {
    try {
      const bluetooth = BluetoothService.getInstance();
      await bluetooth.requestDevice();
      setIsBluetoothConnected(true);
    } catch (err) {
      console.error(err);
      // Fallback for devices without WebBluetooth - pedals still work via HID (Keyboard)
      // So we just set it true if they say they ready
      setIsBluetoothConnected(true); 
    }
  };

  // Handle direct links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode && !sessionId) {
      handleJoinSession(joinCode);
    }
  }, []);

  const currentSong = songs.find(s => s.id === bandState?.currentSongId);

  // Sync personal note
  useEffect(() => {
    if (currentSong) {
      const saved = localStorage.getItem(`note_${currentSong.id}`);
      setPersonalNote(saved || '');
    }
  }, [currentSong]);

  const savePersonalNote = (note: string) => {
    if (currentSong) {
      setPersonalNote(note);
      localStorage.setItem(`note_${currentSong.id}`, note);
    }
  };

  // File handling
  const processFiles = async (files: FileList) => {
    for (const file of Array.from(files)) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let type: SongType = 'chordpro';
      let content = '';

      if (extension === 'pdf') {
        type = 'pdf';
        // For PDFs, we'll store the name and try to match it locally 
        // In a real P2P app, we would use WebRTC to transfer the file
        content = URL.createObjectURL(file);
      } else if (['mp4', 'mov', 'webm'].includes(extension || '')) {
        type = 'video';
        content = URL.createObjectURL(file);
      } else {
        type = 'chordpro';
        content = await file.text();
      }

      addSong({
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: file.name.split('.').pop()?.toUpperCase() || 'FILE',
        content: content,
        type: type,
        originalKey: 'C',
        currentKey: 'C',
        bpm: 120
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (role === 'leader') setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (role === 'leader' && e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Scroll Sync (Slave/Follower side)
  useEffect(() => {
    if (role === 'band' && bandState?.scrollPosition !== undefined) {
      const viewer = document.getElementById('song-viewer-container');
      if (viewer) {
        const targetScroll = (viewer.scrollHeight - viewer.clientHeight) * (bandState.scrollPosition / 100);
        viewer.scrollTo({ top: targetScroll, behavior: 'smooth' });
      }
    }
  }, [bandState?.scrollPosition, role]);

  // Scroll Sync (Leader side - send position)
  const onManualScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (role === 'leader') {
      const target = e.currentTarget;
      const percentage = (target.scrollTop / (target.scrollHeight - target.clientHeight)) * 100;
      // Debounce or throttle this in production
      updateState({ scrollPosition: isNaN(percentage) ? 0 : percentage });
    }
  };

  // Wake Lock
  useEffect(() => {
    let sentinel: any = null;
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          sentinel = await (navigator as any).wakeLock.request('screen');
        } catch (err: any) {
          console.warn(`Wake Lock restricted or failed: ${err.name}, ${err.message}`);
        }
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (sentinel !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      if (sentinel) sentinel.release();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Metronome Sound
  useEffect(() => {
    if (bandState?.metronomeActive) {
      const interval = 60000 / (bandState?.bpm || 120);
      const timer = setInterval(() => {
        // Visual indicator logic handled in UI
      }, interval);
      return () => clearInterval(timer);
    }
  }, [bandState?.metronomeActive, bandState?.bpm]);

  const handleStartSession = () => {
    const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setSessionId(newId);
    setRole('leader');
  };

  const handleJoinSession = (id: string) => {
    setSessionId(id.toUpperCase());
    setRole('band');
  };

  if (!role) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-900 to-black">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-8 max-w-md w-full"
        >
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-cyan-500/20 rounded-2xl flex items-center justify-center border border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
              <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin-slow" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
              LIVESYNC ORCHESTRATOR
            </h1>
            <p className="text-gray-400 font-medium">Professional Live Band Coordination</p>
          </div>

          <div className="grid gap-4 mt-12">
            <button 
              onClick={handleStartSession}
              id="start-leader-btn"
              className="group relative px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-3 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
              <Play className="w-5 h-5 fill-current" />
              START AS LEADER
            </button>
            <div className="relative">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-gray-800" />
              <span className="relative z-10 px-4 bg-black text-gray-500 text-sm font-bold">OR JOIN BAND</span>
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="6-DIGIT CODE" 
                className="flex-1 bg-gray-900 border-2 border-gray-800 rounded-xl px-4 py-3 text-center font-mono font-bold tracking-widest focus:border-cyan-500 outline-none transition-colors"
                onChange={(e) => {
                  if (e.target.value.length === 6) handleJoinSession(e.target.value);
                }}
              />
              <button 
                onClick={() => setShowScanner(true)}
                className="p-4 bg-purple-600 hover:bg-purple-500 rounded-xl transition-all"
                id="qr-scan-btn"
              >
                <QrCode className="w-6 h-6" />
              </button>
            </div>
          </div>
          {showScanner && (
            <QRScanner 
              onScan={(text) => {
                const url = new URL(text);
                const code = url.searchParams.get('join');
                if (code) handleJoinSession(code);
                setShowScanner(false);
              }}
              onClose={() => setShowScanner(false)}
            />
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30 overflow-hidden flex flex-col">
      {/* Top Header */}
      <header className="h-16 border-b border-gray-800 flex items-center justify-between px-4 bg-black/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
            <Music className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-sm leading-tight">SESSION {sessionId}</h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">{role}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Offline/Bluetooth Indicators */}
          <div className="hidden sm:flex items-center gap-3 mr-2">
            {isOffline && (
              <div className="flex items-center gap-2 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-[10px] font-bold uppercase tracking-wider">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                Offline
              </div>
            )}
            <button
              onClick={connectBluetooth}
              className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                isBluetoothConnected 
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                  : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isBluetoothConnected ? 'bg-blue-500' : 'bg-gray-600'}`} />
              Bt Pedal
            </button>
          </div>

          {bandState?.metronomeActive && (
            <div className="flex items-center gap-2 mr-4">
              <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
              <span className="text-xs font-mono font-bold text-cyan-400">{bandState.bpm} BPM</span>
            </div>
          )}
          <button 
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-2 hover:bg-gray-800 rounded-lg"
          >
            {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => { setRole(null); setSessionId(null); }}
            className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar / Setlist (Hidden on mobile if following) */}
        <aside 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`${role === 'leader' ? 'w-80' : 'hidden md:flex w-64'} border-r border-gray-800 flex flex-col bg-gray-950 transition-colors ${isDragging ? 'bg-cyan-500/10 border-cyan-500/50' : ''}`}
        >
          <div className="p-4 flex items-center justify-between">
            <h3 className="font-bold text-xs text-gray-500 uppercase tracking-widest">Setlist</h3>
            {role === 'leader' && (
              <div className="flex items-center gap-1">
                <label className="p-1 hover:bg-gray-800 rounded text-cyan-400 cursor-pointer transition-colors" title="Upload Files">
                  <Upload className="w-4 h-4" />
                  <input 
                    type="file" 
                    multiple 
                    className="hidden" 
                    accept=".txt,.chordpro,.cho,.pdf,.mp4,.mov"
                    onChange={(e) => e.target.files && processFiles(e.target.files)}
                  />
                </label>
                <button 
                  onClick={() => {
                    const songName = prompt('Song Title?');
                    if (songName) {
                      addSong({
                        title: songName,
                        artist: 'New Artist',
                        content: '[G]This is a sample [C]song\n[D]With some [G]chords',
                        type: 'chordpro',
                        originalKey: 'G',
                        currentKey: 'G',
                        bpm: 120
                      });
                    }
                  }}
                  className="p-1 hover:bg-gray-800 rounded text-cyan-400 transition-colors"
                  title="Add Manually"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-2 space-y-1">
            {songs.map(song => (
              <button
                key={song.id}
                onClick={() => role === 'leader' && updateState({ currentSongId: song.id, bpm: song.bpm })}
                className={`w-full p-3 rounded-xl flex flex-col items-start transition-all ${
                  bandState?.currentSongId === song.id 
                    ? 'bg-cyan-500/10 border border-cyan-500/50 text-cyan-300' 
                    : 'hover:bg-gray-800 text-gray-400 border border-transparent'
                }`}
              >
                <span className="font-bold text-sm">{song.title}</span>
                <span className="text-[10px] opacity-60">{song.artist}</span>
              </button>
            ))}
          </div>
          
          {role === 'leader' && (
            <div className="p-6 border-t border-gray-800 space-y-4">
              <div className="flex items-center justify-center p-2 bg-white rounded-lg">
                <QRCodeSVG value={window.location.origin + '?join=' + sessionId} size={120} />
              </div>
              <p className="text-center text-[10px] text-gray-500 font-bold uppercase tracking-wider">BAND SCAN TO SYNC</p>
            </div>
          )}
        </aside>

        {/* Main Viewer */}
        <main className="flex-1 flex flex-col bg-black relative">
          {currentSong ? (
            <>
              <MediaOrchestrator 
                song={currentSong}
                transpose={transpose}
                fontSize={fontSize}
                role={role || 'band'}
                isPlaying={bandState?.isPlaying || false}
                scrollPosition={bandState?.scrollPosition || 0}
                onScroll={(p) => updateState({ scrollPosition: p })}
              />

              {/* Personal Notes (Floating or Fixed) */}
              {(currentSong.type === 'chordpro' || currentSong.type === 'txt') && (
                <div className="mx-6 mb-4 p-4 bg-gray-900/50 border border-gray-800 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2 text-gray-500">
                    <Settings className="w-3 h-3" />
                    <span className="text-[9px] uppercase font-bold tracking-widest text-gray-400">Suas Anotações</span>
                  </div>
                  <textarea
                    value={personalNote}
                    onChange={(e) => savePersonalNote(e.target.value)}
                    placeholder="Notas pessoais (viradas, pedais...)"
                    className="w-full bg-transparent text-[11px] font-mono text-cyan-200/60 focus:text-cyan-200 outline-none h-16 resize-none custom-scrollbar"
                  />
                </div>
              )}

              {/* Floating Controls */}
              <div className="absolute bottom-24 right-6 flex flex-col gap-3 z-40">
                <div className="flex items-center gap-2 bg-gray-900/90 border border-gray-800 p-2 rounded-2xl shadow-2xl backdrop-blur-lg">
                   <button onClick={() => setFontSize(s => Math.min(40, s + 2))} className="p-2 hover:bg-gray-800 rounded-xl transition-colors"><Plus className="w-5 h-5 text-gray-300" /></button>
                   <span className="text-xs font-bold text-gray-500 w-4 text-center">{fontSize}</span>
                   <button onClick={() => setFontSize(s => Math.max(12, s - 2))} className="p-2 hover:bg-gray-800 rounded-xl transition-colors"><ChevronUp className="w-5 h-5 rotate-180 text-gray-300" /></button>
                </div>
                <div className="flex items-center gap-2 bg-gray-900/90 border border-gray-800 p-2 rounded-2xl shadow-2xl backdrop-blur-lg">
                   <button onClick={() => setTranspose(t => t + 1)} className="p-2 hover:bg-gray-800 rounded-xl text-cyan-400 font-bold transition-colors">#</button>
                   <span className="text-xs font-bold text-gray-500 w-6 text-center">{transpose > 0 ? `+${transpose}` : transpose}</span>
                   <button onClick={() => setTranspose(t => t - 1)} className="p-2 hover:bg-gray-800 rounded-xl text-purple-400 font-bold transition-colors">b</button>
                </div>
              </div>

              {role === 'leader' ? (
                <div className="h-24 border-t border-gray-800 bg-gray-950 flex items-center justify-between px-6 z-50">
                   <div className="flex items-center gap-8">
                      <button 
                        onClick={() => updateState({ isPlaying: !bandState?.isPlaying })}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                          bandState?.isPlaying ? 'bg-red-500 hover:bg-red-400 shadow-red-500/20' : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/20'
                        }`}
                      >
                        {bandState?.isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current translate-x-0.5" />}
                      </button>
                      
                      <div className="flex items-center gap-6">
                        <button 
                          onClick={() => updateState({ metronomeActive: !bandState?.metronomeActive })}
                          className={`px-4 py-2 rounded-xl font-bold text-[10px] flex items-center gap-2 transition-all border ${
                            bandState?.metronomeActive ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-gray-800 border-gray-700 text-gray-500'
                          }`}
                        >
                           METRÔNOMO
                        </button>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">BPM</span>
                          <input 
                            type="number" 
                            value={bandState?.bpm}
                            onChange={(e) => updateState({ bpm: parseInt(e.target.value) })}
                            className="w-16 bg-black border border-gray-800 rounded-lg px-2 py-2 text-sm font-mono text-cyan-400 focus:border-cyan-500 outline-none transition-colors"
                          />
                        </div>
                      </div>
                   </div>

                   <div className="flex items-center gap-4">
                      <div className="text-right mr-4 hidden sm:block">
                        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Status</p>
                        <p className={`text-xs font-bold ${bandState?.isPlaying ? 'text-cyan-400 animate-pulse' : 'text-gray-500'}`}>
                          {bandState?.isPlaying ? 'EXECUTANDO' : 'ESTACIONADO'}
                        </p>
                      </div>
                      <button className="flex flex-col items-center gap-1 group p-2 hover:bg-gray-800 rounded-xl transition-colors">
                        <Settings className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                        <span className="text-[9px] text-gray-600 uppercase font-bold">Ajustes</span>
                      </button>
                   </div>
                </div>
              ) : (
                <div className="h-4 bg-cyan-600/10 relative overflow-hidden">
                  <motion.div 
                    initial={false}
                    animate={{ width: `${bandState?.scrollPosition || 0}%` }}
                    className="absolute inset-y-0 left-0 bg-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-600 flex-col gap-6 text-center p-12">
              <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center mb-4 border border-gray-800 shadow-inner">
                <Music className="w-10 h-10 opacity-20" />
              </div>
              <div className="space-y-2">
                <p className="font-black text-lg uppercase tracking-[0.2em] text-gray-400">Nenhuma Música Selecionada</p>
                <p className="text-sm text-gray-600 max-w-xs mx-auto">Selecine uma música no Setlist ao lado ou adicione novos arquivos para começar o show.</p>
              </div>
              {role === 'leader' && (
                <div className="flex gap-4 mt-4">
                  <div className="flex items-center gap-2 text-[10px] text-gray-700 font-bold uppercase tracking-widest border border-gray-800 px-4 py-2 rounded-full">
                    <Upload className="w-3 h-3" /> Arraste arquivos aqui
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
