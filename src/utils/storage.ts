import { Class, Toy, BorrowedItem, TimerSettings, PaxWeekPoints, RastTracking, NotReturnedRecord, NotReturnedWeekStats } from "@/types";

// ============================================
// FAST LAGRINGSNYCKEL FÖR VARDAGLIGT BEVARANDE
// ============================================
// Denna nyckel används för att lagra ALL app-data i localStorage.
// Data bevaras även efter att appen publiceras om eller uppdateras i Lovable.
// Detta är den primära lagringsmetoden för daglig användning.
const MAIN_STORAGE_KEY = "fritidsAppData";

// ============================================
// DATASTRUKTUR FÖR ALL APP-DATA
// ============================================
interface AppData {
  classes: Class[];
  toys: Toy[];
  borrowed: BorrowedItem[];
  timerSettings: TimerSettings;
  paxPoints: PaxWeekPoints[];
  rastTracking: RastTracking | null;
  notReturned: NotReturnedRecord[];
  notReturnedStats: NotReturnedWeekStats[];
  adminPassword: string | null;
  adminPasswordSet: boolean;
}

// ============================================
// STANDARDVÄRDEN
// ============================================
export const DEFAULT_CLASSES: Class[] = [
  { 
    name: "Klass 1", 
    students: [
      { id: "student-1", name: "Elev 1" },
      { id: "student-2", name: "Elev 2" },
      { id: "student-3", name: "Elev 3" }
    ], 
    color: "#3B82F6" 
  },
  { 
    name: "Klass 2", 
    students: [
      { id: "student-4", name: "Elev 4" },
      { id: "student-5", name: "Elev 5" },
      { id: "student-6", name: "Elev 6" }
    ], 
    color: "#10B981" 
  },
];

export const DEFAULT_TOYS: Toy[] = [
  { id: "toy-1", name: "Fotboll", icon: "⚽", quantity: 3 },
  { id: "toy-2", name: "Basketboll", icon: "🏀", quantity: 3 },
];

const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  sessions: [
    { id: "session-1", name: "Rast 1", startTime: "09:00", endTime: "11:30", enabled: true },
    { id: "session-2", name: "Rast 2", startTime: "13:00", endTime: "15:30", enabled: true },
  ],
  timerType: 'digital',
  warningMinutes: 15,
  delayMinutes: 30,
  alarmSound: 'bell',
  alarmVolume: 80,
};

// ============================================
// CENTRAL LAGRING - LÄSA OCH SKRIVA ALL DATA
// ============================================
// Dessa funktioner hanterar den centrala lagringsnyckeln för vardagligt bevarande.

/**
 * Läser all app-data från localStorage.
 * Om ingen data finns, returneras standardvärden.
 */
const loadAppData = (): AppData => {
  try {
    const stored = localStorage.getItem(MAIN_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Kunde inte läsa app-data från localStorage:", error);
  }
  
  // Om ingen data finns eller vid fel, returnera standardvärden
  return {
    classes: DEFAULT_CLASSES,
    toys: DEFAULT_TOYS,
    borrowed: [],
    timerSettings: DEFAULT_TIMER_SETTINGS,
    paxPoints: [],
    rastTracking: null,
    notReturned: [],
    notReturnedStats: [],
    adminPassword: null,
    adminPasswordSet: false,
  };
};

/**
 * Sparar all app-data till localStorage under den centrala nyckeln.
 * Denna funktion körs automatiskt varje gång något ändras i appen.
 */
const saveAppData = (data: AppData): void => {
  try {
    localStorage.setItem(MAIN_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Kunde inte spara app-data till localStorage:", error);
  }
};

// ============================================
// KLASSER - ELEVER OCH KLASSDATA
// ============================================

export const loadClasses = (): Class[] => {
  return loadAppData().classes;
};

export const saveClasses = (classes: Class[]): void => {
  const data = loadAppData();
  data.classes = classes;
  saveAppData(data);
};

// ============================================
// LEKSAKER - INKLUSIVE BILDER (BASE64)
// ============================================
// Bilder sparas som Base64-strängar i toy.image

export const loadToys = (): Toy[] => {
  return loadAppData().toys;
};

export const saveToys = (toys: Toy[]): void => {
  const data = loadAppData();
  data.toys = toys;
  saveAppData(data);
};

// ============================================
// UTLÅNADE LEKSAKER
// ============================================

export const loadBorrowedItems = (): BorrowedItem[] => {
  return loadAppData().borrowed;
};

export const saveBorrowedItems = (items: BorrowedItem[]): void => {
  const data = loadAppData();
  data.borrowed = items;
  saveAppData(data);
};

// ============================================
// ADMIN-LÖSENORD
// ============================================

export const getAdminPassword = (): string | null => {
  return loadAppData().adminPassword;
};

export const setAdminPassword = (password: string): void => {
  const data = loadAppData();
  data.adminPassword = password;
  data.adminPasswordSet = true;
  saveAppData(data);
};

export const isPasswordSet = (): boolean => {
  return loadAppData().adminPasswordSet;
};

// ============================================
// TIMER-INSTÄLLNINGAR
// ============================================

export const loadTimerSettings = (): TimerSettings => {
  return loadAppData().timerSettings;
};

export const saveTimerSettings = (settings: TimerSettings): void => {
  const data = loadAppData();
  data.timerSettings = settings;
  saveAppData(data);
};

// ============================================
// PAX-POÄNG
// ============================================

export const loadPaxPoints = (): PaxWeekPoints[] => {
  return loadAppData().paxPoints;
};

export const savePaxPoints = (points: PaxWeekPoints[]): void => {
  const data = loadAppData();
  data.paxPoints = points;
  saveAppData(data);
};

// ============================================
// RAST-TRACKING
// ============================================

export const loadRastTracking = (): RastTracking | null => {
  return loadAppData().rastTracking;
};

export const saveRastTracking = (tracking: RastTracking): void => {
  const data = loadAppData();
  data.rastTracking = tracking;
  saveAppData(data);
};

export const clearRastTracking = (): void => {
  const data = loadAppData();
  data.rastTracking = null;
  saveAppData(data);
};

// ============================================
// EJ ÅTERLÄMNADE LEKSAKER - POSTER
// ============================================

export const loadNotReturnedRecords = (): NotReturnedRecord[] => {
  return loadAppData().notReturned;
};

export const saveNotReturnedRecords = (records: NotReturnedRecord[]): void => {
  const data = loadAppData();
  data.notReturned = records;
  saveAppData(data);
};

export const addNotReturnedRecord = (record: NotReturnedRecord): void => {
  const records = loadNotReturnedRecords();
  records.push(record);
  saveNotReturnedRecords(records);
};

export const removeNotReturnedRecord = (recordId: string): void => {
  const records = loadNotReturnedRecords();
  const updated = records.filter(r => r.id !== recordId);
  saveNotReturnedRecords(updated);
};

export const updateNotReturnedRecord = (recordId: string, updates: Partial<NotReturnedRecord>): void => {
  const records = loadNotReturnedRecords();
  const updated = records.map(r => r.id === recordId ? { ...r, ...updates } : r);
  saveNotReturnedRecords(updated);
};

// ============================================
// EJ ÅTERLÄMNADE LEKSAKER - VECKOSTATISTIK
// ============================================

export const loadNotReturnedWeekStats = (): NotReturnedWeekStats[] => {
  return loadAppData().notReturnedStats;
};

export const saveNotReturnedWeekStats = (stats: NotReturnedWeekStats[]): void => {
  const data = loadAppData();
  data.notReturnedStats = stats;
  saveAppData(data);
};

export const addNotReturnedStat = (
  studentId: string,
  studentName: string,
  className: string,
  reason: 'lost' | 'refused' | 'stolen' | 'other',
  stolenBy?: string,
  otherReason?: string
): void => {
  const now = new Date();
  const weekNumber = getWeekNumber(now);
  const year = now.getFullYear();
  
  const stats = loadNotReturnedWeekStats();
  let weekData = stats.find(s => s.weekNumber === weekNumber && s.year === year);
  
  if (!weekData) {
    weekData = {
      weekNumber,
      year,
      studentStats: {},
    };
    stats.push(weekData);
  }
  
  if (!weekData.studentStats[studentId]) {
    weekData.studentStats[studentId] = {
      studentName,
      className,
      count: 0,
      reasons: [],
    };
  }
  
  weekData.studentStats[studentId].count++;
  weekData.studentStats[studentId].reasons.push({
    reason,
    stolenBy,
    otherReason,
    timestamp: now.toISOString(),
  });
  
  saveNotReturnedWeekStats(stats);
};

const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

// ============================================
// BACKUP OCH EXPORT/IMPORT FÖR NYA ENHETER
// ============================================
// Dessa funktioner används för att MANUELLT exportera och importera data
// mellan olika appar, enheter eller vid remix.
// Detta är INTE den primära lagringsmetoden - den används endast för migration.

/**
 * Exporterar ALL app-data som en JSON-sträng.
 * Används för manuella backuper och för att flytta data till andra enheter/appar.
 */
export const exportAllData = (): string => {
  const data = loadAppData();
  return JSON.stringify(data, null, 2);
};

/**
 * Importerar data från en JSON-sträng och ersätter all befintlig data.
 * Skapar automatiskt en backup innan importen genomförs.
 * Används för att återställa data från backup eller flytta data från annan enhet.
 */
export const importAllData = (jsonData: string): { success: boolean; error?: string } => {
  try {
    const newData = JSON.parse(jsonData);
    
    // Validera att det är en giltig AppData-struktur
    if (typeof newData !== 'object' || newData === null) {
      return { success: false, error: "Ogiltig datastruktur" };
    }
    
    // Skapa backup innan import
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupKey = `lekotek-backup-${timestamp}`;
    localStorage.setItem(backupKey, exportAllData());
    
    // Importera den nya datan
    saveAppData(newData as AppData);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: "Kunde inte läsa filen. Kontrollera att det är en giltig JSON-fil." };
  }
};

/**
 * Laddar ner all app-data som en JSON-fil till enheten.
 * Används för att skapa manuella backuper för säkerhetskopiering eller migration.
 */
export const downloadDataAsFile = (): void => {
  const data = exportAllData();
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const filename = `lekotek-data-${date}.json`;
  
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};