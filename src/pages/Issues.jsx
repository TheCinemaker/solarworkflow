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

      <div className="p-4 text-center text-slate-500 text-sm italic w-full">
        Nincsenek aktív hibajegyek a rendszerben.
      </div>
    </div>
  );
}
