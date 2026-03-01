import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Switch,
  FlatList,
} from 'react-native';
import { Calendar, Plus, Check, Trash2, X, MapPin } from 'lucide-react-native';
import { Calendar as DateCalendar } from 'react-native-calendars';
import { format } from 'date-fns';
import { useTasks } from '../context/TaskContext';
import { Colors } from '../constants/Colors';
import * as Location from 'expo-location';
import { geocodePlaceName, requestLocationReminderPermissions } from '../lib/geofencing';
import {
  isGooglePlacesConfigured,
  fetchAutocompleteSuggestions,
  fetchPlaceDetails,
  type PlaceSuggestion,
} from '../lib/googlePlaces';

const DISTANCE_OPTIONS_FEET = [10, 20, 50, 100, 250, 500];

function formatDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface EditTaskPanelProps {
  visible: boolean;
  onClose: () => void;
  taskId: string;
}

export default function EditTaskPanel({ visible, onClose, taskId }: EditTaskPanelProps) {
  const { tasks, updateTaskDate, updateTaskLocationReminder, addSubtask, deleteSubtask, toggleSubtask } = useTasks();
  const task = tasks.find((t) => t.id === taskId);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // "When I'm nearby" state — sync from task when panel opens
  const [remindNearLocation, setRemindNearLocation] = useState(false);
  const [locationPlaceName, setLocationPlaceName] = useState('');
  const [selectedPlaceCoords, setSelectedPlaceCoords] = useState<{ name: string; latitude: number; longitude: number } | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [notifyWithinFeet, setNotifyWithinFeet] = useState(500);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const googlePlacesEnabled = isGooglePlacesConfigured();

  useEffect(() => {
    if (!visible || !task) return;
    setRemindNearLocation(!!task.locationReminder);
    setLocationPlaceName(task.locationReminder?.locationName ?? '');
    setSelectedPlaceCoords(
      task.locationReminder
        ? { name: task.locationReminder.locationName, latitude: task.locationReminder.latitude, longitude: task.locationReminder.longitude }
        : null
    );
    setNotifyWithinFeet(task.locationReminder?.radiusFeet ?? 500);
    setLocationError(null);
    setSuggestionsError(null);
  }, [visible, taskId, task?.id]);

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
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [remindNearLocation]);

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
      const result = await fetchAutocompleteSuggestions(locationPlaceName, { location: location ?? undefined });
      setSuggestions(result.suggestions);
      if (result.error) setSuggestionsError(result.error);
      setIsLoadingSuggestions(false);
      debounceRef.current = null;
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [remindNearLocation, locationPlaceName, googlePlacesEnabled, userLocation]);

  const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
    if (!task) return;
    setShowSuggestions(false);
    setSuggestions([]);
    setIsGeocoding(true);
    setLocationError(null);
    const fullText = suggestion.text?.trim() || suggestion.placeId;
    const details = await fetchPlaceDetails(suggestion.placeId);
    setIsGeocoding(false);
    if (details) {
      setLocationPlaceName(fullText);
      const coords = { name: fullText, latitude: details.latitude, longitude: details.longitude };
      setSelectedPlaceCoords(coords);
      updateTaskLocationReminder(task.id, {
        locationName: coords.name,
        latitude: coords.latitude,
        longitude: coords.longitude,
        radiusFeet: notifyWithinFeet,
      });
    } else {
      setLocationError('Could not load place details.');
    }
  };

  const handleRemindNearToggle = (value: boolean) => {
    if (!task) return;
    setRemindNearLocation(value);
    setLocationError(null);
    if (!value) {
      setLocationPlaceName('');
      setSelectedPlaceCoords(null);
      updateTaskLocationReminder(task.id, undefined);
    } else {
      if (Platform.OS !== 'web') requestLocationReminderPermissions().catch(() => {});
    }
  };

  const handleDistanceChange = (feet: number) => {
    if (!task) return;
    setNotifyWithinFeet(feet);
    const coords = selectedPlaceCoords ?? (task.locationReminder ? { name: task.locationReminder.locationName, latitude: task.locationReminder.latitude, longitude: task.locationReminder.longitude } : null);
    if (coords) {
      updateTaskLocationReminder(task.id, {
        locationName: coords.name,
        latitude: coords.latitude,
        longitude: coords.longitude,
        radiusFeet: feet,
      });
    }
  };

  const handleUseTypedLocation = async () => {
    if (!task || !locationPlaceName.trim()) return;
    setLocationError(null);
    setIsGeocoding(true);
    const coords = await geocodePlaceName(locationPlaceName.trim());
    setIsGeocoding(false);
    if (coords) {
      setSelectedPlaceCoords({ name: locationPlaceName.trim(), latitude: coords.latitude, longitude: coords.longitude });
      updateTaskLocationReminder(task.id, {
        locationName: locationPlaceName.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        radiusFeet: notifyWithinFeet,
      });
    } else {
      setLocationError('Could not find that place. Try a full address or landmark.');
    }
  };

  if (!visible) return null;

  const taskDate = task?.date
    ? task.date instanceof Date
      ? task.date
      : new Date(task.date)
    : undefined;
  const todayString = formatDateString(new Date());
  const minDate = todayString;

  const handleDateSelect = (day: { dateString: string }) => {
    if (!task || day.dateString < minDate) return;
    const [y, m, dayNum] = day.dateString.split('-').map(Number);
    updateTaskDate(task.id, new Date(y, m - 1, dayNum));
    setShowDatePicker(false);
  };

  const handleAddSubtask = () => {
    if (!task) return;
    const title = newSubtaskTitle.trim();
    if (!title) return;
    addSubtask(task.id, title);
    setNewSubtaskTitle('');
  };

  const markedDates = taskDate
    ? {
        [formatDateString(taskDate)]: {
          selected: true,
          selectedColor: '#2563EB',
          selectedTextColor: '#FFFFFF',
        },
      }
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.panel}>
          <View style={styles.handleWrapper}>
            <View style={styles.handle} />
          </View>

          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Edit Task</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {task ? (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.taskTitleLabel}>Task</Text>
              <Text style={styles.taskTitle}>{task.title}</Text>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Due date</Text>
                <TouchableOpacity
                  style={styles.dateCard}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.8}
                >
                  <Calendar size={20} color="#BFDBFE" />
                  <Text style={styles.dateCardText}>
                    {taskDate
                      ? format(taskDate, 'EEEE, MMMM d, yyyy')
                      : 'Tap to set due date'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Sub-tasks</Text>
                {task.subtasks && task.subtasks.length > 0 ? (
                  <View style={styles.subtaskList}>
                    {task.subtasks.map((st) => (
                      <View key={st.id} style={styles.subtaskRow}>
                        <TouchableOpacity
                          style={[styles.subtaskCheckbox, st.isCompleted && styles.checkboxChecked]}
                          onPress={() => toggleSubtask(task.id, st.id)}
                          activeOpacity={0.7}
                        >
                          {st.isCompleted && <Check size={16} color="#FFF" strokeWidth={3} />}
                        </TouchableOpacity>
                        <Text
                          style={[styles.subtaskTitle, st.isCompleted && styles.subtaskTitleCompleted]}
                          numberOfLines={2}
                        >
                          {st.title}
                        </Text>
                        <TouchableOpacity
                          onPress={() => deleteSubtask(task.id, st.id)}
                          style={styles.subtaskDelete}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 size={18} color={Colors.light.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : null}
                <View style={styles.addSubtaskRow}>
                  <TextInput
                    style={styles.subtaskInput}
                    placeholder="Add a sub-task"
                    placeholderTextColor="#6B7280"
                    value={newSubtaskTitle}
                    onChangeText={setNewSubtaskTitle}
                    onSubmitEditing={handleAddSubtask}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={[styles.addSubtaskButton, !newSubtaskTitle.trim() && styles.addSubtaskButtonDisabled]}
                    onPress={handleAddSubtask}
                    disabled={!newSubtaskTitle.trim()}
                    activeOpacity={0.8}
                  >
                    <Plus size={20} color={newSubtaskTitle.trim() ? '#EFF6FF' : '#6B7280'} />
                    <Text
                      style={[
                        styles.addSubtaskButtonText,
                        !newSubtaskTitle.trim() && styles.addSubtaskButtonTextDisabled,
                      ]}
                    >
                      Add
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

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
                      placeholder={googlePlacesEnabled ? 'Search for a place or address…' : 'e.g. Whole Foods, 123 Main St'}
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
                        {Platform.OS === 'web' && !suggestionsError.includes('Enable it by visiting') && ' On web, add your site to the API key\'s HTTP referrers in Google Cloud Console.'}
                      </Text>
                    )}
                    {locationError ? <Text style={styles.locationError}>{locationError}</Text> : null}
                    {isGeocoding && !isLoadingSuggestions ? <Text style={styles.locationHint}>Finding location…</Text> : null}
                    {locationPlaceName.trim() && !selectedPlaceCoords && !showSuggestions && (
                      <TouchableOpacity
                        style={styles.useAddressButton}
                        onPress={handleUseTypedLocation}
                        disabled={isGeocoding}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.useAddressButtonText}>Use this address</Text>
                      </TouchableOpacity>
                    )}
                    <Text style={styles.distanceLabel}>Notify when within</Text>
                    <View style={styles.distanceRow}>
                      {DISTANCE_OPTIONS_FEET.map((ft) => (
                        <TouchableOpacity
                          key={ft}
                          style={[styles.distanceChip, notifyWithinFeet === ft && styles.distanceChipActive]}
                          onPress={() => handleDistanceChange(ft)}
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
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Task not found</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Date picker modal */}
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
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Change due date</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={styles.datePickerCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerContent}>
              <DateCalendar
                minDate={minDate}
                current={taskDate ? formatDateString(taskDate) : undefined}
                initialDate={taskDate ? formatDateString(taskDate) : todayString}
                onDayPress={handleDateSelect}
                markedDates={markedDates}
                theme={calendarTheme}
                style={styles.calendar}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    bottom: 0,
    left: 0,
    right: 0,
  },
  panel: {
    backgroundColor: '#020617',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 30,
  },
  handleWrapper: {
    alignItems: 'center',
    paddingVertical: 6,
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
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#E5E7EB',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    maxHeight: 520,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  taskTitleLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#F9FAFB',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  dateCardText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#E5E7EB',
  },
  subtaskList: {
    marginBottom: 12,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingRight: 8,
    marginBottom: 6,
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
  subtaskDelete: {
    padding: 6,
  },
  addSubtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subtaskInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: '#E5E7EB',
  },
  addSubtaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },
  addSubtaskButtonDisabled: {
    backgroundColor: '#1F2937',
  },
  addSubtaskButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#EFF6FF',
  },
  addSubtaskButtonTextDisabled: {
    color: '#6B7280',
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
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
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  datePickerTitle: {
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
  calendar: {
    marginBottom: 8,
  },
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionCardIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionCardTextWrapper: {
    flex: 1,
  },
  sectionCardTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#E5E7EB',
    marginBottom: 2,
  },
  sectionCardSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
  },
  locationInputWrap: {
    marginTop: 10,
    marginLeft: 4,
  },
  inputCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  locationInput: {
    minHeight: 44,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: '#E5E7EB',
  },
  distanceLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#9CA3AF',
    marginTop: 16,
    marginBottom: 8,
  },
  distanceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  distanceChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    marginTop: 6,
  },
  locationHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
    marginTop: 6,
  },
  useAddressButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#1D4ED8',
    alignSelf: 'flex-start',
  },
  useAddressButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#EFF6FF',
  },
  suggestionsDropdown: {
    marginTop: 6,
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
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  suggestionIcon: {
    marginRight: 10,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#E5E7EB',
  },
});
