import React, { useMemo, useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  Home,
  LayoutGrid,
  CalendarDays,
  Settings,
  Search,
  Plus,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { useTasks } from '../context/TaskContext';
import TaskItem from '../components/TaskItem';
import AddTaskModal from '../components/AddTaskModal';

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildMonthGrid(month: Date): Date[] {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const calendarStart = startOfWeek(start, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(end, { weekStartsOn: 0 });
  const days: Date[] = [];
  let d = calendarStart;
  while (d <= calendarEnd) {
    days.push(d);
    d = addDays(d, 1);
  }
  return days;
}

export default function CalendarScreen() {
  const router = useRouter();
  const { tasks, addTask, toggleTask, deleteTask } = useTasks();
  const { user, isLoading: authLoading } = useAuth();
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled && !session) router.replace('/login');
    })();
    return () => { cancelled = true };
  }, [router]);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const monthGrid = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const tasksForSelectedDay = useMemo(() => {
    return tasks.filter((task) => {
      if (!task.date) return false;
      const taskDate = task.date instanceof Date ? task.date : new Date(task.date);
      return isSameDay(taskDate, selectedDate);
    });
  }, [tasks, selectedDate]);

  const goPrevMonth = () => setViewMonth((m) => subMonths(m, 1));
  const goNextMonth = () => setViewMonth((m) => addMonths(m, 1));

  if (authLoading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>A</Text>
            </View>
            <Text style={styles.headerScreenTitle}>Calendar</Text>
          </View>
          <TouchableOpacity activeOpacity={0.7} style={styles.searchButton}>
            <Search size={20} color="#E5E7EB" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Month navigation */}
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={goPrevMonth} activeOpacity={0.7}>
            <ChevronLeft size={22} color="#9CA3AF" />
          </TouchableOpacity>
          <Text style={styles.monthText}>{format(viewMonth, 'MMMM yyyy')}</Text>
          <TouchableOpacity onPress={goNextMonth} activeOpacity={0.7}>
            <ChevronRight size={22} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Week day headers */}
        <View style={styles.weekDayRow}>
          {WEEK_DAYS.map((day) => (
            <Text key={day} style={styles.weekDayText}>
              {day}
            </Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calendarGrid}>
          {monthGrid.map((day) => {
            const inMonth = isSameMonth(day, viewMonth);
            const selected = isSameDay(day, selectedDate);
            const today = isToday(day);
            return (
              <TouchableOpacity
                key={day.toISOString()}
                style={[
                  styles.dayCell,
                  !inMonth && styles.dayCellOtherMonth,
                  selected && styles.dayCellSelected,
                  today && !selected && styles.dayCellToday,
                ]}
                onPress={() => setSelectedDate(day)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.dayCellText,
                    !inMonth && styles.dayCellTextOtherMonth,
                    selected && styles.dayCellTextSelected,
                    today && !selected && styles.dayCellTextToday,
                  ]}
                >
                  {format(day, 'd')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tasks for selected day */}
        <View style={styles.tasksSection}>
          <Text style={styles.tasksSectionTitle}>
            {format(selectedDate, 'EEEE, MMM d')}
          </Text>
          {tasksForSelectedDay.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No tasks this day</Text>
              <Text style={styles.emptySubText}>
                Add a task with a date to see it here
              </Text>
            </View>
          ) : (
            tasksForSelectedDay.map((item) => (
              <TaskItem
                key={item.id}
                task={item}
                onToggle={toggleTask}
                onDelete={deleteTask}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Bottom navigation & FAB */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomNavContainer}>
          <TouchableOpacity
            style={styles.bottomNavItem}
            onPress={() => router.push('/')}
            activeOpacity={0.8}
          >
            <Home size={20} color="#6B7280" />
            <Text style={styles.bottomNavLabel}>My Day</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomNavItem, styles.bottomNavItemCategories]}
            onPress={() => router.push('categories')}
            activeOpacity={0.8}
          >
            <LayoutGrid size={20} color="#6B7280" />
            <Text style={styles.bottomNavLabel}>Categories</Text>
          </TouchableOpacity>
          <View style={[styles.bottomNavItemActive, styles.bottomNavItemCalendar]}>
            <CalendarDays size={20} color="#60A5FA" />
            <Text style={styles.bottomNavLabelActive}>Calendar</Text>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#E5E7EB',
  },
  headerScreenTitle: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: '#F9FAFB',
  },
  searchButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  monthText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#F9FAFB',
  },
  weekDayRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  weekDayText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#6B7280',
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  dayCell: {
    width: '13%',
    aspectRatio: 1,
    marginVertical: 2,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: '0.64%',
  },
  dayCellOtherMonth: {
    opacity: 0.35,
  },
  dayCellSelected: {
    backgroundColor: '#2563EB',
  },
  dayCellToday: {
    backgroundColor: '#1E3A5F',
  },
  dayCellText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: '#F9FAFB',
  },
  dayCellTextOtherMonth: {
    color: '#9CA3AF',
  },
  dayCellTextSelected: {
    color: '#EFF6FF',
  },
  dayCellTextToday: {
    color: '#93C5FD',
  },
  tasksSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    minHeight: 120,
  },
  tasksSectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#9CA3AF',
    marginBottom: 12,
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: '#6B7280',
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#4B5563',
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
});
