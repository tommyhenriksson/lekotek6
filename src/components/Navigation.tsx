import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, Settings } from "lucide-react";

type Tab = "borrow" | "borrowed" | "admin";

interface NavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const Navigation = ({ activeTab, onTabChange }: NavigationProps) => {
  return (
    <nav className="bg-card border-b border-border px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Lekotek
        </h1>
        
        <div className="flex gap-2 flex-1 justify-center">
          <Button
            variant={activeTab === "borrow" ? "default" : "outline"}
            size="sm"
            className="text-sm px-4 py-5 rounded-xl flex-1 max-w-[120px]"
            onClick={() => onTabChange("borrow")}
          >
            <ArrowUp className="mr-1.5 h-4 w-4" />
            Låna
          </Button>
          
          <Button
            variant={activeTab === "borrowed" ? "default" : "outline"}
            size="sm"
            className="text-sm px-4 py-5 rounded-xl flex-1 max-w-[120px]"
            onClick={() => onTabChange("borrowed")}
          >
            <ArrowDown className="mr-1.5 h-4 w-4" />
            Lämna
          </Button>
        </div>
        
        <Button
          variant={activeTab === "admin" ? "secondary" : "ghost"}
          size="sm"
          className="rounded-full p-2"
          onClick={() => onTabChange("admin")}
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </nav>
  );
};

export default Navigation;
