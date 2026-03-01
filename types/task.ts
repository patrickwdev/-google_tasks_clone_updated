/** Optional location for "remind me when I'm near" notifications */
export interface TaskLocationReminder {
  locationName: string;
  latitude: number;
  longitude: number;
  /** Notify when within this distance in feet (default used by app if not set) */
  radiusFeet?: number;
}

/** A single sub-task under a task */
export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Task {
  id: string;
  title: string;
  details?: string;
  isCompleted: boolean;
  date?: Date;
  listId: string; // For future multiple lists support
  /** When set, user gets a notification when arriving near this location */
  locationReminder?: TaskLocationReminder;
  /** Optional list of sub-tasks */
  subtasks?: SubTask[];
}

export type TaskContextType = {
  tasks: Task[];
  addTask: (
    title: string,
    details?: string,
    date?: Date,
    locationReminder?: TaskLocationReminder,
    subtasks?: SubTask[]
  ) => void;
  toggleTask: (id: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  deleteTask: (id: string) => void;
  updateTaskDate: (taskId: string, date: Date) => void;
  updateTaskLocationReminder: (taskId: string, locationReminder: TaskLocationReminder | undefined) => void;
  addSubtask: (taskId: string, title: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
};
