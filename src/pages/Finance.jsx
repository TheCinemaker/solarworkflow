import { useNavigate } from 'react-router-dom';

export default function Finance() {
  const navigate = useNavigate();

  return (
    <div className="page active" id="p-workers">
      <div className="page-header fu">
        <div>
          <div className="pg-greet">Heti összesítő</div>
          <div className="pg-title">Munkások</div>
        </div>
        <div className="hdr-btn">+</div>
      </div>
      
      <div className="stats-grid fu d1">
        <div className="sc">
          <div className="sc-lbl">Heti összes</div>
          <div className="sc-val" style={{color:'#4f8ef7'}}>312h</div>
          <div className="sc-sub">8 munkás</div>
        </div>
        <div className="sc">
          <div className="sc-lbl">Bérköltség</div>
          <div className="sc-val" style={{color:'#ffd60a'}}>936K</div>
          <div className="sc-sub">Ft · ezen a héten</div>
        </div>
      </div>
      
      <div className="shdr fu d2">
        <div className="shdr-t">Aktív munkások</div>
        <div className="shdr-a">Fizetések →</div>
      </div>
      
      <div className="wlist fu d2">
        <div className="wrow">
          <div className="wav" style={{background:'linear-gradient(135deg,#4f8ef7,#2a5ccc)'}}>TP</div>
          <div>
            <div className="wname">Tóth Péter</div>
            <div className="wrole">⚡ Vezető villanyszerelő</div>
          </div>
          <div className="wright">
            <div className="wh" style={{color:'#2ed158'}}>48h</div>
            <div className="wp">144 000 Ft</div>
          </div>
        </div>
        <div className="wrow">
          <div className="wav" style={{background:'linear-gradient(135deg,#2ed158,#1a8a38)'}}>KA</div>
          <div>
            <div className="wname">Kiss András</div>
            <div className="wrole">☀️ Napelemes szakember</div>
          </div>
          <div className="wright">
            <div className="wh" style={{color:'#2ed158'}}>40h</div>
            <div className="wp">100 000 Ft</div>
          </div>
        </div>
        <div className="wrow">
          <div className="wav" style={{background:'linear-gradient(135deg,#ff9f0a,#b86000)'}}>VG</div>
          <div>
            <div className="wname">Varga Gábor</div>
            <div className="wrole">🔧 Villanyszerelő</div>
          </div>
          <div className="wright">
            <div className="wh" style={{color:'#ff9f0a'}}>36h</div>
            <div className="wp">90 000 Ft</div>
          </div>
        </div>
        <div className="wrow">
          <div className="wav" style={{background:'linear-gradient(135deg,#bf5af2,#7a18b8)'}}>SD</div>
          <div>
            <div className="wname">Szabó Dávid</div>
            <div className="wrole">🔌 Segédszerelő</div>
          </div>
          <div className="wright">
            <div className="wh" style={{color:'#ff9f0a'}}>32h</div>
            <div className="wp">64 000 Ft</div>
          </div>
        </div>
        <div className="wrow" style={{opacity:'.4'}}>
          <div className="wav" style={{background:'linear-gradient(135deg,#636366,#3a3a3c)'}}>NZ</div>
          <div>
            <div className="wname">Nagy Zoltán</div>
            <div className="wrole">🏖 Szabadságon – jún. 2</div>
          </div>
          <div className="wright">
            <div className="wh" style={{color:'rgba(238,242,255,.32)'}}>–</div>
            <div className="wp">Szabadság</div>
          </div>
        </div>
      </div>
      
      <div className="shdr fu d3">
        <div className="shdr-t">Telegram csoportok</div>
      </div>
      
      <div className="tgcard fu d3" style={{marginBottom:'20px'}}>
        <div className="tg-groups">
          <div className="tgg">
            <div className="tgg-dot" style={{background:'#2ed158'}}></div>
            <div className="tgg-n">Molnár ház – munkások</div>
            <div className="tgg-c">4 tag · 2h</div>
          </div>
          <div className="tgg">
            <div className="tgg-dot" style={{background:'#4f8ef7'}}></div>
            <div className="tgg-n">Irodaház projekt</div>
            <div className="tgg-c">3 tag · 1n</div>
          </div>
          <div className="tgg">
            <div className="tgg-dot" style={{background:'#ff9f0a'}}></div>
            <div className="tgg-n">Horváth porta</div>
            <div className="tgg-c">2 tag · 3n</div>
          </div>
          <div className="tgg">
            <div className="tgg-dot" style={{background:'#ff3b30'}}></div>
            <div className="tgg-n">Nagy villa – HIBA</div>
            <div className="tgg-c">3 tag · 1n</div>
          </div>
        </div>
      </div>
    </div>
  );
}
