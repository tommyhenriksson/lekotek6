import { Class, Toy, BorrowedItem, TimerSettings, PaxWeekPoints, RastTracking, NotReturnedRecord, NotReturnedWeekStats } from "@/types";
import * as IDB from "./indexedDB";

// ============================================
// LAGRINGSNYCKEL FÖR ALL APP-DATA
// ============================================
// Denna nyckel används för att lagra ALL app-data i IndexedDB.
// Data bevaras även efter att appen publiceras om eller uppdateras i Lovable.
// IndexedDB används istället för localStorage för att hantera större datamängder (särskilt bilder).
const MAIN_STORAGE_KEY = "fritidsAppData";

// Flagga för om migrering från localStorage har körts
let migrationCompleted = false;

// ============================================
// DATASTRUKTUR FÖR ALL APP-DATA
// ============================================
// VIKTIGT: Version används för att hantera migreringar vid framtida uppdateringar
const CURRENT_DATA_VERSION = 2; // Öka detta nummer när datastrukturen ändras

interface AppData {
  version: number; // För att hantera migreringar
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
    { id: "session-1", name: "Rast 1", startTime: "09:30", endTime: "10:10", enabled: true },
    { id: "session-2", name: "Rast 2", startTime: "11:30", endTime: "12:10", enabled: true },
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
 * Migrerar data från äldre versioner till nuvarande struktur.
 * Detta säkerställer att befintlig data bevaras vid uppdateringar.
 */
const migrateData = (data: any): AppData => {
  console.log("[storage.migrateData] Kontrollerar dataversion:", data.version || 'ingen version');
  
  // Om data saknar version, sätt version 1
  if (!data.version) {
    data.version = 1;
  }
  
  // Migrering från version 1 till 2: Uppdatera timer-standardtider
  if (data.version === 1) {
    console.log("[storage.migrateData] Migrerar från version 1 till 2");
    if (data.timerSettings?.sessions) {
      data.timerSettings.sessions = data.timerSettings.sessions.map((session: any) => {
        if (session.id === "session-1" && (session.startTime !== "09:30" || session.endTime !== "10:10")) {
          console.log("[storage.migrateData] Uppdaterar Rast 1 till nya tider");
          return { ...session, startTime: "09:30", endTime: "10:10" };
        }
        if (session.id === "session-2" && (session.startTime !== "11:30" || session.endTime !== "12:10")) {
          console.log("[storage.migrateData] Uppdaterar Rast 2 till nya tider");
          return { ...session, startTime: "11:30", endTime: "12:10" };
        }
        return session;
      });
    }
    data.version = 2;
  }
  
  // Framtida migreringar läggs till här:
  // if (data.version === 2) {
  //   // Migrering från version 2 till 3
  //   data.version = 3;
  // }
  
  console.log("[storage.migrateData] Data migrerad till version:", data.version);
  return data;
};

/**
 * Läser all app-data från IndexedDB (eller localStorage vid första körningen).
 * Om ingen data finns, returneras standardvärden.
 * Befintlig data bevaras ALLTID och migreras vid behov.
 */
const loadAppData = async (): Promise<AppData> => {
  try {
    // Migrera från localStorage till IndexedDB vid första körningen
    if (!migrationCompleted && IDB.isIndexedDBAvailable()) {
      await IDB.migrateFromLocalStorage(MAIN_STORAGE_KEY);
      migrationCompleted = true;
    }
    
    // Hämta data från IndexedDB
    const stored = await IDB.getItem(MAIN_STORAGE_KEY);
    if (stored) {
      // Kör migrering om nödvändigt
      const migratedData = migrateData(stored);
      
      // Säkerställ att alla fält finns (fyller i saknade med standardvärden)
      const completeData: AppData = {
        version: migratedData.version || CURRENT_DATA_VERSION,
        classes: migratedData.classes || DEFAULT_CLASSES,
        toys: migratedData.toys || DEFAULT_TOYS,
        borrowed: migratedData.borrowed || [],
        timerSettings: migratedData.timerSettings || DEFAULT_TIMER_SETTINGS,
        paxPoints: migratedData.paxPoints || [],
        rastTracking: migratedData.rastTracking || null,
        notReturned: migratedData.notReturned || [],
        notReturnedStats: migratedData.notReturnedStats || [],
        adminPassword: migratedData.adminPassword || null,
        adminPasswordSet: migratedData.adminPasswordSet || false,
      };
      
      // Spara tillbaka migrerad data om version ändrades
      if (migratedData.version !== stored.version) {
        console.log("[storage.loadAppData] Sparar migrerad data");
        await saveAppData(completeData);
      }
      
      return completeData;
    }
  } catch (error) {
    console.error("Kunde inte läsa app-data från IndexedDB:", error);
  }
  
  // Om ingen data finns eller vid fel, returnera standardvärden
  console.log("[storage.loadAppData] Ingen befintlig data - skapar standardvärden");
  return {
    version: CURRENT_DATA_VERSION,
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
 * Sparar all app-data till IndexedDB under den centrala nyckeln.
 * Denna funktion körs automatiskt varje gång något ändras i appen.
 * Data säkerställs alltid ha korrekt version innan sparning.
 */
const saveAppData = async (data: AppData): Promise<void> => {
  try {
    // Säkerställ att version alltid är satt
    const dataToSave = {
      ...data,
      version: data.version || CURRENT_DATA_VERSION,
    };
    
    // Spara till IndexedDB
    await IDB.setItem(MAIN_STORAGE_KEY, dataToSave);
    
    // Spara även till localStorage som backup (om det får plats)
    try {
      localStorage.setItem(MAIN_STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (backupError) {
      // Om localStorage är fullt, fortsätt ändå - IndexedDB är primär lagring
      console.warn("[storage.saveAppData] Kunde inte spara backup till localStorage:", backupError);
    }
  } catch (error) {
    console.error("Kunde inte spara app-data till IndexedDB:", error);
    alert("Varning: Data kunde inte sparas. Försök igen.");
  }
};

// ============================================
// KLASSER - ELEVER OCH KLASSDATA
// ============================================

export const loadClasses = async (): Promise<Class[]> => {
  const data = await loadAppData();
  return data.classes;
};

export const saveClasses = async (classes: Class[]): Promise<void> => {
  const data = await loadAppData();
  data.classes = classes;
  await saveAppData(data);
};

// ============================================
// LEKSAKER - INKLUSIVE BILDER (BASE64)
// ============================================
// Bilder sparas som Base64-strängar i toy.image

export const loadToys = async (): Promise<Toy[]> => {
  const data = await loadAppData();
  return data.toys;
};

export const saveToys = async (toys: Toy[]): Promise<void> => {
  console.log("[storage.saveToys] Sparar leksaker, antal:", toys.length);
  const data = await loadAppData();
  data.toys = toys;
  await saveAppData(data);
  console.log("[storage.saveToys] IndexedDB uppdaterad med leksaker:", toys.map(t => t.name).join(", "));
};

// ============================================
// UTLÅNADE LEKSAKER
// ============================================

export const loadBorrowedItems = async (): Promise<BorrowedItem[]> => {
  const data = await loadAppData();
  return data.borrowed;
};

export const saveBorrowedItems = async (items: BorrowedItem[]): Promise<void> => {
  const data = await loadAppData();
  data.borrowed = items;
  await saveAppData(data);
};

// ============================================
// ADMIN-LÖSENORD
// ============================================

export const getAdminPassword = async (): Promise<string | null> => {
  const data = await loadAppData();
  return data.adminPassword;
};

export const setAdminPassword = async (password: string): Promise<void> => {
  const data = await loadAppData();
  data.adminPassword = password;
  data.adminPasswordSet = true;
  await saveAppData(data);
};

export const isPasswordSet = async (): Promise<boolean> => {
  const data = await loadAppData();
  return data.adminPasswordSet;
};

// ============================================
// TIMER-INSTÄLLNINGAR
// ============================================

export const loadTimerSettings = async (): Promise<TimerSettings> => {
  const data = await loadAppData();
  return data.timerSettings;
};

export const saveTimerSettings = async (settings: TimerSettings): Promise<void> => {
  const data = await loadAppData();
  data.timerSettings = settings;
  await saveAppData(data);
};

export const resetTimerSettingsToDefault = async (): Promise<void> => {
  const data = await loadAppData();
  data.timerSettings = DEFAULT_TIMER_SETTINGS;
  await saveAppData(data);
};

// ============================================
// PAX-POÄNG
// ============================================

export const loadPaxPoints = async (): Promise<PaxWeekPoints[]> => {
  const data = await loadAppData();
  return data.paxPoints;
};

export const savePaxPoints = async (points: PaxWeekPoints[]): Promise<void> => {
  const data = await loadAppData();
  data.paxPoints = points;
  await saveAppData(data);
};

// ============================================
// RAST-TRACKING
// ============================================

export const loadRastTracking = async (): Promise<RastTracking | null> => {
  const data = await loadAppData();
  return data.rastTracking;
};

export const saveRastTracking = async (tracking: RastTracking): Promise<void> => {
  const data = await loadAppData();
  data.rastTracking = tracking;
  await saveAppData(data);
};

export const clearRastTracking = async (): Promise<void> => {
  const data = await loadAppData();
  data.rastTracking = null;
  await saveAppData(data);
};

// ============================================
// EJ ÅTERLÄMNADE LEKSAKER - POSTER
// ============================================

export const loadNotReturnedRecords = async (): Promise<NotReturnedRecord[]> => {
  const data = await loadAppData();
  return data.notReturned;
};

export const saveNotReturnedRecords = async (records: NotReturnedRecord[]): Promise<void> => {
  const data = await loadAppData();
  data.notReturned = records;
  await saveAppData(data);
};

export const addNotReturnedRecord = async (record: NotReturnedRecord): Promise<void> => {
  const records = await loadNotReturnedRecords();
  records.push(record);
  await saveNotReturnedRecords(records);
};

export const removeNotReturnedRecord = async (recordId: string): Promise<void> => {
  const records = await loadNotReturnedRecords();
  const updated = records.filter(r => r.id !== recordId);
  await saveNotReturnedRecords(updated);
};

export const updateNotReturnedRecord = async (recordId: string, updates: Partial<NotReturnedRecord>): Promise<void> => {
  const records = await loadNotReturnedRecords();
  const updated = records.map(r => r.id === recordId ? { ...r, ...updates } : r);
  await saveNotReturnedRecords(updated);
};

// ============================================
// EJ ÅTERLÄMNADE LEKSAKER - VECKOSTATISTIK
// ============================================

export const loadNotReturnedWeekStats = async (): Promise<NotReturnedWeekStats[]> => {
  const data = await loadAppData();
  return data.notReturnedStats;
};

export const saveNotReturnedWeekStats = async (stats: NotReturnedWeekStats[]): Promise<void> => {
  const data = await loadAppData();
  data.notReturnedStats = stats;
  await saveAppData(data);
};

export const addNotReturnedStat = async (
  studentId: string,
  studentName: string,
  className: string,
  reason: 'lost' | 'refused' | 'stolen' | 'other',
  stolenBy?: string,
  otherReason?: string
): Promise<void> => {
  const now = new Date();
  const weekNumber = getWeekNumber(now);
  const year = now.getFullYear();
  
  const stats = await loadNotReturnedWeekStats();
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
  
  await saveNotReturnedWeekStats(stats);
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
 * LÄSER ALLTID DIREKT FRÅN IndexedDB för att garantera senaste datan.
 */
export const exportAllData = async (): Promise<string> => {
  console.log("[storage.exportAllData] Läser data DIREKT från IndexedDB...");
  
  // Läs alltid direkt från IndexedDB (inte från cache eller state)
  const data = await loadAppData();
  
  console.log("[storage.exportAllData] Antal leksaker i export:", data.toys.length);
  console.log("[storage.exportAllData] Leksaker:", data.toys.map(t => t.name).join(", "));
  console.log("[storage.exportAllData] Leksaker med bilder:", data.toys.filter(t => t.image).map(t => `${t.name} (${t.image?.substring(0, 30)}...)`).join(", "));
  
  return JSON.stringify(data, null, 2);
};

/**
 * Importerar data från en JSON-sträng med SMART SAMMANFOGNING.
 * Jämför och sammanfogar data istället för att skriva över allt.
 * Skapar automatiskt en backup innan importen genomförs.
 */
export const importAllData = async (jsonData: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const importedData = JSON.parse(jsonData);
    
    // Validera att det är en giltig AppData-struktur
    if (typeof importedData !== 'object' || importedData === null) {
      return { success: false, error: "Ogiltig datastruktur" };
    }
    
    console.log("[storage.importAllData] Startar smart import...");
    
    // Skapa backup innan import
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupKey = `lekotek-backup-${timestamp}`;
    const exportedData = await exportAllData();
    await IDB.setItem(backupKey, JSON.parse(exportedData));
    console.log("[storage.importAllData] Backup skapad i IndexedDB:", backupKey);
    
    // Läs befintlig data
    const existingData = await loadAppData();
    
    // SMART SAMMANFOGNING AV LEKSAKER
    // Behåll befintliga leksaker och lägg till nya från importen
    const existingToyIds = new Set(existingData.toys.map(t => t.id));
    const newToysToAdd = importedData.toys?.filter((t: Toy) => !existingToyIds.has(t.id)) || [];
    
    // Uppdatera befintliga leksaker om de finns i importen
    const updatedToys = existingData.toys.map(existingToy => {
      const importedToy = importedData.toys?.find((t: Toy) => t.id === existingToy.id);
      if (importedToy) {
        // Om leksaken finns i importen, använd den importerade versionen
        console.log(`[storage.importAllData] Uppdaterar leksak: ${existingToy.name} -> ${importedToy.name}`);
        return importedToy;
      }
      return existingToy;
    });
    
    // Kombinera uppdaterade och nya leksaker
    const mergedToys = [...updatedToys, ...newToysToAdd];
    console.log(`[storage.importAllData] Leksaker efter sammanfogning: ${mergedToys.length} (${updatedToys.length} befintliga, ${newToysToAdd.length} nya)`);
    
    // SMART SAMMANFOGNING AV KLASSER
    const existingClassNames = new Set(existingData.classes.map(c => c.name));
    const newClassesToAdd = importedData.classes?.filter((c: Class) => !existingClassNames.has(c.name)) || [];
    
    const updatedClasses = existingData.classes.map(existingClass => {
      const importedClass = importedData.classes?.find((c: Class) => c.name === existingClass.name);
      if (importedClass) {
        console.log(`[storage.importAllData] Uppdaterar klass: ${existingClass.name}`);
        return importedClass;
      }
      return existingClass;
    });
    
    const mergedClasses = [...updatedClasses, ...newClassesToAdd];
    console.log(`[storage.importAllData] Klasser efter sammanfogning: ${mergedClasses.length}`);
    
    // SAMMANFOGAD DATA
    const mergedData: AppData = {
      version: CURRENT_DATA_VERSION, // Använd alltid senaste versionen
      classes: mergedClasses,
      toys: mergedToys,
      borrowed: importedData.borrowed || existingData.borrowed,
      timerSettings: importedData.timerSettings || existingData.timerSettings,
      paxPoints: importedData.paxPoints || existingData.paxPoints,
      rastTracking: importedData.rastTracking || existingData.rastTracking,
      notReturned: importedData.notReturned || existingData.notReturned,
      notReturnedStats: importedData.notReturnedStats || existingData.notReturnedStats,
      adminPassword: existingData.adminPassword, // Behåll alltid befintligt lösenord
      adminPasswordSet: existingData.adminPasswordSet,
    };
    
    // Spara sammanfogad data
    await saveAppData(mergedData);
    console.log("[storage.importAllData] Import slutförd!");
    
    return { success: true };
  } catch (error) {
    console.error("[storage.importAllData] Importfel:", error);
    return { success: false, error: "Kunde inte läsa filen. Kontrollera att det är en giltig JSON-fil." };
  }
};

/**
 * Laddar ner all app-data som en JSON-fil till enheten.
 * GARANTERAR att senaste datan från IndexedDB exporteras.
 */
export const downloadDataAsFile = async (): Promise<void> => {
  console.log("[storage.downloadDataAsFile] Startar export...");
  
  // Läs alltid direkt från IndexedDB för att garantera senaste datan
  const data = await exportAllData();
  
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '');
  const filename = `lekotek-data-${date}-${time}.json`;
  
  console.log("[storage.downloadDataAsFile] Skapar fil:", filename);
  
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  console.log("[storage.downloadDataAsFile] Export slutförd!");
};