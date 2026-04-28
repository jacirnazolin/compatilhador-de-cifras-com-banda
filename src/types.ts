/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SongType = 'chordpro' | 'pdf' | 'video' | 'txt';

export interface Song {
  id: string;
  title: string;
  artist: string;
  content: string; // Text content or URL for PDF/Video
  type: SongType;
  originalKey: string;
  currentKey: string;
  bpm: number;
}

export interface BandState {
  sessionId: string;
  leaderId: string;
  currentSongId: string | null;
  isPlaying: boolean;
  scrollPosition: number; // 0 to 100 percentage
  metronomeActive: boolean;
  bpm: number;
  lastUpdated: number;
}

export interface UserNote {
  songId: string;
  userId: string;
  note: string;
}

export type UserRole = 'leader' | 'band';
