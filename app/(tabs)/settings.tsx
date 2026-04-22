import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Typography, Spacing, Radius } from '../../constants/theme';
import { useTheme, ThemePreference } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ title, colors }: { title: string; colors: any }) {
  return (
    <Text
      style={{
        color: colors.textMuted,
        fontSize: Typography.sizes.xs,
        fontWeight: Typography.weights.semiBold,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        paddingHorizontal: Spacing.md,
        marginTop: Spacing.xs,
        marginBottom: Spacing.xs,
      }}
    >
      {title}
    </Text>
  );
}

function SettingsRow({
  label,
  sublabel,
  right,
  onPress,
  colors,
  danger,
}: {
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  colors: any;
  danger?: boolean;
}) {
  const Row = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        gap: Spacing.md,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: danger ? colors.danger : colors.textPrimary,
            fontSize: Typography.sizes.sm,
            fontWeight: Typography.weights.medium,
          }}
        >
          {label}
        </Text>
        {sublabel ? (
          <Text
            style={{
              color: colors.textMuted,
              fontSize: Typography.sizes.xs,
              marginTop: 2,
            }}
          >
            {sublabel}
          </Text>
        ) : null}
      </View>
      {right ?? (
        onPress ? (
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>›</Text>
        ) : null
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {Row}
      </TouchableOpacity>
    );
  }
  return Row;
}

function SettingsCard({ children, colors }: { children: React.ReactNode; colors: any }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );
}

function Separator({ colors }: { colors: any }) {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: colors.border,
        marginHorizontal: Spacing.md,
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Theme Picker
// ─────────────────────────────────────────────────────────────────────────────

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'light',  label: 'Light'  },
  { value: 'dark',   label: 'Dark'   },
  { value: 'system', label: 'System' },
];

function ThemePicker({ colors, theme, setTheme }: { colors: any; theme: ThemePreference; setTheme: (t: ThemePreference) => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surfaceAlt,
        borderRadius: Radius.sm,
        padding: 3,
        margin: Spacing.md,
        marginTop: 4,
      }}
    >
      {THEME_OPTIONS.map(opt => (
        <TouchableOpacity
          key={opt.value}
          onPress={() => setTheme(opt.value)}
          activeOpacity={0.7}
          style={{
            flex: 1,
            paddingVertical: 7,
            borderRadius: Radius.xs,
            backgroundColor: theme === opt.value ? colors.surface : 'transparent',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: theme === opt.value ? colors.accent : colors.textSecondary,
              fontSize: Typography.sizes.xs,
              fontWeight: theme === opt.value ? Typography.weights.semiBold : Typography.weights.regular,
            }}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { colors: C, theme, setTheme } = useTheme();
  const { profile } = useAuthStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const displayName = profile?.display_name ?? 'Member';
  const email = profile?.email ?? '';
  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // household name not stored in profile — would need a separate query
  const householdName = profile?.household_id ? 'My Household' : '—';

  const handleSignOut = async () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Not yet available', 'Contact support to delete your account.');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
          gap: Spacing.xs,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Header ──────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md }}>
          <Text
            style={{
              color: C.textPrimary,
              fontSize: Typography.sizes.xl,
              fontWeight: Typography.weights.bold,
              letterSpacing: -0.3,
            }}
          >
            Settings
          </Text>
        </View>

        {/* ─── Profile Card ────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: Spacing.lg }}>
          <SettingsCard colors={C}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: Spacing.md,
                gap: Spacing.md,
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: C.accentBg,
                  borderWidth: 2,
                  borderColor: C.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: C.accent,
                    fontSize: Typography.sizes.lg,
                    fontWeight: Typography.weights.bold,
                  }}
                >
                  {initials}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: C.textPrimary,
                    fontSize: Typography.sizes.md,
                    fontWeight: Typography.weights.semiBold,
                  }}
                >
                  {displayName}
                </Text>
                <Text style={{ color: C.textMuted, fontSize: Typography.sizes.xs, marginTop: 2 }}>
                  {email}
                </Text>
                {profile?.role && (
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      marginTop: 4,
                      backgroundColor: C.accentBg,
                      borderRadius: Radius.full,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                    }}
                  >
                    <Text
                      style={{
                        color: C.accent,
                        fontSize: 10,
                        fontWeight: Typography.weights.medium,
                      }}
                    >
                      {profile.role === 'admin' ? 'Admin' : 'Member'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </SettingsCard>
        </View>

        {/* ─── Appearance ──────────────────────────────────────────── */}
        <SectionHeader title="Appearance" colors={C} />
        <View style={{ paddingHorizontal: Spacing.lg }}>
          <SettingsCard colors={C}>
            <SettingsRow label="Theme" colors={C} />
            <ThemePicker colors={C} theme={theme} setTheme={setTheme} />
          </SettingsCard>
        </View>

        {/* ─── Household ───────────────────────────────────────────── */}
        <SectionHeader title="Household" colors={C} />
        <View style={{ paddingHorizontal: Spacing.lg }}>
          <SettingsCard colors={C}>
            <SettingsRow
              label="Household name"
              sublabel={householdName}
              colors={C}
              onPress={() => {}}
            />
            <Separator colors={C} />
            <SettingsRow
              label="Invite member"
              colors={C}
              onPress={() => router.push('/invite' as any)}
            />
            <Separator colors={C} />
            <SettingsRow
              label="Manage members"
              colors={C}
              onPress={() => router.push('/manage-members' as any)}
            />
          </SettingsCard>
        </View>

        {/* ─── Notifications ───────────────────────────────────────── */}
        <SectionHeader title="Notifications" colors={C} />
        <View style={{ paddingHorizontal: Spacing.lg }}>
          <SettingsCard colors={C}>
            <SettingsRow
              label="Push notifications"
              sublabel="Low stock & expiry alerts"
              colors={C}
              right={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: C.surfaceAlt, true: C.accent }}
                  thumbColor={notificationsEnabled ? '#fff' : C.textMuted}
                />
              }
            />
          </SettingsCard>
        </View>

        {/* ─── Account ─────────────────────────────────────────────── */}
        <SectionHeader title="Account" colors={C} />
        <View style={{ paddingHorizontal: Spacing.lg }}>
          <SettingsCard colors={C}>
            <SettingsRow
              label="Sign out"
              colors={C}
              onPress={handleSignOut}
            />
            <Separator colors={C} />
            <SettingsRow
              label="Delete account"
              colors={C}
              danger
              onPress={handleDeleteAccount}
            />
          </SettingsCard>
        </View>

        {/* ─── Footer ──────────────────────────────────────────────── */}
        <View style={{ alignItems: 'center', paddingVertical: Spacing.xl }}>
          <Text style={{ color: C.textMuted, fontSize: Typography.sizes.xs }}>
            Tended · v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
