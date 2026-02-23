import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Task, TaskContextType } from '../types/task';

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

  const addTask = (title: string, details?: string, date?: Date) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title,
      details,
      date,
      isCompleted: false,
      listId: 'default',
    };
    setTasks((prev) => [newTask, ...prev]);
  };

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
