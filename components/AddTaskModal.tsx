import React, { useState, useEffect, useRef } from 'react';
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
  Switch,
  FlatList,
} from 'react-native';
import {
  Calendar,
  X,
  MapPin,
  ListChecks,
  Trash2,
  Bell,
} from 'lucide-react-native';
import { Calendar as DateCalendar } from 'react-native-calendars';
import type { TaskLocationReminder, SubTask, TaskCategory } from '../types/task';

// DateTimePicker has no web support and can throw "dismiss of undefined"; only load on native and guard
let DateTimePicker: React.ComponentType<any> | null = null;
if (Platform.OS !== 'web') {
  try {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch {
    // Native module not available (e.g. web or unsupported runtime)
  }
}
import { BUILT_IN_CATEGORY_KEYS } from '../types/task';
import { useTasks } from '../context/TaskContext';
import * as Location from 'expo-location';
import { geocodePlaceName, requestLocationReminderPermissions } from '../lib/geofencing';
import {
  isGooglePlacesConfigured,
  fetchAutocompleteSuggestions,
  fetchPlaceDetails,
  type PlaceSuggestion,
} from '../lib/googlePlaces';

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  /** When set, the modal opens with this date pre-selected (e.g. from calendar day panel). */
  initialDate?: Date;
  /** When true, render only the form content (no Modal wrapper). Used when embedding inside AddItemModal. */
  embedInPanel?: boolean;
  onAdd: (
    title: string,
    details?: string,
    date?: Date,
    locationReminder?: TaskLocationReminder,
    subtasks?: SubTask[],
    category?: TaskCategory | string,
    reminders?: Date[]
  ) => void;
}

export default function AddTaskModal({ visible, onClose, initialDate, embedInPanel, onAdd }: AddTaskModalProps) {
  const { categoryLabels, hiddenCategories, customCategories, getCategoryLabel } = useTasks();
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDueTimePicker, setShowDueTimePicker] = useState(false);
  const [dueTimeError, setDueTimeError] = useState<string | null>(null);
  /** True when user chose "No time (date only)" for the due date; reminder button is disabled in that case */
  const [dueDateIsDateOnly, setDueDateIsDateOnly] = useState(false);
  const [reminders, setReminders] = useState<Date[]>([]);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  /** Reminder panel: working date/time while the slide-up is open */
  const [reminderPanelDate, setReminderPanelDate] = useState<Date>(() => new Date());
  const [reminderPanelTime, setReminderPanelTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d;
  });
  /** Android: only show time picker after user taps "Set time" so dialog doesn't open on panel open */
  const [showReminderTimePicker, setShowReminderTimePicker] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [remindNearLocation, setRemindNearLocation] = useState(false);
  const [locationPlaceName, setLocationPlaceName] = useState('');
  const [selectedPlaceCoords, setSelectedPlaceCoords] = useState<{ name: string; latitude: number; longitude: number } | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [category, setCategory] = useState<TaskCategory | string | undefined>('Work');
  const [subtasks, setSubtasks] = useState<{ id: string; title: string }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [notifyWithinFeet, setNotifyWithinFeet] = useState(500);
  const googlePlacesEnabled = isGooglePlacesConfigured();

  const DISTANCE_OPTIONS_FEET = [10, 20, 50, 100, 250, 500];
  const MAX_REMINDERS = 3;

  // Get current location when "When I'm nearby" is turned on (to bias suggestions near user)
  useEffect(() => {
    if (!remindNearLocation) return;
    let cancelled = false;
    (async () => {
      try {
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          const { status: requested } = await Location.requestForegroundPermissionsAsync();
          status = requested;
        }
        if (status !== 'granted' || cancelled) return;
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          maxAge: 60000,
          timeout: 15000,
        });
        if (!cancelled) setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } catch {
        // Ignore; suggestions will work without bias
      }
    })();
    return () => { cancelled = true; };
  }, [remindNearLocation]);

  // Helper: get location for this request (use cached or fetch now)
  const getLocationForSearch = async (): Promise<{ latitude: number; longitude: number } | undefined> => {
    if (userLocation) return userLocation;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return undefined;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        maxAge: 60000,
        timeout: 10000,
      });
      const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setUserLocation(coords);
      return coords;
    } catch {
      return undefined;
    }
  };

  // Debounced Google Places autocomplete (with location bias when available)
  useEffect(() => {
    if (!remindNearLocation || !googlePlacesEnabled || locationPlaceName.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSuggestionsError(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      setShowSuggestions(true);
      setSuggestionsError(null);
      const location = await getLocationForSearch();
      const result = await fetchAutocompleteSuggestions(locationPlaceName, {
        location: location ?? undefined,
      });
      setSuggestions(result.suggestions);
      if (result.error) setSuggestionsError(result.error);
      setIsLoadingSuggestions(false);
      debounceRef.current = null;
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [remindNearLocation, locationPlaceName, googlePlacesEnabled, userLocation]);

  // Auto-clear due time error after a few seconds
  useEffect(() => {
    if (!dueTimeError) return;
    const id = setTimeout(() => setDueTimeError(null), 1000);
    return () => clearTimeout(id);
  }, [dueTimeError]);

  // When opened with initialDate (e.g. from calendar day panel), pre-fill the due date
  useEffect(() => {
    if (visible && initialDate) setDate(initialDate);
  }, [visible, initialDate]);

  const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
    setShowSuggestions(false);
    setSuggestions([]);
    setIsGeocoding(true);
    setLocationError(null);
    // Use suggestion.text (place + address) for display; fetch details for coordinates
    const fullText = suggestion.text?.trim() || suggestion.placeId;
    const details = await fetchPlaceDetails(suggestion.placeId);
    setIsGeocoding(false);
    if (details) {
      setLocationPlaceName(fullText);
      setSelectedPlaceCoords({
        name: fullText,
        latitude: details.latitude,
        longitude: details.longitude,
      });
    } else {
      setLocationError('Could not load place details.');
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !date) return;
    setLocationError(null);
    let locationReminder: TaskLocationReminder | undefined;
    if (remindNearLocation && locationPlaceName.trim()) {
      if (selectedPlaceCoords) {
        locationReminder = {
          locationName: selectedPlaceCoords.name,
          latitude: selectedPlaceCoords.latitude,
          longitude: selectedPlaceCoords.longitude,
          radiusFeet: notifyWithinFeet,
        };
      } else {
        setIsGeocoding(true);
        const coords = await geocodePlaceName(locationPlaceName.trim());
        setIsGeocoding(false);
        if (coords) {
          locationReminder = {
            locationName: locationPlaceName.trim(),
            latitude: coords.latitude,
            longitude: coords.longitude,
            radiusFeet: notifyWithinFeet,
          };
        } else {
          setLocationError('Could not find that place. Try a full address or landmark.');
          return;
        }
      }
    }
    const subTaskList: SubTask[] = subtasks
      .filter((s) => s.title.trim())
      .map((s) => ({ id: s.id, title: s.title.trim(), isCompleted: false }));
    onAdd(
      title,
      details,
      date,
      locationReminder,
      subTaskList.length ? subTaskList : undefined,
      category,
      reminders.length ? reminders : undefined,
    );
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setTitle('');
    setDetails('');
    setDate(undefined);
    setDueDateIsDateOnly(false);
    setReminders([]);
    setDueTimeError(null);
    setRemindNearLocation(false);
    setLocationPlaceName('');
    setSelectedPlaceCoords(null);
    setNotifyWithinFeet(500);
    setSuggestions([]);
    setShowSuggestions(false);
    setLocationError(null);
    setSuggestionsError(null);
    setCategory('Work');
    setSubtasks([]);
  };

  const addSubtask = () => {
    setSubtasks((prev) => [...prev, { id: Date.now().toString(), title: '' }]);
  };

  const updateSubtask = (id: string, title: string) => {
    setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
  };

  const removeSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  const handleRemindNearToggle = (value: boolean) => {
    setRemindNearLocation(value);
    setLocationError(null);
    if (value && Platform.OS !== 'web') requestLocationReminderPermissions().catch(() => {});
  };

  const formatDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const markedDates = date
    ? { [formatDateString(date)]: { selected: true, selectedColor: '#2563EB', selectedTextColor: '#FFFFFF' } }
    : {};

  const todayString = formatDateString(new Date());

  const handleDayPress = (day: { dateString: string }) => {
    if (day.dateString < todayString) return;
    const [y, m, dayNum] = day.dateString.split('-').map(Number);
    setDate(new Date(y, m - 1, dayNum));
    setReminders([]);
  };

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

  const formContent = (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={embedInPanel ? styles.keyboardViewEmbed : styles.keyboardView}
    >
      <View style={[styles.container, embedInPanel && styles.containerEmbed]}>
        {!embedInPanel && (
          <>
            <View style={styles.handleWrapper}>
              <View style={styles.handle} />
            </View>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                <X size={20} color="#9CA3AF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Add New Task</Text>
              <TouchableOpacity
                onPress={resetForm}
                style={styles.clearButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

          {/* Task name */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Task Name</Text>
            <View style={styles.inputCard}>
              <TextInput
                style={styles.inputTitle}
                placeholder="What needs to be done?"
                placeholderTextColor="#6B7280"
                value={title}
                onChangeText={setTitle}
                autoFocus={true}
              />
            </View>
          </View>

          {/* Sub-tasks */}
          <View style={styles.section}>
            <View style={styles.subtaskHeader}>
              <Text style={styles.sectionLabel}>Sub-tasks</Text>
              <TouchableOpacity
                onPress={addSubtask}
                style={styles.addSubtaskButton}
                activeOpacity={0.7}
              >
                <ListChecks size={16} color="#60A5FA" />
                <Text style={styles.addSubtaskText}>Add sub-task</Text>
              </TouchableOpacity>
            </View>
            {subtasks.length === 0 ? (
              <View style={styles.subtaskEmpty}>
                <Text style={styles.subtaskEmptyText}>No sub-tasks yet</Text>
                <Text style={styles.subtaskEmptyHint}>Tap "Add sub-task" to break this task into steps</Text>
              </View>
            ) : (
              subtasks.map((st) => (
                <View key={st.id} style={styles.subtaskRow}>
                  <View style={styles.subtaskInputWrap}>
                    <TextInput
                      style={styles.subtaskInput}
                      placeholder="Sub-task"
                      placeholderTextColor="#6B7280"
                      value={st.title}
                      onChangeText={(t) => updateSubtask(st.id, t)}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => removeSubtask(st.id)}
                    style={styles.removeSubtaskBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* Due date - tap anywhere to open calendar */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionCard}
              onPress={() => {
                setDueTimeError(null);
                setShowDatePicker(true);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.sectionCardHeader}>
                <View style={styles.sectionCardIconWrapper}>
                  <Calendar size={18} color="#BFDBFE" />
                </View>
                <View style={styles.sectionCardTextWrapper}>
                  <Text style={styles.sectionCardTitle}>Due Date</Text>
                  <Text style={styles.sectionCardSubtitle}>
                    {date
                      ? (date.getHours() === 0 && date.getMinutes() === 0
                          ? date.toLocaleDateString()
                          : date.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }))
                      : 'Tap to pick a date for your task'}
                  </Text>
                </View>
              </View>
              <View style={styles.sectionCardRight}>
                <Text style={styles.sectionCardRightText}>
                  {date ? 'Change' : 'Select'}
                </Text>
              </View>
            </TouchableOpacity>
            {dueTimeError ? (
              <Text style={styles.dueTimeErrorText}>{dueTimeError}</Text>
            ) : null}
          </View>

          {/* Reminder — tap to open slide-up panel; disabled when due date is "No time (date only)" */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.sectionCard, date && dueDateIsDateOnly && styles.sectionCardDisabled]}
              onPress={() => {
                if (date && dueDateIsDateOnly) return;
                if (reminders.length > 0) {
                  const last = reminders[reminders.length - 1];
                  setReminderPanelDate(last);
                  setReminderPanelTime(last);
                } else {
                  setReminderPanelDate(new Date());
                  const inOneHour = new Date();
                  inOneHour.setHours(inOneHour.getHours() + 1, 0, 0, 0);
                  setReminderPanelTime(inOneHour);
                }
                setShowReminderTimePicker(false);
                setReminderError(null);
                setShowReminderPicker(true);
              }}
              activeOpacity={0.8}
              disabled={!!(date && dueDateIsDateOnly)}
            >
              <View style={styles.sectionCardHeader}>
                <View style={styles.sectionCardIconWrapper}>
                  <Bell size={18} color={date && dueDateIsDateOnly ? '#6B7280' : '#BFDBFE'} />
                </View>
                <View style={styles.sectionCardTextWrapper}>
                  <Text style={styles.sectionCardTitle}>Reminder</Text>
                  <Text style={[styles.sectionCardSubtitle, date && dueDateIsDateOnly && styles.sectionCardSubtitleDisabled]}>
                    {date && dueDateIsDateOnly
                      ? 'Not available for date-only tasks'
                      : reminders.length === 0
                        ? 'Tap to add reminders (max 3)'
                        : reminders.length === 1
                          ? reminders[0].toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
                          : `${reminders.length}/${MAX_REMINDERS} reminders`}
                  </Text>
                </View>
              </View>
              <View style={styles.sectionCardRight}>
                <Text style={[styles.sectionCardRightText, date && dueDateIsDateOnly && styles.sectionCardRightTextDisabled]}>
                  {reminders.length === 0 ? 'Add' : 'Edit'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Location reminder — notify when near a place */}
          <View style={styles.section}>
            <View style={styles.sectionCard}>
              <View style={styles.sectionCardHeader}>
                <View style={styles.sectionCardIconWrapper}>
                  <MapPin size={18} color="#BFDBFE" />
                </View>
                <View style={styles.sectionCardTextWrapper}>
                  <Text style={styles.sectionCardTitle}>When I'm nearby</Text>
                  <Text style={styles.sectionCardSubtitle}>
                    {remindNearLocation ? 'Notify me near the place below' : 'Notify me when I arrive at a location'}
                  </Text>
                </View>
              </View>
              <Switch
                value={remindNearLocation}
                onValueChange={handleRemindNearToggle}
                trackColor={{ false: '#374151', true: '#2563EB' }}
                thumbColor={remindNearLocation ? '#93C5FD' : '#9CA3AF'}
              />
            </View>
            {remindNearLocation && (
              <View style={styles.locationInputWrap}>
                <TextInput
                  style={[styles.inputCard, styles.locationInput]}
                  placeholder={googlePlacesEnabled ? "Search for a place or address…" : "e.g. Whole Foods, 123 Main St"}
                  placeholderTextColor="#6B7280"
                  value={locationPlaceName}
                  onChangeText={(t) => {
                    setLocationPlaceName(t);
                    setLocationError(null);
                    setSelectedPlaceCoords(null);
                  }}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  editable={!isGeocoding}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <View style={[styles.suggestionsDropdown, Platform.OS === 'web' && styles.suggestionsDropdownWeb]}>
                    <FlatList
                      data={suggestions}
                      keyExtractor={(item) => item.placeId}
                      keyboardShouldPersistTaps="handled"
                      style={styles.suggestionsList}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.suggestionItem}
                          onPress={() => handleSelectSuggestion(item)}
                          activeOpacity={0.7}
                        >
                          <MapPin size={14} color="#9CA3AF" style={styles.suggestionIcon} />
                          <Text style={styles.suggestionText} numberOfLines={2}>{item.text}</Text>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                )}
                {isLoadingSuggestions && <Text style={styles.locationHint}>Searching places…</Text>}
                {suggestionsError && (
                  <Text style={styles.locationError}>
                    {suggestionsError}
                    {Platform.OS === 'web' && !suggestionsError.includes('Enable it by visiting') && ' On web, add your site (e.g. http://localhost:8081) to the API key’s HTTP referrers in Google Cloud Console.'}
                  </Text>
                )}
                {locationError ? <Text style={styles.locationError}>{locationError}</Text> : null}
                {isGeocoding && !isLoadingSuggestions ? <Text style={styles.locationHint}>Finding location…</Text> : null}
                <Text style={styles.distanceLabel}>Notify when within</Text>
                <View style={styles.distanceRow}>
                  {DISTANCE_OPTIONS_FEET.map((ft) => (
                    <TouchableOpacity
                      key={ft}
                      style={[styles.distanceChip, notifyWithinFeet === ft && styles.distanceChipActive]}
                      onPress={() => setNotifyWithinFeet(ft)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.distanceChipText, notifyWithinFeet === ft && styles.distanceChipTextActive]}>
                        {ft} ft
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Category</Text>
            <View style={styles.categoryRow}>
              {BUILT_IN_CATEGORY_KEYS.filter((key) => !hiddenCategories.includes(key)).map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.categoryChip,
                    category === key && styles.categoryChipActive,
                  ]}
                  onPress={() => setCategory(key)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      key === 'Personal' && styles.categoryTextNarrow,
                      category === key && styles.categoryTextActive,
                    ]}
                  >
                    {categoryLabels[key]}
                  </Text>
                </TouchableOpacity>
              ))}

              {customCategories
                .filter((c) => !hiddenCategories.includes(c.id))
                .map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.categoryChip,
                      category === c.id && styles.categoryChipActive,
                    ]}
                    onPress={() => setCategory(c.id)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        category === c.id && styles.categoryTextActive,
                      ]}
                    >
                      {getCategoryLabel(c.id)}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          </View>

          {/* Hidden details input (preserves existing data model) */}
          <TextInput
            style={styles.hiddenDetailsInput}
            placeholder="Add details"
            placeholderTextColor="#4B5563"
            value={details}
            onChangeText={setDetails}
            multiline
          />

          {/* Primary action — requires title and due date */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              (!title.trim() || !date || isGeocoding) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!title.trim() || !date || isGeocoding}
            activeOpacity={0.9}
          >
            <Text
              style={[
                styles.saveButtonText,
                (!title.trim() || !date) && styles.saveButtonTextDisabled,
              ]}
            >
              Create Task
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
  );

  const subModals = (
    <>
      {/* Date picker popup */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity
          style={styles.datePickerOverlay}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <TouchableOpacity
            style={styles.datePickerPopup}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.datePickerPopupHeader}>
              <Text style={styles.datePickerPopupTitle}>Pick a date</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={styles.datePickerCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerContent}>
              <Text style={styles.datePickerSectionLabel}>Select a date</Text>
              <DateCalendar
                minDate={todayString}
                current={date ? formatDateString(date) : undefined}
                initialDate={date ? formatDateString(date) : todayString}
                onDayPress={handleDayPress}
                markedDates={markedDates}
                theme={calendarTheme}
                style={styles.dateCalendar}
              />
              <TouchableOpacity
                style={styles.dateOnlyButton}
                onPress={() => {
                  if (date) {
                    const d = new Date(date);
                    d.setHours(0, 0, 0, 0);
                    setDate(d);
                    setReminders([]);
                    setDueDateIsDateOnly(true);
                  }
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.dateOnlyButtonText}>No time (date only)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.datePickerDone}
                onPress={() => {
                  setShowDatePicker(false);
                  if (date) {
                    setDueDateIsDateOnly(false);
                    const d = new Date(date);
                    const in30 = new Date(Date.now() + 30 * 60 * 1000);
                    d.setHours(in30.getHours(), in30.getMinutes(), 0, 0);
                    setDate(d);
                    setDueTimeError(null);
                    setShowDueTimePicker(true);
                  }
                }}
              >
                <Text style={styles.datePickerDoneText}>Set date & time</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Due time: on Android use native dialog only (no Modal) to avoid flash when selecting past time */}
      {Platform.OS === 'android' && showDueTimePicker && DateTimePicker && (
        <DateTimePicker
          value={date ?? new Date()}
          mode="time"
          minimumDate={date && formatDateString(date) === todayString ? new Date() : undefined}
          onChange={(_, t) => {
            setShowDueTimePicker(false);
            if (t && date) {
              setDueDateIsDateOnly(false);
              const d = new Date(date);
              d.setHours(t.getHours(), t.getMinutes(), 0, 0);
              const now = new Date();
              if (d.getTime() < now.getTime()) {
                setTimeout(() => setDueTimeError('That time has already passed. Pick a later time.'), 0);
                return;
              }
              setDueTimeError(null);
              setDate(d);
              setReminders([]);
            }
          }}
          display="default"
        />
      )}

      {/* Due time picker modal — iOS and web only (Android uses inline picker above) */}
      {Platform.OS !== 'android' && (
        <Modal
          visible={showDueTimePicker}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setDueTimeError(null);
            setShowDueTimePicker(false);
          }}
        >
          <TouchableOpacity
            style={styles.datePickerOverlay}
            activeOpacity={1}
            onPress={() => {
              setDueTimeError(null);
              setShowDueTimePicker(false);
            }}
          >
            <TouchableOpacity
              style={styles.datePickerPopup}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.datePickerPopupHeader}>
                <Text style={styles.datePickerPopupTitle}>Pick a time</Text>
                <TouchableOpacity
                  onPress={() => {
                    setDueTimeError(null);
                    setShowDueTimePicker(false);
                  }}
                  style={styles.datePickerCloseBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerContent}>
                <Text style={styles.datePickerSectionLabel}>Time of day</Text>
                {DateTimePicker ? (
                  <>
                    <DateTimePicker
                      value={date ?? new Date()}
                      mode="time"
                      minimumDate={date && formatDateString(date) === todayString ? new Date() : undefined}
                      onChange={(_, t) => {
                        if (t && date) {
                          setDueDateIsDateOnly(false);
                          const d = new Date(date);
                          d.setHours(t.getHours(), t.getMinutes(), 0, 0);
                          const now = new Date();
                          if (d.getTime() < now.getTime()) {
                            setShowDueTimePicker(false);
                            setTimeout(() => setDueTimeError('That time has already passed. Pick a later time.'), 0);
                            return;
                          }
                          setDueTimeError(null);
                          setDate(d);
                          setReminders([]);
                        }
                      }}
                      display="spinner"
                      themeVariant="dark"
                      style={styles.reminderTimePicker}
                    />
                    <TouchableOpacity
                      style={styles.datePickerDone}
                      onPress={() => {
                        if (date) {
                          const now = new Date();
                          if (formatDateString(date) === todayString && date.getTime() < now.getTime()) {
                            setShowDueTimePicker(false);
                            setTimeout(() => setDueTimeError('That time has already passed. Pick a later time.'), 0);
                            return;
                          }
                        }
                        setDueTimeError(null);
                        setReminders([]);
                        setShowDueTimePicker(false);
                      }}
                    >
                      <Text style={styles.datePickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={styles.reminderWebHint}>
                    Set due time on the iOS or Android app.
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Reminder slide-up panel — same on all platforms */}
      <Modal
        visible={showReminderPicker}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setReminderError(null);
          setShowReminderPicker(false);
        }}
      >
        <TouchableWithoutFeedback onPress={() => {
          setReminderError(null);
          setShowReminderPicker(false);
        }}>
          <View style={styles.reminderOverlay} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.reminderKeyboardView}
        >
          <TouchableWithoutFeedback>
            <View style={styles.reminderPanel}>
              <View style={styles.handleWrapper}>
                <View style={styles.handle} />
              </View>
              <View style={styles.reminderPanelHeader}>
                <Text style={styles.reminderPanelTitle}>Reminders</Text>
                <TouchableOpacity
                  onPress={() => {
                    setReminderError(null);
                    setShowReminderPicker(false);
                  }}
                  style={styles.datePickerCloseBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={22} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <View style={styles.reminderPanelContent}>
                {reminders.length > 0 ? (
                  <View style={styles.reminderListSection}>
                    <Text style={styles.datePickerSectionLabel}>Your reminders</Text>
                    {reminders.map((r, i) => (
                      <View key={i} style={styles.reminderListItem}>
                        <Text style={styles.reminderListItemText}>
                          {r.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                        </Text>
                        <TouchableOpacity
                          onPress={() => setReminders((prev) => prev.filter((_, j) => j !== i))}
                          style={styles.reminderListDelete}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : null}
                <Text style={styles.datePickerSectionLabel}>Date</Text>
                <DateCalendar
                  minDate={todayString}
                  maxDate={date ? formatDateString(date) : undefined}
                  current={formatDateString(reminderPanelDate)}
                  initialDate={formatDateString(reminderPanelDate)}
                  onDayPress={(day) => {
                    setReminderError(null);
                    const [y, m, dayNum] = day.dateString.split('-').map(Number);
                    setReminderPanelDate(new Date(y, m - 1, dayNum));
                  }}
                  markedDates={{
                    [formatDateString(reminderPanelDate)]: {
                      selected: true,
                      selectedColor: '#2563EB',
                      selectedTextColor: '#FFFFFF',
                    },
                  }}
                  theme={calendarTheme}
                  style={styles.reminderCalendar}
                />

                <Text style={[styles.datePickerSectionLabel, styles.reminderTimeLabel]}>Time</Text>
                {!DateTimePicker ? (
                  <Text style={styles.reminderWebHint}>
                    Set reminder time on the iOS or Android app.
                  </Text>
                ) : Platform.OS === 'android' && !showReminderTimePicker ? (
                  <TouchableOpacity
                    style={styles.reminderTimeRow}
                    onPress={() => setShowReminderTimePicker(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.reminderTimeRowText}>
                      {reminderPanelTime.toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                    <Text style={styles.sectionCardRightText}>Set time</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.reminderTimePickerWrap}>
                    {(Platform.OS !== 'android' || showReminderTimePicker) && (
                      <DateTimePicker
                        value={reminderPanelTime}
                        mode="time"
                        minimumDate={
                          formatDateString(reminderPanelDate) === todayString ? new Date() : undefined
                        }
                        onChange={(_, t) => {
                          if (t) {
                            setReminderError(null);
                            setReminderPanelTime(t);
                          }
                          if (Platform.OS === 'android') setShowReminderTimePicker(false);
                        }}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        themeVariant="dark"
                        style={Platform.OS === 'android' ? undefined : styles.reminderTimePicker}
                      />
                    )}
                  </View>
                )}

                {reminderError ? (
                  <Text style={styles.reminderValidationError}>{reminderError}</Text>
                ) : null}
                {reminders.length >= MAX_REMINDERS ? (
                  <Text style={styles.reminderLimitHint}>Maximum {MAX_REMINDERS} reminders.</Text>
                ) : null}
                <TouchableOpacity
                  style={[styles.reminderPanelAdd, reminders.length >= MAX_REMINDERS && styles.reminderPanelAddDisabled]}
                  onPress={() => {
                    if (reminders.length >= MAX_REMINDERS) {
                      setReminderError(`Maximum ${MAX_REMINDERS} reminders allowed.`);
                      return;
                    }
                    const combined = new Date(reminderPanelDate);
                    combined.setHours(
                      reminderPanelTime.getHours(),
                      reminderPanelTime.getMinutes(),
                      0,
                      0,
                    );
                    const now = new Date();
                    if (combined.getTime() < now.getTime()) {
                      setReminderError('That time has already passed. Pick a later time.');
                      return;
                    }
                    if (date) {
                      const dueDateTime = date.getTime();
                      if (combined.getTime() > dueDateTime) {
                        setReminderError('Reminder must be before the due date and time.');
                        return;
                      }
                    }
                    const sameTimeOfDay = reminders.some(
                      (r) => r.getHours() === combined.getHours() && r.getMinutes() === combined.getMinutes()
                    );
                    if (sameTimeOfDay) {
                      setReminderError('A reminder at this time already exists. Pick a different time.');
                      setTimeout(() => setReminderError(null), 1000);
                      return;
                    }
                    setReminderError(null);
                    setReminders((prev) => [...prev, combined].sort((a, b) => a.getTime() - b.getTime()));
                    const next = new Date(combined);
                    next.setMinutes(next.getMinutes() + 30, 0, 0);
                    setReminderPanelDate(next);
                    setReminderPanelTime(next);
                  }}
                  activeOpacity={0.9}
                  disabled={reminders.length >= MAX_REMINDERS}
                >
                  <Text style={[styles.datePickerDoneText, reminders.length >= MAX_REMINDERS && styles.reminderPanelAddTextDisabled]}>
                    Add reminder
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.reminderPanelDone}
                  onPress={() => setShowReminderPicker(false)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.reminderPanelDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );

  if (embedInPanel) {
    return (
      <>
        {formContent}
        {subModals}
      </>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
      {formContent}
      {subModals}
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
  keyboardViewEmbed: {
    flex: 1,
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
  },
  containerEmbed: {
    paddingTop: 0,
    shadowOpacity: 0,
    elevation: 0,
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
  iconButton: {
    padding: 4,
  },
  clearButton: {
    paddingHorizontal: 4,
  },
  clearText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#60A5FA',
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
  inputCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1D4ED8',
    backgroundColor: '#020617',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputTitle: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#E5E7EB',
  },
  subtaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  addSubtaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addSubtaskText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#60A5FA',
  },
  subtaskEmpty: {
    backgroundColor: '#020617',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
    borderStyle: 'dashed',
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  subtaskEmptyText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#6B7280',
    marginBottom: 2,
  },
  subtaskEmptyHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#4B5563',
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  subtaskInputWrap: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1F2937',
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  subtaskInput: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#E5E7EB',
    padding: 0,
  },
  removeSubtaskBtn: {
    padding: 8,
  },
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#020617',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#111827',
  },
  sectionCardDisabled: {
    opacity: 0.6,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionCardIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionCardTextWrapper: {
    flex: 1,
  },
  sectionCardTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#E5E7EB',
    marginBottom: 0,
  },
  sectionCardSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
  },
  sectionCardSubtitleDisabled: {
    color: '#6B7280',
  },
  sectionCardRight: {
    paddingLeft: 12,
  },
  sectionCardRightText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#60A5FA',
  },
  sectionCardRightTextDisabled: {
    color: '#6B7280',
  },
  locationInputWrap: {
    marginTop: 6,
    marginLeft: 4,
  },
  locationInput: {
    minHeight: 38,
    color: '#FFFFFF',
  },
  distanceLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#9CA3AF',
    marginTop: 10,
    marginBottom: 4,
  },
  distanceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  distanceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  distanceChipActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#2563EB',
  },
  distanceChipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#9CA3AF',
  },
  distanceChipTextActive: {
    color: '#EFF6FF',
  },
  locationError: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#F87171',
    marginTop: 4,
  },
  locationHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
    marginTop: 4,
  },
  suggestionsDropdown: {
    marginTop: 4,
    maxHeight: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    backgroundColor: '#0F172A',
    overflow: 'hidden',
  },
  suggestionsDropdownWeb: {
    zIndex: 9999,
    position: 'relative',
    elevation: 9999,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  suggestionIcon: {
    marginRight: 8,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#E5E7EB',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#111827',
    gap: 4,
  },
  categoryChipActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#2563EB',
  },
  categoryText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#9CA3AF',
  },
  categoryTextNarrow: {
    letterSpacing: -0.2,
  },
  categoryTextActive: {
    color: '#EFF6FF',
  },
  hiddenDetailsInput: {
    height: 0,
    opacity: 0,
  },
  saveButton: {
    marginTop: 2,
    marginBottom: 2,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 24,
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
  datePickerCloseBtn: {
    padding: 4,
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
  dateCalendar: {
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
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  datePickerDoneText: {
    color: '#F9FAFB',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  reminderPicker: {
    alignSelf: 'center',
  },
  reminderWebHint: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 16,
  },
  dueTimeErrorText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#F87171',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  reminderOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.75)',
  },
  reminderKeyboardView: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  reminderPanel: {
    backgroundColor: '#020617',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 30,
  },
  reminderPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  reminderPanelTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#E5E7EB',
    flex: 1,
  },
  reminderPanelContent: {
    paddingBottom: 8,
  },
  reminderCalendar: {
    marginBottom: 8,
  },
  reminderTimeLabel: {
    marginTop: 8,
    marginBottom: 8,
  },
  reminderTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  reminderTimeRowText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#E5E7EB',
  },
  reminderTimePickerWrap: {
    marginBottom: 16,
  },
  reminderTimePicker: {
    alignSelf: 'center',
  },
  reminderValidationError: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#F87171',
    textAlign: 'center',
    marginBottom: 12,
  },
  reminderListSection: {
    marginBottom: 16,
  },
  reminderListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  reminderListItemText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#E5E7EB',
  },
  reminderListDelete: {
    padding: 4,
  },
  reminderPanelAdd: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  reminderPanelAddDisabled: {
    backgroundColor: '#1F2937',
    opacity: 0.7,
  },
  reminderPanelAddTextDisabled: {
    color: '#6B7280',
  },
  reminderLimitHint: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  reminderPanelDone: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  reminderPanelDoneText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: '#9CA3AF',
  },
});
