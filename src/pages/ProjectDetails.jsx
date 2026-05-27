import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function ProjectDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [project, setProject] = useState(null);

  useEffect(() => {
    async function fetchProject() {
      if (id) {
        const { data } = await supabase.from('projects').select('*').eq('id', id).single();
        if (data) setProject(data);
      }
    }
    fetchProject();
  }, [id]);

  return (
    <div className="page active" id="p-detail">
      <div className="back-btn fu" onClick={() => navigate('/')}>‹ Vissza</div>
      
      <div className="dhero fu d1">
        <div className="dh-tag">⚡ Projekt Adatlap</div>
        <div className="dh-name">{project ? project.name : 'Betöltés...'}</div>
        <div className="dh-addr">📍 {project ? project.address : '...'}</div>
      </div>

      <div className="shdr fu d2">
        <div className="shdr-t">Készültség és Fotók</div>
      </div>
      
      <div className="p-4 text-center text-slate-500 text-sm italic w-full">
        Jelenleg nincsenek feltöltött adatok (fotók, checkpointok) ehhez a projekthez.
      </div>
    </div>
  );
}
