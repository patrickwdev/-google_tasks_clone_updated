import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import {
  Home,
  LayoutGrid,
  CalendarDays,
  Settings,
  Plus,
  ChevronRight,
  ChevronLeft,
  User,
  Lock,
  Bell,
  Moon,
  Globe,
  HelpCircle,
  Shield,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTasks } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import AddTaskModal from '../components/AddTaskModal';
import { supabase } from '../lib/supabase';

const ICON_COLOR = '#60A5FA';
const LOGOUT_COLOR = '#FCA5A5';

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  showChevron = true,
  rightElement,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  rightElement?: React.ReactNode;
}) {
  const content = (
    <>
      <View style={styles.rowIcon}>{icon}</View>
      <Text style={styles.rowLabel}>{label}</Text>
      {value != null && <Text style={styles.rowValue}>{value}</Text>}
      {rightElement}
      {showChevron && <ChevronRight size={20} color="#6B7280" />}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }
  return <View style={styles.row}>{content}</View>;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { addTask } = useTasks();
  const { user, signOut, isLoading: authLoading } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled && !session) router.replace('/login');
    })();
    return () => { cancelled = true };
  }, [router]);

  const handleLogOut = async () => {
    await signOut();
    router.replace('/login');
  };

  if (authLoading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header: back + Settings title */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color="#E5E7EB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile block */}
        <View style={styles.profileBlock}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {user
                ? user.fullName
                    .trim()
                    .split(/\s+/)
                    .map((n) => n.charAt(0))
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || '?'
                : '?'}
            </Text>
          </View>
          <Text style={styles.profileName}>{user?.fullName ?? '...'}</Text>
          <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
        </View>

        {/* ACCOUNT */}
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.sectionCard}>
          <SettingsRow
            icon={<User size={20} color={ICON_COLOR} />}
            label="Personal Info"
            onPress={() => {}}
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            icon={<Lock size={20} color={ICON_COLOR} />}
            label="Security"
            onPress={() => {}}
          />
        </View>

        {/* PREFERENCES */}
        <Text style={styles.sectionTitle}>PREFERENCES</Text>
        <View style={styles.sectionCard}>
          <SettingsRow
            icon={<Bell size={20} color={ICON_COLOR} />}
            label="Notifications"
            onPress={() => {}}
          />
          <View style={styles.rowDivider} />
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Moon size={20} color={ICON_COLOR} />
            </View>
            <Text style={styles.rowLabel}>Dark Mode</Text>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#374151', true: '#2563EB' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.rowDivider} />
          <SettingsRow
            icon={<Globe size={20} color={ICON_COLOR} />}
            label="Language"
            value="English"
            onPress={() => {}}
          />
        </View>

        {/* SUPPORT */}
        <Text style={styles.sectionTitle}>SUPPORT</Text>
        <View style={styles.sectionCard}>
          <SettingsRow
            icon={<HelpCircle size={20} color={ICON_COLOR} />}
            label="Help Center"
            onPress={() => {}}
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            icon={<Shield size={20} color={ICON_COLOR} />}
            label="Privacy Policy"
            onPress={() => {}}
          />
        </View>

        {/* Log Out */}
        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.8}
          onPress={handleLogOut}
        >
          <ChevronRight size={18} color={LOGOUT_COLOR} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.versionText}>Version 2.4.0 (Build 402)</Text>
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
          <TouchableOpacity
            style={[styles.bottomNavItem, styles.bottomNavItemCalendar]}
            onPress={() => router.push('calendar')}
            activeOpacity={0.8}
          >
            <CalendarDays size={20} color="#6B7280" />
            <Text style={styles.bottomNavLabel}>Calendar</Text>
          </TouchableOpacity>
          <View style={styles.bottomNavItemActive}>
            <Settings size={20} color="#60A5FA" />
            <Text style={styles.bottomNavLabelActive}>Settings</Text>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#020617',
    borderBottomWidth: 1,
    borderBottomColor: '#111827',
  },
  backButton: {
    padding: 4,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#F9FAFB',
  },
  headerRight: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 200,
  },
  profileBlock: {
    alignItems: 'center',
    marginBottom: 28,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileAvatarText: {
    fontSize: 24,
    fontFamily: 'Inter_600SemiBold',
    color: '#F9FAFB',
  },
  profileName: {
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginLeft: 56,
  },
  rowIcon: {
    width: 28,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#F9FAFB',
  },
  rowValue: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
    marginRight: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7F1D1D',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#991B1B',
  },
  logoutText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: LOGOUT_COLOR,
  },
  versionText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#6B7280',
    textAlign: 'center',
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
