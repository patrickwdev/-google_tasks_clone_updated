/** Optional location for "remind me when I'm near" notifications */
export interface TaskLocationReminder {
  locationName: string;
  latitude: number;
  longitude: number;
  /** Notify when within this distance in feet (default used by app if not set) */
  radiusFeet?: number;
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
}

export type TaskContextType = {
  tasks: Task[];
  addTask: (
    title: string,
    details?: string,
    date?: Date,
    locationReminder?: TaskLocationReminder
  ) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
};
