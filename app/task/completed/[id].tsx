import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Calendar, MapPin, Check, Trash2, ListChecks } from 'lucide-react-native';
import { format } from 'date-fns';
import { useTasks } from '../../../context/TaskContext';
import { Colors } from '../../../constants/Colors';

export default function CompletedTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tasks, toggleTask, deleteTask } = useTasks();

  const task = id ? tasks.find((t) => t.id === id) : undefined;

  if (!task) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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

  const handleMarkIncomplete = () => {
    toggleTask(task.id);
    router.back();
  };

  const handleDelete = () => {
    deleteTask(task.id);
    router.back();
  };

  const taskDate = task.date
    ? task.date instanceof Date ? task.date : new Date(task.date)
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#E5E7EB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Completed</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.completedBadge}>
          <Check size={18} color="#22C55E" strokeWidth={2.5} />
          <Text style={styles.completedBadgeText}>Completed</Text>
        </View>

        <Text style={styles.title}>{task.title}</Text>

        {task.details ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Details</Text>
            <Text style={styles.detailsText}>{task.details}</Text>
          </View>
        ) : null}

        {task.subtasks && task.subtasks.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <ListChecks size={18} color="#9CA3AF" />
              <Text style={styles.sectionLabel}>Sub-tasks</Text>
            </View>
            {task.subtasks.map((st) => (
              <View key={st.id} style={styles.subtaskRow}>
                <View style={[styles.subtaskCheckbox, st.isCompleted && styles.checkboxChecked]}>
                  {st.isCompleted && <Check size={16} color="#FFF" strokeWidth={3} />}
                </View>
                <Text
                  style={[styles.subtaskTitle, st.isCompleted && styles.subtaskTitleCompleted]}
                  numberOfLines={2}
                >
                  {st.title}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {taskDate ? (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Calendar size={18} color="#9CA3AF" />
              <Text style={styles.sectionLabel}>Due date</Text>
            </View>
            <Text style={styles.dateText}>
              {format(taskDate, 'EEEE, MMMM d, yyyy')}
            </Text>
          </View>
        ) : null}

        {task.locationReminder ? (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <MapPin size={18} color={Colors.light.primary} />
              <Text style={styles.sectionLabel}>Remind me when I'm near</Text>
            </View>
            <Text style={styles.locationText}>{task.locationReminder.locationName}</Text>
          </View>
        ) : null}

        <TouchableOpacity style={styles.markIncompleteButton} onPress={handleMarkIncomplete} activeOpacity={0.7}>
          <Text style={styles.markIncompleteButtonText}>Mark incomplete</Text>
        </TouchableOpacity>

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignSelf: 'flex-start',
  },
  completedBadgeText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#22C55E',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#9CA3AF',
    marginBottom: 24,
    lineHeight: 32,
    textDecorationLine: 'line-through',
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
  checkboxChecked: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
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
  markIncompleteButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  markIncompleteButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#94A3B8',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
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
