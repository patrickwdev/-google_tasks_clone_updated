import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {
  Home,
  LayoutGrid,
  CalendarDays,
  Settings,
  Search,
  Plus,
  User,
  ShoppingBag,
  Dumbbell,
  BookOpen,
  Briefcase,
  House,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTasks } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import AddTaskModal from '../components/AddTaskModal';
import { supabase } from '../lib/supabase';

type CategoryCard = {
  id: string;
  label: string;
  pending: number;
  icon: React.ReactNode;
  accentColor: string;
  accentBg: string;
};

const CATEGORIES: Omit<CategoryCard, 'icon'>[] = [
  { id: 'work', label: 'Work', pending: 12, accentColor: '#60A5FA', accentBg: '#1D4ED8' },
  { id: 'personal', label: 'Personal', pending: 5, accentColor: '#A855F7', accentBg: '#5B21B6' },
  { id: 'shopping', label: 'Shopping', pending: 3, accentColor: '#FBBF24', accentBg: '#92400E' },
  { id: 'fitness', label: 'Fitness', pending: 2, accentColor: '#34D399', accentBg: '#065F46' },
  { id: 'study', label: 'Study', pending: 8, accentColor: '#F97316', accentBg: '#9A3412' },
  { id: 'home', label: 'Home', pending: 4, accentColor: '#38BDF8', accentBg: '#0E7490' },
];

export default function CategoriesScreen() {
  const router = useRouter();
  const { addTask } = useTasks();
  const { user, isLoading: authLoading } = useAuth();
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

  if (authLoading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const renderCategory = ({ item }: { item: Omit<CategoryCard, 'icon'> }) => {
    const renderIcon = () => {
      switch (item.id) {
        case 'work':
          return <Briefcase size={18} color="#F9FAFB" />;
        case 'personal':
          return <User size={18} color="#F9FAFB" />;
        case 'shopping':
          return <ShoppingBag size={18} color="#F9FAFB" />;
        case 'fitness':
          return <Dumbbell size={18} color="#F9FAFB" />;
        case 'study':
          return <BookOpen size={18} color="#F9FAFB" />;
        case 'home':
        default:
          return <House size={18} color="#F9FAFB" />;
      }
    };

    return (
      <TouchableOpacity style={styles.categoryCard} activeOpacity={0.85}>
        <View
          style={[
            styles.categoryIconWrapper,
            { backgroundColor: item.accentBg },
          ]}
        >
          {renderIcon()}
        </View>
        <Text style={styles.categoryTitle}>{item.label}</Text>
        <Text style={styles.categorySubtitle}>
          {item.pending} pending
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
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
            style={styles.headerIconButton}
          >
            <Plus size={20} color="#E5E7EB" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Search size={18} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your life areas..."
            placeholderTextColor="#6B7280"
          />
        </View>
      </View>

      {/* Category grid */}
      <FlatList
        data={CATEGORIES}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={renderCategory}
        ListFooterComponent={
          <View style={styles.focusCard}>
            <Text style={styles.focusTitle}>Focus Mode</Text>
            <Text style={styles.focusSubtitle}>Keep your tasks organized</Text>
          </View>
        }
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
  headerIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1D4ED8',
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
    padding: 14,
    marginHorizontal: 4,
  },
  categoryIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  categorySubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
  },
  focusCard: {
    marginTop: 6,
    marginHorizontal: 4,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 18,
    backgroundColor: '#1D2448',
  },
  focusTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#E5E7EB',
    marginBottom: 4,
  },
  focusSubtitle: {
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

