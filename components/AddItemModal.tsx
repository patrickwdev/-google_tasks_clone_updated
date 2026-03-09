import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  ScrollView,
  Switch,
} from 'react-native';
import { X, Calendar } from 'lucide-react-native';
import { Calendar as DateCalendar } from 'react-native-calendars';
import { useTasks } from '../context/TaskContext';
import AddTaskModal from './AddTaskModal';

let DateTimePicker: React.ComponentType<any> | null = null;
if (Platform.OS !== 'web') {
  try {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch {}
}

export type AddItemMode = 'event' | 'task';

export interface AddItemModalProps {
  visible: boolean;
  onClose: () => void;
  /** When set, the modal opens with this date pre-selected (e.g. from calendar day panel). */
  initialDate?: Date;
  /** Called when user saves an event. dateTime is always the time-field date (for event list); onCalendar = Add to calendar toggle. */
  onSaveEvent: (title: string, dateTime: Date, location?: string, notes?: string, onCalendar?: boolean) => void;
}

export default function AddItemModal({
  visible,
  onClose,
  initialDate,
  onSaveEvent,
}: AddItemModalProps) {
  const { addTask, tasks } = useTasks();
  const eventsOnCalendarCount = useMemo(
    () => tasks.filter((t) => t.itemType === 'event' && t.onCalendar === true).length,
    [tasks]
  );
  const allowAddToCalendar = eventsOnCalendarCount === 0;

  const [mode, setMode] = useState<AddItemMode>('event');
  const [title, setTitle] = useState('');
  const [eventDateTime, setEventDateTime] = useState<Date>(() => {
    const d = initialDate ? new Date(initialDate) : new Date();
    if (d.getHours() === 0 && d.getMinutes() === 0) {
      const inOne = new Date();
      inOne.setHours(inOne.getHours() + 1, 0, 0, 0);
      return inOne;
    }
    return d;
  });
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [addToCalendar, setAddToCalendar] = useState(false);
  const [hasPickedTime, setHasPickedTime] = useState(false);
  const [showDatePanel, setShowDatePanel] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const formatDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const todayString = formatDateString(new Date());
  const eventMarkedDates = eventDateTime
    ? { [formatDateString(eventDateTime)]: { selected: true, selectedColor: '#2563EB', selectedTextColor: '#FFFFFF' } }
    : {};
  const calendarTheme = {
    backgroundColor: 'transparent',
    calendarBackground: 'transparent',
    textSectionTitleColor: '#9CA3AF',
    selectedDayBackgroundColor: '#2563EB',
    selectedDayTextColor: '#FFFFFF',
    todayTextColor: '#60A5FA',
    dayTextColor: '#E5E7EB',
    textDisabledColor: '#4B5563',
    arrowColor: '#60A5FA',
    monthTextColor: '#E5E7EB',
    textDayFontFamily: 'Inter_500Medium',
    textMonthFontFamily: 'Inter_600SemiBold',
    textDayHeaderFontFamily: 'Inter_500Medium',
    textDayFontSize: 16,
    textMonthFontSize: 16,
    textDayHeaderFontSize: 12,
  };
  const handleEventDayPress = (day: { dateString: string }) => {
    if (day.dateString < todayString) return;
    const [y, m, dayNum] = day.dateString.split('-').map(Number);
    setEventDateTime(new Date(y, m - 1, dayNum));
  };

  useEffect(() => {
    if (visible) setAddToCalendar(false);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    if (initialDate) {
      const d = new Date(initialDate);
      if (d.getHours() === 0 && d.getMinutes() === 0) {
        const inOne = new Date(d);
        inOne.setHours(inOne.getHours() + 1, 0, 0, 0);
        setEventDateTime(inOne);
        setHasPickedTime(false);
      } else {
        setEventDateTime(d);
        setHasPickedTime(true);
      }
    } else {
      setHasPickedTime(false);
    }
  }, [visible, initialDate]);

  const resetEventForm = () => {
    setMode('event');
    setTitle('');
    const d = initialDate ? new Date(initialDate) : new Date();
    const inOne = new Date(d);
    inOne.setHours(inOne.getHours() + 1, 0, 0, 0);
    setEventDateTime(inOne);
    setLocation('');
    setNotes('');
    setAddToCalendar(false);
    setHasPickedTime(false);
  };

  const handleClose = () => {
    resetEventForm();
    onClose();
  };

  const handleSaveEvent = () => {
    if (!title.trim()) return;
    const dateToSave = hasPickedTime
      ? eventDateTime
      : (() => {
          const d = new Date(eventDateTime);
          d.setHours(0, 0, 0, 0);
          return d;
        })();
    onSaveEvent(title.trim(), dateToSave, location.trim() || undefined, notes.trim() || undefined, addToCalendar);
    handleClose();
  };

  const displayTime = hasPickedTime
    ? eventDateTime.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
    : eventDateTime.toLocaleDateString(undefined, { dateStyle: 'medium' });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.container}>
          <View style={styles.handleWrapper}>
            <View style={styles.handle} />
          </View>

          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleClose} style={styles.iconButton}>
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Item</Text>
            <View style={styles.headerRight} />
          </View>

          {/* Tabs: Event | Task */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, mode === 'event' && styles.tabActive]}
              onPress={() => setMode('event')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, mode === 'event' && styles.tabTextActive]}>Event</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'task' && styles.tabActive]}
              onPress={() => setMode('task')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, mode === 'task' && styles.tabTextActive]}>Task</Text>
            </TouchableOpacity>
          </View>

          {mode === 'event' ? (
            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Title</Text>
                <View style={styles.inputCard}>
                  <TextInput
                    style={styles.input}
                    placeholder="Event title"
                    placeholderTextColor="#6B7280"
                    value={title}
                    onChangeText={setTitle}
                    autoFocus
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Due Date</Text>
                <TouchableOpacity
                  style={styles.sectionCard}
                  onPress={() => setShowDatePanel(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.sectionCardSubtitle}>{displayTime}</Text>
                  <Text style={styles.sectionCardRightText}>Change</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Location (optional)</Text>
                <View style={styles.inputCard}>
                  <TextInput
                    style={styles.input}
                    placeholder="Add location"
                    placeholderTextColor="#6B7280"
                    value={location}
                    onChangeText={setLocation}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Notes (optional)</Text>
                <View style={styles.inputCard}>
                  <TextInput
                    style={[styles.input, styles.inputMultiline]}
                    placeholder="Add notes"
                    placeholderTextColor="#6B7280"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <View style={[styles.addToCalendarRow, !allowAddToCalendar && styles.addToCalendarRowDisabled]}>
                  <View style={styles.addToCalendarLabelWrap}>
                    <Calendar size={18} color={allowAddToCalendar ? '#93C5FD' : '#6B7280'} style={styles.addToCalendarIcon} />
                    <Text style={[styles.addToCalendarLabel, !allowAddToCalendar && styles.addToCalendarLabelDisabled]}>
                      Add this event to the calendar?
                    </Text>
                  </View>
                  <Switch
                    value={addToCalendar}
                    onValueChange={setAddToCalendar}
                    trackColor={{ false: '#374151', true: '#2563EB' }}
                    thumbColor={addToCalendar ? '#93C5FD' : '#9CA3AF'}
                    disabled={!allowAddToCalendar}
                  />
                </View>
                <Text style={styles.addToCalendarHint}>
                  {!allowAddToCalendar
                    ? 'Only one event can be on the calendar. One event is already added.'
                    : addToCalendar
                      ? 'Event will appear on the calendar on the date and time above.'
                      : 'Event will be saved but not shown on the calendar.'}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, !title.trim() && styles.saveButtonDisabled]}
                onPress={handleSaveEvent}
                disabled={!title.trim()}
                activeOpacity={0.9}
              >
                <Text style={[styles.saveButtonText, !title.trim() && styles.saveButtonTextDisabled]}>
                  Save Event
                </Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <View style={styles.taskFormWrapper}>
              <AddTaskModal
                visible={true}
                embedInPanel
                initialDate={initialDate}
                onClose={handleClose}
                onAdd={(title, details, date, locationReminder, subtasks, category, reminders) => {
                  addTask(title, details, date, locationReminder, subtasks, category, reminders);
                  handleClose();
                }}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Date panel — like due date: calendar + No time / Set date & time */}
      <Modal
        visible={showDatePanel}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePanel(false)}
      >
        <TouchableOpacity
          style={styles.datePickerOverlay}
          activeOpacity={1}
          onPress={() => setShowDatePanel(false)}
        >
          <TouchableOpacity
            style={styles.datePickerPopup}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.datePickerPopupHeader}>
              <Text style={styles.datePickerPopupTitle}>Pick a date</Text>
              <TouchableOpacity onPress={() => setShowDatePanel(false)} hitSlop={12}>
                <X size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerContent}>
              <Text style={styles.datePickerSectionLabel}>Select a date</Text>
              <DateCalendar
                minDate={todayString}
                current={formatDateString(eventDateTime)}
                initialDate={formatDateString(eventDateTime)}
                onDayPress={handleEventDayPress}
                markedDates={eventMarkedDates}
                theme={calendarTheme}
                style={styles.eventDateCalendar}
              />
              <TouchableOpacity
                style={styles.dateOnlyButton}
                onPress={() => {
                  const d = new Date(eventDateTime);
                  d.setHours(0, 0, 0, 0);
                  setEventDateTime(d);
                  setHasPickedTime(false);
                  setShowDatePanel(false);
                }}
              >
                <Text style={styles.dateOnlyButtonText}>No time (date only)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.datePickerDone}
                onPress={() => {
                  setShowDatePanel(false);
                  const d = new Date(eventDateTime);
                  const in30 = new Date(Date.now() + 30 * 60 * 1000);
                  d.setHours(in30.getHours(), in30.getMinutes(), 0, 0);
                  setEventDateTime(d);
                  setHasPickedTime(true);
                  setShowTimePicker(true);
                }}
              >
                <Text style={styles.datePickerDoneText}>Set date & time</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Time of day — Android native */}
      {Platform.OS === 'android' && showTimePicker && DateTimePicker && (
        <DateTimePicker
          value={eventDateTime}
          mode="time"
          minimumDate={formatDateString(eventDateTime) === todayString ? new Date() : undefined}
          onChange={(_, t) => {
            setShowTimePicker(false);
            if (t) {
              const d = new Date(eventDateTime);
              d.setHours(t.getHours(), t.getMinutes(), 0, 0);
              setEventDateTime(d);
              setHasPickedTime(true);
            }
          }}
          display="default"
        />
      )}

      {/* Time of day — iOS and web Modal */}
      {Platform.OS !== 'android' && (
        <Modal
          visible={showTimePicker}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowTimePicker(false);
            setHasPickedTime(true);
          }}
        >
          <TouchableOpacity
            style={styles.datePickerOverlay}
            activeOpacity={1}
            onPress={() => {
              setShowTimePicker(false);
              setHasPickedTime(true);
            }}
          >
            <TouchableOpacity style={styles.datePickerPopup} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.datePickerPopupHeader}>
                <Text style={styles.datePickerPopupTitle}>Pick a time</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowTimePicker(false);
                    setHasPickedTime(true);
                  }}
                  hitSlop={12}
                >
                  <X size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerContent}>
                <Text style={styles.datePickerSectionLabel}>Time of day</Text>
                {DateTimePicker ? (
                  <>
                    <DateTimePicker
                      value={eventDateTime}
                      mode="time"
                      minimumDate={formatDateString(eventDateTime) === todayString ? new Date() : undefined}
                      onChange={(_, t) => t && (() => {
                        const d = new Date(eventDateTime);
                        d.setHours(t.getHours(), t.getMinutes(), 0, 0);
                        setEventDateTime(d);
                      })()}
                      display="spinner"
                      themeVariant="dark"
                      style={styles.eventTimePicker}
                    />
                    <TouchableOpacity
                      style={styles.datePickerDone}
                      onPress={() => {
                        setShowTimePicker(false);
                        setHasPickedTime(true);
                      }}
                    >
                      <Text style={styles.datePickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={styles.webHint}>Set time on the iOS or Android app.</Text>
                )}
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.75)',
  },
  keyboardView: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
  },
  container: {
    backgroundColor: '#020617',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 30,
    maxHeight: '85%',
  },
  handleWrapper: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  handle: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1F2937',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#E5E7EB',
  },
  headerRight: {
    width: 28,
  },
  iconButton: {
    padding: 4,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1F2937',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#2563EB',
  },
  tabText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#EFF6FF',
  },
  formScroll: {
    maxHeight: 420,
  },
  formScrollContent: {
    paddingBottom: 24,
  },
  section: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  addToCalendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  addToCalendarLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addToCalendarIcon: {
    marginRight: 8,
  },
  addToCalendarLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#E5E7EB',
    flex: 1,
  },
  addToCalendarRowDisabled: {
    opacity: 0.7,
  },
  addToCalendarLabelDisabled: {
    color: '#9CA3AF',
  },
  addToCalendarHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#6B7280',
    marginTop: 6,
    marginLeft: 4,
  },
  inputCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1D4ED8',
    backgroundColor: '#020617',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#E5E7EB',
    padding: 0,
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#020617',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#111827',
  },
  sectionCardSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#E5E7EB',
  },
  sectionCardRightText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#60A5FA',
  },
  saveButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#1F2937',
  },
  saveButtonText: {
    color: '#F9FAFB',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  saveButtonTextDisabled: {
    color: '#6B7280',
  },
  taskFormWrapper: {
    flex: 1,
    minHeight: 400,
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  datePickerPopup: {
    backgroundColor: '#020617',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1F2937',
    width: '100%',
    maxWidth: 340,
    overflow: 'hidden',
  },
  datePickerPopupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  datePickerPopupTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: '#E5E7EB',
  },
  datePickerContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  datePickerSectionLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#9CA3AF',
    marginBottom: 12,
  },
  eventDateCalendar: {
    marginBottom: 16,
  },
  dateOnlyButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  dateOnlyButtonText: {
    color: '#9CA3AF',
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  datePickerDone: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  datePickerDoneText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#EFF6FF',
  },
  webHint: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
  },
  eventTimePicker: {
    marginVertical: 8,
  },
});
