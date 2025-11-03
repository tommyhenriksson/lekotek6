import { useState, useEffect } from "react";
import { NotReturnedRecord, NotReturnedWeekStats } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronLeft, ChevronRight, History } from "lucide-react";
import { removeNotReturnedRecord, updateNotReturnedRecord, addNotReturnedStat, updateNotReturnedStat, loadNotReturnedWeekStats } from "@/utils/storage";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AdminNotReturnedProps {
  records: NotReturnedRecord[];
  onRefresh: () => void;
}

const AdminNotReturned = ({ records, onRefresh }: AdminNotReturnedProps) => {
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [tempStolenBy, setTempStolenBy] = useState<string>("");
  const [tempOtherReason, setTempOtherReason] = useState<string>("");
  const [weekStats, setWeekStats] = useState<NotReturnedWeekStats[]>([]);
  const [selectedStudentHistory, setSelectedStudentHistory] = useState<{
    studentId: string;
    studentName: string;
    className: string;
  } | null>(null);
  
  const now = new Date();
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };
  
  const currentWeek = getWeekNumber(now);
  const currentYear = now.getFullYear();
  
  const [viewWeek, setViewWeek] = useState(currentWeek);
  const [viewYear, setViewYear] = useState(currentYear);

  useEffect(() => {
    const loadStats = async () => {
      const stats = await loadNotReturnedWeekStats();
      setWeekStats(stats);
    };
    loadStats();
  }, [records]);

  const handleRemove = async (recordId: string) => {
    // Bara ta bort posten - statistiken är redan loggad när anledning valdes
    await removeNotReturnedRecord(recordId);
    onRefresh();
    toast.success("Post borttagen");
  };

  const handleReasonChange = async (recordId: string, reason: 'lost' | 'refused' | 'stolen' | 'other') => {
    const record = records.find(r => r.id === recordId);
    if (!record) return;
    
    // Om detta är första gången en anledning väljs, logga statistik direkt
    const isFirstTimeReason = !record.reason;
    
    if (reason === 'stolen' || reason === 'other') {
      setEditingRecordId(recordId);
      if (reason === 'stolen') {
        setTempStolenBy(record?.stolenBy || "");
      } else {
        setTempOtherReason(record?.otherReason || "");
      }
    } else {
      await updateNotReturnedRecord(recordId, { 
        reason, 
        stolenBy: undefined, 
        otherReason: undefined 
      });
      setEditingRecordId(null);
      
      // Logga eller uppdatera statistik
      if (isFirstTimeReason) {
        await addNotReturnedStat(
          record.studentId,
          record.studentName,
          record.className,
          reason
        );
      } else {
        await updateNotReturnedStat(
          record.studentId,
          record.studentName,
          record.className,
          reason
        );
      }
      
      onRefresh();
      return;
    }
    
    await updateNotReturnedRecord(recordId, { reason });
    
    // Logga eller uppdatera statistik för 'stolen' och 'other' anledningar
    // (kommer att uppdateras när användaren fyller i detaljerna)
    if (isFirstTimeReason) {
      await addNotReturnedStat(
        record.studentId,
        record.studentName,
        record.className,
        reason,
        record.stolenBy,
        record.otherReason
      );
    } else {
      await updateNotReturnedStat(
        record.studentId,
        record.studentName,
        record.className,
        reason,
        record.stolenBy,
        record.otherReason
      );
    }
    
    onRefresh();
  };

  const handleStolenByChange = async (recordId: string, stolenBy: string) => {
    setTempStolenBy(stolenBy);
    if (stolenBy.trim()) {
      const record = records.find(r => r.id === recordId);
      if (!record) return;
      
      await updateNotReturnedRecord(recordId, { stolenBy });
      
      // Uppdatera statistiken med den nya detaljen
      await updateNotReturnedStat(
        record.studentId,
        record.studentName,
        record.className,
        'stolen',
        stolenBy,
        undefined
      );
      
      onRefresh();
    }
  };

  const handleOtherReasonChange = async (recordId: string, otherReason: string) => {
    setTempOtherReason(otherReason);
    if (otherReason.trim()) {
      const record = records.find(r => r.id === recordId);
      if (!record) return;
      
      await updateNotReturnedRecord(recordId, { otherReason });
      
      // Uppdatera statistiken med den nya detaljen
      await updateNotReturnedStat(
        record.studentId,
        record.studentName,
        record.className,
        'other',
        undefined,
        otherReason
      );
      
      onRefresh();
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("sv-SE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getReasonLabel = (reason?: string) => {
    switch (reason) {
      case 'lost':
        return 'Tappade bort';
      case 'refused':
        return 'Vägrade lämna';
      case 'stolen':
        return 'Någon tog elevens leksak';
      case 'other':
        return 'Annan orsak';
      default:
        return 'Välj anledning';
    }
  };

  const goToPreviousWeek = () => {
    if (viewWeek === 1) {
      setViewWeek(52);
      setViewYear(viewYear - 1);
    } else {
      setViewWeek(viewWeek - 1);
    }
  };

  const goToNextWeek = () => {
    if (viewWeek === 52) {
      setViewWeek(1);
      setViewYear(viewYear + 1);
    } else {
      setViewWeek(viewWeek + 1);
    }
  };

  const goToCurrentWeek = () => {
    setViewWeek(currentWeek);
    setViewYear(currentYear);
  };

  const isCurrentWeek = viewWeek === currentWeek && viewYear === currentYear;

  const getCurrentWeekStats = () => {
    return weekStats.find(s => s.year === viewYear && s.weekNumber === viewWeek);
  };

  const formatReasons = (reasons: any[]) => {
    const grouped: { [key: string]: number } = {};
    reasons.forEach(r => {
      const label = getReasonLabel(r.reason);
      grouped[label] = (grouped[label] || 0) + 1;
    });
    return Object.entries(grouped)
      .map(([reason, count]) => `${reason} (${count})`)
      .join(', ');
  };

  const getStudentHistory = (studentId: string) => {
    // Get all weeks where this student has records, sorted by week (newest first)
    const history: Array<{
      weekNumber: number;
      year: number;
      count: number;
      reasons: string[];
    }> = [];

    weekStats.forEach(weekStat => {
      const studentData = weekStat.studentStats[studentId];
      if (studentData) {
        history.push({
          weekNumber: weekStat.weekNumber,
          year: weekStat.year,
          count: studentData.count,
          reasons: studentData.reasons.map(r => {
            let label = getReasonLabel(r.reason);
            if (r.reason === 'stolen' && r.stolenBy) {
              label += ` (${r.stolenBy})`;
            } else if (r.reason === 'other' && r.otherReason) {
              label += ` (${r.otherReason})`;
            }
            return label;
          })
        });
      }
    });

    // Sort by year and week (newest first)
    return history.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.weekNumber - a.weekNumber;
    });
  };

  return (
    <Card className="p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Elever som inte lämnat in</h3>
      </div>
      
      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="current">Aktuella</TabsTrigger>
          <TabsTrigger value="stats">Veckostatistik</TabsTrigger>
        </TabsList>
        
        <TabsContent value="current">
      
      {records.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Ingen har glömt att lämna tillbaka</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Elev</TableHead>
                <TableHead>Klass</TableHead>
                <TableHead>Leksaker</TableHead>
                <TableHead>När?</TableHead>
                <TableHead>Kontrollerad</TableHead>
                <TableHead>Anledning</TableHead>
                <TableHead>Historik</TableHead>
                <TableHead className="text-right">Åtgärd</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.studentName}</TableCell>
                  <TableCell>{record.className}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {record.borrowedItems.map((item, idx) => (
                        <div key={idx}>{item.toyName}</div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {record.sessionName || record.sessionEndTime}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(record.checkedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2 min-w-[200px]">
                      <Select
                        value={record.reason || ''}
                        onValueChange={(value) => handleReasonChange(record.id, value as any)}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Välj anledning">
                            {getReasonLabel(record.reason)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-background border z-50">
                          <SelectItem value="lost">Tappade bort</SelectItem>
                          <SelectItem value="refused">Vägrade lämna</SelectItem>
                          <SelectItem value="stolen">Någon tog elevens leksak</SelectItem>
                          <SelectItem value="other">Annan orsak</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {record.reason === 'stolen' && (
                        <Input
                          placeholder="Vem tog leksaken?"
                          value={editingRecordId === record.id ? tempStolenBy : record.stolenBy || ''}
                          onChange={(e) => handleStolenByChange(record.id, e.target.value)}
                          className="text-sm"
                        />
                      )}
                      
                      {record.reason === 'other' && (
                        <Textarea
                          placeholder="Beskriv anledningen..."
                          value={editingRecordId === record.id ? tempOtherReason : record.otherReason || ''}
                          onChange={(e) => handleOtherReasonChange(record.id, e.target.value)}
                          className="text-sm min-h-[60px]"
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedStudentHistory({
                            studentId: record.studentId,
                            studentName: record.studentName,
                            className: record.className
                          })}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>
                            Elevhistorik: {record.studentName} ({record.className})
                          </DialogTitle>
                        </DialogHeader>
                        <div className="max-h-[400px] overflow-y-auto">
                          {(() => {
                            const history = getStudentHistory(record.studentId);
                            if (history.length === 0) {
                              return (
                                <div className="text-center py-8 text-muted-foreground">
                                  <p>Ingen historik finns för denna elev</p>
                                </div>
                              );
                            }
                            return (
                              <div className="space-y-3">
                                {history.map((entry, idx) => (
                                  <div
                                    key={idx}
                                    className="p-4 rounded-lg border bg-card"
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-semibold">
                                        Vecka {entry.weekNumber}, {entry.year}
                                      </span>
                                      <span className="text-sm text-muted-foreground">
                                        {entry.count} {entry.count === 1 ? 'gång' : 'gånger'}
                                      </span>
                                    </div>
                                    <div className="text-sm space-y-1">
                                      {entry.reasons.map((reason, reasonIdx) => (
                                        <div key={reasonIdx} className="text-muted-foreground">
                                          • {reason}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(record.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
        </TabsContent>
        
        <TabsContent value="stats">
          {weekStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Ingen statistik ännu</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 px-2 mb-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousWeek}
                  className="rounded-xl w-full sm:w-auto"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Föregående vecka
                </Button>
                <div className="text-center flex-1">
                  <p className="font-semibold text-lg">
                    Vecka {viewWeek}, {viewYear}
                  </p>
                  {!isCurrentWeek && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={goToCurrentWeek}
                      className="text-xs"
                    >
                      Gå till nuvarande vecka
                    </Button>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextWeek}
                  className="rounded-xl w-full sm:w-auto"
                >
                  Nästa vecka
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              {getCurrentWeekStats() ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Elev</TableHead>
                        <TableHead>Klass</TableHead>
                        <TableHead className="text-center">Antal gånger</TableHead>
                        <TableHead>Orsaker</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(getCurrentWeekStats()!.studentStats).map(([studentId, stats]) => (
                        <TableRow key={studentId}>
                          <TableCell className="font-medium">{stats.studentName}</TableCell>
                          <TableCell>{stats.className}</TableCell>
                          <TableCell className="text-center font-semibold">{stats.count}</TableCell>
                          <TableCell className="text-sm">{formatReasons(stats.reasons)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Ingen data för denna vecka</p>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default AdminNotReturned;
