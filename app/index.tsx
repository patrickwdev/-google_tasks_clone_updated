import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SectionList,
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
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { useTasks } from '../context/TaskContext';
import TaskItem from '../components/TaskItem';
import AddTaskModal from '../components/AddTaskModal';
import { format, addDays, startOfWeek, isSameDay, startOfDay } from 'date-fns';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function TasksScreen() {
  const { tasks, addTask, toggleTask, deleteTask } = useTasks();
  const { user, isLoading: authLoading } = useAuth();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [viewWeekStart, setViewWeekStart] = useState<Date>(() =>
    startOfWeek(today, { weekStartsOn: 1 })
  );
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [completedSectionExpanded, setCompletedSectionExpanded] = useState(true);
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

  const incompleteCount = useMemo(
    () => tasks.filter((t) => !t.isCompleted).length,
    [tasks]
  );
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => addDays(viewWeekStart, index));
  }, [viewWeekStart]);

  // All hooks must run before any early return (Rules of Hooks)
  const tasksForSelectedDay = useMemo(() => {
    return tasks.filter((t) => {
      if (!t.date) return false;
      const taskDate = t.date instanceof Date ? t.date : new Date(t.date);
      return isSameDay(taskDate, selectedDate);
    });
  }, [tasks, selectedDate]);

  const incompleteForSelectedDay = useMemo(
    () => tasksForSelectedDay.filter((t) => !t.isCompleted).length,
    [tasksForSelectedDay]
  );

  const incompleteTasks = useMemo(() => {
    return tasksForSelectedDay
      .filter((t) => !t.isCompleted)
      .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  }, [tasksForSelectedDay]);

  const completedTasks = useMemo(() => {
    return tasksForSelectedDay
      .filter((t) => t.isCompleted)
      .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  }, [tasksForSelectedDay]);

  const listSections = useMemo(() => {
    const dayTitle = isSameDay(selectedDate, today)
      ? "Today's Tasks"
      : format(selectedDate, "EEEE, MMM d") + "'s Tasks";
    const sections: { title: string; data: typeof incompleteTasks }[] = [
      { title: dayTitle, data: incompleteTasks },
    ];
    if (completedTasks.length > 0) {
      sections.push({ title: 'Completed', data: [] });
    }
    return sections;
  }, [selectedDate, today, incompleteTasks, completedTasks]);

  const goToPreviousWeek = () => {
    const prevWeekStart = addDays(viewWeekStart, -7);
    setViewWeekStart(prevWeekStart);
    const dayOfWeek = selectedDate.getDay();
    const isSunday = dayOfWeek === 0;
    const mondayOffset = isSunday ? 6 : dayOfWeek - 1;
    setSelectedDate(addDays(prevWeekStart, mondayOffset));
  };
  const goToNextWeek = () => {
    const nextWeekStart = addDays(viewWeekStart, 7);
    setViewWeekStart(nextWeekStart);
    const dayOfWeek = selectedDate.getDay();
    const isSunday = dayOfWeek === 0;
    const mondayOffset = isSunday ? 6 : dayOfWeek - 1;
    setSelectedDate(addDays(nextWeekStart, mondayOffset));
  };

  const isShowingToday = isSameDay(selectedDate, today);

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
            {isShowingToday
              ? `You have ${incompleteCount} task${incompleteCount === 1 ? '' : 's'} to complete today.`
              : `You have ${incompleteForSelectedDay} task${incompleteForSelectedDay === 1 ? '' : 's'} for this day.`}
          </Text>
        </View>
      </View>

      {/* Month & week strip */}
      <View style={styles.dateSection}>
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={goToPreviousWeek} activeOpacity={0.7}>
            <ChevronLeft size={18} color="#9CA3AF" />
          </TouchableOpacity>
          <Text style={styles.monthText}>{format(viewWeekStart, 'MMMM yyyy')}</Text>
          <TouchableOpacity onPress={goToNextWeek} activeOpacity={0.7}>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekRow}>
          {weekDays.map((day) => {
            const isToday = isSameDay(day, today);
            const isSelected = isSameDay(day, selectedDate);

            return (
              <TouchableOpacity
                key={day.toISOString()}
                style={[
                  styles.dayPill,
                  isToday && styles.dayPillActive,
                  isSelected && !isToday && styles.dayPillSelected,
                ]}
                onPress={() => setSelectedDate(day)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Text
                  style={[
                    styles.dayName,
                    isToday && styles.dayNameActive,
                    isSelected && !isToday && styles.dayNameSelected,
                  ]}
                >
                  {format(day, 'EEE').toUpperCase()}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    isToday && styles.dayNumberActive,
                    isSelected && !isToday && styles.dayNumberSelected,
                  ]}
                >
                  {format(day, 'd')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Task list: Today's Tasks (incomplete) + Completed section */}
      <SectionList
        sections={listSections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => {
          if (section.title === 'Completed') return null;
          return (
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          );
        }}
        renderSectionFooter={({ section }) => {
          if (section.title === 'Completed') {
            const isCollapsible = completedTasks.length > 1;
            const showList =
              completedTasks.length <= 1 || completedSectionExpanded;
            return (
              <View style={styles.sectionHeaderRow}>
                <View style={styles.completedSectionCard}>
                  {isCollapsible ? (
                    <TouchableOpacity
                      style={styles.completedHeaderRow}
                      onPress={() =>
                        setCompletedSectionExpanded((prev) => !prev)
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={styles.sectionHeaderText}>
                        Completed ({completedTasks.length})
                      </Text>
                      {completedSectionExpanded ? (
                        <ChevronUp size={20} color="#9CA3AF" />
                      ) : (
                        <ChevronDown size={20} color="#9CA3AF" />
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.completedHeaderRow}>
                      <Text style={styles.sectionHeaderText}>Completed</Text>
                    </View>
                  )}
                  {showList && (
                    <View style={styles.completedSectionBody}>
                      {completedTasks.length === 0 ? (
                        <View style={styles.completedEmpty}>
                          <Text style={styles.completedEmptyText}>
                            No completed tasks for this day
                          </Text>
                        </View>
                      ) : (
                        completedTasks.map((item) => (
                          <TaskItem
                            key={item.id}
                            task={item}
                            onToggle={toggleTask}
                            onDelete={deleteTask}
                            onPress={(t) => router.push(t.isCompleted ? `/task/completed/${t.id}` : `/task/${t.id}`)}
                            onEdit={(t) => router.push(t.isCompleted ? `/task/completed/${t.id}` : `/task/${t.id}`)}
                          />
                        ))
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          }
          if (section.data.length > 0) return null;
          return (
            <View style={styles.emptyStateSimple}>
              <Text style={styles.emptyTextSimple}>No tasks for this day</Text>
            </View>
          );
        }}
        renderItem={({ item }) => (
          <TaskItem
            task={item}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onPress={(t) => router.push(t.isCompleted ? `/task/completed/${t.id}` : `/task/${t.id}`)}
            onEdit={(t) => router.push(t.isCompleted ? `/task/completed/${t.id}` : `/task/${t.id}`)}
          />
        )}
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
  dayPillSelected: {
    backgroundColor: '#1E3A5F',
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
  dayNameSelected: {
    color: '#93C5FD',
  },
  dayNumber: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#9CA3AF',
  },
  dayNumberActive: {
    color: '#EFF6FF',
  },
  dayNumberSelected: {
    color: '#93C5FD',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#E5E7EB',
  },
  completedSectionCard: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#020617',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#111827',
    overflow: 'hidden',
  },
  completedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  completedSectionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  listContent: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 140,
    flexGrow: 1,
  },
  emptyStateSimple: {
    paddingTop: 48,
    alignItems: 'center',
  },
  emptyTextSimple: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: '#6B7280',
  },
  completedEmpty: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  completedEmptyText: {
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
