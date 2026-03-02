import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Task, TaskContextType, TaskLocationReminder, SubTask, TaskCategory } from '../types/task';
import { syncGeofencesForTasks } from '../lib/geofencing';
import { useAuth } from './AuthContext';
import { fetchTasks, insertTask, updateTask, deleteTaskById } from '../lib/tasksDb';

const TaskContext = createContext<TaskContextType | undefined>(undefined);

const DEFAULT_TASKS: Task[] = [
  {
    id: '1',
    title: 'Welcome to Tasks',
    details: 'Tap the + button to create a new task.',
    isCompleted: false,
    listId: 'default',
    date: new Date(),
  },
  {
    id: '2',
    title: 'Try completing a task',
    details: 'Tap the circle to mark as done.',
    isCompleted: false,
    listId: 'default',
  },
];

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};

export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);
  const [tasksLoaded, setTasksLoaded] = useState(false);

  // Load tasks from Supabase when user is logged in
  useEffect(() => {
    if (!user) {
      setTasks(DEFAULT_TASKS);
      setTasksLoaded(false);
      return;
    }
    let cancelled = false;
    setTasksLoaded(false);
    fetchTasks(user.id)
      .then((list) => {
        if (!cancelled) {
          setTasks(list.length ? list : DEFAULT_TASKS);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('Failed to load tasks from Supabase:', err);
          setTasks(DEFAULT_TASKS);
        }
      })
      .finally(() => {
        if (!cancelled) setTasksLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const addTask = useCallback(
    (
      title: string,
      details?: string,
      date?: Date,
      locationReminder?: TaskLocationReminder,
      subtasks?: SubTask[],
      category?: TaskCategory
    ) => {
      if (user) {
        const tempId = `temp-${Date.now()}`;
        const tempTask: Task = {
          id: tempId,
          title,
          details,
          date,
          isCompleted: false,
          listId: 'default',
          category,
          locationReminder,
          subtasks: subtasks?.length ? subtasks : undefined,
        };
        setTasks((prev) => [tempTask, ...prev]);
        insertTask(user.id, { title, details, date, locationReminder, subtasks, category })
          .then((created) => {
            setTasks((prev) => prev.map((t) => (t.id === tempId ? created : t)));
          })
          .catch((err) => {
            console.warn('Failed to save task to Supabase:', err);
            setTasks((prev) => prev.filter((t) => t.id !== tempId));
          });
      } else {
        const newTask: Task = {
          id: Date.now().toString(),
          title,
          details,
          date,
          isCompleted: false,
          listId: 'default',
          category,
          locationReminder,
          subtasks: subtasks?.length ? subtasks : undefined,
        };
        setTasks((prev) => [newTask, ...prev]);
      }
    },
    [user]
  );

  // Sync geofences whenever tasks with location reminders change
  useEffect(() => {
    syncGeofencesForTasks(tasks).catch(() => {});
  }, [tasks]);

  const toggleTask = useCallback(
    (id: string) => {
      setTasks((prev) => {
        const next = prev.map((task) =>
          task.id === id ? { ...task, isCompleted: !task.isCompleted } : task
        );
        const updated = next.find((t) => t.id === id);
        if (user && updated && !id.startsWith('temp-')) {
          updateTask(user.id, id, { isCompleted: updated.isCompleted }).catch((err) =>
            console.warn('Failed to update task in Supabase:', err)
          );
        }
        return next;
      });
    },
    [user]
  );

  const toggleSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      setTasks((prev) => {
        const next = prev.map((task) => {
          if (task.id !== taskId || !task.subtasks) return task;
          const subtasks = task.subtasks.map((st) =>
            st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
          );
          return { ...task, subtasks };
        });
        const updated = next.find((t) => t.id === taskId);
        if (user && updated && !taskId.startsWith('temp-')) {
          updateTask(user.id, taskId, { subtasks: updated.subtasks }).catch((err) =>
            console.warn('Failed to update task in Supabase:', err)
          );
        }
        return next;
      });
    },
    [user]
  );

  const deleteTask = useCallback(
    (id: string) => {
      if (user && !id.startsWith('temp-')) {
        deleteTaskById(user.id, id).catch((err) =>
          console.warn('Failed to delete task from Supabase:', err)
        );
      }
      setTasks((prev) => prev.filter((task) => task.id !== id));
    },
    [user]
  );

  const updateTaskDate = useCallback(
    (taskId: string, date: Date) => {
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? { ...task, date } : task))
      );
      if (user && !taskId.startsWith('temp-')) {
        updateTask(user.id, taskId, { date }).catch((err) =>
          console.warn('Failed to update task in Supabase:', err)
        );
      }
    },
    [user]
  );

  const updateTaskLocationReminder = useCallback(
    (taskId: string, locationReminder: TaskLocationReminder | undefined) => {
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? { ...task, locationReminder } : task))
      );
      if (user && !taskId.startsWith('temp-')) {
        updateTask(user.id, taskId, { locationReminder }).catch((err) =>
          console.warn('Failed to update task in Supabase:', err)
        );
      }
    },
    [user]
  );

  const addSubtask = useCallback(
    (taskId: string, title: string) => {
      const newSubtask: SubTask = {
        id: Date.now().toString(),
        title: title.trim(),
        isCompleted: false,
      };
      setTasks((prev) => {
        const next = prev.map((task) => {
          if (task.id !== taskId) return task;
          const subtasks = [...(task.subtasks || []), newSubtask];
          return { ...task, subtasks };
        });
        const updated = next.find((t) => t.id === taskId);
        if (user && updated && !taskId.startsWith('temp-')) {
          updateTask(user.id, taskId, { subtasks: updated.subtasks }).catch((err) =>
            console.warn('Failed to update task in Supabase:', err)
          );
        }
        return next;
      });
    },
    [user]
  );

  const deleteSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      setTasks((prev) => {
        const next = prev.map((task) => {
          if (task.id !== taskId || !task.subtasks) return task;
          const subtasks = task.subtasks.filter((st) => st.id !== subtaskId);
          return { ...task, subtasks: subtasks.length ? subtasks : undefined };
        });
        const updated = next.find((t) => t.id === taskId);
        if (user && updated && !taskId.startsWith('temp-')) {
          updateTask(user.id, taskId, { subtasks: updated.subtasks }).catch((err) =>
            console.warn('Failed to update task in Supabase:', err)
          );
        }
        return next;
      });
    },
    [user]
  );

  return (
    <TaskContext.Provider
      value={{
        tasks,
        addTask,
        toggleTask,
        toggleSubtask,
        deleteTask,
        updateTaskDate,
        updateTaskLocationReminder,
        addSubtask,
        deleteSubtask,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};
