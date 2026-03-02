/** Category shown when creating a task and on the task detail screen */
export type TaskCategory = 'Work' | 'Personal' | 'Shopping' | 'Health' | 'New';

export type CategoryLabels = Record<TaskCategory, string>;

/** User-created category (id is stored in task.category) */
export interface CustomCategory {
  id: string;
  label: string;
}

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
  /** Category (e.g. Work, Personal) or custom category id shown on task detail */
  category?: TaskCategory | string;
  /** When set, user gets a notification when arriving near this location */
  locationReminder?: TaskLocationReminder;
  /** Optional list of sub-tasks */
  subtasks?: SubTask[];
}

export type TaskContextType = {
  tasks: Task[];
  /** Current display labels for each category (can be renamed by the user) */
  categoryLabels: CategoryLabels;
  /** Categories that should be hidden/disabled in the UI (deleted); includes custom category ids */
  hiddenCategories: (TaskCategory | string)[];
  /** User-created categories (persisted per user) */
  customCategories: CustomCategory[];
  /** Create a new custom category */
  addCustomCategory: (label: string) => void;
  /** Rename a custom category by id */
  renameCustomCategory: (id: string, label: string) => void;
  /** Get display label for any category key (built-in or custom) */
  getCategoryLabel: (key: TaskCategory | string) => string;
  /** Rename the display label for a given category key (e.g. Work -> Deep Work) */
  renameCategoryLabel: (category: TaskCategory, label: string) => void;
  /** Delete a whole category and all its tasks */
  deleteCategoryAndTasks: (category: TaskCategory | string) => void;
  addTask: (
    title: string,
    details?: string,
    date?: Date,
    locationReminder?: TaskLocationReminder,
    subtasks?: SubTask[],
    category?: TaskCategory | string
  ) => void;
  toggleTask: (id: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  deleteTask: (id: string) => void;
  updateTaskDate: (taskId: string, date: Date) => void;
  updateTaskLocationReminder: (taskId: string, locationReminder: TaskLocationReminder | undefined) => void;
  addSubtask: (taskId: string, title: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
};
