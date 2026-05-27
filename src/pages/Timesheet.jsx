import { useNavigate } from 'react-router-dom';

export default function Timesheet() {
  const navigate = useNavigate();

  return (
    <div className="page active" id="p-daily">
      <div className="back-btn fu" onClick={() => navigate('/')}>‹ Vissza</div>
      <div className="page-header fu">
        <div>
          <div className="pg-greet">{new Date().toLocaleDateString('hu-HU')}</div>
          <div className="pg-title">Napi lap</div>
        </div>
        <div className="hdr-btn">📋</div>
      </div>
      
      <div className="p-4 text-center text-slate-500 text-sm italic w-full">
        Munkalap rögzítése modul fejlesztés alatt...
      </div>
    </div>
  );
}
