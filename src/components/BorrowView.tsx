import { useState, useEffect } from "react";
import { Class, Student, Toy, BorrowedItem, TimerSettings, NotReturnedRecord } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import CleaningTimer from "./CleaningTimer";
import { removeNotReturnedRecord } from "@/utils/storage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BorrowViewProps {
  classes: Class[];
  toys: Toy[];
  borrowedItems: BorrowedItem[];
  timerSettings: TimerSettings;
  notReturnedRecords: NotReturnedRecord[];
  onBorrow: (studentId: string, studentName: string, toyId: string, toyName: string) => void;
  onRefreshNotReturned: () => void;
}

const BorrowView = ({ classes, toys, borrowedItems, timerSettings, notReturnedRecords, onBorrow, onRefreshNotReturned }: BorrowViewProps) => {
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [confirmToy, setConfirmToy] = useState<Toy | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hasStudentBorrowed = (studentId: string) => {
    return borrowedItems.some(item => item.studentId === studentId);
  };

  const isStudentNotReturned = (studentId: string) => {
    return notReturnedRecords.some(record => record.studentId === studentId && record.blockedFromBorrowing);
  };

  const handleRemoveNotReturned = (studentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const record = notReturnedRecords.find(r => r.studentId === studentId);
    if (record) {
      removeNotReturnedRecord(record.id);
      onRefreshNotReturned();
      toast.success("Eleven har tagits bort från listan");
    }
  };

  const isSessionActive = (): boolean => {
    const now = currentTime;
    const currentTotalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    for (const session of timerSettings.sessions) {
      if (!session.enabled) continue;

      const [startHour, startMin] = session.startTime.split(":").map(Number);
      const [endHour, endMin] = session.endTime.split(":").map(Number);
      const startSeconds = startHour * 3600 + startMin * 60;
      const endSeconds = endHour * 3600 + endMin * 60;

      if (currentTotalSeconds >= startSeconds && currentTotalSeconds < endSeconds) {
        return true;
      }
    }
    return false;
  };

  const isBorrowingBlocked = (): boolean => {
    if (!isSessionActive()) return false;
    
    const now = currentTime;
    const currentTotalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    for (const session of timerSettings.sessions) {
      if (!session.enabled) continue;

      const [startHour, startMin] = session.startTime.split(":").map(Number);
      const [endHour, endMin] = session.endTime.split(":").map(Number);
      const startSeconds = startHour * 3600 + startMin * 60;
      const endSeconds = endHour * 3600 + endMin * 60;

      if (currentTotalSeconds >= startSeconds && currentTotalSeconds < endSeconds) {
        const secondsRemaining = endSeconds - currentTotalSeconds;
        // Block when remaining time is warning minutes or less
        return secondsRemaining <= timerSettings.warningMinutes * 60;
      }
    }
    return false;
  };

  const handleClassSelect = (classGroup: Class) => {
    setSelectedClass(classGroup);
    setSelectedStudent(null);
  };

  const handleBackToClasses = () => {
    setSelectedClass(null);
    setSelectedStudent(null);
  };

  const handleToySelect = (toy: Toy) => {
    if (!selectedStudent) {
      toast.error("Välj en elev först!");
      return;
    }

    if (isBorrowingBlocked()) {
      toast.error(`Utlåningsstopp! Det är mindre än ${timerSettings.warningMinutes} minuter kvar till stängning. Elever kan fortfarande lämna tillbaka leksaker.`);
      return;
    }

    if (hasStudentBorrowed(selectedStudent.id)) {
      toast.error(`${selectedStudent.name} har redan lånat en leksak!`);
      return;
    }

    if (toy.quantity <= 0) {
      toast.error("Denna leksak är slut!");
      return;
    }

    setConfirmToy(toy);
  };

  const confirmBorrow = () => {
    if (!selectedStudent || !confirmToy) return;
    
    onBorrow(selectedStudent.id, selectedStudent.name, confirmToy.id, confirmToy.name);
    toast.success(`${selectedStudent.name} lånade ${confirmToy.name}!`);
    setSelectedStudent(null);
    setConfirmToy(null);
  };

  return (
    <div className="flex flex-col gap-6 p-4 pb-20 max-w-screen-2xl mx-auto">
      {/* Timer */}
      <CleaningTimer settings={timerSettings} />
      
      {/* Students Section */}
      <div>
        {!selectedClass ? (
          <>
            <h2 className="text-2xl font-bold mb-4 text-foreground">Välj Klass</h2>
            <div className="grid gap-3">
              {classes.map((classGroup) => {
                const textColor = classGroup.color || "#8B5CF6";
                const bgColor = `${textColor}1A`; // Add alpha for 10% opacity
                
                return (
                  <Card
                    key={classGroup.name}
                    className="p-5 cursor-pointer transition-all rounded-xl hover:shadow-lg active:scale-95"
                    style={{ backgroundColor: bgColor }}
                    onClick={() => handleClassSelect(classGroup)}
                  >
                    <h3 className="text-xl font-semibold" style={{ color: textColor }}>{classGroup.name}</h3>
                    <p className="text-muted-foreground mt-1">{classGroup.students.length} elever</p>
                  </Card>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <Button
                variant="outline"
                onClick={handleBackToClasses}
                className="rounded-xl"
                size="sm"
              >
                ← Tillbaka
              </Button>
              <h2 className="text-xl font-bold text-foreground">{selectedClass.name}</h2>
            </div>
            <div className="grid grid-cols-3 gap-2" style={{ gridAutoFlow: 'column', gridTemplateRows: `repeat(${Math.ceil(selectedClass.students.length / 3)}, minmax(0, 1fr))` }}>
              {[...selectedClass.students]
                .sort((a, b) => a.name.localeCompare(b.name, 'sv'))
                .map((student) => {
                  const borrowed = hasStudentBorrowed(student.id);
                  const notReturned = isStudentNotReturned(student.id);
                  const isSelected = selectedStudent?.id === student.id;
                  
                  return (
                  <Card
                    key={student.id}
                    className={`p-3 transition-all rounded-xl ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-lg cursor-pointer"
                        : borrowed || notReturned
                        ? "bg-muted opacity-50 cursor-not-allowed"
                        : "cursor-pointer active:scale-95"
                    }`}
                    onClick={() => !borrowed && !notReturned && setSelectedStudent(student)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base font-medium flex-1">
                        {student.name}
                      </span>
                      {borrowed && !notReturned && <CheckCircle2 className="h-4 w-4" />}
                    </div>
                  </Card>
                  );
                })}
            </div>
          </>
        )}
      </div>

      {/* Toys Section */}
      <div>
        <h2 className="text-xl font-bold mb-3 text-foreground">
          Välj Leksak
        </h2>
        {selectedStudent && (
          <p className="text-base text-muted-foreground mb-4">
            för {selectedStudent.name}
          </p>
        )}
        {isBorrowingBlocked() && (
          <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500 rounded-xl">
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
              ⚠️ Utlåningsstopp! Det är mindre än {timerSettings.warningMinutes} minuter kvar till stängning. Elever kan fortfarande lämna tillbaka.
            </p>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          {toys.map((toy) => {
            const canBorrow = toy.quantity > 0 && selectedStudent && !isBorrowingBlocked();
            return (
            <Card
              key={toy.id}
              className={`p-3 rounded-xl transition-all ${
                canBorrow
                  ? "cursor-pointer active:scale-95"
                  : "opacity-50 cursor-not-allowed"
              }`}
              onClick={() => canBorrow && handleToySelect(toy)}
            >
            <div className="text-center space-y-2">
                {toy.image ? (
                  <img src={toy.image} alt={toy.name} className="w-12 h-12 mx-auto object-cover rounded-lg" />
                ) : (
                  <div className="text-3xl">{toy.icon}</div>
                )}
                <h3 className="text-sm font-semibold line-clamp-1">{toy.name}</h3>
                <div
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    toy.quantity > 0
                      ? "bg-accent text-accent-foreground"
                      : "bg-destructive text-destructive-foreground"
                  }`}
                >
                  {toy.quantity > 0 ? toy.quantity : "Slut"}
                </div>
              </div>
            </Card>
            );
          })}
        </div>
      </div>

      <AlertDialog open={!!confirmToy} onOpenChange={(open) => !open && setConfirmToy(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bekräfta lån</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedStudent && confirmToy && (
                <>Vill du låna ut {confirmToy.name} till {selectedStudent.name}?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBorrow}>Bekräfta</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BorrowView;
