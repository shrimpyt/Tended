import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Clipboard,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {Colors, Typography, Spacing, Radius, Border} from '../constants/theme';
import {useAuthStore, ProfileRole} from '../store/authStore';
import {supabase} from '../lib/supabase';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DIETARY_OPTIONS = [
  'Vegan',
  'Vegetarian',
  'Gluten-free',
  'Dairy-free',
  'Nut-free',
  'Halal',
  'Kosher',
  'Low-sodium',
];

const ITEM_CATEGORIES = ['Kitchen', 'Cleaning', 'Pantry', 'Bathroom'];

const ROLE_LABELS: Record<ProfileRole, string> = {
  creator: 'Creator',
  admin: 'Admin',
  member: 'Member',
  restricted: 'Restricted',
};

const ROLE_COLORS: Record<ProfileRole, string> = {
  creator: Colors.blue,
  admin: Colors.green,
  member: Colors.textSecondary,
  restricted: Colors.amber,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HouseholdMember {
  id: string;
  display_name: string;
  email: string;
  role: ProfileRole;
  restricted_categories: string[] | null;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({title}: {title: string}) {
  return <Text style={sStyles.sectionHeader}>{title}</Text>;
}

function RowSeparator() {
  return <View style={sStyles.separator} />;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SettingsScreen() {
  const router = useRouter();
  const {profile, fetchProfile, signOut} = useAuthStore();

  // --- Profile ---
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);
  const nameSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Dietary ---
  const [dietary, setDietary] = useState<string[]>(profile?.dietary_restrictions ?? []);
  const [savingDietary, setSavingDietary] = useState(false);

  // --- Security ---
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const passwordSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Household ---
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  // --- Sign out ---
  const [signingOut, setSigningOut] = useState(false);

  const inviteCode = profile?.household_id
    ? profile.household_id.replace(/-/g, '').slice(0, 6).toUpperCase()
    : null;

  const isAdmin = profile?.role === 'creator' || profile?.role === 'admin';

  useEffect(() => {
    return () => {
      if (nameSuccessTimer.current) clearTimeout(nameSuccessTimer.current);
      if (passwordSuccessTimer.current) clearTimeout(passwordSuccessTimer.current);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Household members fetch
  // ---------------------------------------------------------------------------

  const fetchMembers = useCallback(async () => {
    const hid = profile?.household_id;
    if (!hid || !isAdmin) return;
    setMembersLoading(true);
    try {
      const {data, error} = await supabase
        .from('profiles')
        .select('id, display_name, email, role, restricted_categories')
        .eq('household_id', hid);
      if (!error && data) setMembers(data as HouseholdMember[]);
    } finally {
      setMembersLoading(false);
    }
  }, [profile?.household_id, isAdmin]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // ---------------------------------------------------------------------------
  // Profile handlers
  // ---------------------------------------------------------------------------

  const handleSaveName = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) {setNameError('Name cannot be empty.'); return;}
    if (!profile) return;
    setNameError(null);
    setNameSuccess(false);
    setSavingName(true);
    const {error} = await supabase
      .from('profiles')
      .update({display_name: trimmed})
      .eq('id', profile.id);
    setSavingName(false);
    if (error) {
      setNameError(error.message);
    } else {
      setNameSuccess(true);
      await fetchProfile();
      nameSuccessTimer.current = setTimeout(() => setNameSuccess(false), 2000);
    }
  };

  const toggleDietary = (option: string) => {
    setDietary(prev =>
      prev.includes(option) ? prev.filter(d => d !== option) : [...prev, option],
    );
  };

  const handleSaveDietary = async () => {
    if (!profile) return;
    setSavingDietary(true);
    await supabase
      .from('profiles')
      .update({dietary_restrictions: dietary})
      .eq('id', profile.id);
    setSavingDietary(false);
    await fetchProfile();
  };

  // ---------------------------------------------------------------------------
  // Security handlers
  // ---------------------------------------------------------------------------

  const handleChangePassword = async () => {
    if (!newPassword) {setPasswordError('Enter a new password.'); return;}
    if (newPassword.length < 6) {setPasswordError('Password must be at least 6 characters.'); return;}
    if (newPassword !== confirmPassword) {setPasswordError('Passwords do not match.'); return;}
    setPasswordError(null);
    setPasswordSuccess(false);
    setSavingPassword(true);
    const {error} = await supabase.auth.updateUser({password: newPassword});
    setSavingPassword(false);
    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      passwordSuccessTimer.current = setTimeout(() => setPasswordSuccess(false), 3000);
    }
  };

  // ---------------------------------------------------------------------------
  // Household / RBAC handlers
  // ---------------------------------------------------------------------------

  const handleCopyCode = () => {
    if (!inviteCode) return;
    try {
      Clipboard.setString(inviteCode);
      Alert.alert('Copied', `Invite code "${inviteCode}" copied to clipboard.`);
    } catch {
      Alert.alert('Invite Code', `Your invite code is: ${inviteCode}`);
    }
  };

  const handleChangeRole = (member: HouseholdMember) => {
    if (member.id === profile?.id) {
      Alert.alert('Cannot change', 'You cannot change your own role.');
      return;
    }
    const availableRoles: ProfileRole[] =
      profile?.role === 'creator'
        ? ['admin', 'member', 'restricted']
        : ['member', 'restricted'];

    Alert.alert(
      `Change role for ${member.display_name || member.email}`,
      `Current role: ${ROLE_LABELS[member.role]}`,
      [
        ...availableRoles.map(role => ({
          text: ROLE_LABELS[role],
          onPress: () => applyRoleChange(member.id, role),
        })),
        {text: 'Cancel', style: 'cancel'},
      ],
    );
  };

  const applyRoleChange = async (memberId: string, newRole: ProfileRole) => {
    setUpdatingRole(memberId);
    const update: Record<string, unknown> = {role: newRole};
    // Clear restricted_categories when un-restricting
    if (newRole !== 'restricted') update.restricted_categories = null;
    const {error} = await supabase
      .from('profiles')
      .update(update)
      .eq('id', memberId);
    setUpdatingRole(null);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      await fetchMembers();
    }
  };

  const toggleMemberCategory = async (member: HouseholdMember, category: string) => {
    const current = member.restricted_categories ?? [];
    const updated = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];
    setUpdatingRole(member.id);
    await supabase
      .from('profiles')
      .update({restricted_categories: updated.length > 0 ? updated : null})
      .eq('id', member.id);
    setUpdatingRole(null);
    await fetchMembers();
  };

  // ---------------------------------------------------------------------------
  // Sign out
  // ---------------------------------------------------------------------------

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
          } catch {
            setSigningOut(false);
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          }
        },
      },
    ]);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ----------------------------------------------------------------- */}
        {/* PROFILE */}
        {/* ----------------------------------------------------------------- */}
        <SectionHeader title="Profile" />

        <View style={styles.card}>
          {/* Display name */}
          <View style={styles.cardRow}>
            <Text style={styles.rowLabel}>Display name</Text>
            <TextInput
              style={styles.inlineInput}
              value={displayName}
              onChangeText={t => {setDisplayName(t); setNameError(null); setNameSuccess(false);}}
              placeholder="Your name"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>
          {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
          {nameSuccess ? <Text style={styles.successText}>Saved!</Text> : null}
          <TouchableOpacity
            style={[styles.cardActionButton, savingName && styles.disabled]}
            onPress={handleSaveName}
            disabled={savingName}
            activeOpacity={0.8}>
            {savingName
              ? <ActivityIndicator color={Colors.blue} size="small" />
              : <Text style={styles.cardActionText}>Save name</Text>}
          </TouchableOpacity>

          <RowSeparator />

          {/* Email (read-only) */}
          <View style={styles.cardRow}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue}>{profile?.email}</Text>
          </View>
        </View>

        {/* Dietary preferences */}
        <View style={styles.card}>
          <Text style={styles.cardSectionLabel}>Dietary preferences</Text>
          <View style={styles.chipRow}>
            {DIETARY_OPTIONS.map(option => {
              const active = dietary.includes(option);
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleDietary(option)}
                  activeOpacity={0.7}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.cardActionButton, savingDietary && styles.disabled]}
            onPress={handleSaveDietary}
            disabled={savingDietary}
            activeOpacity={0.8}>
            {savingDietary
              ? <ActivityIndicator color={Colors.blue} size="small" />
              : <Text style={styles.cardActionText}>Save preferences</Text>}
          </TouchableOpacity>
        </View>

        {/* ----------------------------------------------------------------- */}
        {/* SECURITY */}
        {/* ----------------------------------------------------------------- */}
        <SectionHeader title="Security" />

        <View style={styles.card}>
          <Text style={styles.cardSectionLabel}>Change password</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="New password"
            placeholderTextColor={Colors.textSecondary}
            value={newPassword}
            onChangeText={t => {setNewPassword(t); setPasswordError(null); setPasswordSuccess(false);}}
            secureTextEntry
            autoComplete="new-password"
          />
          <TextInput
            style={[styles.fieldInput, {marginTop: Spacing.sm}]}
            placeholder="Confirm new password"
            placeholderTextColor={Colors.textSecondary}
            value={confirmPassword}
            onChangeText={t => {setConfirmPassword(t); setPasswordError(null);}}
            secureTextEntry
          />
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          {passwordSuccess ? <Text style={styles.successText}>Password updated!</Text> : null}
          <TouchableOpacity
            style={[styles.cardActionButton, savingPassword && styles.disabled]}
            onPress={handleChangePassword}
            disabled={savingPassword}
            activeOpacity={0.8}>
            {savingPassword
              ? <ActivityIndicator color={Colors.blue} size="small" />
              : <Text style={styles.cardActionText}>Update password</Text>}
          </TouchableOpacity>
        </View>

        {/* ----------------------------------------------------------------- */}
        {/* HOUSEHOLD */}
        {/* ----------------------------------------------------------------- */}
        <SectionHeader title="Household" />

        {/* Invite code */}
        {inviteCode ? (
          <View style={styles.card}>
            <View style={styles.inviteRow}>
              <View>
                <Text style={styles.cardSectionLabel}>Invite code</Text>
                <Text style={styles.inviteCode}>{inviteCode}</Text>
              </View>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={handleCopyCode}
                activeOpacity={0.7}>
                <Text style={styles.copyButtonText}>Copy</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.inviteHint}>
              Share this code with a household member to let them join.
            </Text>
          </View>
        ) : null}

        {/* Members (admin/creator only) */}
        {isAdmin ? (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardSectionLabel}>Members</Text>
              {membersLoading && <ActivityIndicator color={Colors.blue} size="small" />}
            </View>

            {members.map((member, idx) => {
              const isMe = member.id === profile?.id;
              const isExpanded = expandedMember === member.id;
              const isUpdating = updatingRole === member.id;

              return (
                <View key={member.id}>
                  {idx > 0 && <RowSeparator />}

                  {/* Member row */}
                  <TouchableOpacity
                    style={styles.memberRow}
                    onPress={() => !isMe && setExpandedMember(isExpanded ? null : member.id)}
                    activeOpacity={isMe ? 1 : 0.7}
                    disabled={isMe}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {(member.display_name || member.email)[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>
                        {member.display_name || member.email}
                        {isMe ? '  (you)' : ''}
                      </Text>
                      <Text style={styles.memberEmail}>{member.email}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.roleBadge, {borderColor: ROLE_COLORS[member.role]}]}
                      onPress={() => !isMe && handleChangeRole(member)}
                      activeOpacity={isMe ? 1 : 0.7}
                      disabled={isMe}>
                      {isUpdating
                        ? <ActivityIndicator color={ROLE_COLORS[member.role]} size="small" />
                        : <Text style={[styles.roleBadgeText, {color: ROLE_COLORS[member.role]}]}>
                            {ROLE_LABELS[member.role]}
                          </Text>
                      }
                    </TouchableOpacity>
                  </TouchableOpacity>

                  {/* Expanded: category restrictions for restricted members */}
                  {isExpanded && member.role === 'restricted' && (
                    <View style={styles.categoryExpanded}>
                      <Text style={styles.categoryLabel}>
                        Allowed inventory categories
                        {!member.restricted_categories || member.restricted_categories.length === 0
                          ? '  (all)' : ''}
                      </Text>
                      <View style={styles.chipRow}>
                        {ITEM_CATEGORIES.map(cat => {
                          const allowed = !member.restricted_categories ||
                            member.restricted_categories.length === 0 ||
                            member.restricted_categories.includes(cat);
                          return (
                            <TouchableOpacity
                              key={cat}
                              style={[styles.chip, allowed && styles.chipActive]}
                              onPress={() => toggleMemberCategory(member, cat)}
                              activeOpacity={0.7}
                              disabled={isUpdating}>
                              <Text style={[styles.chipText, allowed && styles.chipTextActive]}>
                                {cat}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      <Text style={styles.categoryHint}>
                        Tap a category to toggle access. Empty selection means unrestricted.
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : null}

        {/* ----------------------------------------------------------------- */}
        {/* SIGN OUT */}
        {/* ----------------------------------------------------------------- */}
        <TouchableOpacity
          style={[styles.signOutButton, signingOut && styles.disabled]}
          onPress={handleSignOut}
          disabled={signingOut}
          activeOpacity={0.8}>
          {signingOut
            ? <ActivityIndicator color={Colors.red} />
            : <Text style={styles.signOutText}>Sign out</Text>}
        </TouchableOpacity>

        <View style={{height: Spacing.xxl}} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const sStyles = StyleSheet.create({
  sectionHeader: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  separator: {
    height: Border.width,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: Border.width,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 80,
    paddingVertical: Spacing.xs,
  },
  backText: {
    color: Colors.blue,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.medium,
  },

  // Scroll
  scroll: {flex: 1},
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    gap: Spacing.md,
  },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
    paddingVertical: Spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardSectionLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  rowLabel: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    minWidth: 80,
  },
  rowValue: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    flex: 1,
    textAlign: 'right',
  },
  inlineInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    textAlign: 'right',
  },
  fieldInput: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.md,
  },
  cardActionButton: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: Border.width,
    borderColor: Colors.blue,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  cardActionText: {
    color: Colors.blue,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  chip: {
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  chipActive: {
    borderColor: Colors.blue,
    backgroundColor: Colors.blueHighlight,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  chipTextActive: {
    color: Colors.blue,
  },

  // Invite code
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  inviteCode: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: Typography.weights.medium,
    letterSpacing: 6,
    marginTop: Spacing.xs,
  },
  copyButton: {
    borderWidth: Border.width,
    borderColor: Colors.blue,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  copyButtonText: {
    color: Colors.blue,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  inviteHint: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    lineHeight: 16,
  },

  // Members
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  memberEmail: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
  },
  roleBadge: {
    borderWidth: Border.width,
    borderRadius: Radius.sm,
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
    minWidth: 70,
    alignItems: 'center',
  },
  roleBadgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },

  // Category expansion
  categoryExpanded: {
    backgroundColor: Colors.surfaceElevated,
    borderTopWidth: Border.width,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  categoryLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.md,
  },
  categoryHint: {
    color: Colors.textTertiary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
    paddingHorizontal: Spacing.md,
    lineHeight: 16,
  },

  // Feedback
  errorText: {
    color: Colors.red,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xs,
  },
  successText: {
    color: Colors.green,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.regular,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xs,
  },
  disabled: {
    opacity: 0.5,
  },

  // Sign out
  signOutButton: {
    borderWidth: Border.width,
    borderColor: Colors.red,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  signOutText: {
    color: Colors.red,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
});
