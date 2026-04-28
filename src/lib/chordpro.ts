/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ChordProLine {
  type: 'text' | 'metadata' | 'chorus' | 'verse';
  content: ChordProToken[];
}

export interface ChordProToken {
  type: 'text' | 'chord';
  value: string;
}

const CHORD_REGEX = /\[(.*?)\]/g;

export function parseChordPro(content: string): ChordProLine[] {
  const lines = content.split('\n');
  return lines.map(line => {
    const tokens: ChordProToken[] = [];
    let lastIndex = 0;
    let match;

    while ((match = CHORD_REGEX.exec(line)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({
          type: 'text',
          value: line.substring(lastIndex, match.index)
        });
      }
      tokens.push({
        type: 'chord',
        value: match[1]
      });
      lastIndex = CHORD_REGEX.lastIndex;
    }

    if (lastIndex < line.length) {
      tokens.push({
        type: 'text',
        value: line.substring(lastIndex)
      });
    }

    return {
      type: 'text', // Simple implementation for now
      content: tokens
    };
  });
}

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const KEYS_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export function transposeChord(chord: string, semitones: number): string {
  return chord.replace(/[A-G][#b]?/g, (match) => {
    let index = KEYS.indexOf(match);
    if (index === -1) index = KEYS_FLAT.indexOf(match);
    if (index === -1) return match;

    const newIndex = (index + semitones + 12) % 12;
    return KEYS[newIndex];
  });
}
