import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { Check, Trash2, MapPin, MoreVertical, ListChecks, Bell, Calendar } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { Task } from '../types/task';
import { format } from 'date-fns';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  /** When set, tapping the task content (title/details) opens this screen */
  onPress?: (task: Task) => void;
  /** When set, shows an edit button that calls this with the task */
  onEdit?: (task: Task) => void;
}

const PANEL_WIDTH = 160;
const PANEL_HEIGHT_EST = 56;
const GAP = 8;
const SAFE_PADDING = 16;

export default function TaskItem({ task, onToggle, onDelete, onPress, onEdit }: TaskItemProps) {
  const [showActionPanel, setShowActionPanel] = useState(false);
  const [panelAnchor, setPanelAnchor] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const dotsRef = useRef<View>(null);

  const openPanel = () => {
    dotsRef.current?.measureInWindow((x, y, w, h) => {
      setPanelAnchor({ x, y, w, h });
      setShowActionPanel(true);
    });
  };

  const closePanel = () => {
    setShowActionPanel(false);
    setPanelAnchor(null);
  };

  const handleDelete = () => {
    closePanel();
    onDelete(task.id);
  };

  const content = (
    <>
      {task.isCompleted && (
        <View style={styles.completedBadge}>
          <Check size={12} color="#FFF" strokeWidth={2.5} />
          <Text style={styles.completedBadgeText}>Completed</Text>
        </View>
      )}
      <Text
        style={[styles.title, task.isCompleted && styles.titleCompleted]}
        numberOfLines={2}
      >
        {task.title}
      </Text>
      {task.details && (
        <Text style={styles.details} numberOfLines={1}>
          {task.details}
        </Text>
      )}
      {task.date && (
        <View style={styles.dateContainer}>
          <Calendar size={12} color="#BFDBFE" />
          <Text style={styles.dateText}>
            {(() => {
              const d = new Date(task.date);
              const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
              return hasTime
                ? format(d, "EEE, MMM d 'at' h:mm a")
                : format(d, 'EEE, MMM d');
            })()}
          </Text>
        </View>
      )}
      {task.reminders && task.reminders.length > 0 && (
        <View style={styles.remindersContainer}>
          <Bell size={12} color="#93C5FD" />
          <View style={styles.remindersList}>
            {task.reminders.slice(0, 2).map((reminderDate, index) => {
              const d = reminderDate instanceof Date ? reminderDate : new Date(reminderDate);
              const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
              return (
                <Text key={index} style={styles.reminderText} numberOfLines={1}>
                  {hasTime
                    ? format(d, "EEE, MMM d 'at' h:mm a")
                    : format(d, 'EEE, MMM d')}
                </Text>
              );
            })}
            {task.reminders.length > 2 && (
              <Text style={styles.reminderMore}>+{task.reminders.length - 2} more</Text>
            )}
          </View>
        </View>
      )}
      {task.locationReminder && (
        <View style={styles.locationContainer}>
          <MapPin size={12} color={Colors.light.primary} />
          <Text style={styles.locationText}>Remind near {task.locationReminder.locationName}</Text>
        </View>
      )}
      {task.subtasks && task.subtasks.length > 0 && (
        <View style={styles.subtasksContainer}>
          <View style={styles.subtasksHeader}>
            <ListChecks size={12} color="#6B7280" />
            <Text style={styles.subtasksLabel}>
              {task.subtasks.filter((st) => st.isCompleted).length} of {task.subtasks.length}
            </Text>
          </View>
          {task.subtasks.slice(0, 3).map((st) => (
            <View key={st.id} style={styles.subtaskRow}>
              <View style={[styles.subtaskDot, st.isCompleted && styles.subtaskDotCompleted]}>
                {st.isCompleted && <Check size={10} color="#FFF" strokeWidth={2.5} />}
              </View>
              <Text
                style={[styles.subtaskTitle, st.isCompleted && styles.subtaskTitleCompleted]}
                numberOfLines={1}
              >
                {st.title}
              </Text>
            </View>
          ))}
          {task.subtasks.length > 3 && (
            <Text style={styles.subtaskMore}>+{task.subtasks.length - 3} more</Text>
          )}
        </View>
      )}
    </>
  );

  const isEvent = task.itemType === 'event';

  return (
    <View style={[styles.container, isEvent && styles.containerEvent]}>
      {!isEvent && (
        <TouchableOpacity
          style={[styles.checkbox, task.isCompleted && styles.checkboxChecked]}
          onPress={() => onToggle(task.id)}
          activeOpacity={0.6}
        >
          {task.isCompleted && <Check size={16} color="#FFF" strokeWidth={3} />}
        </TouchableOpacity>
      )}

      <View style={styles.content}>
        {onPress ? (
          <TouchableOpacity
            style={styles.contentTouchable}
            onPress={() => onPress(task)}
            activeOpacity={0.7}
          >
            {content}
          </TouchableOpacity>
        ) : (
          content
        )}
      </View>

      {onEdit ? (
        <View ref={dotsRef} collapsable={false}>
          <TouchableOpacity onPress={openPanel} style={styles.actionBtn}>
            <MoreVertical size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      ) : null}
      {!onEdit ? (
        <TouchableOpacity onPress={() => onDelete(task.id)} style={styles.actionBtn}>
          <Trash2 size={18} color="#9CA3AF" />
        </TouchableOpacity>
      ) : null}

      <Modal
        visible={showActionPanel}
        transparent
        animationType="fade"
        onRequestClose={closePanel}
      >
        <TouchableWithoutFeedback onPress={closePanel}>
          <View style={styles.panelOverlay} />
        </TouchableWithoutFeedback>
        {panelAnchor && (
          <View
            style={[
              styles.panelAnchor,
              (() => {
                const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
                let left = panelAnchor.x + panelAnchor.w - PANEL_WIDTH;
                if (left < SAFE_PADDING) left = SAFE_PADDING;
                if (left + PANEL_WIDTH > screenWidth - SAFE_PADDING) left = screenWidth - PANEL_WIDTH - SAFE_PADDING;
                let top = panelAnchor.y + panelAnchor.h + GAP;
                if (top + PANEL_HEIGHT_EST > screenHeight - SAFE_PADDING) {
                  top = panelAnchor.y - PANEL_HEIGHT_EST - GAP;
                }
                if (top < SAFE_PADDING) top = SAFE_PADDING;
                return { left, top };
              })(),
            ]}
            pointerEvents="box-none"
          >
            <View style={styles.panel}>
              <TouchableOpacity
                style={styles.panelOption}
                onPress={handleDelete}
                activeOpacity={0.7}
              >
                <Trash2 size={18} color="#FFF" />
                <Text style={styles.panelOptionText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#020617',
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#111827',
  },
  containerEvent: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    marginBottom: 0,
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginRight: 16,
  },
  checkboxChecked: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  contentTouchable: {
    flex: 1,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: Colors.light.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  completedBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFF',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#E5E7EB',
    marginBottom: 2,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  details: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  dateContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#BFDBFE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#1D4ED8',
  },
  remindersContainer: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  remindersList: {
    flex: 1,
  },
  reminderText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#93C5FD',
    marginBottom: 2,
  },
  reminderMore: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#6B7280',
  },
  locationContainer: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
  },
  subtasksContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  subtasksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  subtasksLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#6B7280',
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  subtaskDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#4B5563',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskDotCompleted: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  subtaskTitle: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
  },
  subtaskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  subtaskMore: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#6B7280',
    marginTop: 2,
    marginLeft: 20,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  panelOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  panelAnchor: {
    position: 'absolute',
  },
  panel: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 4,
    minWidth: PANEL_WIDTH,
  },
  panelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  panelOptionText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: '#FFF',
  },
});
