import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function ProjectDetails() {
  const navigate = useNavigate();

  useEffect(() => {
    // Re-trigger animation
    const timeout = setTimeout(() => {
      document.querySelectorAll('.pfill').forEach(b => {
        const w = b.style.width;
        b.style.width = '0';
        requestAnimationFrame(() => requestAnimationFrame(() => {
          b.style.width = w;
        }));
      });
    }, 100);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="page active" id="p-detail">
      <div className="back-btn fu" onClick={() => navigate('/')}>‹ Vissza</div>
      
      <div className="dhero fu d1">
        <div className="dh-tag">☀️ Napelemes kivitelezés</div>
        <div className="dh-name">Molnár ház – 10kWp</div>
        <div className="dh-addr">📍 Pécs, Alkotmány u. 14 · Megkezdve: máj. 12</div>
        <div className="dh-3">
          <div className="dh-s"><div className="dh-v" style={{color:'#2ed158'}}>68%</div><div className="dh-l">Készültség</div></div>
          <div className="dh-s"><div className="dh-v">124h</div><div className="dh-l">Munkaóra</div></div>
          <div className="dh-s"><div className="dh-v">Jún. 5</div><div className="dh-l">Átadás</div></div>
        </div>
      </div>

      <div className="shdr fu d2">
        <div className="shdr-t">Készültség</div>
        <div className="shdr-a">Szerkesztés</div>
      </div>
      
      <div className="prog-list fu d2">
        <div className="pi">
          <div className="pi-top"><div className="pi-n">Tartószerkezet</div><div className="pi-p">100%</div></div>
          <div className="pbar"><div className="pfill" style={{width:'100%',background:'#2ed158'}}></div></div>
        </div>
        <div className="pi">
          <div className="pi-top"><div className="pi-n">Panelek elhelyezése</div><div className="pi-p">85%</div></div>
          <div className="pbar"><div className="pfill" style={{width:'85%',background:'#2ed158'}}></div></div>
        </div>
        <div className="pi">
          <div className="pi-top"><div className="pi-n">Kábelezés</div><div className="pi-p">60%</div></div>
          <div className="pbar"><div className="pfill" style={{width:'60%',background:'#4f8ef7'}}></div></div>
        </div>
        <div className="pi">
          <div className="pi-top"><div className="pi-n">Inverter bekötés</div><div className="pi-p">20%</div></div>
          <div className="pbar"><div className="pfill" style={{width:'20%',background:'#ff9f0a'}}></div></div>
        </div>
        <div className="pi">
          <div className="pi-top"><div className="pi-n">ELMŰ bejelentés</div><div className="pi-p">0%</div></div>
          <div className="pbar"><div className="pfill" style={{width:'1%',background:'rgba(238,242,255,.3)'}}></div></div>
        </div>
      </div>

      <div className="shdr fu d3">
        <div className="shdr-t">Checkpoint fotók</div>
        <div className="shdr-a">+ Feltölt</div>
      </div>
      
      <div className="pgrid fu d3">
        <div className="pitem" style={{background:'linear-gradient(135deg,#141f14,#1d2e1d)'}}>
          🔧<div className="pbadge">Tartó – kész</div>
        </div>
        <div className="pitem" style={{background:'linear-gradient(135deg,#141420,#1d1d2e)'}}>
          ☀️<div className="pbadge">Panelek</div>
        </div>
        <div className="pitem" style={{background:'linear-gradient(135deg,#201414,#2e1d1d)'}}>
          ⚡<div className="pbadge">Kábelezés</div>
        </div>
        <div className="pitem" style={{background:'linear-gradient(135deg,#141a20,#1d252e)'}}>
          🏠<div className="pbadge">Áttekintő</div>
        </div>
        <div className="pitem" style={{opacity:'.35', borderStyle:'dashed'}}>
          +<div className="pbadge">Inverter</div>
        </div>
        <div className="pitem" style={{opacity:'.35', borderStyle:'dashed'}}>
          +<div className="pbadge">Átadás</div>
        </div>
      </div>

      <div className="shdr fu d4"><div className="shdr-t">Checkpointok</div></div>
      <div className="cklist fu d4">
        <div className="cki"><div className="cki-ico">✅</div><div className="cki-t done">Tartószerkezet – megkezdés előtt</div></div>
        <div className="cki"><div className="cki-ico">✅</div><div className="cki-t done">Tartószerkezet – befejezve</div></div>
        <div className="cki"><div className="cki-ico">✅</div><div className="cki-t done">Panelek elhelyezve</div></div>
        <div className="cki"><div className="cki-ico" style={{opacity:'.35'}}>○</div><div className="cki-t">Inverter bekötés kész</div></div>
        <div className="cki"><div className="cki-ico" style={{opacity:'.35'}}>○</div><div className="cki-t">Átadás előtti állapot</div></div>
      </div>

      <div className="shdr fu d5"><div className="shdr-t">Telegram csoport</div></div>
      <div className="tgcard fu d5" style={{marginBottom:'20px'}}>
        <div className="tg-row">
          <span style={{fontSize:'26px'}}>✈️</span>
          <div>
            <div style={{fontSize:'14px',fontWeight:'600',color:'#eef2ff'}}>Molnár ház – munkások</div>
            <div style={{fontSize:'11px',color:'rgba(238,242,255,.32)'}}>4 tag · 23 fotó/videó · utolsó üzenet 2h</div>
          </div>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <div style={{flex:1,background:'rgba(255,255,255,.05)',borderRadius:'12px',padding:'11px',textAlign:'center'}}>
            <div style={{fontSize:'19px',fontWeight:'700',color:'#eef2ff'}}>23</div>
            <div style={{fontSize:'10px',color:'rgba(238,242,255,.32)'}}>Media</div>
          </div>
          <div style={{flex:1,background:'rgba(255,255,255,.05)',borderRadius:'12px',padding:'11px',textAlign:'center'}}>
            <div style={{fontSize:'19px',fontWeight:'700',color:'#eef2ff'}}>4</div>
            <div style={{fontSize:'10px',color:'rgba(238,242,255,.32)'}}>Tag</div>
          </div>
          <div style={{flex:2,background:'rgba(42,171,238,.12)',border:'1px solid rgba(42,171,238,.25)',borderRadius:'12px',padding:'11px',textAlign:'center',cursor:'pointer'}}>
            <div style={{fontSize:'13px',fontWeight:'700',color:'#2AABEE'}}>Megnyitás</div>
            <div style={{fontSize:'10px',color:'rgba(42,171,238,.65)'}}>Telegramban</div>
          </div>
        </div>
      </div>
    </div>
  );
}
