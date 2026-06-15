// VoltDesk Funkcióválasztó (Feature Flags)
// Környezeti változók alapján kapcsoljuk be a modulokat, amelyek a szerveren alapértelmezetten ki vannak kapcsolva.

export const FEATURE_FLAGS = {
  CLIENT_SIGNATURE: import.meta.env.VITE_CLIENT_SIGNATURE === 'true',     // Digitális aláírás és PDF-be ágyazás (Díj: 39.000 Ft)
  TELEGRAM_ALERTS: import.meta.env.VITE_TELEGRAM_ALERTS === 'true',      // Telegram webhook értesítések (Díj: 26.000 Ft)
  TASK_TEMPLATES: import.meta.env.VITE_TASK_TEMPLATES === 'true',       // Feladat sablonok importálása (Díj: 39.000 Ft)
  INVENTORY_MANAGEMENT: import.meta.env.VITE_INVENTORY_MANAGEMENT === 'true', // Anyag és készletkezelő (Díj: 65.000 Ft)
  CLIENT_FEEDBACK: import.meta.env.VITE_CLIENT_FEEDBACK === 'true',      // Nyilvános ügyfél értékelések (Díj: 52.000 Ft)
};
