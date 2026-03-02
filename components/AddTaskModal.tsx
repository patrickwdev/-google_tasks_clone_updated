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
  Briefcase,
  User,
  ShoppingBag,
  Heart,
  Plus,
  MapPin,
  ListChecks,
  Trash2,
} from 'lucide-react-native';
import { Calendar as DateCalendar } from 'react-native-calendars';
import type { TaskLocationReminder, SubTask, TaskCategory } from '../types/task';
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
  onAdd: (title: string, details?: string, date?: Date, locationReminder?: TaskLocationReminder, subtasks?: SubTask[], category?: TaskCategory) => void;
}

export default function AddTaskModal({ visible, onClose, onAdd }: AddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [remindNearLocation, setRemindNearLocation] = useState(false);
  const [locationPlaceName, setLocationPlaceName] = useState('');
  const [selectedPlaceCoords, setSelectedPlaceCoords] = useState<{ name: string; latitude: number; longitude: number } | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [category, setCategory] = useState<'Work' | 'Personal' | 'Shopping' | 'Health' | 'New'>('Work');
  const [subtasks, setSubtasks] = useState<{ id: string; title: string }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [notifyWithinFeet, setNotifyWithinFeet] = useState(500);
  const googlePlacesEnabled = isGooglePlacesConfigured();

  const DISTANCE_OPTIONS_FEET = [10, 20, 50, 100, 250, 500];

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
    onAdd(title, details, date, locationReminder, subTaskList.length ? subTaskList : undefined, category);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setTitle('');
    setDetails('');
    setDate(undefined);
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.container}>
          {/* Handle */}
          <View style={styles.handleWrapper}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
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
              onPress={() => setShowDatePicker(true)}
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
                      ? date.toLocaleDateString()
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
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  category === 'Work' && styles.categoryChipActive,
                ]}
                onPress={() => setCategory('Work')}
              >
                <Briefcase
                  size={16}
                  color={category === 'Work' ? '#EFF6FF' : '#9CA3AF'}
                />
                <Text
                  style={[
                    styles.categoryText,
                    category === 'Work' && styles.categoryTextActive,
                  ]}
                >
                  Work
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  category === 'Personal' && styles.categoryChipActive,
                ]}
                onPress={() => setCategory('Personal')}
              >
                <User
                  size={16}
                  color={category === 'Personal' ? '#EFF6FF' : '#9CA3AF'}
                />
                <Text
                  style={[
                    styles.categoryText,
                    styles.categoryTextNarrow,
                    category === 'Personal' && styles.categoryTextActive,
                  ]}
                >
                  Personal
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  category === 'Shopping' && styles.categoryChipActive,
                ]}
                onPress={() => setCategory('Shopping')}
              >
                <ShoppingBag
                  size={16}
                  color={category === 'Shopping' ? '#EFF6FF' : '#9CA3AF'}
                />
                <Text
                  style={[
                    styles.categoryText,
                    category === 'Shopping' && styles.categoryTextActive,
                  ]}
                >
                  Shopping
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  category === 'Health' && styles.categoryChipActive,
                ]}
                onPress={() => setCategory('Health')}
              >
                <Heart
                  size={16}
                  color={category === 'Health' ? '#EFF6FF' : '#9CA3AF'}
                />
                <Text
                  style={[
                    styles.categoryText,
                    category === 'Health' && styles.categoryTextActive,
                  ]}
                >
                  Health
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  category === 'New' && styles.categoryChipActive,
                ]}
                onPress={() => setCategory('New')}
              >
                <Plus
                  size={16}
                  color={category === 'New' ? '#EFF6FF' : '#9CA3AF'}
                />
                <Text
                  style={[
                    styles.categoryText,
                    category === 'New' && styles.categoryTextActive,
                  ]}
                >
                  New
                </Text>
              </TouchableOpacity>
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
                style={styles.datePickerDone}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerDoneText}>Done</Text>
              </TouchableOpacity>
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
  container: {
    backgroundColor: '#020617',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
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
    marginBottom: 20,
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
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  inputCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1D4ED8',
    backgroundColor: '#020617',
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    marginBottom: 8,
  },
  addSubtaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  addSubtaskText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#60A5FA',
  },
  subtaskEmpty: {
    backgroundColor: '#020617',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
    borderStyle: 'dashed',
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  subtaskEmptyText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#6B7280',
    marginBottom: 4,
  },
  subtaskEmptyHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#4B5563',
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  subtaskInputWrap: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#111827',
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
  sectionCardRight: {
    paddingLeft: 16,
  },
  sectionCardRightText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#60A5FA',
  },
  locationInputWrap: {
    marginTop: 10,
    marginLeft: 4,
  },
  locationInput: {
    minHeight: 44,
    color: '#FFFFFF',
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
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#111827',
    gap: 6,
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
    marginTop: 4,
    marginBottom: 4,
    paddingVertical: 14,
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
  datePickerDone: {
    marginTop: 16,
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
});
