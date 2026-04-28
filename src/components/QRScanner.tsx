/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (text: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scannerRef.current.render((decodedText) => {
      onScan(decodedText);
      scannerRef.current?.clear();
    }, (error) => {
      // Quietly handle scan errors
    });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error("Scanner clear error", e));
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-gray-900 rounded-3xl overflow-hidden border border-gray-800 shadow-2xl">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
          <h3 className="font-bold text-sm uppercase tracking-widest text-cyan-400">Scan Band Code</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-500">Close</button>
        </div>
        <div id="qr-reader" className="w-full"></div>
        <div className="p-8 text-center text-xs text-gray-500 font-medium">
          Position the leader's QR code within the square
        </div>
      </div>
    </div>
  );
}
