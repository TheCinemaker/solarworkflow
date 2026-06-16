import React, { useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ClientSign() {
  const { id } = useParams();
  const canvasRef = useRef(null);
  const [projectName, setProjectName] = useState('Betöltés...');
  const [signerName, setSignerName] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchProject() {
      try {
        const { data, error: fetchErr } = await supabase
          .rpc('get_project_name_public', { proj_id: id });
        
        if (fetchErr) throw fetchErr;
        if (data) {
          setProjectName(data);
        } else {
          setProjectName('Ismeretlen projekt');
        }
      } catch (err) {
        console.error('Hiba a projekt lekérésekor:', err);
        setError('A munkalap betöltése sikertelen. Lehet, hogy nem megfelelő a link.');
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [id]);

  const getCanvasContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.strokeStyle = '#111827'; // sötétszürke toll
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!signerName.trim()) {
      alert('Kérlek, add meg a neved!');
      return;
    }
    if (!hasDrawn) {
      alert('Kérlek, rajzold le az aláírásod a rajzfelületen!');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setSubmitting(true);
    try {
      const signatureData = canvas.toDataURL('image/png');
      
      const { error: submitErr } = await supabase.rpc('submit_client_signature', {
        proj_id: id,
        sig: signatureData,
        sig_name: signerName.trim()
      });

      if (submitErr) throw submitErr;
      setSuccess(true);
    } catch (err) {
      console.error('Hiba az aláírás mentésekor:', err);
      alert('Sikertelen aláírás: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#475569]" style={{ background: '#f8fafc' }}>
        Munkalap betöltése...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center" style={{ background: '#f8fafc' }}>
        <div style={{ background: '#ffffff', border: '1px solid #fee2e2', borderRadius: '20px', padding: '24px', maxWidth: '400px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
          <div className="text-red-500 font-extrabold text-3xl mb-3">⚠️</div>
          <div className="text-sm font-bold text-[#991b1b]">{error}</div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center" style={{ background: '#f8fafc' }}>
        <div style={{ background: '#ffffff', border: '1px solid #dcfce7', borderRadius: '20px', padding: '32px', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)' }}>
          <div className="text-emerald-500 font-black text-4xl mb-4">✓</div>
          <h2 className="text-lg font-black text-[#166534] tracking-tight mb-2">Aláírás sikeresen rögzítve!</h2>
          <p className="text-xs text-[#374151] font-medium leading-relaxed">
            Köszönjük a közreműködést. Az aláírás rögzítésre került a munkalapon. Ezt a böngészőlapot most már bezárhatod.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f8fafc' }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '800',
          color: '#0f172a',
          marginBottom: '6px',
          letterSpacing: '-0.3px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          Munkalap digitális aláírása
        </h3>
        
        <p style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px' }}>
          Projekt: <span style={{ color: '#2563eb' }}>{projectName}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Név mező */}
          <div>
            <label style={{
              display: 'block',
              color: '#475569',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '6px'
            }}>Megrendelő / Átvevő neve</label>
            <input
              type="text"
              required
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Pl. Kovács János"
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '10px 12px',
                color: '#0f172a',
                fontSize: '13px',
                width: '100%',
                outline: 'none',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease'
              }}
            />
          </div>

          {/* Canvas Rajzfelület */}
          <div>
            <label style={{
              display: 'block',
              color: '#475569',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '6px'
            }}>Aláírás rajzolása</label>
            <div style={{
              position: 'relative',
              borderRadius: '12px',
              border: '1.5px dashed #cbd5e1',
              background: '#f8fafc',
              overflow: 'hidden',
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
          <div style={{ display: 'flex', gap: '10px', paddingTop: '8px' }}>
            <button
              type="button"
              onClick={clearCanvas}
              style={{
                flex: 1,
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '11px',
                color: '#475569',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Törlés
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 2,
                background: submitting ? 'rgba(59, 130, 246, 0.5)' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                border: 'none',
                borderRadius: '10px',
                padding: '11px',
                color: '#fff',
                fontSize: '13px',
                fontWeight: '700',
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: submitting ? 'none' : '0 4px 10px rgba(59, 130, 246, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              {submitting ? 'Mentés...' : 'Aláírás elküldése'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

