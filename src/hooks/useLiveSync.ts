/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { BandState, Song, UserRole } from '../types';

export function useLiveSync(sessionId: string | null, role: UserRole) {
  const [bandState, setBandState] = useState<BandState | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Sync Band State
  useEffect(() => {
    if (!sessionId) return;

    const docRef = doc(db, 'sessions', sessionId);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        setBandState(snapshot.data() as BandState);
        setIsConnected(true);
      } else if (role === 'leader') {
        const initialState: BandState = {
          sessionId,
          leaderId: auth.currentUser?.uid || 'anonymous',
          currentSongId: null,
          isPlaying: false,
          scrollPosition: 0,
          metronomeActive: false,
          bpm: 120,
          lastUpdated: Date.now()
        };
        setDoc(docRef, initialState);
        setBandState(initialState);
        setIsConnected(true);
      }
    }, (error) => {
      console.error("Firestore sync error:", error);
      setIsConnected(false);
    });

    return () => unsubscribe();
  }, [sessionId, role]);

  // Sync Songs
  useEffect(() => {
    if (!sessionId) {
      // Load cached songs if no session
      const cached = localStorage.getItem('cached_songs');
      if (cached) setSongs(JSON.parse(cached));
      return;
    }

    const songsRef = collection(db, 'sessions', sessionId, 'songs');
    const unsubscribe = onSnapshot(songsRef, (snapshot) => {
      const updatedSongs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Song));
      setSongs(updatedSongs);
      // Cache for offline
      localStorage.setItem('cached_songs', JSON.stringify(updatedSongs));
    }, (err) => {
      console.warn("Using cached songs due to sync error:", err);
      const cached = localStorage.getItem('cached_songs');
      if (cached) setSongs(JSON.parse(cached));
    });

    return () => unsubscribe();
  }, [sessionId]);

  const updateState = useCallback(async (updates: Partial<BandState>) => {
    if (!sessionId || role !== 'leader') return;
    const docRef = doc(db, 'sessions', sessionId);
    await updateDoc(docRef, { ...updates, lastUpdated: Date.now() });
  }, [sessionId, role]);

  const addSong = useCallback(async (song: Omit<Song, 'id'>) => {
    if (!sessionId || role !== 'leader') return;
    const songsRef = collection(db, 'sessions', sessionId, 'songs');
    const newSongRef = doc(songsRef);
    await setDoc(newSongRef, { ...song });
  }, [sessionId, role]);

  return { bandState, songs, updateState, addSong, isConnected };
}
