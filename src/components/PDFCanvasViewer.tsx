/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';

const PDF_JS_VERSION = '3.11.174';

interface PDFCanvasViewerProps {
  url: string;
  scrollPosition: number;
  onScroll: (percentage: number) => void;
  role: 'leader' | 'band';
}

export default function PDFCanvasViewer({ url, scrollPosition, onScroll, role }: PDFCanvasViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let isMounted = true;
    let loadingTask: any = null;

    const loadPdf = async () => {
      if (!url) return;
      setLoading(true);
      setError(null);
      setProgress(0);
      
      try {
        const pdfjs = await import('pdfjs-dist');
        const workerUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.js`;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

        await new Promise(resolve => setTimeout(resolve, 100));
        if (!isMounted) return;

        loadingTask = pdfjs.getDocument({
          url: url,
          cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/cmaps/`,
          cMapPacked: true,
          disableAutoFetch: true,
          disableStream: true,
          isEvalSupported: false
        });

        loadingTask.onProgress = (data: { loaded: number; total: number }) => {
          if (isMounted && data.total > 0) {
            setProgress(Math.round((data.loaded / data.total) * 100));
          }
        };

        const pdf = await loadingTask.promise;
        if (!isMounted) return;

        if (canvasContainerRef.current) {
          canvasContainerRef.current.innerHTML = '';
          const totalPages = pdf.numPages;
          
          for (let i = 1; i <= totalPages; i++) {
            if (!isMounted) break;
            
            try {
              const page = await pdf.getPage(i);
              const viewport = page.getViewport({ scale: 2.0 });
              
              const canvas = document.createElement('canvas');
              canvas.className = "w-full max-w-4xl mb-6 shadow-2xl rounded-sm bg-white block mx-auto transition-opacity duration-700 opacity-0";
              const context = canvas.getContext('2d');
              canvas.height = viewport.height;
              canvas.width = viewport.width;

              if (context) {
                await page.render({ canvasContext: context, viewport }).promise;
                if (isMounted && canvasContainerRef.current) {
                  canvasContainerRef.current.appendChild(canvas);
                  setTimeout(() => { 
                    if (canvas) canvas.classList.remove('opacity-0'); 
                  }, 100);
                }
              }
            } catch (pageErr) {
              console.warn(`Error on page ${i}:`, pageErr);
            }
          }
        }
      } catch (err: any) {
        console.error("Critical PDF error:", err);
        if (isMounted) {
          setError("O navegador bloqueou o carregamento interno do PDF. Use o botão acima para abrir em nova aba.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadPdf();

    return () => { 
      isMounted = false; 
      if (loadingTask && loadingTask.destroy) {
        loadingTask.destroy();
      }
    };
  }, [url]);

  useEffect(() => {
    if (role === 'band' && scrollRef.current) {
      const container = scrollRef.current;
      const target = (container.scrollHeight - container.clientHeight) * (scrollPosition / 100);
      container.scrollTo({ top: target, behavior: 'smooth' });
    }
  }, [scrollPosition, role]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (role === 'leader') {
      const container = e.currentTarget;
      const totalScrollable = container.scrollHeight - container.clientHeight;
      if (totalScrollable <= 0) return;
      
      const percentage = (container.scrollTop / totalScrollable) * 100;
      onScroll(isNaN(percentage) ? 0 : percentage);
    }
  };

  return (
    <div 
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto custom-scrollbar bg-gray-950 p-4 scroll-smooth relative"
    >
      <div ref={canvasContainerRef} className="w-full flex flex-col items-center" />
      
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-cyan-400 bg-gray-950/80 z-20">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-800 rounded-full" />
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin absolute inset-0" />
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono">
              {progress > 0 ? `${progress}%` : ''}
            </div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Processando Partitura</p>
        </div>
      )}

      {error && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 gap-6 z-10 bg-gray-950">
          <div className="p-4 bg-red-500/10 rounded-full">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-2">
            <p className="text-red-400 text-xs font-bold uppercase tracking-widest">{error}</p>
          </div>
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg transition-all"
          >
            Abrir em Nova Aba
          </a>
        </div>
      )}
    </div>
  );
}
