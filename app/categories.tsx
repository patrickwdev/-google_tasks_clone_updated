import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Home,
  LayoutGrid,
  CalendarDays,
  Settings,
  Search,
  Plus,
  MoreVertical,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTasks } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import AddTaskModal from '../components/AddTaskModal';
import { supabase } from '../lib/supabase';
import type { TaskCategory } from '../types/task';
import { BUILT_IN_CATEGORY_KEYS } from '../types/task';

type CategoryGridItem = {
  id: string;
  label: string;
  accentColor: string;
  accentBg: string;
  categoryKey: TaskCategory | string;
  isCustom: boolean;
};

/** Each entry must have a unique categoryKey (add new key to TaskCategory in types/task.ts and to VALID_CATEGORIES + categoryLabels in TaskContext). */
const BUILT_IN_CATEGORIES: CategoryGridItem[] = [
  { id: 'work', label: 'Work', accentColor: '#60A5FA', accentBg: '#1D4ED8', categoryKey: 'Work', isCustom: false },
  { id: 'personal', label: 'Personal', accentColor: '#A855F7', accentBg: '#5B21B6', categoryKey: 'Personal', isCustom: false },
  { id: 'shopping', label: 'Shopping', accentColor: '#FBBF24', accentBg: '#92400E', categoryKey: 'Shopping', isCustom: false },
  { id: 'fitness', label: 'Fitness', accentColor: '#34D399', accentBg: '#065F46', categoryKey: 'Health', isCustom: false },
  { id: 'home', label: 'Home', accentColor: '#38BDF8', accentBg: '#0E7490', categoryKey: 'Home', isCustom: false },
];

// Ensure every built-in category has a unique key and matches BUILT_IN_CATEGORY_KEYS
const _builtInKeys = BUILT_IN_CATEGORIES.map((c) => c.categoryKey);
const _keySet = new Set(_builtInKeys);
if (_keySet.size !== _builtInKeys.length) {
  throw new Error('BUILT_IN_CATEGORIES: every categoryKey must be unique.');
}
const _expectedSet = new Set(BUILT_IN_CATEGORY_KEYS);
if (_keySet.size !== _expectedSet.size || [..._keySet].some((k) => !_expectedSet.has(k as TaskCategory))) {
  throw new Error('BUILT_IN_CATEGORIES: categoryKeys must match BUILT_IN_CATEGORY_KEYS in types/task.ts.');
}

const CUSTOM_CATEGORY_ACCENT = { accentColor: '#8B5CF6', accentBg: '#4C1D95' };

const LIST_PADDING_H = 16;
const CARD_MARGIN_H = 4;

export default function CategoriesScreen() {
  const router = useRouter();
  const {
    addTask,
    categoryLabels,
    renameCategoryLabel,
    renameCustomCategory,
    tasks,
    hiddenCategories,
    customCategories,
    addCustomCategory,
    getCategoryLabel,
    deleteCategoryAndTasks,
  } = useTasks();
  const { user, isLoading: authLoading } = useAuth();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const { width: screenWidth } = Dimensions.get('window');
  const cardWidth = useMemo(
    () => (screenWidth - LIST_PADDING_H * 2 - CARD_MARGIN_H * 4) / 2,
    [screenWidth],
  );
  const [addCategoryPanelVisible, setAddCategoryPanelVisible] = useState(false);
  const [addCategoryName, setAddCategoryName] = useState('');
  const [categoryMenu, setCategoryMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    categoryId?: string;
    categoryKey?: TaskCategory | string;
    categoryLabel?: string;
  }>({ visible: false, x: 0, y: 0 });
  const [renameModal, setRenameModal] = useState<{
    visible: boolean;
    categoryId?: string;
    categoryKey?: TaskCategory | string;
    value: string;
  }>({ visible: false, value: '' });
  const [searchQuery, setSearchQuery] = useState('');

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

  const taskCountsByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const task of tasks) {
      if (!task.category) continue;
      const key = task.category;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [tasks]);

  const gridData = useMemo(() => {
    const builtIn = BUILT_IN_CATEGORIES.filter(
      (c) => !hiddenCategories.includes(c.categoryKey),
    );
    const custom = customCategories
      .filter((c) => !hiddenCategories.includes(c.id))
      .map((c) => ({
        id: c.id,
        label: c.label,
        categoryKey: c.id as TaskCategory | string,
        isCustom: true,
        ...CUSTOM_CATEGORY_ACCENT,
      }));
    return [...builtIn, ...custom];
  }, [hiddenCategories, customCategories]);

  const filteredGridData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return gridData;
    return gridData.filter((item) =>
      getCategoryLabel(item.categoryKey).toLowerCase().includes(q),
    );
  }, [gridData, searchQuery, getCategoryLabel]);

  if (authLoading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const closeCategoryMenu = () => {
    setCategoryMenu((prev) => ({ ...prev, visible: false }));
  };

  const openRenameModal = (
    categoryId: string | undefined,
    categoryKey: TaskCategory | string | undefined,
    categoryLabel: string | undefined,
  ) => {
    if (!categoryId || !categoryKey) return;
    setRenameModal({
      visible: true,
      categoryId,
      categoryKey,
      value: categoryLabel ?? '',
    });
  };

  const closeRenameModal = () => {
    setRenameModal({ visible: false, categoryId: undefined, categoryKey: undefined, value: '' });
  };

  const handleRenameSave = () => {
    if (!renameModal.categoryId || !renameModal.categoryKey) return;
    const trimmed = renameModal.value.trim();
    if (!trimmed) {
      closeRenameModal();
      return;
    }
    const ok = renameModal.categoryKey.startsWith('custom_')
      ? renameCustomCategory(renameModal.categoryKey, trimmed)
      : (() => {
          const target = BUILT_IN_CATEGORIES.find((c) => c.id === renameModal.categoryId);
          return target ? renameCategoryLabel(target.categoryKey as TaskCategory, trimmed) : false;
        })();
    if (ok) closeRenameModal();
    else Alert.alert('Duplicate name', 'A category with this name already exists.');
  };

  const handleAddCategoryCreate = () => {
    const trimmed = addCategoryName.trim();
    if (!trimmed) return;
    const ok = addCustomCategory(trimmed);
    if (ok) {
      setAddCategoryName('');
      setAddCategoryPanelVisible(false);
    } else {
      Alert.alert('Duplicate name', 'A category with this name already exists.');
    }
  };

  const renderCategory = ({ item }: { item: CategoryGridItem }) => {
    const count = taskCountsByCategory[item.categoryKey] ?? 0;
    const displayLabel = getCategoryLabel(item.categoryKey);

    const openCategoryMenu = (e: { nativeEvent: { pageX: number; pageY: number } }) => {
      const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
      const MENU_WIDTH = 168;
      const MENU_HEIGHT = 96;
      const MARGIN = 10;
      const pressX = e.nativeEvent.pageX;
      const pressY = e.nativeEvent.pageY;
      const x = Math.min(pressX, screenWidth - MENU_WIDTH - MARGIN);
      const y = Math.min(pressY, screenHeight - MENU_HEIGHT - MARGIN);
      setCategoryMenu({
        visible: true,
        x: Math.max(MARGIN, x),
        y: Math.max(MARGIN, y),
        categoryId: item.id,
        categoryKey: item.categoryKey,
        categoryLabel: displayLabel,
      });
    };

    return (
      <View style={[styles.categoryCard, { width: cardWidth, maxWidth: cardWidth }]}>
        <View style={styles.categoryCardHeader}>
          <TouchableOpacity
            style={styles.categoryDotsButton}
            activeOpacity={0.7}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            accessibilityRole="button"
            accessibilityLabel={`Category options for ${displayLabel}`}
            onPress={openCategoryMenu}
          >
            <MoreVertical size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.categoryCardContent}
          activeOpacity={0.85}
          onPress={() => router.push(`/categories/${item.categoryKey}`)}
        >
          <Text style={styles.categoryTitle}>{displayLabel}</Text>
          <Text style={styles.categorySubtitle}>
            {count} task{count === 1 ? '' : 's'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity activeOpacity={0.7} style={styles.avatarButton}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>A</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Categories</Text>

          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.headerDotsButton}
            onPress={() => setAddCategoryPanelVisible(true)}
            accessibilityLabel="Add category"
          >
            <MoreVertical size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Search size={18} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your life areas..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Category grid */}
      <FlatList
        data={filteredGridData}
        keyExtractor={(item) => item.id}
        numColumns={2}
        initialNumToRender={20}
        contentContainerStyle={[styles.listContent, { flexGrow: 1 }]}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={renderCategory}
      />

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
            style={[styles.bottomNavItemActive, styles.bottomNavItemCategories]}
            onPress={() => router.push('categories')}
            activeOpacity={0.8}
          >
            <LayoutGrid size={20} color="#60A5FA" />
            <Text style={styles.bottomNavLabelActive}>Categories</Text>
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

      <Modal
        visible={categoryMenu.visible}
        transparent
        animationType="fade"
        onRequestClose={closeCategoryMenu}
      >
        <TouchableOpacity
          style={styles.categoryMenuOverlay}
          activeOpacity={1}
          onPress={closeCategoryMenu}
        >
          <TouchableOpacity
            style={[
              styles.categoryMenuPanel,
              { left: categoryMenu.x, top: categoryMenu.y },
            ]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <TouchableOpacity
              style={styles.categoryMenuItem}
              activeOpacity={0.8}
              onPress={() => {
                closeCategoryMenu();
                openRenameModal(categoryMenu.categoryId, categoryMenu.categoryKey, categoryMenu.categoryLabel);
              }}
            >
              <Text style={styles.categoryMenuItemText}>Edit</Text>
            </TouchableOpacity>

            <View style={styles.categoryMenuDivider} />

            <TouchableOpacity
              style={styles.categoryMenuItem}
              activeOpacity={0.8}
              onPress={() => {
                if (categoryMenu.categoryKey) {
                  deleteCategoryAndTasks(categoryMenu.categoryKey);
                }
                closeCategoryMenu();
              }}
            >
              <Text style={[styles.categoryMenuItemText, styles.categoryMenuItemTextDanger]}>
                Delete
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={renameModal.visible}
        transparent
        animationType="slide"
        onRequestClose={closeRenameModal}
      >
        <TouchableOpacity
          style={styles.renameOverlay}
          activeOpacity={1}
          onPress={closeRenameModal}
        >
          <TouchableOpacity
            style={styles.renameSheet}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.renameTitle}>Rename category</Text>
            <TextInput
              style={styles.renameInput}
              placeholder="Category name"
              placeholderTextColor="#6B7280"
              value={renameModal.value}
              onChangeText={(text) =>
                setRenameModal((prev) => ({ ...prev, value: text }))
              }
              autoFocus
            />
            <View style={styles.renameActions}>
              <TouchableOpacity
                style={[styles.renameButton, styles.renameButtonSecondary]}
                activeOpacity={0.8}
                onPress={closeRenameModal}
              >
                <Text style={styles.renameButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.renameButton,
                  styles.renameButtonPrimary,
                  !renameModal.value.trim() && styles.renameButtonPrimaryDisabled,
                ]}
                activeOpacity={0.8}
                onPress={handleRenameSave}
                disabled={!renameModal.value.trim()}
              >
                <Text
                  style={[
                    styles.renameButtonPrimaryText,
                    !renameModal.value.trim() &&
                      styles.renameButtonPrimaryTextDisabled,
                  ]}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Add category slide-up panel (header 3-dots) */}
      <Modal
        visible={addCategoryPanelVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddCategoryPanelVisible(false)}
      >
        <TouchableOpacity
          style={styles.renameOverlay}
          activeOpacity={1}
          onPress={() => setAddCategoryPanelVisible(false)}
        >
          <TouchableOpacity
            style={styles.renameSheet}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.renameTitle}>Add category</Text>
            <TextInput
              style={styles.renameInput}
              placeholder="Category name"
              placeholderTextColor="#6B7280"
              value={addCategoryName}
              onChangeText={setAddCategoryName}
              autoFocus
            />
            <View style={styles.renameActions}>
              <TouchableOpacity
                style={[styles.renameButton, styles.renameButtonSecondary]}
                activeOpacity={0.8}
                onPress={() => {
                  setAddCategoryName('');
                  setAddCategoryPanelVisible(false);
                }}
              >
                <Text style={styles.renameButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.renameButton,
                  styles.renameButtonPrimary,
                  !addCategoryName.trim() && styles.renameButtonPrimaryDisabled,
                ]}
                activeOpacity={0.8}
                onPress={handleAddCategoryCreate}
                disabled={!addCategoryName.trim()}
              >
                <Text
                  style={[
                    styles.renameButtonPrimaryText,
                    !addCategoryName.trim() && styles.renameButtonPrimaryTextDisabled,
                  ]}
                >
                  Create
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  avatarButton: {
    paddingRight: 4,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#F9FAFB',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#F9FAFB',
  },
  headerDotsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#E5E7EB',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 140,
    paddingTop: 8,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  categoryCard: {
    flex: 1,
    minHeight: 130,
    borderRadius: 18,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#111827',
    paddingTop: 0,
    paddingBottom: 14,
    paddingHorizontal: 14,
    marginHorizontal: 4,
  },
  categoryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    marginBottom: 0,
  },
  categoryCardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  categoryDotsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -4,
  },
  categoryMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.25)',
  },
  categoryMenuPanel: {
    position: 'absolute',
    width: 168,
    borderRadius: 14,
    backgroundColor: '#0B1220',
    borderWidth: 1,
    borderColor: '#111827',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 18,
  },
  categoryMenuItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  categoryMenuItemText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#E5E7EB',
  },
  categoryMenuItemTextDanger: {
    color: '#F87171',
  },
  categoryMenuDivider: {
    height: 1,
    backgroundColor: '#111827',
  },
  renameOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'flex-end',
  },
  renameSheet: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
    backgroundColor: '#020617',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: '#111827',
  },
  renameTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#E5E7EB',
    marginBottom: 12,
  },
  renameInput: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1D4ED8',
    backgroundColor: '#020617',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: '#E5E7EB',
    marginBottom: 18,
  },
  renameActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  renameButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  renameButtonSecondary: {
    backgroundColor: 'transparent',
  },
  renameButtonSecondaryText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#9CA3AF',
  },
  renameButtonPrimary: {
    backgroundColor: '#2563EB',
  },
  renameButtonPrimaryDisabled: {
    backgroundColor: '#1F2937',
  },
  renameButtonPrimaryText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#F9FAFB',
  },
  renameButtonPrimaryTextDisabled: {
    color: '#6B7280',
  },
  categoryTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#F9FAFB',
    marginTop: -22,
    marginBottom: 4,
  },
  categorySubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
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

