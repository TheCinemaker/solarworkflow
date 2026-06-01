import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Info() {
  const navigate = useNavigate();
  const developerEmail = "avar.szilveszter@gmail.com";

  return (
    <div className="page active" id="p-info" style={{ padding: 'calc(20px + env(safe-area-inset-top)) 15px 40px' }}>
      {/* Fejléc */}
      <div className="flex justify-between items-center mb-6 fu">
        <div>
          <div className="pg-greet">RENDSZERINFORMÁCIÓ</div>
          <div className="pg-title">Névjegy & Info</div>
        </div>
        <div 
          className="hdr-btn" 
          onClick={() => navigate('/')} 
          title="Vissza a Főoldalra"
          style={{ padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </div>
      </div>

      {/* Fő Névjegy Kártya */}
      <div className="dhero fu d1" style={{ marginBottom: '20px', padding: '24px 20px', textAlign: 'center' }}>
        <div style={{
          width: '74px',
          height: '74px',
          borderRadius: '22px',
          background: 'rgba(7, 9, 15, 0.6)',
          border: '1.5px solid rgba(79, 142, 247, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 10px 30px rgba(79, 142, 247, 0.25)',
          animation: 'pulse 2.5s infinite ease-in-out'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="url(#saLogoGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="saLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4f8ef7" />
                <stop offset="100%" stopColor="#2ed158" />
              </linearGradient>
            </defs>
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        
        <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--t1)', letterSpacing: '-0.8px', marginBottom: '4px' }}>
          SA software
        </div>
        <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--blue)', marginBottom: '14px' }}>
          & Network Solutions
        </div>
        
        <p style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: '1.6', maxWidth: '300px', margin: '0 auto' }}>
          Egyedi szoftverfejlesztés, felhő-infrastruktúrák tervezése és prémium IT hálózati megoldások az Ön vállalkozására szabva.
        </p>
      </div>

      {/* Szolgáltatások (Marketing) Kártyák */}
      <div className="shdr fu d2" style={{ marginTop: '10px' }}>
        <div className="shdr-t">SZOLGÁLTATÁSAINK</div>
      </div>

      <div className="space-y-3 fu d2">
        {/* 1. kártya */}
        <div className="gcard flex items-start space-x-3.5" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', padding: '16px' }}>
          <div style={{ marginTop: '2px', flexShrink: 0 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f8ef7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px rgba(79, 142, 247, 0.45))' }}>
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--t1)', marginBottom: '3px' }}>Egyedi Web & Mobilalkalmazások</div>
            <div style={{ fontSize: '12px', color: 'var(--t3)', lineHeight: '1.5' }}>
              Gyors, modern és reszponzív rendszerek (mint a VoltDesk), melyek egyszerűsítik a napi munkát és növelik a hatékonyságot.
            </div>
          </div>
        </div>

        {/* 2. kártya */}
        <div className="gcard flex items-start space-x-3.5" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', padding: '16px' }}>
          <div style={{ marginTop: '2px', flexShrink: 0 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2ed158" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px rgba(46, 209, 88, 0.45))' }}>
              <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
              <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--t1)', marginBottom: '3px' }}>Felhő & Adatbázis Integráció</div>
            <div style={{ fontSize: '12px', color: 'var(--t3)', lineHeight: '1.5' }}>
              Biztonságos Supabase és PostgreSQL alapú adatbázisok, valós idejű szinkronizációval és automatikus mentéssel.
            </div>
          </div>
        </div>

        {/* 3. kártya */}
        <div className="gcard flex items-start space-x-3.5" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', padding: '16px' }}>
          <div style={{ marginTop: '2px', flexShrink: 0 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fcaf17" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px rgba(252, 175, 23, 0.45))' }}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--t1)', marginBottom: '3px' }}>IT Hálózatok & Felügyelet</div>
            <div style={{ fontSize: '12px', color: 'var(--t3)', lineHeight: '1.5' }}>
              Nagy megbízhatóságú vállalati hálózatok tervezése, VPN távoli elérés kiépítése és folyamatos rendszerfelügyelet.
            </div>
          </div>
        </div>
      </div>

      {/* Kapcsolati Zóna */}
      <div className="shdr fu d3" style={{ marginTop: '20px' }}>
        <div className="shdr-t">KAPCSOLAT & AJÁNLATKÉRÉS</div>
      </div>

      <div className="gcard fu d3 text-center space-y-4" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', padding: '20px' }}>
        <div style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: '1.5' }}>
          Szeretne hasonló prémium szoftvert, vagy optimalizálná cége informatikai infrastruktúráját? Vegye fel velünk a kapcsolatot!
        </div>
        
        <div className="flex flex-col space-y-3 pt-1">
          <a 
            href={`mailto:${developerEmail}?subject=Ajánlatkérés - SA software`}
            className="w-full flex items-center justify-center space-x-2 font-bold transition-all hover:scale-[1.02] active:scale-98"
            style={{
              background: 'linear-gradient(135deg, #4f8ef7, #2c72e0)',
              border: 'none',
              borderRadius: 'var(--btn-r)',
              padding: '12px 16px',
              color: '#fff',
              fontSize: '13px',
              textDecoration: 'none',
              boxShadow: '0 8px 25px rgba(79, 142, 247, 0.35)'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            <span>Írjon nekünk e-mailt</span>
          </a>

          <a 
            href={`mailto:${developerEmail}`}
            style={{
              fontSize: '11px',
              color: 'var(--t3)',
              textDecoration: 'underline',
              fontWeight: '600'
            }}
          >
            {developerEmail}
          </a>
        </div>
      </div>

      {/* Belső stílus a pulzáláshoz */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.03); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
