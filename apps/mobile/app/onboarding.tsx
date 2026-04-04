import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Border, Shadows} from '../constants/theme';
import {useAuthStore} from '../store/authStore';
import {supabase} from '../lib/supabase';

const STEPS = [
  {
    icon: '▤',
    title: 'Track your inventory',
    body: 'Add household items to Tended — from cleaning supplies to pantry staples. Set stock levels and get alerts when you\'re running low so you never run out.',
    hint: 'Tip: Use the camera to scan barcodes or snap a photo for instant item recognition.',
  },
  {
    icon: '$',
    title: 'Watch your spending',
    body: 'Log grocery trips and track spending by category. Tended shows you week-over-week trends and flags waste so you can spend smarter.',
    hint: 'Tip: Import a receipt photo to log multiple items at once.',
  },
  {
    icon: '↔',
    title: 'Share with your household',
    body: 'Invite your partner using your 6-character household code. Every change — inventory, shopping list, spending — syncs in real time for both of you.',
    hint: 'Tip: Find your invite code any time in Settings.',
  },
];

export default function OnboardingScreen() {
  const {profile, fetchProfile} = useAuthStore();
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const handleNext = () => {
    if (!isLast) {
      setStep(s => s + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    if (!profile) return;
    setFinishing(true);
    await supabase
      .from('profiles')
      .update({has_onboarded: true})
      .eq('id', profile.id);
    await fetchProfile();
    // _layout.tsx will detect has_onboarded = true and redirect to /(tabs)
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.inner}>

        {/* Progress dots */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === step && styles.dotActive]}
            />
          ))}
        </View>

        {/* Step content */}
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>{current.icon}</Text>
          </View>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.body}>{current.body}</Text>
          <View style={styles.hintBox}>
            <Text style={styles.hintText}>{current.hint}</Text>
          </View>
        </View>

        {/* Navigation */}
        <View style={styles.nav}>
          {step > 0 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setStep(s => s - 1)}
              activeOpacity={0.7}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextButton, step === 0 && styles.nextButtonFull, finishing && styles.buttonDisabled]}
            onPress={handleNext}
            disabled={finishing}
            activeOpacity={0.85}>
            {finishing
              ? <ActivityIndicator color={Colors.textPrimary} />
              : <Text style={styles.nextText}>{isLast ? 'Get started' : 'Next'}</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Step counter */}
        <Text style={styles.stepCounter}>{step + 1} of {STEPS.length}</Text>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
    justifyContent: 'space-between',
  },

  // Progress dots
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.blue,
    width: 24,
  },

  // Card
  card: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glow,
  },
  iconText: {
    fontSize: 32,
    color: Colors.blue,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  body: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
    textAlign: 'center',
    lineHeight: 24,
  },
  hintBox: {
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    width: '100%',
  },
  hintText: {
    color: Colors.textTertiary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    lineHeight: 20,
    textAlign: 'center',
  },

  // Navigation
  nav: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  backButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  backText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  nextButton: {
    flex: 2,
    backgroundColor: Colors.blue,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    ...Shadows.glow,
  },
  nextButtonFull: {
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  nextText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },

  // Counter
  stepCounter: {
    color: Colors.textTertiary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
