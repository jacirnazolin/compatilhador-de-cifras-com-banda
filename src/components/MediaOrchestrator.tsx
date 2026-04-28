/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Song } from '../types';
import ChordViewer from './ChordViewer';
import PDFCanvasViewer from './PDFCanvasViewer';

interface MediaOrchestratorProps {
  song: Song;
  transpose: number;
  fontSize: number;
  role: 'leader' | 'band';
  isPlaying: boolean;
  scrollPosition: number;
  onScroll: (percentage: number) => void;
}

export default function MediaOrchestrator({ 
  song, 
  transpose, 
  fontSize, 
  role, 
  isPlaying,
  scrollPosition, 
  onScroll 
}: MediaOrchestratorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-scroll logic
  useEffect(() => {
    let interval: any;
    if (isPlaying && role === 'leader' && (song.type === 'chordpro' || song.type === 'txt')) {
      interval = setInterval(() => {
        if (containerRef.current) {
          const container = containerRef.current;
          const maxScroll = container.scrollHeight - container.clientHeight;
          if (container.scrollTop < maxScroll) {
            const nextScroll = container.scrollTop + 0.5; // Slow crawl
            container.scrollTop = nextScroll;
            const percentage = (nextScroll / maxScroll) * 100;
            onScroll(percentage);
          }
        }
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isPlaying, role, song.type, onScroll]);

  // Sync Video Playback
  useEffect(() => {
    if (videoRef.current && song.type === 'video') {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, song.type]);

  // Sync Scroll for Text/ChordPro (Slave side)
  useEffect(() => {
    if (role === 'band' && containerRef.current && (song.type === 'chordpro' || song.type === 'txt')) {
      const container = containerRef.current;
      const target = (container.scrollHeight - container.clientHeight) * (scrollPosition / 100);
      container.scrollTo({ top: target, behavior: 'smooth' });
    }
  }, [scrollPosition, role, song.type]);

  // Sync Video Time (Slave side)
  useEffect(() => {
    if (role === 'band' && videoRef.current && song.type === 'video') {
      const video = videoRef.current;
      const targetTime = video.duration * (scrollPosition / 100);
      if (Math.abs(video.currentTime - targetTime) > 1.5) { // Looser sync for video
        video.currentTime = targetTime;
      }
    }
  }, [scrollPosition, role, song.type]);

  const handleManualScroll = () => {
    if (role === 'leader' && containerRef.current) {
      const container = containerRef.current;
      const percentage = (container.scrollTop / (container.scrollHeight - container.clientHeight)) * 100;
      onScroll(isNaN(percentage) ? 0 : percentage);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (role === 'leader' && videoRef.current) {
      const video = videoRef.current;
      const percentage = (video.currentTime / video.duration) * 100;
      onScroll(percentage);
    }
  };

  if (song.type === 'video') {
    return (
      <div className="flex-1 flex items-center justify-center bg-black p-4">
        <video 
          ref={videoRef}
          src={song.content} 
          controls={role === 'leader'}
          onTimeUpdate={handleVideoTimeUpdate}
          className="max-w-full max-h-full rounded-xl shadow-2xl border border-gray-800"
        />
      </div>
    );
  }

  if (song.type === 'pdf') {
    return (
      <PDFCanvasViewer 
        url={song.content}
        scrollPosition={scrollPosition}
        onScroll={onScroll}
        role={role}
      />
    );
  }

  return (
    <div 
      ref={containerRef}
      onScroll={handleManualScroll}
      className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth"
    >
      <ChordViewer song={song} transpose={transpose} fontSize={fontSize} />
    </div>
  );
}
