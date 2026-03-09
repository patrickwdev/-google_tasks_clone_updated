import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTasks } from '../../context/TaskContext';
import { useAuth } from '../../context/AuthContext';
import TaskItem from '../../components/TaskItem';

export default function CategoryTasksScreen() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { tasks, toggleTask, deleteTask, getCategoryLabel } = useTasks();

  const categoryKey = category ?? undefined;

  const tasksForCategory = useMemo(
    () =>
      categoryKey
        ? tasks.filter((t) => t.category === categoryKey)
        : [],
    [tasks, categoryKey],
  );

  if (authLoading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const title = categoryKey ? getCategoryLabel(categoryKey) : 'Category';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={22} color="#E5E7EB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerRight} />
      </View>

      {(!categoryKey || tasksForCategory.length === 0) ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No tasks here yet</Text>
          <Text style={styles.emptySubtitle}>
            Tasks assigned to this category will show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={tasksForCategory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TaskItem
              task={item}
              onToggle={toggleTask}
              onDelete={deleteTask}
              onPress={(t) => router.push(t.isCompleted ? `/task/completed/${t.id}` : `/task/${t.id}`)}
              onEdit={(t) => router.push(t.isCompleted ? `/task/completed/${t.id}` : `/task/${t.id}`)}
            />
          )}
        />
      )}
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
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#111827',
  },
  backButton: {
    padding: 8,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#F9FAFB',
  },
  headerRight: {
    width: 40,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#E5E7EB',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

