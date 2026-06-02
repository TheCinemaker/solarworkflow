import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Helper: kép URL -> base64
async function imageToBase64(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('hu-HU', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

// ═══════════════════════════════════════
// CSV EXPORT
// ═══════════════════════════════════════
export function exportCSV(issues) {
  const header = ['Projekt', 'Projekt szám', 'Státusz', 'Leírás', 'Bejelentő', 'Dátum', 'Javító', 'Javítva', 'Javítás megjegyzés'];
  const rows = issues.map(i => [
    i.projects?.name || '',
    i.projects?.serial_number || '',
    i.resolved ? 'Javított' : 'Nyitott',
    i.description || '',
    i.profiles?.full_name || '',
    formatDate(i.created_at),
    i.resolved_by_profile?.full_name || '',
    formatDate(i.resolved_at),
    i.resolved_comment || ''
  ]);

  const csvContent = [header, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `VoltDesk_Hibak_${dateStamp()}.csv`);
}

// ═══════════════════════════════════════
// EXCEL EXPORT
// ═══════════════════════════════════════
export function exportExcel(issues) {
  const data = issues.map(i => ({
    'Projekt': i.projects?.name || '',
    'Projekt szám': i.projects?.serial_number || '',
    'Státusz': i.resolved ? 'Javított' : 'Nyitott',
    'Hiba leírás': i.description || '',
    'Bejelentő': i.profiles?.full_name || '',
    'Bejelentés dátuma': formatDate(i.created_at),
    'Javító': i.resolved_by_profile?.full_name || '',
    'Javítás dátuma': formatDate(i.resolved_at),
    'Javítás megjegyzés': i.resolved_comment || '',
    'Hiba fotó URL': i.file_path || '',
    'Javítás fotó URL': i.resolved_file_path || '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  // Oszlopszélességek
  ws['!cols'] = [
    { wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 40 },
    { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
    { wch: 30 }, { wch: 40 }, { wch: 40 }
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Hibajegyek');
  XLSX.writeFile(wb, `VoltDesk_Hibak_${dateStamp()}.xlsx`);
}

// ═══════════════════════════════════════
// PDF EXPORT (KÉPEKKEL)
// ═══════════════════════════════════════
export async function exportPDF(issues, onProgress) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  // Fejléc
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text('VoltDesk – Hibajegy Riport', margin, y);
  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generálva: ${formatDate(new Date().toISOString())} | Összesen: ${issues.length} hibajegy`, margin, y);
  y += 10;

  // Vonal
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  for (let idx = 0; idx < issues.length; idx++) {
    const issue = issues[idx];
    if (onProgress) onProgress(idx + 1, issues.length);

    // Új oldal ha kevés a hely
    if (y > 240) { doc.addPage(); y = margin; }

    // Projekt + sorszám
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text(`${issue.projects?.serial_number || ''} · ${issue.projects?.name || 'Projekt'}`, margin, y);
    y += 5;

    // Státusz pill
    doc.setFontSize(8);
    if (issue.resolved) {
      doc.setTextColor(46, 209, 88);
      doc.text('● JAVÍTOTT', margin, y);
    } else {
      doc.setTextColor(255, 59, 48);
      doc.text('● NYITOTT', margin, y);
    }
    doc.setTextColor(120, 120, 120);
    doc.text(`Bejelentette: ${issue.profiles?.full_name || '?'} | ${formatDate(issue.created_at)}`, margin + 25, y);
    y += 6;

    // Hiba leírás
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const descLines = doc.splitTextToSize(issue.description || 'Nincs leírás', contentW);
    doc.text(descLines, margin, y);
    y += descLines.length * 4 + 2;

    // Hiba fotó
    if (issue.file_path) {
      const imgData = await imageToBase64(issue.file_path);
      if (imgData) {
        if (y > 220) { doc.addPage(); y = margin; }
        try {
          doc.addImage(imgData, 'JPEG', margin, y, 55, 40);
          // Ha javított, mellé rakjuk a javítás fotót
          if (issue.resolved && issue.resolved_file_path) {
            const fixImg = await imageToBase64(issue.resolved_file_path);
            if (fixImg) {
              doc.setFontSize(7);
              doc.setTextColor(255, 59, 48);
              doc.text('Eredeti hiba ↑', margin, y + 43);
              doc.addImage(fixImg, 'JPEG', margin + 65, y, 55, 40);
              doc.setTextColor(46, 209, 88);
              doc.text('Javítás ↑', margin + 65, y + 43);
            }
          }
          y += 48;
        } catch { y += 2; }
      }
    }

    // Javítás infó
    if (issue.resolved) {
      doc.setFontSize(8);
      doc.setTextColor(46, 209, 88);
      doc.text(`Javította: ${issue.resolved_by_profile?.full_name || '?'} | ${formatDate(issue.resolved_at)}`, margin, y);
      y += 4;
      if (issue.resolved_comment) {
        doc.setTextColor(80, 80, 80);
        const fixLines = doc.splitTextToSize(issue.resolved_comment, contentW);
        doc.text(fixLines, margin, y);
        y += fixLines.length * 3.5 + 2;
      }
    }

    // Elválasztó vonal
    y += 3;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageW - margin, y);
    y += 8;
  }

  doc.save(`VoltDesk_Hibak_${dateStamp()}.pdf`);
}

// Helpers
function dateStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
