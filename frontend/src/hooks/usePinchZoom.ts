import { useEffect, useRef, RefObject, useState } from 'react';

interface PinchZoomOptions {
  minZoom?: number;
  maxZoom?: number;
  onZoomChange?: (zoom: number) => void;
  enablePan?: boolean;
}

interface TouchData {
  x: number;
  y: number;
  distance?: number;
}

export const usePinchZoom = <T extends HTMLElement>(
  options: PinchZoomOptions = {}
): {
  elementRef: RefObject<T | null>;
  zoom: number;
  resetZoom: () => void;
} => {
  const {
    minZoom = 0.5,
    maxZoom = 3,
    onZoomChange,
    enablePan = true
  } = options;

  const elementRef = useRef<T>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  const lastTouchesRef = useRef<TouchData[]>([]);
  const initialZoomRef = useRef(1);
  const initialPanRef = useRef({ x: 0, y: 0 });

  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    if (onZoomChange) onZoomChange(1);
  };

  const getDistance = (touch1: TouchData, touch2: TouchData): number => {
    const dx = touch1.x - touch2.x;
    const dy = touch1.y - touch2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getCenter = (touch1: TouchData, touch2: TouchData): TouchData => {
    return {
      x: (touch1.x + touch2.x) / 2,
      y: (touch1.y + touch2.y) / 2
    };
  };

  const getTouchData = (e: TouchEvent): TouchData[] => {
    return Array.from(e.touches).map(touch => ({
      x: touch.clientX,
      y: touch.clientY
    }));
  };

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        e.preventDefault();
        lastTouchesRef.current = getTouchData(e);
        initialZoomRef.current = zoom;
        initialPanRef.current = { ...pan };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2 && lastTouchesRef.current.length >= 2) {
        e.preventDefault();
        
        const currentTouches = getTouchData(e);
        const lastTouches = lastTouchesRef.current;

        // ピンチズーム計算
        const currentDistance = getDistance(currentTouches[0], currentTouches[1]);
        const lastDistance = getDistance(lastTouches[0], lastTouches[1]);
        
        if (lastDistance > 0) {
          const scale = currentDistance / lastDistance;
          let newZoom = initialZoomRef.current * scale;
          
          // ズーム制限
          newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
          
          setZoom(newZoom);
          if (onZoomChange) onZoomChange(newZoom);

          // パン計算（有効な場合）
          if (enablePan) {
            const currentCenter = getCenter(currentTouches[0], currentTouches[1]);
            const lastCenter = getCenter(lastTouches[0], lastTouches[1]);
            
            const deltaX = currentCenter.x - lastCenter.x;
            const deltaY = currentCenter.y - lastCenter.y;
            
            setPan(prevPan => ({
              x: initialPanRef.current.x + deltaX,
              y: initialPanRef.current.y + deltaY
            }));
          }
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        lastTouchesRef.current = [];
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        
        const delta = e.deltaY * -0.01;
        let newZoom = zoom + delta;
        newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
        
        setZoom(newZoom);
        if (onZoomChange) onZoomChange(newZoom);
      }
    };

    // イベントリスナー追加
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('wheel', handleWheel);
    };
  }, [zoom, pan, minZoom, maxZoom, onZoomChange, enablePan]);

  // エレメントにトランスフォーム適用
  useEffect(() => {
    const element = elementRef.current;
    if (element) {
      element.style.transform = `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`;
      element.style.transformOrigin = 'center center';
    }
  }, [zoom, pan.x, pan.y]);

  return {
    elementRef,
    zoom,
    resetZoom
  };
};