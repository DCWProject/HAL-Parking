import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls } from 'framer-motion';
import { Minimize2, Info, Copy, GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FloatingLogConsole = ({ device, logs, onClose }) => {
  const [size, setSize] = useState({ width: 500, height: 400 });
  const [showInfo, setShowInfo] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  // Local buffer for "Frozen" view
  const [displayedLogs, setDisplayedLogs] = useState(logs);
  
  const logEndRef = useRef(null);
  const containerRef = useRef(null);
  const isAtBottomRef = useRef(true); // Default to locked at bottom
  const dragControls = useDragControls();

  // Sync logs ONLY if we are at bottom
  useEffect(() => {
    if (isAtBottomRef.current) {
        setDisplayedLogs(logs);
        // Defer scroll to ensure render happens first
        setTimeout(() => {
            if (logEndRef.current) {
                logEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }, 0);
    }
  }, [logs]);

  // Track scroll position
  const handleScroll = (e) => {
      const { scrollTop, scrollHeight, clientHeight } = e.target;
      // Allow a small buffer (e.g., 20px) 
      const isBottom = scrollHeight - scrollTop - clientHeight < 20;
      
      if (isBottom) {
          isAtBottomRef.current = true;
          // If we just hit bottom, catch up to latest logs immediately
          if (displayedLogs.length !== logs.length) {
              setDisplayedLogs(logs);
          }
      } else {
          isAtBottomRef.current = false;
      }
  };

  // Copy Logs
  const handleCopy = () => {
      const text = logs.join('\n'); // Copy ALL true logs, not just displayed
      navigator.clipboard.writeText(text);
  };

  // Resize logic
  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      setSize(prev => ({
        width: Math.max(300, prev.width + e.movementX),
        height: Math.max(200, prev.height + e.movementY)
      }));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Use Portal to render outside the current DOM hierarchy (avoids clipping/z-index issues)
  return createPortal(
    <motion.div
        drag
        dragListener={false} // Disable dragging by default on the body
        dragControls={dragControls} // Enable dragging via controls (header)
        dragMomentum={false}
        initial={{ x: window.innerWidth / 2 - 250, y: 100 }} // Start centered-ish
        className="fixed top-0 left-0 bg-card border border-border shadow-2xl rounded-xl flex flex-col overflow-hidden backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95"
        // Force high z-index
        style={{ width: size.width, height: size.height, zIndex: 9999 }}
    >
        {/* Header - Draggable Area */}
        <div 
            className="flex items-center justify-between p-2 bg-muted/50 border-b border-border cursor-move select-none" 
            onPointerDown={(e) => dragControls.start(e)}
        >
            <div className="flex items-center gap-2">
                <GripHorizontal className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Console: {device.device_uid}</span>
                {!isAtBottomRef.current && logs.length > displayedLogs.length && (
                    <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">
                        {logs.length - displayedLogs.length} new
                    </span>
                )}
            </div>
            <div className="flex items-center gap-1" onPointerDownCapture={(e) => e.stopPropagation()}>
                 <Button 
                    variant={showInfo ? "secondary" : "ghost"} 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={() => setShowInfo(!showInfo)}
                    title="Toggle Device Info"
                >
                    <Info className="h-3 w-3" />
                </Button>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 hover:bg-muted" 
                    onClick={handleCopy}
                    title="Copy Logs"
                >
                    <Copy className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/20 hover:text-destructive" onClick={onClose}>
                    <Minimize2 className="h-3 w-3" />
                </Button>
            </div>
        </div>

        {/* Device Info Panel */}
        {showInfo && (
            <div className="p-3 bg-muted/20 border-b border-border text-xs grid grid-cols-2 gap-2">
                <div>
                    <span className="text-muted-foreground block">IP Address</span>
                    <span className="font-mono">{device.ip_address}</span>
                </div>
                 <div>
                    <span className="text-muted-foreground block">Mac Address</span>
                    <span className="font-mono">{device.mac_address || 'N/A'}</span>
                </div>
                 <div>
                    <span className="text-muted-foreground block">Status</span>
                    <span className={`font-bold ${device.is_online ? 'text-green-500' : 'text-red-500'}`}>
                        {device.is_online ? 'ONLINE' : 'OFFLINE'}
                    </span>
                </div>
                 <div>
                    <span className="text-muted-foreground block">Last Seen</span>
                     <span>{device.last_seen ? new Date(device.last_seen).toLocaleTimeString() : 'Never'}</span>
                </div>
            </div>
        )}

        {/* Console Content */}
        <div 
            ref={containerRef} 
            onScroll={handleScroll}
            className="flex-1 bg-black p-3 font-mono text-xs overflow-y-auto text-green-400 custom-scrollbar relative"
        >
             {displayedLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-600 italic">
                    <span>Waiting for logs...</span>
                </div>
            ) : (
                <>
                {displayedLogs.map((log, i) => (
                    <div key={i} className="whitespace-pre-wrap break-all border-b border-green-900/30 pb-0.5 mb-0.5 last:border-0 hover:bg-green-900/10">
                        {log}
                    </div>
                ))}
                <div ref={logEndRef} />
                </>
            )}
            
            {/* Scroll to Bottom Button (only if frozen) */}
            {!isAtBottomRef.current && (
                <button 
                    className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg transition-transform hover:scale-110"
                    onClick={() => {
                        isAtBottomRef.current = true;
                        setDisplayedLogs(logs);
                        // Trigger scroll in next tick
                        setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
                    }}
                >
                    <Minimize2 className="h-4 w-4 rotate-180" />
                </button>
            )}
        </div>

        {/* Resize Handle */}
        <div 
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-center justify-center z-10"
            onMouseDown={handleMouseDown}
        >
            <div className="w-0 h-0 border-l-[10px] border-l-transparent border-b-[10px] border-b-muted-foreground/50 border-r-0 rotate-0 translate-x-[2px] translate-y-[-2px]">
            </div>
             <svg width="10" height="10" viewBox="0 0 10 10" className="absolute bottom-1 right-1 opacity-50">
                 <path d="M6 10 L10 10 L10 6 Z" fill="currentColor" />
                 <path d="M2 10 L4 10 L10 4 L10 2 Z" fill="currentColor" />
             </svg>
        </div>
    </motion.div>,
    document.body
  );
};

export default FloatingLogConsole;
