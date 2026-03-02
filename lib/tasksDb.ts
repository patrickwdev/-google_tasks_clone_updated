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
  subtasks: SubTask[] | null;
  created_at: string;
  updated_at: string;
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    details: row.details ?? undefined,
    isCompleted: row.is_completed,
    date: row.date ? new Date(row.date) : undefined,
    listId: row.list_id,
    category: (row.category as Task['category']) ?? undefined,
    locationReminder: row.location_reminder ?? undefined,
    subtasks: row.subtasks ?? undefined,
  };
}

function taskToRow(task: Partial<Task>, userId: string): Partial<TaskRow> {
  return {
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
  task: { title: string; details?: string; date?: Date; locationReminder?: TaskLocationReminder; subtasks?: SubTask[]; category?: Task['category'] }
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
  patch: Partial<Pick<Task, 'title' | 'details' | 'isCompleted' | 'date' | 'listId' | 'category' | 'locationReminder' | 'subtasks'>>
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.details !== undefined) row.details = patch.details;
  if (patch.isCompleted !== undefined) row.is_completed = patch.isCompleted;
  if (patch.date !== undefined) row.date = patch.date ? patch.date.toISOString() : null;
  if (patch.listId !== undefined) row.list_id = patch.listId;
  if (patch.category !== undefined) row.category = patch.category ?? null;
  if (patch.locationReminder !== undefined) row.location_reminder = patch.locationReminder ?? null;
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
