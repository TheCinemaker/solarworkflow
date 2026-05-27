import { useNavigate } from 'react-router-dom';

export default function CalendarView() {
  const navigate = useNavigate();

  return (
    <div className="page active" id="p-calendar">
      <div className="back-btn fu" onClick={() => navigate('/')}>‹ Vissza</div>
      <div className="page-header fu">
        <div>
          <div className="pg-greet">2026. Május</div>
          <div className="pg-title">Naptár</div>
        </div>
      </div>

      <div className="stats-grid fu d1">
        <div className="sc" style={{background:'rgba(79,142,247,.1)'}}>
          <div className="sc-lbl">Szerda</div>
          <div className="sc-val" style={{color:'#4f8ef7'}}>27</div>
          <div className="sc-sub">Ma</div>
        </div>
      </div>

      <div className="shdr fu d2">
        <div className="shdr-t">Napi Beosztás</div>
      </div>

      <div className="act-list fu d3">
        <div className="act">
          <div className="act-ico" style={{background:'rgba(46,209,88,.12)', fontSize:'12px', fontWeight:'bold', color:'#2ed158'}}>08:00</div>
          <div className="act-body">
            <div className="act-txt"><b>Kovácsék Napelem</b> – Inverter felszerelése</div>
            <div className="act-time">📍 Budapest</div>
          </div>
        </div>
        <div className="act">
          <div className="act-ico" style={{background:'rgba(255,59,48,.12)', fontSize:'12px', fontWeight:'bold', color:'#ff3b30'}}>13:00</div>
          <div className="act-body">
            <div className="act-txt"><b>Szabó Családi Ház</b> – Garanciális javítás - Fi relé</div>
            <div className="act-time">📍 Pécs</div>
          </div>
        </div>
      </div>
    </div>
  );
}
