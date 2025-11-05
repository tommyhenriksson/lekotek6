import { useState } from "react";
import { BorrowedItem, NotReturnedRecord } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PackageCheck, X } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface BorrowedViewProps {
  borrowedItems: BorrowedItem[];
  notReturnedRecords: NotReturnedRecord[];
  onRefreshNotReturned: () => void;
  onReturn: (itemId: string) => void;
  isPastDelayLimit: (borrowedItem?: BorrowedItem) => boolean;
}

interface GroupedToy {
  toyId: string;
  toyName: string;
  toyIcon: string;
  toyImage?: string;
  borrowers: BorrowedItem[];
}

const BorrowedView = ({ borrowedItems, notReturnedRecords, onRefreshNotReturned, onReturn, isPastDelayLimit }: BorrowedViewProps) => {
  const [selectedToy, setSelectedToy] = useState<GroupedToy | null>(null);
  const [confirmReturnItem, setConfirmReturnItem] = useState<BorrowedItem | null>(null);

  // No filtering - keep all history until manually removed by teacher

  const handleReturn = (item: BorrowedItem) => {
    onReturn(item.id);
    toast.success(`${item.toyName} återlämnad!`);
    setConfirmReturnItem(null);
    
    // If this was the last borrower for this toy, go back to toy list
    const remainingBorrowers = selectedToy?.borrowers.filter(b => b.id !== item.id);
    if (remainingBorrowers && remainingBorrowers.length === 0) {
      setSelectedToy(null);
    }
  };

  const handleBackToToys = () => {
    setSelectedToy(null);
  };

  const handleReturnFromNotReturned = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const item = borrowedItems.find(b => b.id === itemId);
    if (!item) return;
    
    // Unblock student from borrowing (history remains in Admin tab)
    const { updateNotReturnedRecord } = await import("@/utils/storage");
    const record = notReturnedRecords.find(r => r.studentId === item.studentId);
    if (record) {
      await updateNotReturnedRecord(record.id, { blockedFromBorrowing: false });
      onRefreshNotReturned();
    }
    
    // Return the item
    onReturn(itemId);
    toast.success("Eleven kan låna igen");
    
    // If this was the last borrower for this toy, go back to toy list
    const remainingBorrowers = selectedToy?.borrowers.filter(b => b.id !== itemId);
    if (remainingBorrowers && remainingBorrowers.length === 0) {
      setSelectedToy(null);
    }
  };

  // Group borrowed items by toy
  const groupedToys = borrowedItems.reduce((acc, item) => {
    const existing = acc.find(g => g.toyId === item.toyId);
    if (existing) {
      existing.borrowers.push(item);
    } else {
      acc.push({
        toyId: item.toyId,
        toyName: item.toyName,
        toyIcon: item.toyIcon,
        toyImage: item.toyImage,
        borrowers: [item],
      });
    }
    return acc;
  }, [] as GroupedToy[]);

  if (borrowedItems.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <PackageCheck className="h-20 w-20 mx-auto text-muted-foreground" />
          <h2 className="text-2xl font-semibold text-muted-foreground">
            Inga utlånade leksaker just nu
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 max-w-screen-xl mx-auto">
      {!selectedToy ? (
        <>
          <h2 className="text-2xl font-bold mb-4 text-foreground">Utlånade Leksaker</h2>
          <div className="grid grid-cols-3 gap-3">
            {groupedToys.map((toy) => (
              <Card
                key={toy.toyId}
                className="p-3 rounded-xl cursor-pointer active:scale-95 transition-all"
                onClick={() => setSelectedToy(toy)}
              >
                <div className="text-center space-y-2">
                  {toy.toyImage ? (
                    <img src={toy.toyImage} alt={toy.toyName} className="w-12 h-12 mx-auto object-cover rounded-lg" />
                  ) : (
                    <div className="text-3xl">{toy.toyIcon}</div>
                  )}
                  <h3 className="text-sm font-semibold line-clamp-1">{toy.toyName}</h3>
                  <div className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                    {toy.borrowers.length} utlånad{toy.borrowers.length !== 1 ? 'e' : ''}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="outline"
              onClick={handleBackToToys}
              className="rounded-xl"
              size="sm"
            >
              ← Tillbaka
            </Button>
            <h2 className="text-xl font-bold text-foreground">{selectedToy.toyName}</h2>
          </div>
          <div className="grid gap-3">
            {[...selectedToy.borrowers]
              .sort((a, b) => a.studentName.localeCompare(b.studentName, 'sv'))
              .map((item) => {
                const textColor = item.classColor || "#8B5CF6";
                const bgColor = `${textColor}1A`;
                const isItemPastDelayLimit = isPastDelayLimit(item);
                
                return (
                  <Card key={item.id} className="p-4 rounded-xl" style={{ backgroundColor: bgColor }}>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold" style={{ color: textColor }}>
                            {item.studentName}
                          </h3>
                          <p className="text-sm text-muted-foreground">{item.className}</p>
                        </div>
                      </div>
                      {notReturnedRecords.some(r => r.studentId === item.studentId) ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="rounded-xl w-full cursor-not-allowed"
                            disabled
                          >
                            Lämnade inte in
                          </Button>
                          <AlertDialog>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-xl border border-destructive/40 hover:bg-destructive/20"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              aria-label="Ta bort från Ej inlämnat"
                              asChild
                            >
                              <AlertDialogTrigger>
                                <X className="h-4 w-4" />
                              </AlertDialogTrigger>
                            </Button>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Vill du låta eleven låna igen?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Elevens orsak till ej inlämnad leksak har dokumenterats.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                <AlertDialogAction onClick={(e) => handleReturnFromNotReturned(item.id, e)}>
                                  Ja
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ) : isItemPastDelayLimit ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="rounded-xl w-full"
                            onClick={() => setConfirmReturnItem(item)}
                          >
                            Lämnade inte in
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl border border-destructive/40 hover:bg-destructive/20"
                            onClick={() => setConfirmReturnItem(item)}
                            aria-label="Försenad återlämning"
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="rounded-xl w-full"
                          onClick={() => setConfirmReturnItem(item)}
                        >
                          Lämna tillbaka
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
          </div>
        </>
      )}

      <AlertDialog open={!!confirmReturnItem} onOpenChange={(open) => !open && setConfirmReturnItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmReturnItem && isPastDelayLimit(confirmReturnItem) ? "För sent att lämna tillbaka" : "Lämna tillbaka leksak?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmReturnItem && (
                isPastDelayLimit(confirmReturnItem) ? (
                  <>
                    Förseningsgränsen har passerats. {confirmReturnItem.studentName} kommer att registreras under "Ej lämnat" och blockeras från att låna fler leksaker denna rast.
                  </>
                ) : (
                  <>Vill {confirmReturnItem.studentName} lämna tillbaka {confirmReturnItem.toyName}?</>
                )
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmReturnItem && handleReturn(confirmReturnItem)}>
              {confirmReturnItem && isPastDelayLimit(confirmReturnItem) ? "Okej, registrera" : "Lämna tillbaka"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BorrowedView;
