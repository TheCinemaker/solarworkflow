import React, { useRef, useState, useEffect } from 'react';
import { Icon } from './Icon';

export default function SignatureModal({ isOpen, onClose, onSave, defaultName = '' }) {
  const canvasRef = useRef(null);
  const [signerName, setSignerName] = useState(defaultName);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSignerName(defaultName);
      setHasDrawn(false);
      // Tisztítás megnyitáskor (rövid késleltetéssel, hogy a DOM felépüljön)
      setTimeout(() => {
        clearCanvas();
      }, 50);
    }
  }, [isOpen, defaultName]);

  if (!isOpen) return null;

  const getCanvasContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.strokeStyle = '#111827'; // sötétszürke toll a fehér háttéren
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    return ctx;
  };

  const getCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Koordináta leképezés a reszponzív mérethez
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const ctx = getCanvasContext();
    if (!ctx) return;

    const coords = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = getCanvasContext();
    if (!ctx) return;

    const coords = getCoords(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    if (!signerName.trim()) {
      alert('Kérlek, add meg az aláíró nevét!');
      return;
    }
    if (!hasDrawn) {
      alert('Kérlek, írd alá a kijelölt felületet!');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Konvertálás base64 formátumba (PNG)
    const signatureData = canvas.toDataURL('image/png');
    onSave({
      signatureData,
      signerName: signerName.trim(),
      date: new Date().toISOString()
    });
  };

  // Modern Apple glassmorphic form stílusok
  const inputStyle = {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid var(--b1)',
    borderRadius: '10px',
    padding: '9px 12px',
    color: 'var(--t1)',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s ease',
    marginBottom: '16px'
  };

  const labelStyle = {
    display: 'block',
    color: 'var(--t3)',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '6px'
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(7, 9, 15, 0.82)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 1000
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'var(--s1)',
        border: '1px solid var(--b1)',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: 'var(--shadow-strong)',
        position: 'relative'
      }}>
        {/* Bezárás gomb a sarokban */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--t3)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <Icon name="close" size={16} strokeWidth={2.5} />
        </button>

        <h3 style={{
          fontSize: '18px',
          fontWeight: '700',
          color: 'var(--t1)',
          marginBottom: '18px',
          letterSpacing: '-0.3px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          Munkalap digitális aláírása
        </h3>

        {/* Név mező */}
        <div>
          <label style={labelStyle}>Átvevö / Aláíró neve</label>
          <input
            type="text"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Pl. Kovács János"
            style={inputStyle}
          />
        </div>

        {/* Canvas Rajzfelület */}
        <div>
          <label style={labelStyle}>Aláírás rajzolása</label>
          <div style={{
            position: 'relative',
            borderRadius: '12px',
            border: '1.5px dashed rgba(255, 255, 255, 0.15)',
            background: '#ffffff',
            overflow: 'hidden',
            marginBottom: '20px',
            height: '200px'
          }}>
            <canvas
              ref={canvasRef}
              width={400}
              height={200}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                cursor: 'crosshair',
                touchAction: 'none' // megakadályozza a mobil görgetést rajzolás közben
              }}
            />
          </div>
        </div>

        {/* Műveleti gombok */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={clearCanvas}
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--b1)',
              borderRadius: 'var(--btn-r)',
              padding: '11px',
              color: 'var(--t2)',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Törlés
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 2,
              background: 'var(--gradient-blue)',
              border: 'none',
              borderRadius: 'var(--btn-r)',
              padding: '11px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(79, 142, 247, 0.3)',
              transition: 'all 0.15s ease'
            }}
          >
            Aláírás mentése
          </button>
        </div>
      </div>
    </div>
  );
}
