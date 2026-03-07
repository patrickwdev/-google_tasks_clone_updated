import { supabase } from './supabase';
import type { Task, TaskLocationReminder, SubTask } from '../types/task';

/** Supabase row shape (snake_case) */
export interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  details: string | null;
  is_completed: boolean;
  date: string | null;
  list_id: string;
  category: string | null;
  location_reminder: TaskLocationReminder | null;
  /** Present after migration 003; undefined if column not yet added */
  reminders?: string[] | null;
  subtasks: SubTask[] | null;
  created_at: string;
  updated_at: string;
}

function parseRemindersFromRow(reminders: unknown): Date[] | undefined {
  if (reminders == null) return undefined;
  let arr: unknown[];
  if (Array.isArray(reminders)) {
    arr = reminders;
  } else if (typeof reminders === 'string') {
    try {
      const parsed = JSON.parse(reminders) as unknown;
      arr = Array.isArray(parsed) ? parsed : [];
    } catch {
      return undefined;
    }
  } else {
    return undefined;
  }
  const dates = arr
    .map((item) => {
      if (typeof item === 'string') return new Date(item);
      if (item instanceof Date) return item;
      if (item != null && typeof item === 'object' && 'toISOString' in item) return new Date((item as Date).toISOString());
      return null;
    })
    .filter((d): d is Date => d != null && !isNaN(d.getTime()));
  return dates.length ? dates : undefined;
}

function rowToTask(row: TaskRow): Task {
  const rawReminders = row.reminders ?? (row as unknown as Record<string, unknown>)['reminders'];
  const reminders = parseRemindersFromRow(rawReminders);
  return {
    id: row.id,
    title: row.title,
    details: row.details ?? undefined,
    isCompleted: row.is_completed,
    date: row.date ? new Date(row.date) : undefined,
    listId: row.list_id,
    category: (row.category as Task['category']) ?? undefined,
    locationReminder: row.location_reminder ?? undefined,
    reminders: reminders?.length ? reminders : undefined,
    subtasks: row.subtasks ?? undefined,
  };
}

function taskToRow(task: Partial<Task>, userId: string): Partial<TaskRow> {
  const row: Partial<TaskRow> = {
    title: task.title,
    details: task.details ?? null,
    is_completed: task.isCompleted ?? false,
    date: task.date ? task.date.toISOString() : null,
    list_id: task.listId ?? 'default',
    category: task.category ?? null,
    location_reminder: task.locationReminder ?? null,
    subtasks: task.subtasks ?? null,
    user_id: userId,
  };
  // Only include reminders when set, so insert works if the DB hasn't run the reminders migration yet
  if (task.reminders !== undefined) {
    row.reminders =
      task.reminders.length > 0
        ? task.reminders.map((d) => (d instanceof Date ? d.toISOString() : new Date(d).toISOString()))
        : [];
  }
  return row;
}

/** Fetch all tasks for the current user (requires auth) */
export async function fetchTasks(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row: TaskRow) => rowToTask(row));
}

/** Insert a new task; returns the created Task with id from Supabase */
export async function insertTask(
  userId: string,
  task: { title: string; details?: string; date?: Date; locationReminder?: TaskLocationReminder; subtasks?: SubTask[]; category?: Task['category']; reminders?: Date[] }
): Promise<Task> {
  const row = taskToRow(
    {
      title: task.title,
      details: task.details,
      date: task.date,
      isCompleted: false,
      listId: 'default',
      category: task.category,
      locationReminder: task.locationReminder,
      reminders: task.reminders,
      subtasks: task.subtasks,
    },
    userId
  );

  const { data, error } = await supabase.from('tasks').insert(row).select('*').single();

  if (error) throw error;
  return rowToTask(data as TaskRow);
}

/** Update a task by id (partial update) */
export async function updateTask(
  userId: string,
  taskId: string,
  patch: Partial<Pick<Task, 'title' | 'details' | 'isCompleted' | 'date' | 'listId' | 'category' | 'locationReminder' | 'reminders' | 'subtasks'>>
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.details !== undefined) row.details = patch.details;
  if (patch.isCompleted !== undefined) row.is_completed = patch.isCompleted;
  if (patch.date !== undefined) row.date = patch.date ? patch.date.toISOString() : null;
  if (patch.listId !== undefined) row.list_id = patch.listId;
  if (patch.category !== undefined) row.category = patch.category ?? null;
  if (patch.locationReminder !== undefined) row.location_reminder = patch.locationReminder ?? null;
  if (patch.reminders !== undefined) {
    row.reminders =
      patch.reminders.length > 0
        ? patch.reminders.map((d) => (d instanceof Date ? d.toISOString() : new Date(d).toISOString()))
        : [];
  }
  if (patch.subtasks !== undefined) row.subtasks = patch.subtasks ?? null;

  const { error } = await supabase
    .from('tasks')
    .update(row)
    .eq('id', taskId)
    .eq('user_id', userId);

  if (error) throw error;
}

/** Delete a task by id */
export async function deleteTaskById(userId: string, taskId: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId).eq('user_id', userId);
  if (error) throw error;
}
