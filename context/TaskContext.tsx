import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, TaskContextType, TaskLocationReminder, SubTask, TaskCategory, CategoryLabels, CustomCategory } from '../types/task';
import { syncGeofencesForTasks } from '../lib/geofencing';
import { useAuth } from './AuthContext';
import { fetchTasks, insertTask, updateTask, deleteTaskById } from '../lib/tasksDb';

const HIDDEN_CATEGORIES_KEY = (userId: string) => `hidden_categories_${userId}`;
const CUSTOM_CATEGORIES_KEY = (userId: string) => `custom_categories_${userId}`;
const VALID_CATEGORIES: TaskCategory[] = ['Work', 'Personal', 'Shopping', 'Health', 'New'];
const CUSTOM_ID_PREFIX = 'custom_';

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
  const [categoryLabels, setCategoryLabels] = useState<CategoryLabels>({
    Work: 'Work',
    Personal: 'Personal',
    Shopping: 'Shopping',
    Health: 'Health',
    New: 'New',
  });
  const [hiddenCategories, setHiddenCategories] = useState<(TaskCategory | string)[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const hiddenCategoriesLoadedRef = useRef(false);
  const customCategoriesLoadedRef = useRef(false);

  // Load hidden categories from storage when user is logged in
  useEffect(() => {
    if (!user?.id) {
      setHiddenCategories([]);
      hiddenCategoriesLoadedRef.current = false;
      return;
    }
    hiddenCategoriesLoadedRef.current = false;
    let cancelled = false;
    AsyncStorage.getItem(HIDDEN_CATEGORIES_KEY(user.id))
      .then((raw) => {
        if (cancelled) return;
        try {
          const parsed = raw ? JSON.parse(raw) : [];
          const valid = Array.isArray(parsed)
            ? parsed.filter((c: unknown) =>
                typeof c === 'string' && (VALID_CATEGORIES.includes(c as TaskCategory) || c.startsWith(CUSTOM_ID_PREFIX))
              ) as (TaskCategory | string)[]
            : [];
          setHiddenCategories(valid);
        } catch {
          setHiddenCategories([]);
        }
        hiddenCategoriesLoadedRef.current = true;
      })
      .catch(() => {
        if (!cancelled) setHiddenCategories([]);
        hiddenCategoriesLoadedRef.current = true;
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  // Persist hidden categories when they change (so deleted category cards stay hidden after refresh)
  useEffect(() => {
    if (!user?.id || !hiddenCategoriesLoadedRef.current) return;
    AsyncStorage.setItem(HIDDEN_CATEGORIES_KEY(user.id), JSON.stringify(hiddenCategories)).catch(() => {});
  }, [user?.id, hiddenCategories]);

  // Load custom categories from storage when user is logged in
  useEffect(() => {
    if (!user?.id) {
      setCustomCategories([]);
      customCategoriesLoadedRef.current = false;
      return;
    }
    customCategoriesLoadedRef.current = false;
    let cancelled = false;
    AsyncStorage.getItem(CUSTOM_CATEGORIES_KEY(user.id))
      .then((raw) => {
        if (cancelled) return;
        try {
          const parsed = raw ? JSON.parse(raw) : [];
          const valid = Array.isArray(parsed)
            ? parsed.filter(
                (c: unknown) =>
                  c != null &&
                  typeof c === 'object' &&
                  'id' in c &&
                  'label' in c &&
                  typeof (c as CustomCategory).id === 'string' &&
                  typeof (c as CustomCategory).label === 'string' &&
                  (c as CustomCategory).id.startsWith(CUSTOM_ID_PREFIX)
              ) as CustomCategory[]
            : [];
          setCustomCategories(valid);
        } catch {
          setCustomCategories([]);
        }
        customCategoriesLoadedRef.current = true;
      })
      .catch(() => {
        if (!cancelled) setCustomCategories([]);
        customCategoriesLoadedRef.current = true;
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  // Persist custom categories when they change
  useEffect(() => {
    if (!user?.id || !customCategoriesLoadedRef.current) return;
    AsyncStorage.setItem(CUSTOM_CATEGORIES_KEY(user.id), JSON.stringify(customCategories)).catch(() => {});
  }, [user?.id, customCategories]);

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

  const addCustomCategory = useCallback((label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const id = `${CUSTOM_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setCustomCategories((prev) => [...prev, { id, label: trimmed }]);
  }, []);

  const renameCustomCategory = useCallback((id: string, label: string) => {
    const trimmed = label.trim();
    if (!trimmed || !id.startsWith(CUSTOM_ID_PREFIX)) return;
    setCustomCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, label: trimmed } : c))
    );
  }, []);

  const getCategoryLabel = useCallback(
    (key: TaskCategory | string): string => {
      if (VALID_CATEGORIES.includes(key as TaskCategory)) {
        return categoryLabels[key as TaskCategory] ?? key;
      }
      const custom = customCategories.find((c) => c.id === key);
      return custom?.label ?? key;
    },
    [categoryLabels, customCategories]
  );

  const renameCategoryLabel = useCallback(
    (category: TaskCategory, label: string) => {
      setCategoryLabels((prev) => ({
        ...prev,
        [category]: label.trim() || prev[category],
      }));
    },
    [],
  );

  const deleteCategoryAndTasks = useCallback(
    (category: TaskCategory | string) => {
      setHiddenCategories((prev) =>
        prev.includes(category) ? prev : [...prev, category],
      );
      setTasks((prev) => {
        const remaining: Task[] = [];
        const toDelete: Task[] = [];
        for (const task of prev) {
          if (task.category === category) {
            toDelete.push(task);
          } else {
            remaining.push(task);
          }
        }
        if (user) {
          toDelete
            .filter((t) => !t.id.startsWith('temp-'))
            .forEach((t) => {
              deleteTaskById(user.id, t.id).catch((err) =>
                console.warn('Failed to delete task from Supabase:', err),
              );
            });
        }
        return remaining;
      });
    },
    [user],
  );

  return (
    <TaskContext.Provider
      value={{
        tasks,
        categoryLabels,
        hiddenCategories,
        customCategories,
        addCustomCategory,
        renameCustomCategory,
        getCategoryLabel,
        renameCategoryLabel,
        deleteCategoryAndTasks,
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
