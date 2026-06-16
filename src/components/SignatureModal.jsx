import React, { useRef, useState, useEffect } from 'react';
import { Icon } from './Icon';
import { FEATURE_FLAGS } from '../config/features';


export default function SignatureModal({ isOpen, onClose, onSave, defaultName = '', projectId }) {
  const canvasRef = useRef(null);
  const [signerName, setSignerName] = useState(defaultName);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [activeTab, setActiveTab] = useState('draw'); // 'draw' vagy 'qr'

  useEffect(() => {
    if (isOpen) {
      setSignerName(defaultName);
      setHasDrawn(false);
      setActiveTab('draw');
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

  // Premium Apple-style sötét üveg/fényes stílusok a tökéletes összhangért
  const inputStyle = {
    background: 'var(--s1)',
    border: '1px solid var(--b1)',
    borderRadius: '10px',
    padding: '10px 12px',
    color: 'var(--t1)',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
    marginBottom: '16px',
    boxSizing: 'border-box'
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
      background: 'var(--backdrop)', // sötétített, elmosott háttér a téma alapján
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
        background: 'var(--bg)', // VoltDesk téma-azonos háttér
        border: '1px solid var(--b1)',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: 'var(--shadow-strong)',
        position: 'relative',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)'
      }}>
        {/* Bezárás gomb a sarokban */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'none',
            border: 'none',
            color: 'var(--t3)',
            cursor: 'pointer',
            padding: '4px',
            transition: 'color 0.15s ease'
          }}
        >
          <Icon name="close" size={16} strokeWidth={2.5} />
        </button>

        <h3 style={{
          fontSize: '18px',
          fontWeight: '800',
          color: 'var(--t1)', // Világos betűk
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

        {/* Tab választó (csak ha a kliens QR aláírás modul be van kapcsolva) */}
        {FEATURE_FLAGS.CLIENT_SIGNATURE && (
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--b1)',
            borderRadius: '10px',
            padding: '2px',
            marginBottom: '18px'
          }}>
            <button
              onClick={() => setActiveTab('draw')}
              style={{
                flex: 1,
                background: activeTab === 'draw' ? 'var(--s1)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                padding: '8px',
                color: activeTab === 'draw' ? 'var(--t1)' : 'var(--t3)',
                fontSize: '11px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                boxShadow: activeTab === 'draw' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Aláírás itt
            </button>
            <button
              onClick={() => setActiveTab('qr')}
              style={{
                flex: 1,
                background: activeTab === 'qr' ? 'var(--s1)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                padding: '8px',
                color: activeTab === 'qr' ? 'var(--t1)' : 'var(--t3)',
                fontSize: '11px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                boxShadow: activeTab === 'qr' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              QR kód átadás
            </button>
          </div>
        )}

        {activeTab === 'draw' || !FEATURE_FLAGS.CLIENT_SIGNATURE ? (
          <>
            {/* Név mező */}
            <div>
              <label style={labelStyle}>Átvevő / Aláíró neve</label>
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
                border: '1.5px dashed var(--b1)',
                background: '#ffffff', // Tiszta fehér háttér a rajzhoz
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
                    touchAction: 'none'
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
                  borderRadius: '10px',
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
                  borderRadius: '10px',
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
          </>
        ) : (
          /* QR Code Tab view */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: 'var(--t3)', lineHeight: '1.4', marginBottom: '14px' }}>
              Mutasd meg ezt a QR-kódot a megrendelőnek. Ha beolvassa a saját telefonjával, azonnal aláírhatja a munkalapot a saját kijelzőjén.
            </p>
            
            {/* QR Code képkeret */}
            <div style={{
              background: '#ffffff', // Fehér háttér a QR-kód jobb olvashatóságáért
              padding: '12px',
              borderRadius: '16px',
              border: '1px solid var(--b1)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=10&data=${encodeURIComponent(
                  `${window.location.origin}/sign/${projectId}`
                )}`}
                alt="Aláírás QR Kód"
                style={{ width: '180px', height: '180px', display: 'block' }}
              />
            </div>

            {/* Link másolás */}
            <button
              onClick={() => {
                const link = `${window.location.origin}/sign/${projectId}`;
                navigator.clipboard.writeText(link)
                  .then(() => alert('Aláírási link másolva a vágólapra!'))
                  .catch(() => alert('Sikertelen másolás, a link: ' + link));
              }}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--b1)',
                borderRadius: '10px',
                padding: '10px 12px',
                color: 'var(--t2)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Aláírási link másolása
            </button>

            {/* Realtime státusz */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '10px',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--blue)',
              background: 'rgba(79, 142, 247, 0.1)',
              padding: '6px 12px',
              borderRadius: '20px',
              border: '1px solid rgba(79, 142, 247, 0.25)',
              margin: '0 auto'
            }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb] animate-pulse" style={{ display: 'inline-block', width: '6px', height: '6px', background: 'var(--blue)' }}></span>
              <span>Várakozás az aláírásra...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

