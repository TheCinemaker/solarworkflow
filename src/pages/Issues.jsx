import { useNavigate } from 'react-router-dom';

export default function Issues() {
  const navigate = useNavigate();
  
  return (
    <div className="page active" id="p-issues">
      <div className="back-btn fu" onClick={() => navigate('/')}>‹ Vissza</div>
      <div className="page-header fu">
        <div>
          <div className="pg-greet">Sürgős és nyitott</div>
          <div className="pg-title">Hibák / Visszajárás</div>
        </div>
      </div>

      <div className="shdr fu d1">
        <div className="shdr-t">Kivizsgálandó (3)</div>
      </div>
      
      <div className="act-list fu d2">
        <div className="act">
          <div className="act-ico" style={{background:'rgba(255,59,48,.12)'}}>⚠️</div>
          <div className="act-body">
            <div className="act-txt"><b>Nagy villa</b> – inverter meghibásodás jelentve</div>
            <div className="act-time">Tegnap 17:23</div>
          </div>
        </div>
        <div className="act">
          <div className="act-ico" style={{background:'rgba(255,159,10,.12)'}}>⚠️</div>
          <div className="act-body">
            <div className="act-txt"><b>Horváth porta</b> – Folyosó 3-as kapcsoló nem vált megfelelően.</div>
            <div className="act-time">3 napja</div>
          </div>
        </div>
      </div>

      <div className="shdr fu d3">
        <div className="shdr-t">Megoldott</div>
      </div>

      <div className="act-list fu d4" style={{opacity:0.5}}>
        <div className="act">
          <div className="act-ico" style={{background:'rgba(46,209,88,.12)'}}>✅</div>
          <div className="act-body">
            <div className="act-txt"><b>Kovácsék Napelem</b> – Tetőcserepek visszarakása javítás.</div>
            <div className="act-time">1 hete</div>
          </div>
        </div>
      </div>
    </div>
  );
}
