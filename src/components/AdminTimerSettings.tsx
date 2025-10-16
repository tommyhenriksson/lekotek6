import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Clock, Volume2 } from "lucide-react";
import { TimerSettings, CleaningSession } from "@/types";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

interface AdminTimerSettingsProps {
  settings: TimerSettings;
  onSave: (settings: TimerSettings) => void;
}

const AdminTimerSettings = ({ settings, onSave }: AdminTimerSettingsProps) => {
  const [localSettings, setLocalSettings] = useState<TimerSettings>(settings);

  // Autosave with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Validate times before saving
      let isValid = true;
      for (const session of localSettings.sessions) {
        const [startHour, startMin] = session.startTime.split(":").map(Number);
        const [endHour, endMin] = session.endTime.split(":").map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        if (endMinutes <= startMinutes) {
          isValid = false;
          break;
        }
      }

      if (isValid && JSON.stringify(localSettings) !== JSON.stringify(settings)) {
        onSave(localSettings);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [localSettings, settings, onSave]);

  const addSession = () => {
    const newSession: CleaningSession = {
      id: `session-${Date.now()}`,
      name: `Pass ${localSettings.sessions.length + 1}`,
      startTime: "09:00",
      endTime: "12:00",
      enabled: true,
    };
    setLocalSettings({
      ...localSettings,
      sessions: [...localSettings.sessions, newSession],
    });
  };

  const removeSession = (id: string) => {
    setLocalSettings({
      ...localSettings,
      sessions: localSettings.sessions.filter((s) => s.id !== id),
    });
  };

  const updateSession = (id: string, updates: Partial<CleaningSession>) => {
    setLocalSettings({
      ...localSettings,
      sessions: localSettings.sessions.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    });
  };

  return (
    <Card className="p-6 rounded-2xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Timer-inställningar</h3>
          </div>
          <span className="text-xs text-muted-foreground">Sparas automatiskt</span>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Timer-typ</Label>
            <Select
              value={localSettings.timerType}
              onValueChange={(value: 'digital' | 'analog') =>
                setLocalSettings({ ...localSettings, timerType: value })
              }
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="digital">Digital</SelectItem>
                <SelectItem value="analog">Analog</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Städpåminnelse (minuter före stängning)</Label>
            <Input
              type="number"
              min="1"
              max="60"
              value={localSettings.warningMinutes === 0 ? "" : localSettings.warningMinutes}
              onChange={(e) => {
                const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                setLocalSettings({
                  ...localSettings,
                  warningMinutes: isNaN(val) ? 0 : val,
                });
              }}
              onBlur={() => {
                if (!localSettings.warningMinutes || localSettings.warningMinutes < 1) {
                  setLocalSettings({
                    ...localSettings,
                    warningMinutes: 15,
                  });
                }
              }}
              className="rounded-xl"
            />
          </div>

          <div>
            <Label>Förseningsgräns (minuter)</Label>
            <Input
              type="number"
              min="1"
              max="120"
              value={localSettings.delayMinutes === 0 ? "" : localSettings.delayMinutes}
              onChange={(e) => {
                const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                setLocalSettings({
                  ...localSettings,
                  delayMinutes: isNaN(val) ? 0 : val,
                });
              }}
              onBlur={() => {
                if (!localSettings.delayMinutes || localSettings.delayMinutes < 1) {
                  setLocalSettings({
                    ...localSettings,
                    delayMinutes: 30,
                  });
                }
              }}
              className="rounded-xl"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Tid innan elever läggs till i "Ej lämnat"-listan efter sessionens slut
            </p>
          </div>

          <div>
            <Label>Alarm-ljud</Label>
            <Select
              value={localSettings.alarmSound}
              onValueChange={(value: 'beep' | 'bell' | 'chime' | 'none') =>
                setLocalSettings({ ...localSettings, alarmSound: value })
              }
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bell">Klocka</SelectItem>
                <SelectItem value="beep">Pip</SelectItem>
                <SelectItem value="chime">Chimes</SelectItem>
                <SelectItem value="none">Ingen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Volym ({localSettings.alarmVolume}%)
            </Label>
            <Slider
              value={[localSettings.alarmVolume]}
              onValueChange={(value) =>
                setLocalSettings({ ...localSettings, alarmVolume: value[0] })
              }
              max={100}
              step={5}
              className="mt-2"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Städtider</h4>
            <Button onClick={addSession} size="sm" className="rounded-xl">
              <Plus className="h-4 w-4 mr-1" />
              Lägg till
            </Button>
          </div>

          {localSettings.sessions.map((session, index) => (
            <Card key={session.id} className="p-4 rounded-xl">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 mr-2">
                    <Label className="text-xs mb-1 block">Passnamn</Label>
                    <Input
                      type="text"
                      value={session.name}
                      onChange={(e) =>
                        updateSession(session.id, { name: e.target.value })
                      }
                      className="rounded-xl"
                      placeholder={`Pass ${index + 1}`}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Switch
                      checked={session.enabled}
                      onCheckedChange={(checked) =>
                        updateSession(session.id, { enabled: checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSession(session.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Starttid</Label>
                    <Input
                      type="time"
                      value={session.startTime}
                      onChange={(e) =>
                        updateSession(session.id, { startTime: e.target.value })
                      }
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Sluttid</Label>
                    <Input
                      type="time"
                      value={session.endTime}
                      onChange={(e) =>
                        updateSession(session.id, { endTime: e.target.value })
                      }
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default AdminTimerSettings;
