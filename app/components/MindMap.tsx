'use client';

import React, { useEffect, useRef } from 'react';

interface MindMapProps {
  data: string; 
  onClose?: () => void; 
  isInline?: boolean; 
}

const MindMap: React.FC<MindMapProps> = ({ data, onClose, isInline = false }) => {
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data || !mermaidRef.current) return;

    const loadMermaid = async () => {
      try {
        
        const mermaid = (await import('mermaid')).default;
        
        
        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          mindmap: {
            padding: 20,
            maxNodeWidth: 200,
          },
          fontFamily: 'Kalam, "Comic Sans MS", cursive',
          fontSize: 16,
        });

        
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = '';
          
          
          const diagramId = `mermaid-${Date.now()}`;
          
          
          const diagramWithConfig = `---
config:
  look: handDrawn
  theme: neutral
---
${data}`;
          
          
          const { svg } = await mermaid.render(diagramId, diagramWithConfig);
          
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = svg;
            
            
            const svgElement = mermaidRef.current.querySelector('svg');
            if (svgElement) {
              svgElement.style.filter = 'drop-shadow(2px 4px 8px rgba(0,0,0,0.1))';
            }
          }
        }
      } catch (error) {
        console.error('Error rendering Mermaid diagram:', error);
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = `
            <div class="flex items-center justify-center h-full text-gray-500">
              <div class="text-center">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p class="text-lg font-medium">Could not render mind map</p>
                <p class="text-sm">Please try generating again</p>
              </div>
            </div>
          `;
        }
      }
    };

    loadMermaid();
  }, [data]);

  if (isInline) {
    return (
      <div className="bg-gradient-to-br from-blue-50/80 to-purple-50/80 border border-blue-200 rounded-2xl overflow-hidden shadow-lg animate-fadeIn">
        
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold" style={{fontFamily: '"Kalam", "Comic Sans MS", cursive'}}>
                Mind Map Visualization
              </h3>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        
        <div className="bg-gradient-to-br from-blue-50/50 to-purple-50/50 relative">
          
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236366f1' fill-opacity='0.05'%3E%3Ccircle cx='20' cy='20' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
          
          <div 
            ref={mermaidRef} 
            className="w-full flex items-center justify-center relative z-10 p-6"
            style={{
              fontFamily: '"Kalam", "Comic Sans MS", cursive',
              minHeight: '400px'
            }}
          />
        </div>
      </div>
    );
  }

  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-3xl w-11/12 h-5/6 max-w-6xl max-h-[800px] overflow-hidden shadow-2xl transform animate-scaleIn">
        
        <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 text-white p-6 flex items-center justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400/50 to-red-400/50 animate-pulse"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg transform rotate-3">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-wide" style={{fontFamily: '"Kalam", "Comic Sans MS", cursive'}}>
                Mind Map
              </h2>
              <p className="text-base text-white/90 font-medium">Visualization of your explanation</p>
            </div>
          </div>
          <div className="flex items-center gap-3 relative z-10">
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110 hover:rotate-90 transform rotate-12"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        
        <div className="h-full bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 relative overflow-hidden">
          
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d69e2e' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
          
          <div 
            ref={mermaidRef} 
            className="w-full h-full flex items-center justify-center relative z-10 p-8"
            style={{
              fontFamily: '"Kalam", "Comic Sans MS", cursive',
              minHeight: '500px'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default MindMap; 