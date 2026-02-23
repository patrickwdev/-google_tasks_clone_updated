import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check, Trash2 } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { Task } from '../types/task';
import { format } from 'date-fns';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.checkbox, task.isCompleted && styles.checkboxChecked]}
        onPress={() => onToggle(task.id)}
        activeOpacity={0.6}
      >
        {task.isCompleted && <Check size={16} color="#FFF" strokeWidth={3} />}
      </TouchableOpacity>

      <View style={styles.content}>
        <Text
          style={[styles.title, task.isCompleted && styles.titleCompleted]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        {task.details && (
          <Text style={styles.details} numberOfLines={1}>
            {task.details}
          </Text>
        )}
        {task.date && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>
              {format(new Date(task.date), 'EEE, MMM d')}
            </Text>
          </View>
        )}
      </View>

      {/* Optional: Add a subtle delete or menu button if needed, 
          for now keeping it clean like Google Tasks (usually swipe or detail view) 
          Adding a small delete button for UX convenience in this MVP */}
      <TouchableOpacity onPress={() => onDelete(task.id)} style={styles.deleteBtn}>
          <Trash2 size={18} color={Colors.light.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#020617',
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#111827',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginRight: 16,
  },
  checkboxChecked: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#E5E7EB',
    marginBottom: 2,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  details: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  dateContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#BFDBFE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#1D4ED8',
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 8,
  }
});
