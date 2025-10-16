import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Clock, Bell } from "lucide-react";
import { TimerSettings, CleaningSession } from "@/types";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CleaningTimerProps {
  settings: TimerSettings;
}

const CleaningTimer = ({ settings }: CleaningTimerProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hasWarned, setHasWarned] = useState(false);
  const [hasAlarmed, setHasAlarmed] = useState(false);
  const [showAlarmDialog, setShowAlarmDialog] = useState(false);

  // Generate unique key for this session on this date
  const getSessionKey = (session: CleaningSession) => {
    const today = new Date().toDateString();
    return `alarm-acknowledged-${session.name}-${session.startTime}-${today}`;
  };

  // Check if alarm has been acknowledged for current session
  const hasAcknowledgedAlarm = (session: CleaningSession) => {
    const key = getSessionKey(session);
    return localStorage.getItem(key) === 'true';
  };

  // Mark alarm as acknowledged for current session
  const acknowledgeAlarm = (session: CleaningSession) => {
    const key = getSessionKey(session);
    localStorage.setItem(key, 'true');
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getCurrentSession = (): CleaningSession | null => {
    const now = currentTime;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const session of settings.sessions) {
      if (!session.enabled) continue;

      const [startHour, startMin] = session.startTime.split(":").map(Number);
      const [endHour, endMin] = session.endTime.split(":").map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
        return session;
      }
    }
    return null;
  };

  const getTimeRemaining = (session: CleaningSession): number => {
    const now = currentTime;
    const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const [endHour, endMin] = session.endTime.split(":").map(Number);
    const endSeconds = endHour * 3600 + endMin * 60;
    const secondsRemaining = endSeconds - currentSeconds;
    return Math.floor(secondsRemaining / 60);
  };

  const getTimeRemainingInSeconds = (session: CleaningSession): number => {
    const now = currentTime;
    const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const [endHour, endMin] = session.endTime.split(":").map(Number);
    const endSeconds = endHour * 3600 + endMin * 60;
    return endSeconds - currentSeconds;
  };

  const currentSession = getCurrentSession();
  const minutesRemaining = currentSession ? getTimeRemaining(currentSession) : null;
  const secondsRemaining = currentSession ? getTimeRemainingInSeconds(currentSession) : null;

  const playAlarmSound = () => {
    if (settings.alarmSound === 'none') return;
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    gainNode.gain.value = settings.alarmVolume / 100;
    
    // Different sound patterns
    if (settings.alarmSound === 'beep') {
      oscillator.frequency.value = 800;
      oscillator.type = 'square';
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } else if (settings.alarmSound === 'bell') {
      oscillator.frequency.value = 1000;
      oscillator.type = 'sine';
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
      oscillator.stop(audioContext.currentTime + 1);
    } else if (settings.alarmSound === 'chime') {
      oscillator.frequency.value = 523.25; // C5
      oscillator.type = 'sine';
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 659.25; // E5
        osc2.type = 'sine';
        gain2.gain.value = settings.alarmVolume / 100;
        osc2.start();
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        osc2.stop(audioContext.currentTime + 0.5);
      }, 300);
    }
  };

  // Warning and alarm logic
  useEffect(() => {
    if (!currentSession || secondsRemaining === null) {
      setHasWarned(false);
      setHasAlarmed(false);
      return;
    }

    // Check if already acknowledged for this session
    if (hasAcknowledgedAlarm(currentSession)) {
      setHasWarned(true); // Prevent showing again
      return;
    }

    // Use exact seconds comparison to match BorrowView's timing
    if (secondsRemaining <= settings.warningMinutes * 60 && secondsRemaining > 0 && !hasWarned) {
      setShowAlarmDialog(true);
      playAlarmSound();
      setHasWarned(true);
    } else if (secondsRemaining <= 0 && !hasAlarmed) {
      setHasAlarmed(true);
      setHasWarned(false);
    }
  }, [secondsRemaining, hasWarned, hasAlarmed, currentSession, settings.warningMinutes]);

  if (!currentSession || minutesRemaining === null || minutesRemaining < 0) {
    return null;
  }

  const [endHour, endMin] = currentSession.endTime.split(":").map(Number);
  const endSeconds = endHour * 3600 + endMin * 60;
  const currentSeconds = currentTime.getHours() * 3600 + currentTime.getMinutes() * 60 + currentTime.getSeconds();
  const totalSeconds = endSeconds - currentSeconds;
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const [sessionStartHour] = currentSession.startTime.split(":").map(Number);
  const [sessionEndHour, sessionEndMin] = currentSession.endTime.split(":").map(Number);
  const sessionTotalMinutes = (sessionEndHour * 60 + sessionEndMin) - (sessionStartHour * 60);
  const percentage = (minutesRemaining / sessionTotalMinutes) * 100;

  const isWarning = minutesRemaining <= settings.warningMinutes;
  const isCritical = minutesRemaining <= 5;

  return (
    <>
      <AlertDialog open={showAlarmDialog} onOpenChange={setShowAlarmDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-2xl">
              <Bell className="h-8 w-8 text-destructive animate-pulse" />
              Dags att städa!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-lg">
              Stängningstiden är här. Påminn alla om att lämna tillbaka leksakerna och börja städa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => {
                if (currentSession) {
                  acknowledgeAlarm(currentSession);
                }
                setShowAlarmDialog(false);
              }} 
              className="rounded-xl"
            >
              Uppfattat!
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className={`p-6 rounded-2xl mb-6 transition-all ${
        isCritical ? "bg-destructive/20 border-destructive" : 
        isWarning ? "bg-yellow-500/20 border-yellow-500" : 
        "border-primary"
      }`}>
      <div className="flex items-center gap-3 mb-4">
        {isCritical ? <Bell className="h-6 w-6 text-destructive animate-pulse" /> : <Clock className="h-6 w-6 text-primary" />}
        <h3 className={`text-lg font-semibold ${isCritical ? "text-destructive" : isWarning ? "text-yellow-600" : "text-foreground"}`}>
          Tid till stängning
        </h3>
      </div>

      {settings.timerType === 'digital' ? (
        <div className="text-center">
          <div className={`text-6xl font-bold tabular-nums ${
            isCritical ? "text-destructive" : 
            isWarning ? "text-yellow-600" : 
            "text-primary"
          }`}>
            {hours > 0 && `${hours}:`}
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <div className="mt-4 w-full bg-secondary rounded-full h-3 overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${
                isCritical ? "bg-destructive" : 
                isWarning ? "bg-yellow-500" : 
                "bg-primary"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Stänger kl. {currentSession.endTime}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="relative w-48 h-48">
            {/* Clock face */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-muted"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - percentage / 100)}`}
                strokeLinecap="round"
                className={`transition-all duration-1000 ${
                  isCritical ? "text-destructive" : 
                  isWarning ? "text-yellow-500" : 
                  "text-primary"
                }`}
              />
              {/* Hour markers */}
              {[...Array(12)].map((_, i) => {
                const angle = (i * 30 * Math.PI) / 180;
                const x1 = 50 + 38 * Math.cos(angle);
                const y1 = 50 + 38 * Math.sin(angle);
                const x2 = 50 + 42 * Math.cos(angle);
                const y2 = 50 + 42 * Math.sin(angle);
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-muted-foreground"
                  />
                );
              })}
            </svg>
            {/* Time display in center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`text-3xl font-bold tabular-nums ${
                isCritical ? "text-destructive" : 
                isWarning ? "text-yellow-600" : 
                "text-primary"
              }`}>
                {hours > 0 && `${hours}:`}
                {String(minutes).padStart(2, '0')}
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Stänger kl. {currentSession.endTime}
          </p>
        </div>
      )}
      </Card>
    </>
  );
};

export default CleaningTimer;
