import { useState, useEffect } from "react";
import { Class, Student } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Edit2, Check } from "lucide-react";
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

interface AdminClassEditorProps {
  classes: Class[];
  onSave: (classes: Class[]) => void;
}

const AdminClassEditor = ({ classes, onSave }: AdminClassEditorProps) => {
  const [localClasses, setLocalClasses] = useState<Class[]>(classes);
  const [editingStudent, setEditingStudent] = useState<{ classIndex: number; studentId: string } | null>(null);
  const [classToDelete, setClassToDelete] = useState<number | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<{ classIndex: number; studentId: string } | null>(null);

  // Autosave with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (JSON.stringify(localClasses) !== JSON.stringify(classes)) {
        onSave(localClasses);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [localClasses, classes, onSave]);

  const addClass = () => {
    const newClass: Class = {
      name: `Ny Klass ${localClasses.length + 1}`,
      students: [],
    };
    setLocalClasses([...localClasses, newClass]);
  };

  const removeClass = (index: number) => {
    const updated = localClasses.filter((_, i) => i !== index);
    setLocalClasses(updated);
    setClassToDelete(null);
    toast.success("Klass borttagen!");
  };

  const updateClassName = (index: number, name: string) => {
    const updated = [...localClasses];
    updated[index] = { ...updated[index], name };
    setLocalClasses(updated);
  };

  const updateClassColor = (index: number, color: string) => {
    const updated = [...localClasses];
    updated[index] = { ...updated[index], color };
    setLocalClasses(updated);
  };

  const addStudent = (classIndex: number) => {
    const newStudent: Student = {
      id: `student-${Date.now()}`,
      name: "",
    };
    const updated = [...localClasses];
    updated[classIndex].students.push(newStudent);
    setLocalClasses(updated);
    setEditingStudent({ classIndex, studentId: newStudent.id });
  };

  const removeStudent = (classIndex: number, studentId: string) => {
    const updated = [...localClasses];
    updated[classIndex].students = updated[classIndex].students.filter(s => s.id !== studentId);
    setLocalClasses(updated);
    setStudentToDelete(null);
    toast.success("Elev borttagen!");
  };

  const updateStudentName = (classIndex: number, studentId: string, name: string) => {
    const updated = [...localClasses];
    const student = updated[classIndex].students.find(s => s.id === studentId);
    if (student) {
      student.name = name;
      setLocalClasses(updated);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Redigera Klasser</h3>
        <span className="text-xs text-muted-foreground">Sparas automatiskt</span>
      </div>

      <div className="space-y-3">
        {localClasses.map((classItem, classIndex) => (
          <Card key={classIndex} className="p-4 rounded-xl">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={classItem.name}
                  onChange={(e) => updateClassName(classIndex, e.target.value)}
                  className="flex-1 rounded-xl"
                  placeholder="Klassnamn"
                />
                <Input
                  type="color"
                  value={classItem.color || "#8B5CF6"}
                  onChange={(e) => updateClassColor(classIndex, e.target.value)}
                  className="w-20 h-10 rounded-xl cursor-pointer"
                  title="Välj färg"
                />
                <Button
                  onClick={() => setClassToDelete(classIndex)}
                  size="sm"
                  variant="destructive"
                  className="rounded-xl"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {[...classItem.students]
                  .sort((a, b) => a.name.localeCompare(b.name, 'sv'))
                  .map((student) => (
                    <div key={student.id} className="flex items-center gap-2">
                    {editingStudent?.classIndex === classIndex && editingStudent?.studentId === student.id ? (
                      <>
                        <Input
                          value={student.name}
                          onChange={(e) => updateStudentName(classIndex, student.id, e.target.value)}
                          className="flex-1 rounded-xl"
                          placeholder="Elevnamn"
                          autoFocus
                        />
                        <Button
                          onClick={() => setEditingStudent(null)}
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 text-sm px-3 py-2 border rounded-xl bg-muted">
                          {student.name || "Namnlös elev"}
                        </div>
                        <Button
                          onClick={() => setEditingStudent({ classIndex, studentId: student.id })}
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      onClick={() => setStudentToDelete({ classIndex, studentId: student.id })}
                      size="sm"
                      variant="destructive"
                      className="rounded-xl"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    </div>
                  ))}

                <Button
                  onClick={() => addStudent(classIndex)}
                  size="sm"
                  variant="outline"
                  className="w-full rounded-xl"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Lägg till elev
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Button onClick={addClass} size="sm" className="w-full rounded-xl">
        <Plus className="mr-2 h-4 w-4" />
        Lägg till klass
      </Button>

      <AlertDialog open={classToDelete !== null} onOpenChange={(open) => !open && setClassToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort klass?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort denna klass? Alla elever i klassen kommer också att tas bort.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={() => classToDelete !== null && removeClass(classToDelete)}>
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={studentToDelete !== null} onOpenChange={(open) => !open && setStudentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort elev?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort denna elev?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={() => studentToDelete && removeStudent(studentToDelete.classIndex, studentToDelete.studentId)}>
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminClassEditor;
