import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  Home,
  LayoutGrid,
  CalendarDays,
  Settings,
  Search,
  Plus,
  X,
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
  isBefore,
  startOfDay,
} from 'date-fns';
import { getHolidayMapForMonth, getHolidayName, isHoliday } from '../lib/holidays';
import { useTasks } from '../context/TaskContext';
import AddItemModal from '../components/AddItemModal';
import TaskItem from '../components/TaskItem';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DAY_PANEL_HEIGHT = Math.min(SCREEN_HEIGHT * 0.55, 420);
const GRID_PADDING = 6;
const COLUMN_GAP = 4;
const ROW_GAP = 64;
const DAY_CELL_SIZE = Math.floor((SCREEN_WIDTH - GRID_PADDING * 2 - COLUMN_GAP * 7) / 7);

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKS_IN_GRID = 6;
const DAYS_PER_WEEK = 7;
const TOTAL_DAYS_IN_GRID = WEEKS_IN_GRID * DAYS_PER_WEEK; // 42

function buildMonthGrid(month: Date): Date[] {
  const start = startOfMonth(month);
  const calendarStart = startOfWeek(start, { weekStartsOn: 0 });
  const days: Date[] = [];
  let d = calendarStart;
  for (let i = 0; i < TOTAL_DAYS_IN_GRID; i++) {
    days.push(d);
    d = addDays(d, 1);
  }
  return days;
}

/** Local calendar date string (YYYY-MM-DD) for reliable same-day comparison. */
function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function CalendarScreen() {
  const router = useRouter();
  const { tasks, addTask, toggleTask, deleteTask } = useTasks();
  const { user, isLoading: authLoading } = useAuth();
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [isAddItemVisible, setIsAddItemVisible] = useState(false);
  const [addTaskInitialDate, setAddTaskInitialDate] = useState<Date | undefined>(undefined);
  const [isDayPanelVisible, setIsDayPanelVisible] = useState(false);
  const [dayPanelSegment, setDayPanelSegment] = useState<'events' | 'tasks'>('events');
  const dayPanelSlide = useRef(new Animated.Value(DAY_PANEL_HEIGHT)).current;

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
  const nextMonth = useMemo(() => addMonths(viewMonth, 1), [viewMonth]);
  const holidayMap = useMemo(() => getHolidayMapForMonth(viewMonth), [viewMonth]);
  const holidayMapNext = useMemo(() => getHolidayMapForMonth(nextMonth), [nextMonth]);

  const selectedDateKey = toLocalDateKey(selectedDate);

  const itemsForSelectedDay = useMemo(() => {
    return tasks.filter((task) => {
      if (!task.date) return false;
      const taskDate = task.date instanceof Date ? task.date : new Date(task.date);
      if (isNaN(taskDate.getTime())) return false;
      return toLocalDateKey(taskDate) === selectedDateKey;
    });
  }, [tasks, selectedDateKey]);

  const eventsForSelectedDay = useMemo(() => {
    return tasks.filter((t) => {
      if (t.itemType !== 'event') return false;
      if (!t.date) return false;
      const taskDate = t.date instanceof Date ? t.date : new Date(t.date);
      if (isNaN(taskDate.getTime())) return false;
      return toLocalDateKey(taskDate) === selectedDateKey;
    });
  }, [tasks, selectedDateKey]);
  const tasksForSelectedDay = useMemo(
    () => itemsForSelectedDay.filter((t) => t.itemType !== 'event'),
    [itemsForSelectedDay]
  );

  const holidayNameForPanel =
    getHolidayName(selectedDate, holidayMap) ?? getHolidayName(selectedDate, holidayMapNext) ?? null;

  const isSelectedDatePast = isBefore(startOfDay(selectedDate), startOfDay(new Date()));

  useEffect(() => {
    if (isDayPanelVisible) {
      Animated.spring(dayPanelSlide, {
        toValue: 0,
        useNativeDriver: true,
        friction: 24,
        tension: 180,
      }).start();
    }
  }, [isDayPanelVisible]);

  const openDayPanel = (day: Date) => {
    setSelectedDate(day);
    setIsDayPanelVisible(true);
  };

  const closeDayPanel = () => {
    Animated.timing(dayPanelSlide, {
      toValue: DAY_PANEL_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setIsDayPanelVisible(false));
  };

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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
            const holiday = isHoliday(day, holidayMap);
            const dayKey = toLocalDateKey(day);
            const eventsOnDay = tasks.filter((task) => {
              if (!task.date || task.itemType !== 'event' || task.onCalendar === false) return false;
              const taskDate = task.date instanceof Date ? task.date : new Date(task.date);
              if (isNaN(taskDate.getTime())) return false;
              return toLocalDateKey(taskDate) === dayKey;
            });
            const firstEventTitle = eventsOnDay.length > 0 ? eventsOnDay[0].title : null;
            return (
              <TouchableOpacity
                key={day.toISOString()}
                style={[
                  styles.dayCell,
                  { width: DAY_CELL_SIZE, height: DAY_CELL_SIZE },
                  !inMonth && styles.dayCellOtherMonth,
                  selected && styles.dayCellSelected,
                  today && !selected && styles.dayCellToday,
                  holiday && !selected && styles.dayCellHoliday,
                ]}
                onPress={() => openDayPanel(day)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.dayCellText,
                    !inMonth && styles.dayCellTextOtherMonth,
                    selected && styles.dayCellTextSelected,
                    today && !selected && styles.dayCellTextToday,
                    holiday && !selected && styles.dayCellTextHoliday,
                  ]}
                >
                  {format(day, 'd')}
                </Text>
                {firstEventTitle != null && (
                  <Text
                    style={[
                      styles.dayCellTitle,
                      !inMonth && styles.dayCellTitleOtherMonth,
                      selected && styles.dayCellTitleSelected,
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {firstEventTitle}
                  </Text>
                )}
                {holiday && getHolidayName(day, holidayMap) && (
                  <Text
                    style={[styles.dayCellHolidayName, selected && styles.dayCellHolidayNameSelected]}
                    numberOfLines={2}
                  >
                    {getHolidayName(day, holidayMap)}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
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
            onPress={() => {
              setAddTaskInitialDate(undefined);
              setIsAddItemVisible(true);
            }}
            activeOpacity={0.85}
          >
            <Plus size={34} color="#EFF6FF" />
          </TouchableOpacity>
        </View>
      </View>

      <AddItemModal
        visible={isAddItemVisible}
        onClose={() => setIsAddItemVisible(false)}
        initialDate={addTaskInitialDate}
        onSaveEvent={(eventTitle, dateTime, location, notes, onCalendar) => {
          const details = [location, notes].filter(Boolean).join('\n\n');
          addTask(eventTitle, details || undefined, dateTime, undefined, undefined, undefined, undefined, 'event', onCalendar);
        }}
      />

      {/* Day details slide-up panel */}
      <Modal
        visible={isDayPanelVisible}
        transparent
        animationType="none"
        onRequestClose={closeDayPanel}
      >
        <View style={styles.dayPanelOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDayPanel} />
          <Animated.View
            style={[
              styles.dayPanel,
              {
                height: DAY_PANEL_HEIGHT,
                transform: [{ translateY: dayPanelSlide }],
              },
            ]}
          >
            <View style={styles.dayPanelHandle} />
              <View style={styles.dayPanelHeader}>
                <Text style={styles.dayPanelTitle}>{format(selectedDate, 'EEEE, MMM d')}</Text>
                <TouchableOpacity onPress={closeDayPanel} hitSlop={12} style={styles.dayPanelClose}>
                  <X size={22} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              {holidayNameForPanel && (
                <Text style={styles.dayPanelHoliday}>{holidayNameForPanel}</Text>
              )}
              {/* Events / Task segment cards */}
              <View style={styles.dayPanelSegmentRow}>
                <TouchableOpacity
                  style={[styles.dayPanelSegmentCard, dayPanelSegment === 'events' && styles.dayPanelSegmentCardActive]}
                  onPress={() => setDayPanelSegment('events')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dayPanelSegmentLabel, dayPanelSegment === 'events' && styles.dayPanelSegmentLabelActive]}>
                    Events
                  </Text>
                  {eventsForSelectedDay.length > 0 && (
                    <Text style={[styles.dayPanelSegmentCount, dayPanelSegment === 'events' && styles.dayPanelSegmentCountActive]}>
                      {eventsForSelectedDay.length}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dayPanelSegmentCard, dayPanelSegment === 'tasks' && styles.dayPanelSegmentCardActive]}
                  onPress={() => setDayPanelSegment('tasks')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dayPanelSegmentLabel, dayPanelSegment === 'tasks' && styles.dayPanelSegmentLabelActive]}>
                    Task
                  </Text>
                  {tasksForSelectedDay.length > 0 && (
                    <Text style={[styles.dayPanelSegmentCount, dayPanelSegment === 'tasks' && styles.dayPanelSegmentCountActive]}>
                      {tasksForSelectedDay.length}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {(dayPanelSegment === 'events' ? eventsForSelectedDay.length : tasksForSelectedDay.length) > 0 && (
                <TouchableOpacity
                  style={[styles.dayPanelCreateButton, isSelectedDatePast && styles.dayPanelCreateButtonDisabled]}
                  onPress={isSelectedDatePast ? undefined : () => {
                    setAddTaskInitialDate(selectedDate);
                    closeDayPanel();
                    setIsAddItemVisible(true);
                  }}
                  activeOpacity={isSelectedDatePast ? 1 : 0.8}
                  disabled={isSelectedDatePast}
                >
                  <Plus size={20} color={isSelectedDatePast ? '#6B7280' : '#EFF6FF'} />
                  <Text style={[styles.dayPanelCreateButtonText, isSelectedDatePast && styles.dayPanelCreateButtonTextDisabled]}>
                    Add
                  </Text>
                </TouchableOpacity>
              )}

              <ScrollView
                style={styles.dayPanelScroll}
                contentContainerStyle={styles.dayPanelScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {dayPanelSegment === 'events' ? (
                  eventsForSelectedDay.length === 0 ? (
                    <View style={styles.dayPanelEmpty}>
                      <Text style={styles.dayPanelEmptyText}>No events this day</Text>
                      <Text style={styles.dayPanelEmptySub}>Add an event with this date to see it here</Text>
                      <TouchableOpacity
                        style={[styles.dayPanelEmptyAddButton, isSelectedDatePast && styles.dayPanelEmptyAddButtonDisabled]}
                        onPress={isSelectedDatePast ? undefined : () => {
                          setAddTaskInitialDate(selectedDate);
                          closeDayPanel();
                          setIsAddItemVisible(true);
                        }}
                        activeOpacity={isSelectedDatePast ? 1 : 0.8}
                        disabled={isSelectedDatePast}
                      >
                        <Plus size={18} color={isSelectedDatePast ? '#6B7280' : '#2563EB'} />
                        <Text style={[styles.dayPanelEmptyAddButtonText, isSelectedDatePast && styles.dayPanelEmptyAddButtonTextDisabled]}>
                          Add
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    eventsForSelectedDay.map((item) => (
                      <TaskItem
                        key={item.id}
                        task={item}
                        onToggle={toggleTask}
                        onDelete={deleteTask}
                        onPress={(t) => {
                          closeDayPanel();
                          router.push(t.isCompleted ? `/task/completed/${t.id}` : `/task/${t.id}`);
                        }}
                        onEdit={(t) => {
                          closeDayPanel();
                          router.push(t.isCompleted ? `/task/completed/${t.id}` : `/task/${t.id}`);
                        }}
                      />
                    ))
                  )
                ) : tasksForSelectedDay.length === 0 ? (
                  <View style={styles.dayPanelEmpty}>
                    <Text style={styles.dayPanelEmptyText}>No tasks this day</Text>
                    <Text style={styles.dayPanelEmptySub}>Add a task with this date to see it here</Text>
                    <TouchableOpacity
                      style={[styles.dayPanelEmptyAddButton, isSelectedDatePast && styles.dayPanelEmptyAddButtonDisabled]}
                      onPress={isSelectedDatePast ? undefined : () => {
                        setAddTaskInitialDate(selectedDate);
                        closeDayPanel();
                        setIsAddItemVisible(true);
                      }}
                      activeOpacity={isSelectedDatePast ? 1 : 0.8}
                      disabled={isSelectedDatePast}
                    >
                      <Plus size={18} color={isSelectedDatePast ? '#6B7280' : '#2563EB'} />
                      <Text style={[styles.dayPanelEmptyAddButtonText, isSelectedDatePast && styles.dayPanelEmptyAddButtonTextDisabled]}>
                        Add
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  tasksForSelectedDay.map((item) => (
                    <TaskItem
                      key={item.id}
                      task={item}
                      onToggle={toggleTask}
                      onDelete={deleteTask}
                      onPress={(t) => {
                        closeDayPanel();
                        router.push(t.isCompleted ? `/task/completed/${t.id}` : `/task/${t.id}`);
                      }}
                      onEdit={(t) => {
                        closeDayPanel();
                        router.push(t.isCompleted ? `/task/completed/${t.id}` : `/task/${t.id}`);
                      }}
                    />
                  ))
                )}
              </ScrollView>
          </Animated.View>
        </View>
      </Modal>
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
    paddingHorizontal: GRID_PADDING,
    marginBottom: 18,
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
    paddingHorizontal: GRID_PADDING,
    marginBottom: 20,
    columnGap: COLUMN_GAP,
    rowGap: ROW_GAP,
  },
  dayCell: {
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
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
  dayCellHoliday: {
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.5)',
  },
  dayCellText: {
    fontSize: 18,
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
  dayCellTextHoliday: {
    color: '#FCD34D',
  },
  dayCellTitle: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: '#9CA3AF',
    marginTop: 2,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
  dayCellTitleOtherMonth: {
    color: '#6B7280',
  },
  dayCellTitleSelected: {
    color: '#BFDBFE',
  },
  dayCellHolidayName: {
    fontSize: 9,
    fontFamily: 'Inter_500Medium',
    color: '#FCD34D',
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: 2,
  },
  dayCellHolidayNameSelected: {
    color: '#FEF3C7',
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
  dayPanelOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  dayPanel: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  dayPanelHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  dayPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  dayPanelTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#F9FAFB',
  },
  dayPanelClose: {
    padding: 4,
  },
  dayPanelHoliday: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#FCD34D',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  dayPanelSegmentRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  dayPanelSegmentCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  dayPanelSegmentCardActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#2563EB',
  },
  dayPanelSegmentLabel: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#9CA3AF',
  },
  dayPanelSegmentLabelActive: {
    color: '#EFF6FF',
  },
  dayPanelSegmentCount: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#6B7280',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  dayPanelSegmentCountActive: {
    color: '#BFDBFE',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dayPanelCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  dayPanelCreateButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#EFF6FF',
  },
  dayPanelCreateButtonDisabled: {
    backgroundColor: '#374151',
    opacity: 0.8,
  },
  dayPanelCreateButtonTextDisabled: {
    color: '#9CA3AF',
  },
  dayPanelScroll: {
    flex: 1,
  },
  dayPanelScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  dayPanelEmpty: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  dayPanelEmptyText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: '#6B7280',
    marginBottom: 4,
  },
  dayPanelEmptySub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#4B5563',
  },
  dayPanelEmptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  dayPanelEmptyAddButtonDisabled: {
    backgroundColor: 'rgba(55, 65, 81, 0.3)',
    borderColor: '#4B5563',
  },
  dayPanelEmptyAddButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#2563EB',
  },
  dayPanelEmptyAddButtonTextDisabled: {
    color: '#6B7280',
  },
});
