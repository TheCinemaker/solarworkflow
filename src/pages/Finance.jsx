import { useNavigate } from 'react-router-dom';

export default function Finance() {
  const navigate = useNavigate();

  return (
    <div className="page active" id="p-workers">
      <div className="back-btn fu" onClick={() => navigate('/')}>‹ Vissza</div>
      <div className="page-header fu">
        <div>
          <div className="pg-greet">Heti összesítő</div>
          <div className="pg-title">Munkások</div>
        </div>
        <div className="hdr-btn">+</div>
      </div>
      
      <div className="p-4 text-center text-slate-500 text-sm italic w-full">
        Munkások statisztikái és bérköltségek modul fejlesztés alatt...
      </div>
    </div>
  );
}
