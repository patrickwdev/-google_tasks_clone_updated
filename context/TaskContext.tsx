import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Task, TaskContextType, TaskLocationReminder } from '../types/task';
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
    locationReminder?: TaskLocationReminder
  ) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title,
      details,
      date,
      isCompleted: false,
      listId: 'default',
      locationReminder,
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

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  return (
    <TaskContext.Provider value={{ tasks, addTask, toggleTask, deleteTask }}>
      {children}
    </TaskContext.Provider>
  );
};
