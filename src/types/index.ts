export interface Student {
  id: string;
  name: string;
}

export interface Class {
  name: string;
  students: Student[];
  color?: string;
}

export interface Toy {
  id: string;
  name: string;
  icon: string;
  quantity: number;
  image?: string;
}

export interface BorrowedItem {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  classColor?: string;
  toyId: string;
  toyName: string;
  toyIcon: string;
  toyImage?: string;
  borrowedAt: string;
}

export interface CleaningSession {
  id: string;
  name: string; // Name of the session (e.g. "Mellanmål", "Lunch")
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  enabled: boolean;
}

export interface TimerSettings {
  sessions: CleaningSession[];
  timerType: 'digital' | 'analog';
  warningMinutes: number; // Minutes before closing to show warning
  delayMinutes: number; // Minutes after session end before student is added to "not returned" list
  alarmSound: 'beep' | 'bell' | 'chime' | 'none';
  alarmVolume: number; // 0-100
}

export interface PaxWeekPoints {
  weekNumber: number; // ISO week number
  year: number;
  classPoints: {
    [className: string]: number;
  };
  classBorrows: {
    [className: string]: number;
  };
  classReturns: {
    [className: string]: number;
  };
}

export interface RastTracking {
  sessionId: string;
  date: string; // YYYY-MM-DD format
  studentsWithPoints: string[]; // studentId array
}

export interface NotReturnedRecord {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  sessionEndTime: string; // HH:MM format
  sessionName?: string; // Name of the session (e.g. "Mellanmål", "Lunch")
  checkedAt: string; // ISO timestamp when checked (30 min after session end)
  borrowedItems: {
    toyId: string;
    toyName: string;
    borrowedAt: string;
  }[];
  reason?: 'lost' | 'refused' | 'stolen' | 'other';
  stolenBy?: string; // For 'stolen' reason
  otherReason?: string; // For 'other' reason
}

export interface NotReturnedWeekStats {
  weekNumber: number; // ISO week number
  year: number;
  studentStats: {
    [studentId: string]: {
      studentName: string;
      className: string;
      count: number;
      reasons: {
        reason: 'lost' | 'refused' | 'stolen' | 'other';
        stolenBy?: string;
        otherReason?: string;
        timestamp: string;
      }[];
    };
  };
}
