import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Clipboard,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Border} from '../constants/theme';
import {useAuthStore} from '../store/authStore';
import {supabase} from '../lib/supabase';

interface Member {
  id: string;
  display_name: string;
  email: string;
}

interface Props {
  onClose: () => void;
}

export default function ProfileScreen({onClose}: Props) {
  const {profile, fetchProfile, signOut} = useAuthStore();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  const [signingOut, setSigningOut] = useState(false);

  // Derive the 6-char invite code from household_id
  const inviteCode = profile?.household_id
    ? profile.household_id.replace(/-/g, '').slice(0, 6).toUpperCase()
    : null;

  const fetchMembers = useCallback(async () => {
    const householdId = profile?.household_id;
    if (!householdId) return;

    setMembersLoading(true);
    setMembersError(null);

    try {
      const {data, error} = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .eq('household_id', householdId);

      if (error) {
        setMembersError(error.message);
      } else {
        setMembers((data ?? []) as Member[]);
      }
    } catch (e) {
      setMembersError('Could not load household members.');
    } finally {
      setMembersLoading(false);
    }
  }, [profile?.household_id]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleSaveName = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      setSaveError('Display name cannot be empty.');
      return;
    }
    const userId = profile ? profile.id : null;
    if (!userId) {
      setSaveError('No authenticated user found.');
      return;
    }

    setSaveError(null);
    setSaveSuccess(false);
    setSavingName(true);

    try {
      const {error} = await supabase
        .from('profiles')
        .update({display_name: trimmed})
        .eq('id', userId);

      if (error) {
        setSaveError(error.message);
      } else {
        setSaveSuccess(true);
        await fetchProfile();
        // Clear success message after 2 seconds
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (e) {
      setSaveError('Failed to save display name. Please try again.');
    } finally {
      setSavingName(false);
    }
  };

  const handleCopyCode = () => {
    if (!inviteCode) return;
    try {
      Clipboard.setString(inviteCode);
      Alert.alert('Copied', `Invite code "${inviteCode}" copied to clipboard.`);
    } catch (e) {
      // Fallback if Clipboard isn't available
      Alert.alert('Invite Code', `Your invite code is: ${inviteCode}`);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              await signOut();
            } catch (e) {
              setSigningOut(false);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile & Household</Text>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.closeButton}>
          <Text style={styles.closeText}>Done</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Display name section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Display name</Text>
              <View style={styles.card}>
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={(text) => {
                    setDisplayName(text);
                    setSaveError(null);
                    setSaveSuccess(false);
                  }}
                  placeholder="Your name"
                  placeholderTextColor={Colors.textSecondary}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
              {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
              {saveSuccess ? <Text style={styles.successText}>Saved!</Text> : null}
              <TouchableOpacity
                style={[styles.button, savingName && styles.buttonDisabled]}
                onPress={handleSaveName}
                disabled={savingName}
                activeOpacity={0.8}>
                {savingName
                  ? <ActivityIndicator color={Colors.textPrimary} />
                  : <Text style={styles.buttonText}>Save name</Text>
                }
              </TouchableOpacity>
            </View>

            {/* Invite code section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Household invite code</Text>
              {inviteCode ? (
                <View style={styles.card}>
                  <View style={styles.inviteRow}>
                    <Text style={styles.inviteCode}>{inviteCode}</Text>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={handleCopyCode}
                      activeOpacity={0.7}>
                      <Text style={styles.copyButtonText}>Copy</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.inviteHint}>
                    Share this code with someone so they can join your household.
                  </Text>
                </View>
              ) : (
                <View style={styles.card}>
                  <Text style={styles.emptyText}>No household set up yet.</Text>
                </View>
              )}
            </View>

            {/* Household members header */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Household members</Text>
              {membersLoading && <ActivityIndicator color={Colors.blue} size="small" />}
            </View>
            {membersError ? <Text style={styles.errorText}>{membersError}</Text> : null}

            {!membersLoading && members.length === 0 && !membersError ? (
              <View style={styles.card}>
                <Text style={styles.emptyText}>No members found.</Text>
              </View>
            ) : null}
          </>
        }
        renderItem={({item, index}) => (
          <View
            style={[
              styles.memberRow,
              index === 0 && styles.memberRowFirst,
              index === members.length - 1 && styles.memberRowLast,
            ]}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText}>
                {item.display_name ? item.display_name[0].toUpperCase() : '?'}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>
                {item.display_name}
                {profile && item.id === profile.id ? '  (you)' : ''}
              </Text>
              <Text style={styles.memberEmail}>{item.email}</Text>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={
          <View style={styles.footerSection}>
            <TouchableOpacity
              style={[styles.signOutButton, signingOut && styles.buttonDisabled]}
              onPress={handleSignOut}
              disabled={signingOut}
              activeOpacity={0.8}>
              {signingOut
                ? <ActivityIndicator color={Colors.red} />
                : <Text style={styles.signOutText}>Sign out</Text>
              }
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: Border.width,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.medium,
  },
  closeButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  closeText: {
    color: Colors.blue,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.xl,
    paddingTop: Spacing.xl,
  },

  // Section
  section: {
    gap: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },

  // Input
  input: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
  },

  // Invite code
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  inviteCode: {
    color: Colors.textPrimary,
    fontSize: 32,
    fontWeight: Typography.weights.medium,
    letterSpacing: 6,
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    lineHeight: 16,
  },

  // Members
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  memberRowFirst: {
    borderTopLeftRadius: Radius.md,
    borderTopRightRadius: Radius.md,
  },
  memberRowLast: {
    borderBottomLeftRadius: Radius.md,
    borderBottomRightRadius: Radius.md,
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
    fontSize: Typography.sizes.md,
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
  separator: {
    height: Border.width,
    backgroundColor: Colors.border,
    marginHorizontal: 0,
  },

  // Buttons
  button: {
    backgroundColor: Colors.blue,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },

  // Sign out
  footerSection: {
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  signOutButton: {
    borderWidth: Border.width,
    borderColor: Colors.red,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  signOutText: {
    color: Colors.red,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },

  // Misc
  emptyText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    padding: Spacing.md,
    textAlign: 'center',
  },
  errorText: {
    color: Colors.red,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
  successText: {
    color: Colors.green,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
});
