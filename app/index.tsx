import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import {
  Plus,
  Home,
  LayoutGrid,
  CalendarDays,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { useTasks } from '../context/TaskContext';
import TaskItem from '../components/TaskItem';
import AddTaskModal from '../components/AddTaskModal';
import { format, addDays, startOfWeek } from 'date-fns';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function TasksScreen() {
  const { tasks, addTask, toggleTask, deleteTask } = useTasks();
  const { user, isLoading: authLoading } = useAuth();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled && !session) router.replace('/login');
    })();
    return () => { cancelled = true };
  }, [router]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  const today = new Date();
  const incompleteCount = useMemo(
    () => tasks.filter((t) => !t.isCompleted).length,
    [tasks]
  );
  const weekDays = useMemo(() => {
    const start = startOfWeek(today, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [today]);

  if (authLoading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // Sort tasks: Incomplete first, then by date
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.isCompleted === b.isCompleted) {
      return (b.date?.getTime() || 0) - (a.date?.getTime() || 0);
    }
    return a.isCompleted ? 1 : -1;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {user ? user.fullName.trim().charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
            <Text style={styles.headerScreenTitle}>Home</Text>
          </View>

          <TouchableOpacity activeOpacity={0.7} style={styles.searchButton}>
            <Search size={20} color="#E5E7EB" />
          </TouchableOpacity>
        </View>

        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText}>
            Good morning, {user ? user.fullName.trim().split(/\s+/)[0] || user.fullName : '...'}
          </Text>
          <Text style={styles.subGreetingText}>
            You have {incompleteCount} task
            {incompleteCount === 1 ? '' : 's'} to complete today.
          </Text>
        </View>
      </View>

      {/* Month & week strip */}
      <View style={styles.dateSection}>
        <View style={styles.monthRow}>
          <TouchableOpacity activeOpacity={0.7}>
            <ChevronLeft size={18} color="#9CA3AF" />
          </TouchableOpacity>
          <Text style={styles.monthText}>{format(today, 'MMMM yyyy')}</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekRow}>
          {weekDays.map((day) => {
            const isToday =
              day.getDate() === today.getDate() &&
              day.getMonth() === today.getMonth() &&
              day.getFullYear() === today.getFullYear();

            return (
              <View
                key={day.toISOString()}
                style={[styles.dayPill, isToday && styles.dayPillActive]}
              >
                <Text
                  style={[styles.dayName, isToday && styles.dayNameActive]}
                >
                  {format(day, 'EEE').toUpperCase()}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    isToday && styles.dayNumberActive,
                  ]}
                >
                  {format(day, 'd')}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderText}>Today's Tasks</Text>
      </View>

      {/* Task List */}
      <FlatList
        data={sortedTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TaskItem
            task={item}
            onToggle={toggleTask}
            onDelete={deleteTask}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyCircle}>
              <Plus size={40} color="#4B5563" />
            </View>
            <Text style={styles.emptyText}>No tasks yet</Text>
            <Text style={styles.emptySubText}>Add a task to get started</Text>
          </View>
        }
      />

      {/* Bottom navigation & FAB */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomNavContainer}>
          <View style={styles.bottomNavItemActive}>
            <Home size={20} color="#60A5FA" />
            <Text style={styles.bottomNavLabelActive}>My Day</Text>
          </View>
          <TouchableOpacity
            style={[styles.bottomNavItem, styles.bottomNavItemCategories]}
            onPress={() => router.push('categories')}
            activeOpacity={0.8}
          >
            <LayoutGrid size={20} color="#6B7280" />
            <Text style={styles.bottomNavLabel}>Categories</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomNavItem, styles.bottomNavItemCalendar]}
            onPress={() => router.push('calendar')}
            activeOpacity={0.8}
          >
            <CalendarDays size={20} color="#6B7280" />
            <Text style={styles.bottomNavLabel}>Calendar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bottomNavItem}
            onPress={() => router.push('settings')}
            activeOpacity={0.8}
          >
            <Settings size={20} color="#6B7280" />
            <Text style={styles.bottomNavLabel}>Settings</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.fabContainer} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setIsModalVisible(true)}
            activeOpacity={0.85}
          >
            <Plus size={34} color="#EFF6FF" />
          </TouchableOpacity>
        </View>
      </View>

      <AddTaskModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onAdd={addTask}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerScreenTitle: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#9CA3AF',
  },
  searchButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#F9FAFB',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  greetingContainer: {
    marginTop: 4,
  },
  greetingText: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  subGreetingText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
  },
  dateSection: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 16,
  },
  monthText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#E5E7EB',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayPill: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#020617',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#111827',
  },
  dayPillActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#2563EB',
  },
  dayName: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: '#6B7280',
    marginBottom: 4,
  },
  dayNameActive: {
    color: '#DBEAFE',
  },
  dayNumber: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#9CA3AF',
  },
  dayNumberActive: {
    color: '#EFF6FF',
  },
  sectionHeaderRow: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#E5E7EB',
  },
  listContent: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 140,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 120,
  },
  emptyCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 24,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#E5E7EB',
    marginBottom: 6,
  },
  emptySubText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6B7280',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 96,
    backgroundColor: '#020617',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 32,
    paddingBottom: 16,
    justifyContent: 'center',
  },
  bottomNavContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  fabContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    bottom: 28,
    zIndex: 10,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 12,
  },
  bottomNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bottomNavItemActive: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bottomNavItemCategories: {
    transform: [{ translateX: -24 }],
  },
  bottomNavItemCalendar: {
    transform: [{ translateX: 24 }],
  },
  bottomNavLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#6B7280',
  },
  bottomNavLabelActive: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#60A5FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
});
