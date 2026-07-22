import { useRef, useState, useEffect, useCallback } from 'react';
import { STREAM } from '../config';

const WS_BASE = STREAM.WS;

const connections = new Map();

function getWsUrl(cameraId) {
  return `${WS_BASE}/video_feed?camera_id=${cameraId}`;
}

function ensureConnection(cameraId, onFrame, setIsOffline) {
  let conn = connections.get(cameraId);
  if (conn && conn.ws && (conn.ws.readyState === WebSocket.OPEN || conn.ws.readyState === WebSocket.CONNECTING)) {
    return conn;
  }

  if (conn && conn.ws) {
    try { conn.ws.close(); } catch {}
  }

  const ws = new WebSocket(getWsUrl(cameraId));
  ws.binaryType = 'blob';

  conn = { ws, listeners: new Set() };
  connections.set(cameraId, conn);

  ws.onopen = () => setIsOffline(false);

  ws.onmessage = (event) => {
    for (const cb of conn.listeners) {
      cb(event.data);
    }
  };

  ws.onerror = () => setIsOffline(true);

  ws.onclose = () => {
    setIsOffline(true);
    if (conn.listeners.size > 0) {
      setTimeout(() => {
        ensureConnection(cameraId, onFrame, setIsOffline);
      }, 1000);
    }
  };

  return conn;
}

export function useCameraStream(cameraId, externalRef) {
  const internalRef = useRef(null);
  const canvasRef = externalRef || internalRef;
  const [isOffline, setIsOffline] = useState(true);
  const latestFrameRef = useRef(null);
  const hasNewFrameRef = useRef(false);
  const rafRef = useRef(null);

  const renderFrame = useCallback(() => {
    if (hasNewFrameRef.current && latestFrameRef.current) {
      const blob = latestFrameRef.current;
      hasNewFrameRef.current = false;
      const canvas = canvasRef.current;
      if (canvas) {
        createImageBitmap(blob).then(bitmap => {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
              canvas.width = bitmap.width;
              canvas.height = bitmap.height;
            }
            ctx.drawImage(bitmap, 0, 0);
          }
          bitmap.close();
        }).catch(() => {});
      }
    }
    rafRef.current = requestAnimationFrame(renderFrame);
  }, [canvasRef]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(renderFrame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [renderFrame]);

  useEffect(() => {
    if (!cameraId) return;

    const onFrame = (blob) => {
      latestFrameRef.current = blob;
      hasNewFrameRef.current = true;
    };

    const conn = ensureConnection(cameraId, onFrame, setIsOffline);
    conn.listeners.add(onFrame);

    if (conn.ws && conn.ws.readyState === WebSocket.OPEN) {
      setIsOffline(false);
    }

    return () => {
      conn.listeners.delete(onFrame);
    };
  }, [cameraId]);

  const retry = useCallback(() => {
    if (!cameraId) return;
    const conn = connections.get(cameraId);
    if (conn && conn.ws) {
      try { conn.ws.close(); } catch {}
    }
  }, [cameraId]);

  return { canvasRef, isOffline, retry };
}
