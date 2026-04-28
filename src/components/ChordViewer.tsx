/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { parseChordPro, transposeChord } from '../lib/chordpro';
import { Song } from '../types';

interface ChordViewerProps {
  song: Song;
  transpose: number;
  fontSize: number;
}

export default function ChordViewer({ song, transpose, fontSize }: ChordViewerProps) {
  const lines = useMemo(() => parseChordPro(song.content), [song.content]);

  return (
    <div 
      className="p-6 font-mono leading-relaxed select-none"
      style={{ fontSize: `${fontSize}px` }}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-cyan-400">{song.title}</h1>
        <p className="text-purple-400 opacity-80">{song.artist}</p>
      </div>

      {lines.map((line, i) => (
        <div key={i} className="mb-4 min-h-[1.5em] flex flex-wrap">
          {line.content.map((token, j) => (
            <span key={j} className="relative inline-block">
              {token.type === 'chord' ? (
                <span className="absolute -top-6 left-0 text-cyan-300 font-bold whitespace-nowrap bg-black px-1 rounded">
                  {transposeChord(token.value, transpose)}
                </span>
              ) : (
                <span className="text-gray-100">{token.value}</span>
              )}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
