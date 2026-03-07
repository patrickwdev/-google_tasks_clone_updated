import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Calendar, MapPin, Check, Trash2, ListChecks, MoreVertical, Folder } from 'lucide-react-native';
import { format } from 'date-fns';
import { useTasks } from '../../context/TaskContext';
import { Colors } from '../../constants/Colors';
import EditTaskPanel from '../../components/EditTaskPanel';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tasks, toggleTask, toggleSubtask, deleteTask, categoryLabels } = useTasks();
  const [editPanelVisible, setEditPanelVisible] = useState(false);

  const task = id ? tasks.find((t) => t.id === id) : undefined;

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color="#E5E7EB" />
          </TouchableOpacity>
        </View>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>Task not found</Text>
          <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleToggle = () => toggleTask(task.id);
  const handleDelete = () => {
    deleteTask(task.id);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#E5E7EB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Task</Text>
        <TouchableOpacity
          onPress={() => setEditPanelVisible(true)}
          style={styles.editButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MoreVertical size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <EditTaskPanel
        visible={editPanelVisible}
        onClose={() => setEditPanelVisible(false)}
        taskId={task.id}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Completed toggle */}
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={handleToggle}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, task.isCompleted && styles.checkboxChecked]}>
            {task.isCompleted && <Check size={20} color="#FFF" strokeWidth={3} />}
          </View>
          <Text style={styles.toggleLabel}>
            {task.isCompleted ? 'Completed' : 'Mark as complete'}
          </Text>
        </TouchableOpacity>

        {/* Title */}
        <Text style={[styles.title, task.isCompleted && styles.titleCompleted]}>
          {task.title}
        </Text>

        {/* Details */}
        {task.details ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Details</Text>
            <Text style={styles.detailsText}>{task.details}</Text>
          </View>
        ) : null}

        {/* Category */}
        {task.category ? (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Folder size={18} color="#9CA3AF" />
              <Text style={styles.sectionLabel}>Category</Text>
            </View>
            <Text style={styles.categoryText}>
              {categoryLabels[task.category] ?? task.category}
            </Text>
          </View>
        ) : null}

        {/* Sub-tasks */}
        {task.subtasks && task.subtasks.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <ListChecks size={18} color="#9CA3AF" />
              <Text style={styles.sectionLabel}>Sub-tasks</Text>
            </View>
            {task.subtasks.map((st) => (
              <TouchableOpacity
                key={st.id}
                style={styles.subtaskRow}
                onPress={() => toggleSubtask(task.id, st.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.subtaskCheckbox, st.isCompleted && styles.checkboxChecked]}>
                  {st.isCompleted && <Check size={16} color="#FFF" strokeWidth={3} />}
                </View>
                <Text
                  style={[styles.subtaskTitle, st.isCompleted && styles.subtaskTitleCompleted]}
                  numberOfLines={2}
                >
                  {st.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Due date */}
        {task.date ? (() => {
          const dueDate = task.date instanceof Date ? task.date : new Date(task.date);
          const hasTime = dueDate.getHours() !== 0 || dueDate.getMinutes() !== 0;
          return (
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <Calendar size={18} color="#9CA3AF" />
                <Text style={styles.sectionLabel}>Due date</Text>
              </View>
              <Text style={styles.dateText}>
                {hasTime
                  ? format(dueDate, "EEEE, MMMM d, yyyy 'at' h:mm a")
                  : format(dueDate, 'EEEE, MMMM d, yyyy')}
              </Text>
            </View>
          );
        })() : null}

        {/* Location reminder */}
        {task.locationReminder ? (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <MapPin size={18} color={Colors.light.primary} />
              <Text style={styles.sectionLabel}>Remind me when I'm near</Text>
            </View>
            <Text style={styles.locationText}>{task.locationReminder.locationName}</Text>
          </View>
        ) : null}

        {/* Delete */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} activeOpacity={0.7}>
          <Trash2 size={20} color={Colors.light.danger} />
          <Text style={styles.deleteButtonText}>Delete task</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#111827',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#F9FAFB',
  },
  headerRight: {
    width: 40,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  toggleLabel: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#9CA3AF',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#F9FAFB',
    marginBottom: 24,
    lineHeight: 32,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailsText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#E5E7EB',
    lineHeight: 24,
  },
  categoryText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#9CA3AF',
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingRight: 8,
    marginBottom: 4,
  },
  subtaskCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  subtaskTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: '#E5E7EB',
  },
  subtaskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  dateText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#BFDBFE',
  },
  locationText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#93C5FD',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(217, 48, 37, 0.4)',
  },
  deleteButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.light.danger,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  notFoundText: {
    fontSize: 18,
    fontFamily: 'Inter_500Medium',
    color: '#9CA3AF',
    marginBottom: 16,
  },
  backLink: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  backLinkText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.light.primary,
  },
});
