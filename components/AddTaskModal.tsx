import React, { useState } from 'react';
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
} from 'react-native';
import {
  Calendar,
  X,
  Briefcase,
  User,
  ShoppingBag,
  Heart,
  Plus,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (title: string, details?: string, date?: Date) => void;
}

export default function AddTaskModal({ visible, onClose, onAdd }: AddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [category, setCategory] = useState<'Work' | 'Personal' | 'Shopping' | 'Health' | 'New'>('Work');

  const handleSave = () => {
    if (title.trim()) {
      onAdd(title, details, date);
      resetForm();
      onClose();
    }
  };

  const resetForm = () => {
    setTitle('');
    setDetails('');
    setDate(undefined);
    setPriority('medium');
    setCategory('Work');
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
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

          {/* Due date */}
          <View style={styles.section}>
            <View style={styles.sectionCard}>
              <View style={styles.sectionCardHeader}>
                <View style={styles.sectionCardIconWrapper}>
                  <Calendar size={18} color="#BFDBFE" />
                </View>
                <View style={styles.sectionCardTextWrapper}>
                  <Text style={styles.sectionCardTitle}>Due Date</Text>
                  <Text style={styles.sectionCardSubtitle}>
                    {date
                      ? date.toLocaleDateString()
                      : 'Pick a time for your task'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.sectionCardRight}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.sectionCardRightText}>
                  {date ? 'Change' : 'Today'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Priority */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Set Priority</Text>
            <View style={styles.priorityRow}>
              <TouchableOpacity
                style={[
                  styles.priorityChip,
                  priority === 'low' && styles.priorityChipActive,
                ]}
                onPress={() => setPriority('low')}
              >
                <Text
                  style={[
                    styles.priorityText,
                    priority === 'low' && styles.priorityTextActive,
                  ]}
                >
                  Low
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.priorityChip,
                  priority === 'medium' && styles.priorityChipActive,
                ]}
                onPress={() => setPriority('medium')}
              >
                <Text
                  style={[
                    styles.priorityText,
                    priority === 'medium' && styles.priorityTextActive,
                  ]}
                >
                  Medium
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.priorityChip,
                  priority === 'high' && styles.priorityChipActive,
                ]}
                onPress={() => setPriority('high')}
              >
                <Text
                  style={[
                    styles.priorityText,
                    priority === 'high' && styles.priorityTextActive,
                  ]}
                >
                  High
                </Text>
              </TouchableOpacity>
            </View>
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

          {/* Primary action */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              !title.trim() && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!title.trim()}
            activeOpacity={0.9}
          >
            <Text
              style={[
                styles.saveButtonText,
                !title.trim() && styles.saveButtonTextDisabled,
              ]}
            >
              Create Task
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {showDatePicker && (
        <DateTimePicker
          value={date || new Date()}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
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
  priorityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityChip: {
    flex: 1,
    marginRight: 8,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#111827',
    alignItems: 'center',
  },
  priorityChipActive: {
    backgroundColor: '#1F2937',
    borderColor: '#1D4ED8',
  },
  priorityText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#9CA3AF',
  },
  priorityTextActive: {
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
});
