import { useState, useEffect } from "react";
import { Toy } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Camera, Trash2, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
} from "@/components/ui/alert-dialog";

interface AdminToyEditorProps {
  toys: Toy[];
  onSave: (toys: Toy[]) => void;
}

// Sortable Toy Item Component
const SortableToyItem = ({ 
  toy, 
  onUpdate, 
  onImageUpload, 
  onRemoveImage,
  onDelete 
}: {
  toy: Toy;
  onUpdate: (field: keyof Toy, value: string | number) => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  onDelete: () => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: toy.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className="p-4 rounded-xl"
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div 
            className="flex-shrink-0 cursor-move pt-1 touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-shrink-0">
            {toy.image ? (
              <div className="relative w-20 h-20">
                <img 
                  src={toy.image} 
                  alt={toy.name} 
                  className="w-full h-full object-cover rounded-lg"
                />
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer rounded-lg">
                  <Camera className="h-6 w-6 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onImageUpload}
                  />
                </label>
              </div>
            ) : (
              <label className="w-20 h-20 flex items-center justify-center bg-muted rounded-lg cursor-pointer hover:bg-muted/80">
                <div className="text-center">
                  <div className="text-3xl mb-1">{toy.icon}</div>
                  <Camera className="h-4 w-4 mx-auto text-muted-foreground" />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onImageUpload}
                />
              </label>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <Input
              value={toy.name}
              onChange={(e) => onUpdate("name", e.target.value)}
              placeholder="Leksakens namn"
              className="rounded-xl"
            />
            <div className="flex gap-2">
              <Input
                value={toy.icon}
                onChange={(e) => onUpdate("icon", e.target.value)}
                placeholder="Emoji (används om ingen bild)"
                className="flex-1 rounded-xl text-center"
              />
              <Input
                type="number"
                value={toy.quantity === 0 ? "" : toy.quantity}
                onChange={(e) => {
                  const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                  onUpdate("quantity", isNaN(val) ? 0 : val);
                }}
                placeholder="Antal"
                className="w-20 rounded-xl"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {toy.image && (
            <Button
              onClick={onRemoveImage}
              size="sm"
              variant="outline"
              className="flex-1 rounded-xl"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Ta bort bild
            </Button>
          )}
          <Button
            onClick={onDelete}
            size="sm"
            variant="destructive"
            className={toy.image ? "rounded-xl" : "flex-1 rounded-xl"}
          >
            <X className="mr-2 h-4 w-4" />
            Ta bort leksak
          </Button>
        </div>
      </div>
    </Card>
  );
};

const AdminToyEditor = ({ toys, onSave }: AdminToyEditorProps) => {
  const [localToys, setLocalToys] = useState<Toy[]>(toys);
  const [toyToDelete, setToyToDelete] = useState<string | null>(null);

  // Sensors for drag and drop with touch support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sync localToys with toys prop when it changes
  useEffect(() => {
    setLocalToys(toys);
  }, [toys]);

  // Autosave with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (JSON.stringify(localToys) !== JSON.stringify(toys)) {
        onSave(localToys);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [localToys, toys, onSave]);

  const addToy = () => {
    const newToy: Toy = {
      id: `toy-${Date.now()}`,
      name: "",
      icon: "🎲",
      quantity: 1,
    };
    setLocalToys([...localToys, newToy]);
  };

  const removeToy = (id: string) => {
    const updated = localToys.filter(t => t.id !== id);
    setLocalToys(updated);
    setToyToDelete(null);
    toast.success("Leksak borttagen!");
  };

  const updateToy = (id: string, field: keyof Toy, value: string | number) => {
    const updated = localToys.map(t => 
      t.id === id ? { ...t, [field]: value } : t
    );
    setLocalToys(updated);
  };

  const handleImageUpload = (toyId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Bilden är för stor! Max 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      updateToy(toyId, "image", base64);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (toyId: string) => {
    updateToy(toyId, "image", "");
    toast.success("Bild borttagen, använder emoji!");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLocalToys((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Redigera Leksaker</h3>
        <span className="text-xs text-muted-foreground">Sparas automatiskt</span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={localToys.map(toy => toy.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid gap-3">
            {localToys.map((toy) => (
              <SortableToyItem
                key={toy.id}
                toy={toy}
                onUpdate={(field, value) => updateToy(toy.id, field, value)}
                onImageUpload={(e) => handleImageUpload(toy.id, e)}
                onRemoveImage={() => removeImage(toy.id)}
                onDelete={() => setToyToDelete(toy.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button onClick={addToy} size="sm" className="w-full rounded-xl">
        <Plus className="mr-2 h-4 w-4" />
        Lägg till leksak
      </Button>

      <AlertDialog open={toyToDelete !== null} onOpenChange={(open) => !open && setToyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort leksak?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort denna leksak?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={() => toyToDelete && removeToy(toyToDelete)}>
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminToyEditor;
