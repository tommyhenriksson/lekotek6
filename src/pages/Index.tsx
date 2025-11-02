import { useState, useEffect, useCallback } from "react";
import Navigation from "@/components/Navigation";
import BorrowView from "@/components/BorrowView";
import BorrowedView from "@/components/BorrowedView";
import AdminViewNew from "@/components/AdminViewNew";
import { Class, Toy, BorrowedItem, TimerSettings, PaxWeekPoints, RastTracking, NotReturnedRecord } from "@/types";
import {
  loadClasses,
  saveClasses,
  loadToys,
  saveToys,
  loadBorrowedItems,
  saveBorrowedItems,
  loadTimerSettings,
  saveTimerSettings,
  loadPaxPoints,
  savePaxPoints,
  loadRastTracking,
  saveRastTracking,
  loadNotReturnedRecords,
  addNotReturnedRecord,
} from "@/utils/storage";

type Tab = "borrow" | "borrowed" | "admin";

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("borrow");
  const [classes, setClasses] = useState<Class[]>([]);
  const [toys, setToys] = useState<Toy[]>([]);
  const [borrowedItems, setBorrowedItems] = useState<BorrowedItem[]>([]);
  const [timerSettings, setTimerSettings] = useState<TimerSettings>({
    sessions: [],
    timerType: 'digital',
    warningMinutes: 15,
    delayMinutes: 30,
    alarmSound: 'bell',
    alarmVolume: 80,
  });
  const [paxPoints, setPaxPoints] = useState<PaxWeekPoints[]>([]);
  const [notReturnedRecords, setNotReturnedRecords] = useState<NotReturnedRecord[]>([]);

  // Load data on mount
  // All migrering hanteras nu automatiskt i storage.ts
  useEffect(() => {
    const loadData = async () => {
      setClasses(await loadClasses());
      setToys(await loadToys());
      setBorrowedItems(await loadBorrowedItems());
      setTimerSettings(await loadTimerSettings());
      setPaxPoints(await loadPaxPoints());
      setNotReturnedRecords(await loadNotReturnedRecords());
    };
    loadData();
  }, []);

  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const getCurrentSession = (): string | null => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const activeSession = timerSettings.sessions.find(session => {
      if (!session.enabled) return false;
      return currentTime >= session.startTime && currentTime <= session.endTime;
    });
    
    return activeSession?.id || null;
  };

  const handleBorrow = async (
    studentId: string,
    studentName: string,
    toyId: string,
    toyName: string
  ) => {
    // Find student's class
    const studentClass = classes.find(c => 
      c.students.some(s => s.id === studentId)
    );
    
    // Find toy details
    const toy = toys.find(t => t.id === toyId);
    
    // Decrease toy quantity
    const updatedToys = toys.map((toy) =>
      toy.id === toyId ? { ...toy, quantity: toy.quantity - 1 } : toy
    );
    setToys(updatedToys);
    await saveToys(updatedToys);

    // Add borrowed item
    const newBorrowedItem: BorrowedItem = {
      id: `${studentId}-${toyId}-${Date.now()}`,
      studentId,
      studentName,
      className: studentClass?.name || "",
      classColor: studentClass?.color,
      toyId,
      toyName,
      toyIcon: toy?.icon || "🎲",
      toyImage: toy?.image,
      borrowedAt: new Date().toISOString(),
    };
    const updatedBorrowed = [...borrowedItems, newBorrowedItem];
    setBorrowedItems(updatedBorrowed);
    await saveBorrowedItems(updatedBorrowed);

    // Track borrow statistics
    if (studentClass) {
      const currentWeek = getWeekNumber(new Date());
      const currentYear = new Date().getFullYear();
      
      let weekData = paxPoints.find(p => p.weekNumber === currentWeek && p.year === currentYear);
      
      if (!weekData) {
        weekData = {
          weekNumber: currentWeek,
          year: currentYear,
          classPoints: {},
          classBorrows: {},
          classReturns: {},
        };
        paxPoints.push(weekData);
      }
      
      if (!weekData.classBorrows) weekData.classBorrows = {};
      if (!weekData.classReturns) weekData.classReturns = {};
      
      weekData.classBorrows[studentClass.name] = (weekData.classBorrows[studentClass.name] || 0) + 1;
      
      const updatedPaxPoints = [...paxPoints];
      setPaxPoints(updatedPaxPoints);
      await savePaxPoints(updatedPaxPoints);
    }
  };

  const handleReturn = async (itemId: string) => {
    const item = borrowedItems.find((b) => b.id === itemId);
    if (!item) return;

    // Increase toy quantity
    const updatedToys = toys.map((toy) =>
      toy.id === item.toyId ? { ...toy, quantity: toy.quantity + 1 } : toy
    );
    setToys(updatedToys);
    await saveToys(updatedToys);

    // Remove borrowed item
    const updatedBorrowed = borrowedItems.filter((b) => b.id !== itemId);
    setBorrowedItems(updatedBorrowed);
    await saveBorrowedItems(updatedBorrowed);

    // Track return statistics and PAX Points logic
    const currentWeek = getWeekNumber(new Date());
    const currentYear = new Date().getFullYear();
    
    let weekData = paxPoints.find(p => p.weekNumber === currentWeek && p.year === currentYear);
    
    if (!weekData) {
      weekData = {
        weekNumber: currentWeek,
        year: currentYear,
        classPoints: {},
        classBorrows: {},
        classReturns: {},
      };
      paxPoints.push(weekData);
    }
    
    if (!weekData.classBorrows) weekData.classBorrows = {};
    if (!weekData.classReturns) weekData.classReturns = {};
    
    // Track return
    weekData.classReturns[item.className] = (weekData.classReturns[item.className] || 0) + 1;
    
    const currentSession = getCurrentSession();
    if (currentSession) {
      const today = new Date().toISOString().split('T')[0];
      
      // Load or create rast tracking
      let rastTracking = await loadRastTracking();
      
      // Check if we need to reset tracking (new session or new day)
      if (!rastTracking || rastTracking.sessionId !== currentSession || rastTracking.date !== today) {
        rastTracking = {
          sessionId: currentSession,
          date: today,
          studentsWithPoints: [],
        };
      }
      
      // Check if student already got points this session
      if (!rastTracking.studentsWithPoints.includes(item.studentId)) {
        // Award point
        rastTracking.studentsWithPoints.push(item.studentId);
        await saveRastTracking(rastTracking);
        
        // Update points
        weekData.classPoints[item.className] = (weekData.classPoints[item.className] || 0) + 1;
      }
    }
    
    const updatedPaxPoints = [...paxPoints];
    setPaxPoints(updatedPaxPoints);
    await savePaxPoints(updatedPaxPoints);
  };

  const handleSaveClasses = useCallback(async (newClasses: Class[]) => {
    setClasses(newClasses);
    await saveClasses(newClasses);
  }, []);

  const handleSaveToys = useCallback(async (newToys: Toy[]) => {
    console.log("[Index.handleSaveToys] Sparar leksaker, antal:", newToys.length);
    console.log("[Index.handleSaveToys] Leksaker:", newToys.map(t => t.name).join(", "));
    console.log("[Index.handleSaveToys] Leksaker med bilder:", newToys.filter(t => t.image).map(t => `${t.name} (${t.image?.substring(0, 30)}...)`).join(", "));
    setToys(newToys);
    await saveToys(newToys);
    console.log("[Index.handleSaveToys] IndexedDB uppdaterad");
  }, []);

  const handleSaveTimerSettings = useCallback(async (newSettings: TimerSettings) => {
    setTimerSettings(newSettings);
    await saveTimerSettings(newSettings);
  }, []);

  const handleRefreshNotReturned = async () => {
    setNotReturnedRecords(await loadNotReturnedRecords());
  };

  // Check for students who haven't returned items after delay time following session end
  useEffect(() => {
    console.log("[Index] useEffect körs - timerSettings eller borrowedItems ändrades");
    console.log("[Index] Antal lånade items:", borrowedItems.length);
    console.log("[Index] Aktiva sessioner:", timerSettings.sessions.filter(s => s.enabled).length);
    console.log("[Index] Fördröjning (minuter):", timerSettings.delayMinutes);
    
    // Perform immediate check for any sessions that should have triggered already
    const performImmediateCheck = async () => {
      if (borrowedItems.length === 0) return;
      
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      for (const session of timerSettings.sessions) {
        if (!session.enabled) continue;
        
        const [endHour, endMinute] = session.endTime.split(':').map(Number);
        const delayMinutes = timerSettings.delayMinutes || 30;
        
        // Calculate check time (session end + delay)
        const totalMinutes = endHour * 60 + endMinute + delayMinutes;
        const checkHour = Math.floor(totalMinutes / 60);
        const checkMinute = totalMinutes % 60;
        const checkTime = `${String(checkHour).padStart(2, '0')}:${String(checkMinute).padStart(2, '0')}`;
        
        // If current time is past check time, perform check for this session
        if (currentTime >= checkTime && currentTime < "23:59") {
          console.log("[Index] Omedelbar kontroll för session:", session.name, "Kontrolltid:", checkTime);
          await performCheck(session);
        }
      }
    };
    
    const scheduleNextCheck = () => {
      const now = new Date();
      
      // Find next session to check
      let nextCheckTime: Date | null = null;
      let nextSession: typeof timerSettings.sessions[0] | null = null;
      
      timerSettings.sessions.forEach(session => {
        if (!session.enabled) return;
        
        const [endHour, endMinute] = session.endTime.split(':').map(Number);
        const delayMinutes = timerSettings.delayMinutes || 30;
        
        // Calculate check time (session end + delay)
        const totalMinutes = endHour * 60 + endMinute + delayMinutes;
        const checkHour = Math.floor(totalMinutes / 60);
        const checkMinute = totalMinutes % 60;
        
        const checkTime = new Date();
        checkTime.setHours(checkHour, checkMinute, 0, 0);
        
        // If time has passed today, set to tomorrow
        if (checkTime <= now) {
          checkTime.setDate(checkTime.getDate() + 1);
        }
        
        // Save if this is the nearest check time
        if (!nextCheckTime || checkTime < nextCheckTime) {
          nextCheckTime = checkTime;
          nextSession = session;
        }
      });
      
      if (!nextCheckTime || !nextSession) {
        console.log("[Index] Ingen session att schemalägga");
        return null;
      }
      
      // Calculate milliseconds until next check
      const msUntilCheck = nextCheckTime.getTime() - now.getTime();
      const minutesUntilCheck = Math.round(msUntilCheck / 60000);
      
      console.log("[Index] Schemalägger nästa kontroll för session:", nextSession.name);
      console.log("[Index] Kontrolltid:", nextCheckTime.toLocaleString('sv-SE'));
      console.log("[Index] Om (minuter):", minutesUntilCheck);
      
      // Schedule the check
      const timeoutId = setTimeout(() => {
        console.log("[Index] Kör schemalagd kontroll för session:", nextSession!.name);
        performCheck(nextSession!);
      }, msUntilCheck);
      
      return timeoutId;
    };
    
    const performCheck = async (session: typeof timerSettings.sessions[0]) => {
      console.log("[Index] performCheck körs för session:", session.name);
      console.log("[Index] Antal lånade items att kontrollera:", borrowedItems.length);
      
      if (borrowedItems.length === 0) {
        console.log("[Index] Inga lånade items - hoppar över kontrollen");
        return;
      }
      
      // Group by student and add records
      const studentMap = new Map<string, BorrowedItem[]>();
      borrowedItems.forEach(item => {
        const existing = studentMap.get(item.studentId) || [];
        existing.push(item);
        studentMap.set(item.studentId, existing);
      });
      
      console.log("[Index] Antal elever som inte lämnat tillbaka:", studentMap.size);
      
      // Check if records already exist to avoid duplicates
      const existingRecords = await loadNotReturnedRecords();
      
      for (const [studentId, items] of studentMap.entries()) {
        // Skip if student already has a not-returned record
        if (existingRecords.some(r => r.studentId === studentId)) {
          console.log("[Index] Eleven har redan en 'Ej lämnat'-record, hoppar över:", items[0].studentName);
          continue;
        }
        
        const firstItem = items[0];
        const record: NotReturnedRecord = {
          id: `${studentId}-${Date.now()}`,
          studentId,
          studentName: firstItem.studentName,
          className: firstItem.className,
          sessionEndTime: session.endTime,
          sessionName: session.name,
          checkedAt: new Date().toISOString(),
          borrowedItems: items.map(item => ({
            toyId: item.toyId,
            toyName: item.toyName,
            borrowedAt: item.borrowedAt,
          })),
        };
        console.log("[Index] Lägger till 'Ej lämnat'-record för elev:", firstItem.studentName);
        await addNotReturnedRecord(record);
      }
      
      setNotReturnedRecords(await loadNotReturnedRecords());
      console.log("[Index] 'Ej lämnat'-records uppdaterade");
    };
    
    // Run immediate check first
    performImmediateCheck();
    
    // Then schedule next check
    const timeoutId = scheduleNextCheck();
    
    return () => {
      if (timeoutId) {
        console.log("[Index] Rensar timeout vid useEffect cleanup");
        clearTimeout(timeoutId);
      }
    };
  }, [timerSettings, borrowedItems]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      {activeTab === "borrow" && (
        <BorrowView
          classes={classes}
          toys={toys}
          borrowedItems={borrowedItems}
          timerSettings={timerSettings}
          notReturnedRecords={notReturnedRecords}
          onBorrow={handleBorrow}
          onRefreshNotReturned={handleRefreshNotReturned}
        />
      )}
      
      {activeTab === "borrowed" && (
        <BorrowedView 
          borrowedItems={borrowedItems} 
          notReturnedRecords={notReturnedRecords}
          onRefreshNotReturned={handleRefreshNotReturned}
          onReturn={handleReturn} 
        />
      )}
      
      {activeTab === "admin" && (
        <AdminViewNew
          classes={classes}
          toys={toys}
          timerSettings={timerSettings}
          paxPoints={paxPoints}
          notReturnedRecords={notReturnedRecords}
          onSaveClasses={handleSaveClasses}
          onSaveToys={handleSaveToys}
          onSaveTimerSettings={handleSaveTimerSettings}
          onRefreshNotReturned={handleRefreshNotReturned}
        />
      )}
    </div>
  );
};

export default Index;
