import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { supabase } from './supabase';
import { FEATURE_FLAGS } from '../config/features';

// ═══════════════════════════════════════════════════════════════
// VoltDesk – Teljes Projekt PDF Export
// Generál egy nyomtatható A4-es munkalap-összesítőt a projektről
// ═══════════════════════════════════════════════════════════════

// --- Helpers ---

// jsPDF latin-1 korlát: ő→ö, ű→ü (magyar ékezetek fix)
function normalizeText(text) {
  if (!text) return '';
  return text.toString()
    .replace(/ő/g, 'ö').replace(/Ő/g, 'Ö')
    .replace(/ű/g, 'ü').replace(/Ű/g, 'Ü');
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('hu-HU', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('hu-HU', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
}

function dateStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Kép URL → base64 (kisebb méretben a PDF méret kezelhetőségéért)
async function imageToBase64(url, maxWidth = 400) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;

        // Méretcsökkentés ha túl nagy
        if (w > maxWidth) {
          h = Math.round(h * (maxWidth / w));
          w = maxWidth;
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ data: canvas.toDataURL('image/jpeg', 0.75), width: w, height: h });
      };
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(blob);
    });
  } catch {
    return null;
  }
}

// --- Fő export függvény ---

/**
 * Teljes projekt PDF exportálása
 * @param {string} projectId - Projekt UUID
 * @param {function} onProgress - callback(current, total, stage) 
 */
export async function exportProjectPDF(projectId, onProgress) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth(); // 210mm
  const pageH = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 15;
  const contentW = pageW - margin * 2; // 180mm
  let y = margin;

  if (onProgress) onProgress(0, 1, 'Adatok betöltése...');

  // ═══════════════════════════════════════
  // 1. ADATOK LEKÉRDEZÉSE
  // ═══════════════════════════════════════

  const { data: project, error: projErr } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projErr || !project) {
    throw new Error('Projekt nem található: ' + (projErr?.message || 'ismeretlen hiba'));
  }

  // Worklogs
  const { data: worklogs } = await supabase
    .from('worklogs')
    .select(`
      *,
      profiles:profiles!user_id (full_name, serial_number)
    `)
    .eq('project_id', projectId)
    .order('date', { ascending: true });

  // Media (fotók + hibák)
  const { data: media } = await supabase
    .from('media')
    .select(`
      *,
      profiles:profiles!user_id (full_name, serial_number)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  // Feladatok parse-olása
  const tasks = project.tasks
    ? project.tasks.split('\n').map(t => t.trim()).filter(Boolean)
    : [];
  const completedTasks = project.completed_tasks || [];
  const progressPercent = tasks.length > 0
    ? Math.round((completedTasks.length / tasks.length) * 100)
    : 0;

  // Szűrés: hibák vs munkafolyamat fotók
  const allPhotos = media || [];
  const issuePhotos = allPhotos.filter(p => p.is_issue);
  const workPhotos = allPhotos.filter(p => !p.is_issue);

  // Teljes fotószám a progress-hez
  const totalPhotos = allPhotos.length;
  let processedPhotos = 0;

  // ═══════════════════════════════════════
  // LÁBLÉC HELPER (minden oldalra)
  // ═══════════════════════════════════════
  const addFooter = () => {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 160);
      doc.text(
        normalizeText(`VoltDesk - SA software & networking solutions · Oldal ${i}/${pageCount}`),
        pageW / 2, pageH - 8, { align: 'center' }
      );
      // Vékony elválasztó vonal
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
    }
  };

  // Oldaltörés helper
  const checkNewPage = (needed = 30) => {
    if (y > pageH - needed) {
      doc.addPage();
      y = margin;
    }
  };

  // Szekció cím helper
  const sectionTitle = (title, icon = '') => {
    checkNewPage(25);
    y += 4;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text(normalizeText(`${icon} ${title}`.trim()), margin, y);
    y += 2;
    doc.setDrawColor(79, 142, 247);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 60, y);
    doc.setLineWidth(0.2);
    y += 7;
  };

  // ═══════════════════════════════════════
  // 2. FEJLÉC
  // ═══════════════════════════════════════

  if (onProgress) onProgress(0, 1, 'PDF generálás...');

  // Háttér sáv
  doc.setFillColor(24, 28, 40);
  doc.rect(0, 0, pageW, 22, 'F');

  // VoltDesk felirat
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('VoltDesk', margin, 14);

  // Generálás dátuma jobb oldalon
  doc.setFontSize(8);
  doc.setTextColor(140, 150, 180);
  doc.text(normalizeText(`Készítve: ${formatDate(new Date().toISOString())}`), pageW - margin, 14, { align: 'right' });

  y = 30;

  // ═══════════════════════════════════════
  // 3. MEGRENDELŐ ÉS PROJEKT ADATLAP
  // ═══════════════════════════════════════

  sectionTitle('Megrendelö és Projekt Adatok');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);

  const infoRows = [
    ['Projekt neve:', project.name || '-'],
    ['Megrendelö:', project.client_name || '-'],
    ['Helyszín:', project.address || '-'],
    ['Telefon 1:', project.client_phone || '-'],
    ['Telefon 2:', project.client_phone_2 || '-'],
    ['Telefon 3:', project.client_phone_3 || '-'],
    ['Kezdés:', project.start_time || '-'],
    ['Befejezés:', project.end_time || '-'],
    ['Határidö:', project.deadline ? formatDateShort(project.deadline) : '-'],
  ];

  // Napelemes projekt extra adatok
  if (project.is_solar) {
    infoRows.push(['Típus:', 'Napelemes telepítés']);
    if (project.inverter_brand) {
      infoRows.push(['Inverter:', project.inverter_brand]);
    }
  }

  // 2 oszlopos layout
  const col1X = margin;
  const col2X = margin + 95;

  for (let i = 0; i < infoRows.length; i += 2) {
    checkNewPage(12);

    // Bal oszlop
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text(normalizeText(infoRows[i][0]), col1X, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(normalizeText(infoRows[i][1]), col1X + 28, y);

    // Jobb oszlop (ha van)
    if (i + 1 < infoRows.length) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text(normalizeText(infoRows[i + 1][0]), col2X, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      doc.text(normalizeText(infoRows[i + 1][1]), col2X + 28, y);
    }

    y += 6;
  }

  // Fontos információ
  if (project.important_info) {
    y += 3;
    checkNewPage(20);
    doc.setFillColor(255, 245, 230);
    doc.setDrawColor(255, 159, 10);
    doc.roundedRect(margin, y - 3, contentW, 16, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 120, 0);
    doc.text('FONTOS:', margin + 4, y + 2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 60, 20);
    const infoLines = doc.splitTextToSize(normalizeText(project.important_info), contentW - 30);
    doc.text(infoLines, margin + 22, y + 2);
    y += 16 + (infoLines.length > 1 ? (infoLines.length - 1) * 3.5 : 0);
  }

  // ═══════════════════════════════════════
  // 5. FELADATLISTA (MUNKALAP)
  // ═══════════════════════════════════════

  if (tasks.length > 0) {
    sectionTitle('Feladatlista / Munkalap');

    doc.setFontSize(9);
    tasks.forEach((task) => {
      checkNewPage(8);
      const isDone = completedTasks.includes(task);

      // Feladat szöveg bullet pointtal, checkbox nélkül
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(isDone ? 160 : 40, isDone ? 160 : 40, isDone ? 160 : 40);
      const bullet = '• ';
      const taskText = bullet + task;
      const taskLines = doc.splitTextToSize(normalizeText(taskText), contentW);
      doc.text(taskLines, margin, y);
      y += taskLines.length * 4.5 + 2;
    });
  }

  // ═══════════════════════════════════════
  // 6. MUNKANAPLÓ (WORKLOGS TÁBLÁZAT)
  // ═══════════════════════════════════════

  if (worklogs && worklogs.length > 0) {
    sectionTitle('Munkanapló');

    const wlBody = worklogs.map(wl => [
      formatDateShort(wl.date),
      normalizeText(wl.profiles?.full_name || '-'),
      wl.start_time || '-',
      wl.end_time || '-',
      `${wl.hours || 0} óra`,
      normalizeText(wl.description || '-'),
      normalizeText(wl.materials || '-')
    ]);

    doc.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [[
        normalizeText('Dátum'),
        normalizeText('Dolgozó'),
        normalizeText('Kezdés'),
        normalizeText('Befejezés'),
        normalizeText('Órák'),
        normalizeText('Leírás'),
        normalizeText('Anyagok')
      ]],
      body: wlBody,
      styles: {
        fontSize: 7,
        cellPadding: 2,
        textColor: [40, 40, 40],
        lineColor: [220, 220, 220],
        lineWidth: 0.2
      },
      headStyles: {
        fillColor: [24, 28, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7
      },
      alternateRowStyles: {
        fillColor: [248, 248, 255]
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 25 },
        2: { cellWidth: 14 },
        3: { cellWidth: 14 },
        4: { cellWidth: 14 },
        5: { cellWidth: 'auto' },
        6: { cellWidth: 'auto' }
      }
    });

    y = doc.lastAutoTable.finalY + 10;

    // Összesítés
    const totalHours = worklogs.reduce((sum, wl) => sum + (parseFloat(wl.hours) || 0), 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text(normalizeText(`Összes ledolgozott óra: ${totalHours.toFixed(1)} óra`), margin, y);
    y += 8;
  }

  // ═══════════════════════════════════════
  // 7. MUNKAFOLYAMAT FÉNYKÉPEK
  // ═══════════════════════════════════════

  if (workPhotos.length > 0) {
    sectionTitle('Munkafolyamat Fényképek');

    if (onProgress) onProgress(0, totalPhotos, 'Képek betöltése...');

    for (let i = 0; i < workPhotos.length; i++) {
      const photo = workPhotos[i];
      processedPhotos++;
      if (onProgress) onProgress(processedPhotos, totalPhotos, 'Képek betöltése...');

      checkNewPage(70);

      // Kép betöltése
      const imgResult = await imageToBase64(photo.file_path, 400);
      if (imgResult) {
        // Kép arányos méretezése PDF-be (max 80mm széles)
        const maxImgW = 80;
        const scale = maxImgW / imgResult.width;
        const pdfW = maxImgW;
        const pdfH = imgResult.height * scale;

        // Max magasság ellenőrzés
        const finalH = Math.min(pdfH, 60);

        checkNewPage(finalH + 20);

        try {
          doc.addImage(imgResult.data, 'JPEG', margin, y, pdfW, finalH);
        } catch {
          // Ha nem sikerül beágyazni, kihagyjuk
        }

        // Kép melletti metaadatok
        const infoX = margin + pdfW + 5;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 80);
        doc.text(normalizeText(photo.profiles?.full_name || 'Dolgozó'), infoX, y + 4);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        doc.text(formatDate(photo.created_at), infoX, y + 9);

        // Típus badge
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(46, 209, 88);
        doc.text('MUNKAFOLYAMAT', infoX, y + 14);

        // Megjegyzés
        if (photo.description) {
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(60, 60, 60);
          const descLines = doc.splitTextToSize(normalizeText(photo.description), contentW - pdfW - 10);
          doc.text(descLines, infoX, y + 20);
        }

        y += finalH + 8;
      }
    }
  }

  // ═══════════════════════════════════════
  // 8. HIBAJEGYEK ÖSSZESÍTÉS
  // ═══════════════════════════════════════

  if (issuePhotos.length > 0) {
    doc.addPage();
    y = margin;

    sectionTitle('Hibajegyek Összesítés');

    // Statisztika
    const resolvedCount = issuePhotos.filter(p => p.resolved).length;
    const openCount = issuePhotos.length - resolvedCount;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(normalizeText(`Összes hibajegy: ${issuePhotos.length} | Javított: ${resolvedCount} | Nyitott: ${openCount}`), margin, y);
    y += 8;

    for (let i = 0; i < issuePhotos.length; i++) {
      const issue = issuePhotos[i];
      processedPhotos++;
      if (onProgress) onProgress(processedPhotos, totalPhotos, 'Hibajegyek feldolgozása...');

      checkNewPage(75);

      // Hibajegy fejléc
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');

      if (issue.resolved) {
        doc.setTextColor(46, 209, 88);
        doc.text(normalizeText('JAVÍTOTT'), margin, y);
      } else {
        doc.setTextColor(255, 59, 48);
        doc.text(normalizeText('NYITOTT'), margin, y);
      }

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(7);
      doc.text(
        normalizeText(`Bejelentette: ${issue.profiles?.full_name || '?'} | ${formatDate(issue.created_at)}`),
        margin + 22, y
      );
      y += 5;

      // Hiba leírás
      if (issue.description) {
        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
        const descLines = doc.splitTextToSize(normalizeText(issue.description), contentW);
        doc.text(descLines, margin, y);
        y += descLines.length * 3.5 + 2;
      }

      // Hiba fotó
      const issueImg = await imageToBase64(issue.file_path, 300);
      if (issueImg) {
        checkNewPage(55);
        const imgW = 55;
        const imgH = Math.min(issueImg.height * (imgW / issueImg.width), 42);

        try {
          doc.addImage(issueImg.data, 'JPEG', margin, y, imgW, imgH);

          doc.setFontSize(6);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 59, 48);
          doc.text(normalizeText('Eredeti hiba'), margin, y + imgH + 4);

          // Javítás fotó mellé (ha van)
          if (issue.resolved && issue.resolved_file_path) {
            const fixImg = await imageToBase64(issue.resolved_file_path, 300);
            if (fixImg) {
              const fixH = Math.min(fixImg.height * (imgW / fixImg.width), 42);
              doc.addImage(fixImg.data, 'JPEG', margin + imgW + 10, y, imgW, fixH);

              doc.setTextColor(46, 209, 88);
              doc.text(normalizeText('Javítás utáni állapot'), margin + imgW + 10, y + fixH + 4);
            }
          }

          y += imgH + 8;
        } catch {
          y += 2;
        }
      }

      // Javítás megjegyzés
      if (issue.resolved && issue.resolved_comment) {
        doc.setFontSize(7);
        doc.setTextColor(46, 209, 88);
        doc.setFont('helvetica', 'bold');
        doc.text(normalizeText('Javítás megjegyzés:'), margin, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        const fixLines = doc.splitTextToSize(normalizeText(issue.resolved_comment), contentW - 5);
        doc.text(fixLines, margin + 32, y);
        y += fixLines.length * 3 + 2;
      }

      // Elválasztó
      y += 3;
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(margin, y, pageW - margin, y);
      y += 8;
    }
  }

  // ═══════════════════════════════════════
  // 9. ÁTVÉTEL ÉS ALÁÍRÁS
  // ═══════════════════════════════════════
  sectionTitle('Átvétel és Aláírás');
  checkNewPage(45);

  const startY = y;

  // Bal oszlop - Kivitelező
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text(normalizeText('Kivitelezö:'), col1X, startY);

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(col1X, startY + 16, col1X + 70, startY + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(normalizeText('Aláírás (Kivitelezö)'), col1X, startY + 20);

  // Jobb oszlop - Megrendelő
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text(normalizeText('Megrendelö / Átvevö:'), col2X, startY);

  if (FEATURE_FLAGS.CLIENT_SIGNATURE && project.client_signature) {
    try {
      // Aláírás kép kirajzolása (PNG)
      doc.addImage(project.client_signature, 'PNG', col2X, startY + 1, 40, 20);
    } catch (err) {
      console.error('Hiba az aláírás PDF-be helyezésekor:', err);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text(normalizeText('[Digitális aláírás kép betöltési hiba]'), col2X, startY + 10);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(normalizeText(`Aláíró: ${project.client_signature_name}`), col2X, startY + 24);
    doc.text(normalizeText(`Dátum: ${formatDate(project.client_signature_date)}`), col2X, startY + 28);
  } else {
    // Fallback: fizikai aláírás helye
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(col2X, startY + 16, col2X + 70, startY + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(normalizeText('Aláírás (Megrendelö)'), col2X, startY + 20);
  }

  y = startY + 32;

  // ═══════════════════════════════════════
  // LÁBLÉC ALKALMAZÁSA (minden oldalra)
  // ═══════════════════════════════════════

  addFooter();

  // ═══════════════════════════════════════
  // MENTÉS
  // ═══════════════════════════════════════

  const fileName = `VoltDesk_${project.serial_number || 'Projekt'}_${dateStamp()}.pdf`;
  doc.save(fileName);

  if (onProgress) onProgress(1, 1, 'Kész!');

  return fileName;
}
