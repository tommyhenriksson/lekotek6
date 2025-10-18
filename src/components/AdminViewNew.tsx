import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Key, Download, Upload, AlertTriangle } from "lucide-react";
import { Class, Toy, TimerSettings, PaxWeekPoints, NotReturnedRecord } from "@/types";
import { toast } from "sonner";
import AdminClassEditor from "./AdminClassEditor";
import AdminToyEditor from "./AdminToyEditor";
import AdminTimerSettings from "./AdminTimerSettings";
import AdminPaxPoints from "./AdminPaxPoints";
import AdminNotReturned from "./AdminNotReturned";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAdminPassword, setAdminPassword, isPasswordSet, downloadDataAsFile, importAllData } from "@/utils/storage";

interface AdminViewProps {
  classes: Class[];
  toys: Toy[];
  timerSettings: TimerSettings;
  paxPoints: PaxWeekPoints[];
  notReturnedRecords: NotReturnedRecord[];
  onSaveClasses: (classes: Class[]) => void;
  onSaveToys: (toys: Toy[]) => void;
  onSaveTimerSettings: (settings: TimerSettings) => void;
  onRefreshNotReturned: () => void;
}

const AdminViewNew = ({ classes, toys, timerSettings, paxPoints, notReturnedRecords, onSaveClasses, onSaveToys, onSaveTimerSettings, onRefreshNotReturned }: AdminViewProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(!isPasswordSet());
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFirstTimeSetup = () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Fyll i båda fälten!");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Lösenorden matchar inte!");
      return;
    }
    if (newPassword.length < 4) {
      toast.error("Lösenordet måste vara minst 4 tecken!");
      return;
    }
    setAdminPassword(newPassword);
    setIsFirstTime(false);
    setIsAuthenticated(true);
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Lösenord skapat!");
  };

  const handleLogin = () => {
    if (password === getAdminPassword()) {
      setIsAuthenticated(true);
      toast.success("Inloggad!");
    } else {
      toast.error("Fel lösenord!");
    }
  };

  const handlePasswordChange = () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Fyll i båda fälten!");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Lösenorden matchar inte!");
      return;
    }
    if (newPassword.length < 4) {
      toast.error("Lösenordet måste vara minst 4 tecken!");
      return;
    }
    setAdminPassword(newPassword);
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Lösenord ändrat!");
  };

  const handleExportData = () => {
    try {
      console.log("[AdminViewNew] Exporterar data...");
      downloadDataAsFile();
      toast.success("Export genomförd! Kontrollera nedladdningar.", {
        duration: 3000,
      });
    } catch (error) {
      console.error("[AdminViewNew] Exportfel:", error);
      toast.error("Kunde inte hämta data från lagringen");
    }
  };

  const handleImportData = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log("[AdminViewNew] Importerar fil:", file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = importAllData(content);
      
      if (result.success) {
        toast.success("Import genomförd! Befintlig data bevarad. Sidan laddas om...", {
          duration: 3000,
        });
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast.error(result.error || "Kunde inte importera data");
      }
    };
    reader.onerror = () => {
      toast.error("Kunde inte läsa filen");
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!isAuthenticated) {
    if (isFirstTime) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="p-8 w-full max-w-md rounded-2xl">
            <div className="text-center space-y-6">
              <Key className="h-16 w-16 mx-auto text-primary" />
              <h2 className="text-2xl font-bold">Välkommen!</h2>
              <p className="text-muted-foreground">Skapa ditt admin-lösenord</p>
              <div className="space-y-4">
                <Input
                  type="password"
                  name="new-password"
                  autoComplete="new-password"
                  placeholder="Nytt lösenord"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="text-lg py-6 rounded-xl"
                />
                <Input
                  type="password"
                  name="confirm-password"
                  autoComplete="new-password"
                  placeholder="Bekräfta lösenord"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleFirstTimeSetup()}
                  className="text-lg py-6 rounded-xl"
                />
                <Button
                  onClick={handleFirstTimeSetup}
                  size="lg"
                  className="w-full rounded-xl py-6 text-lg"
                >
                  Skapa lösenord
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 w-full max-w-md rounded-2xl">
          <div className="text-center space-y-6">
            <Lock className="h-16 w-16 mx-auto text-primary" />
            <h2 className="text-2xl font-bold">Admin-inloggning</h2>
            <div className="space-y-4">
              <Input
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="Ange lösenord"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                className="text-lg py-6 rounded-xl"
              />
              <Button
                onClick={handleLogin}
                size="lg"
                className="w-full rounded-xl py-6 text-lg"
              >
                Logga in
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 max-w-screen-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4 text-foreground">Admin-panel</h2>
      
      <Tabs defaultValue="classes" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 mb-4 gap-1">
          <TabsTrigger value="classes" className="text-xs sm:text-sm">Elever</TabsTrigger>
          <TabsTrigger value="toys" className="text-xs sm:text-sm">Leksaker</TabsTrigger>
          <TabsTrigger value="timer" className="text-xs sm:text-sm">Timer</TabsTrigger>
          <TabsTrigger value="pax" className="text-xs sm:text-sm">Poäng</TabsTrigger>
          <TabsTrigger value="not-returned" className="text-xs sm:text-sm">Ej inlämnat</TabsTrigger>
        </TabsList>
        
        <TabsContent value="classes">
          <AdminClassEditor classes={classes} onSave={onSaveClasses} />
        </TabsContent>
        
        <TabsContent value="toys">
          <AdminToyEditor toys={toys} onSave={onSaveToys} />
        </TabsContent>
        
        <TabsContent value="timer">
          <AdminTimerSettings settings={timerSettings} onSave={onSaveTimerSettings} />
        </TabsContent>
        
        <TabsContent value="pax">
          <AdminPaxPoints classes={classes} paxPoints={paxPoints} />
        </TabsContent>
        
        <TabsContent value="not-returned">
          <AdminNotReturned records={notReturnedRecords} onRefresh={onRefreshNotReturned} />
        </TabsContent>
      </Tabs>

      <Card className="p-6 rounded-2xl mt-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Ändra lösenord</h3>
          </div>
          <div className="space-y-3">
            <Input
              type="password"
              name="new-password"
              autoComplete="new-password"
              placeholder="Nytt lösenord"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-xl"
            />
            <Input
              type="password"
              name="confirm-password"
              autoComplete="new-password"
              placeholder="Bekräfta lösenord"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handlePasswordChange()}
              className="rounded-xl"
            />
            <Button
              onClick={handlePasswordChange}
              className="w-full rounded-xl"
            >
              Ändra lösenord
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 rounded-2xl mt-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Backup</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Exportera för att spara all tillgänglig data. Importera för att mata in sparad data.
          </p>
          
          <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/20 rounded-xl">
            <AlertTriangle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              <strong>Smart import:</strong> Importen jämför och sammanfogar data. 
              Befintliga leksaker och klasser bevaras, nya läggs till. 
              En automatisk backup skapas före varje import.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleExportData}
              variant="outline"
              className="w-full rounded-xl"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportera data
            </Button>
            <Button
              onClick={handleImportData}
              variant="outline"
              className="w-full rounded-xl"
            >
              <Upload className="h-4 w-4 mr-2" />
              Importera data
            </Button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelected}
            style={{ display: 'none' }}
          />
        </div>
      </Card>
    </div>
  );
};

export default AdminViewNew;
