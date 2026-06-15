import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ClientFeedback() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadProjectAndCheckReview() {
      try {
        setLoading(true);
        setError(null);

        // 1. Ellenőrizzük, hogy létezik-e már értékelés ehhez a projekthez
        const { data: existingReview } = await supabase
          .from('reviews')
          .select('id')
          .eq('project_id', id)
          .maybeSingle();

        if (existingReview) {
          setAlreadyReviewed(true);
          setLoading(false);
          return;
        }

        // 2. Lekérjük a projekt alap adatait
        const { data: projectData, error: projectErr } = await supabase
          .from('projects')
          .select('id, name, address, client_name, serial_number, tasks, completed_tasks')
          .eq('id', id)
          .single();

        if (projectErr || !projectData) {
          throw new Error('A projekt nem található vagy a link érvénytelen.');
        }

        setProject(projectData);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadProjectAndCheckReview();
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      alert('Kérlek, válassz ki legalább egy csillagot az értékeléshez!');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const { error: insertErr } = await supabase
        .from('reviews')
        .insert({
          project_id: id,
          rating,
          comment: comment.trim() || null
        });

      if (insertErr) {
        throw insertErr;
      }

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError('Sikertelen beküldés: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh',
        background: '#07090f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--t3)'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: '3px solid var(--blue)',
          borderTopColor: 'transparent',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // Megosztott stílusok a kártyához (Apple Glassmorphism)
  const cardStyle = {
    width: '100%',
    maxWidth: '460px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    padding: '36px 28px',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
    position: 'relative',
    zIndex: 1,
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#07090f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative',
      overflow: 'hidden',
      color: '#fff'
    }}>
      {/* Háttér fények */}
      <div style={{
        position: 'absolute', top: '-10%', left: '30%', width: '300px', height: '300px',
        borderRadius: '50%', background: 'rgba(79, 142, 247, 0.12)', filter: 'blur(80px)', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', right: '30%', width: '300px', height: '300px',
        borderRadius: '50%', background: 'rgba(46, 209, 88, 0.08)', filter: 'blur(80px)', pointerEvents: 'none'
      }} />

      <div style={cardStyle}>
        {/* Felső vékony kiemelő vonal */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
          borderRadius: '24px 24px 0 0',
        }} />

        {error && !project && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255, 59, 48, 0.1)',
              border: '1px solid rgba(255, 59, 48, 0.2)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 20px'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'var(--red)' }}>Hiba történt</h3>
            <p style={{ fontSize: '13px', color: 'var(--t3)', lineHeight: '1.5' }}>{error}</p>
          </div>
        )}

        {alreadyReviewed && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(46, 209, 88, 0.1)',
              border: '1px solid rgba(46, 209, 88, 0.2)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 20px'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h3 style={{ fontSize: '19px', fontWeight: '700', marginBottom: '8px' }}>Köszönjük szépen!</h3>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5' }}>
              Ehhez a munkalaphoz korábban már sikeresen elküldte a visszajelzését.
            </p>
          </div>
        )}

        {submitted && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(46, 209, 88, 0.15)',
              border: '1px solid rgba(46, 209, 88, 0.25)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 0 15px rgba(46, 209, 88, 0.2)'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Értékelés elküldve!</h3>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5', marginBottom: '10px' }}>
              Köszönjük, hogy időt szánt a visszajelzésre. Véleménye segít szolgáltatásunk fejlesztésében.
            </p>
            <span style={{ fontSize: '12px', color: 'var(--t3)', fontStyle: 'italic' }}>VoltDesk munkalap lezárva</span>
          </div>
        )}

        {!alreadyReviewed && !submitted && project && (
          <form onSubmit={handleSubmit}>
            {/* Cég logo / arculat */}
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(79,142,247,0.1)',
                border: '1px solid rgba(79,142,247,0.2)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 14px'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2.5">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '5px' }}>VoltDesk ügyfélértékelés</h3>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Munkalap száma: {project.serial_number || 'PRJ-N/A'}
              </p>
            </div>

            {/* Projekt adatok áttekintése */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '14px',
              padding: '14px 16px',
              marginBottom: '24px',
              fontSize: '12px',
              lineHeight: '1.5'
            }}>
              <div style={{ marginBottom: '6px' }}><span style={{ color: 'rgba(255,255,255,0.5)' }}>Projekt neve:</span> <strong style={{ color: '#fff' }}>{project.name}</strong></div>
              <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>Helyszín:</span> <span style={{ color: '#fff' }}>{project.address}</span></div>
            </div>

            {/* Csillagos értékelés */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <label style={{
                display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', marginBottom: '12px'
              }}>
                Hogyan értékelné a munkánkat?
              </label>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map((index) => {
                  const isFilled = index <= (hoverRating || rating);
                  return (
                    <button
                      key={index}
                      type="button"
                      onMouseEnter={() => setHoverRating(index)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        outline: 'none',
                        transition: 'transform 0.1s ease',
                      }}
                      className="hover:scale-125"
                    >
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill={isFilled ? 'var(--yellow)' : 'none'}
                        stroke={isFilled ? 'var(--yellow)' : 'rgba(255,255,255,0.3)'}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          filter: isFilled ? 'drop-shadow(0 0 6px rgba(255, 214, 10, 0.4))' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Szöveges megjegyzés */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', marginBottom: '8px'
              }}>
                Részletes vélemény (Opcionális)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Írja le tapasztalatait, észrevételeit..."
                rows="4"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  color: '#fff',
                  fontSize: '13px',
                  width: '100%',
                  outline: 'none',
                  fontFamily: 'inherit',
                  resize: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {error && (
              <div style={{
                color: 'var(--red)', fontSize: '12px', textAlign: 'center', marginBottom: '16px',
                background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.15)',
                borderRadius: '8px', padding: '8px'
              }}>
                {error}
              </div>
            )}

            {/* Küldés gomb */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: submitting ? 'rgba(79,142,247,0.45)' : 'var(--gradient-blue)',
                border: 'none',
                borderRadius: 'var(--btn-r)',
                padding: '14px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '700',
                cursor: submitting ? 'default' : 'pointer',
                width: '100%',
                boxShadow: submitting ? 'none' : '0 6px 20px rgba(79,142,247,0.3)',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {submitting ? 'Beküldés...' : 'Visszajelzés elküldése'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
