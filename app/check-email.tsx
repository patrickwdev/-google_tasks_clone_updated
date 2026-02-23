import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Mail, ChevronLeft } from 'lucide-react-native';

export default function CheckEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();

  const message = email
    ? `We sent a confirmation link to ${email}. Tap the link to verify your account, then you'll be signed in and taken to the home screen.`
    : "Check your email and confirm your account. Once you've tapped the link, you'll be signed in and taken to the home screen.";

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        onPress={() => router.replace('/login')}
        style={styles.backButton}
        activeOpacity={0.7}
      >
        <ChevronLeft size={24} color="#E5E7EB" />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <Mail size={48} color="#60A5FA" strokeWidth={2} />
        </View>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace('/login')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Back to Log In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 24,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#F9FAFB',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  primaryButton: {
    height: 52,
    minWidth: 200,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
});
