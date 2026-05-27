import { useNavigate } from 'react-router-dom';

export default function Timesheet() {
  const navigate = useNavigate();

  return (
    <div className="page active" id="p-daily">
      <div className="page-header fu">
        <div>
          <div className="pg-greet">2026. május 27.</div>
          <div className="pg-title">Napi lap</div>
        </div>
        <div className="hdr-btn">📋</div>
      </div>
      
      <div className="daily-top fu d1">
        <div className="dt-date">MA · SZERDA</div>
        <div className="dt-title">Ki volt terepen ma?</div>
        <div className="dt-chips">
          <div className="chip" style={{borderColor:'rgba(79,142,247,.35)'}}>
            <span className="chip-dot" style={{background:'#4f8ef7'}}></span>Tóth P.
          </div>
          <div className="chip" style={{borderColor:'rgba(46,209,88,.35)'}}>
            <span className="chip-dot" style={{background:'#2ed158'}}></span>Kiss A.
          </div>
          <div className="chip" style={{borderColor:'rgba(255,159,10,.35)'}}>
            <span className="chip-dot" style={{background:'#ff9f0a'}}></span>Varga G.
          </div>
          <div className="chip" style={{opacity:'.45', borderStyle:'dashed'}}>
            <span className="chip-dot" style={{background:'rgba(238,242,255,.3)'}}></span>+ Hozzáad
          </div>
        </div>
      </div>

      <div className="shdr fu d2">
        <div className="shdr-t">Részletek</div>
      </div>
      
      <div className="irow fu d2">
        <div className="ilbl">Projekt</div>
        <div className="ifield" onClick={() => navigate('/project/1')}>
          <div className="ival">Molnár ház – 10kWp napelem</div>
          <div className="iarr">›</div>
        </div>
      </div>
      
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',padding:'0 20px',marginBottom:'12px'}} className="fu d2">
        <div>
          <div className="ilbl">Tóth P. – óra</div>
          <div className="ifield" style={{justifyContent:'center'}}>
            <span style={{fontSize:'30px',fontWeight:'700',letterSpacing:'-1.2px',color:'#eef2ff'}}>8</span>
            <span style={{fontSize:'12px',color:'rgba(238,242,255,.32)',marginLeft:'4px',alignSelf:'flex-end',paddingBottom:'2px'}}>h</span>
          </div>
        </div>
        <div>
          <div className="ilbl">Kiss A. – óra</div>
          <div className="ifield" style={{justifyContent:'center'}}>
            <span style={{fontSize:'30px',fontWeight:'700',letterSpacing:'-1.2px',color:'#eef2ff'}}>8</span>
            <span style={{fontSize:'12px',color:'rgba(238,242,255,.32)',marginLeft:'4px',alignSelf:'flex-end',paddingBottom:'2px'}}>h</span>
          </div>
        </div>
      </div>
      
      <div className="irow fu d3">
        <div className="ilbl">Elvégzett munkák</div>
        <div className="ifield" style={{minHeight:'72px',alignItems:'flex-start'}}>
          <div className="ival" style={{color:'rgba(238,242,255,.3)'}}>
            Pl. Panelek 8-12. sor felszerelve, kábelezés megkezdve...
          </div>
        </div>
      </div>

      <div className="shdr fu d3">
        <div className="shdr-t">Checkpoint fotó</div>
        <div className="shdr-a" style={{color:'#ff9f0a'}}>Kötelező!</div>
      </div>
      
      <div className="upload-area fu d3">
        <div className="ua-ico">📷</div>
        <div className="ua-t">Fotó vagy videó feltöltése</div>
        <div className="ua-s">Drive-ra kerül + Telegram csoportba is automatikusan</div>
      </div>

      <div className="irow fu d4">
        <div className="ilbl">Hiba / megjegyzés</div>
        <div className="ifield">
          <div className="ival" style={{color:'rgba(238,242,255,.3)'}}>Nincs hiba ma ✓</div>
          <div className="iarr">›</div>
        </div>
      </div>
      
      <button className="sbtn fu d4" onClick={() => {
        alert('Sikeresen beküldve!');
        navigate('/');
      }}>
        ✓ Munkalap beküldése
      </button>
    </div>
  );
}
