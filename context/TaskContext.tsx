import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Task, TaskContextType, TaskLocationReminder, SubTask } from '../types/task';
import { syncGeofencesForTasks } from '../lib/geofencing';

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};

export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const [tasks, setTasks] = useState<Task[]>([
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
  ]);

  const addTask = (
    title: string,
    details?: string,
    date?: Date,
    locationReminder?: TaskLocationReminder,
    subtasks?: SubTask[]
  ) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title,
      details,
      date,
      isCompleted: false,
      listId: 'default',
      locationReminder,
      subtasks: subtasks?.length ? subtasks : undefined,
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  // Sync geofences whenever tasks with location reminders change
  useEffect(() => {
    syncGeofencesForTasks(tasks).catch(() => {});
  }, [tasks]);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, isCompleted: !task.isCompleted } : task
      )
    );
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId || !task.subtasks) return task;
        return {
          ...task,
          subtasks: task.subtasks.map((st) =>
            st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
          ),
        };
      })
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const updateTaskDate = (taskId: string, date: Date) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, date } : task))
    );
  };

  const updateTaskLocationReminder = (taskId: string, locationReminder: TaskLocationReminder | undefined) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, locationReminder } : task))
    );
  };

  const addSubtask = (taskId: string, title: string) => {
    const newSubtask: SubTask = {
      id: Date.now().toString(),
      title: title.trim(),
      isCompleted: false,
    };
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const subtasks = [...(task.subtasks || []), newSubtask];
        return { ...task, subtasks };
      })
    );
  };

  const deleteSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId || !task.subtasks) return task;
        const subtasks = task.subtasks.filter((st) => st.id !== subtaskId);
        return { ...task, subtasks: subtasks.length ? subtasks : undefined };
      })
    );
  };

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
