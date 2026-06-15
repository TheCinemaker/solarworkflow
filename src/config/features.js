// VoltDesk Funkcióválasztó (Feature Flags)
// Csak azokat a modulokat kapcsoljuk be (true), amelyeket a megrendelő kifizetett.

export const FEATURE_FLAGS = {
  CLIENT_SIGNATURE: true,     // Digitális aláírás és PDF-be ágyazás (Díj: 39.000 Ft)
  TELEGRAM_ALERTS: false,      // Telegram webhook értesítések (Díj: 26.000 Ft)
  TASK_TEMPLATES: false,       // Feladat sablonok importálása (Díj: 39.000 Ft)
  INVENTORY_MANAGEMENT: false, // Anyag és készletkezelő (Díj: 65.000 Ft)
  CLIENT_FEEDBACK: true,      // Nyilvános ügyfél értékelések (Díj: 52.000 Ft)
};
