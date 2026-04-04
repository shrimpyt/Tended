import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {Colors, Typography, Spacing, Radius, Border, Shadows} from '../constants/theme';

const FEATURES = [
  {icon: '▤', title: 'Track your inventory', desc: 'Know exactly what you have at home — and get alerts before you run out.'},
  {icon: '$', title: 'Stay on budget', desc: 'Log grocery spending by category and see week-over-week trends.'},
  {icon: '⊡', title: 'Discover meals', desc: 'Get AI-powered meal suggestions based on what\'s already in your pantry.'},
  {icon: '↔', title: 'Stay in sync', desc: 'Share one household with your partner — real-time updates for both of you.'},
];

export default function LandingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.appName}>Tended</Text>
          <Text style={styles.tagline}>Your home, tended to.</Text>
          <Text style={styles.subTagline}>
            Household inventory, spending, and meal planning — for two.
          </Text>
        </View>

        {/* Feature list */}
        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>{f.icon}</Text>
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Beta badge */}
        <View style={styles.betaBadge}>
          <Text style={styles.betaText}>Limited Beta · Free to join</Text>
        </View>

        {/* CTAs */}
        <View style={styles.ctas}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/sign-up')}
            activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>Get started for free</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/sign-in')}
            activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>
              Already have an account?{' '}
              <Text style={styles.secondaryButtonAccent}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.xxl,
  },

  // Hero
  hero: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  appName: {
    color: Colors.textPrimary,
    fontSize: 52,
    fontWeight: Typography.weights.bold,
    letterSpacing: -2,
  },
  tagline: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.medium,
  },
  subTagline: {
    color: Colors.textTertiary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing.xs,
  },

  // Features
  features: {
    gap: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureIconText: {
    fontSize: Typography.sizes.md,
    color: Colors.blue,
  },
  featureText: {
    flex: 1,
    gap: 4,
  },
  featureTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  featureDesc: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
    lineHeight: 18,
  },

  // Beta badge
  betaBadge: {
    alignSelf: 'center',
    borderWidth: Border.width,
    borderColor: Colors.green,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  betaText: {
    color: Colors.green,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    letterSpacing: 0.5,
  },

  // CTAs
  ctas: {
    gap: Spacing.md,
  },
  primaryButton: {
    backgroundColor: Colors.blue,
    borderRadius: Radius.full,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    ...Shadows.glow,
  },
  primaryButtonText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.3,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  secondaryButtonText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
  secondaryButtonAccent: {
    color: Colors.blue,
    fontWeight: Typography.weights.medium,
  },
});
