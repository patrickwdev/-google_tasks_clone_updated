/** Category shown when creating a task and on the task detail screen */
export type TaskCategory = 'Work' | 'Personal' | 'Shopping' | 'Health' | 'Home';

/** Single source of truth for built-in category keys (each must be unique). Add new keys here and in TaskContext + categories BUILT_IN_CATEGORIES. */
export const BUILT_IN_CATEGORY_KEYS: TaskCategory[] = ['Work', 'Personal', 'Shopping', 'Health', 'Home'];

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
  /** Optional date/time reminders (e.g. "Remind me at 2:30 PM") */
  reminders?: Date[];
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
  /** Create a new custom category. Returns false if a category with that name already exists. */
  addCustomCategory: (label: string) => boolean;
  /** Rename a custom category by id. Returns false if another category already has that name. */
  renameCustomCategory: (id: string, label: string) => boolean;
  /** Get display label for any category key (built-in or custom) */
  getCategoryLabel: (key: TaskCategory | string) => string;
  /** Rename the display label for a given category key. Returns false if another category already has that name. */
  renameCategoryLabel: (category: TaskCategory, label: string) => boolean;
  /** Delete a whole category and all its tasks */
  deleteCategoryAndTasks: (category: TaskCategory | string) => void;
  addTask: (
    title: string,
    details?: string,
    date?: Date,
    locationReminder?: TaskLocationReminder,
    subtasks?: SubTask[],
    category?: TaskCategory | string,
    reminders?: Date[]
  ) => void;
  toggleTask: (id: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  deleteTask: (id: string) => void;
  updateTaskDate: (taskId: string, date: Date) => void;
  updateTaskLocationReminder: (taskId: string, locationReminder: TaskLocationReminder | undefined) => void;
  updateTaskReminders: (taskId: string, reminders: Date[]) => void;
  addSubtask: (taskId: string, title: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
};
