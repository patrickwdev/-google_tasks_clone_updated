export interface Task {
  id: string;
  title: string;
  details?: string;
  isCompleted: boolean;
  date?: Date;
  listId: string; // For future multiple lists support
}

export type TaskContextType = {
  tasks: Task[];
  addTask: (title: string, details?: string, date?: Date) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
};
