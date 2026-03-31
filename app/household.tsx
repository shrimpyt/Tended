import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';
import {supabase} from '../lib/supabase';
import {useAuthStore} from '../store/authStore';
import {Colors, Typography, Spacing, Radius, Border} from '../constants/theme';

type Mode = 'choose' | 'create' | 'join';

export default function HouseholdScreen() {
  const {user, fetchProfile} = useAuthStore();
  const [mode, setMode] = useState<Mode>('choose');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview state for join — show the matched household name before confirming
  const [previewHousehold, setPreviewHousehold] = useState<{id: string; name: string} | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const handleCreate = async () => {
    if (!householdName.trim()) {
      setError('Please enter a household name.');
      return;
    }
    setError(null);
    setLoading(true);

    // Generate UUID client-side so we don't need to read it back (avoids RLS chicken-and-egg)
    const householdId = Crypto.randomUUID();

    const {error: createError} = await supabase
      .from('households')
      .insert({id: householdId, name: householdName.trim()});

    if (createError) {
      setError(createError.message);
      setLoading(false);
      return;
    }

    const userId = user ? user.id : null;
    if (!userId) {
      setError('No authenticated user found.');
      setLoading(false);
      return;
    }

    const {error: updateError} = await supabase
      .from('profiles')
      .update({household_id: householdId})
      .eq('id', userId);

    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    await fetchProfile();
  };

  // First step: look up household by 6-char code prefix
  const handleLookup = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (code.length !== 6) {
      setError('Invite code must be exactly 6 characters.');
      return;
    }
    setError(null);
    setLookupLoading(true);
    setPreviewHousehold(null);

    try {
      const {data, error: fetchError} = await supabase
        .from('households')
        .select('id, name')
        .ilike('id', code + '%')
        .limit(1)
        .single();

      if (fetchError || !data) {
        setError('No household found with that code. Double-check and try again.');
      } else {
        setPreviewHousehold({id: data.id, name: data.name});
      }
    } catch (e) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLookupLoading(false);
    }
  };

  // Second step: confirm and join the previewed household
  const handleConfirmJoin = async () => {
    if (!previewHousehold) return;
    setError(null);
    setLoading(true);

    const userId = user ? user.id : null;
    if (!userId) {
      setError('No authenticated user found.');
      setLoading(false);
      return;
    }

    try {
      const {error: updateError} = await supabase
        .from('profiles')
        .update({household_id: previewHousehold.id})
        .eq('id', userId);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      await fetchProfile();
    } catch (e) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'choose') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.inner}>
          <Text style={styles.title}>Set up your household</Text>
          <Text style={styles.subtitle}>
            Create a new household or join one your partner already set up.
          </Text>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => setMode('create')}
            activeOpacity={0.8}>
            <Text style={styles.optionTitle}>Create a household</Text>
            <Text style={styles.optionDesc}>Start fresh — your partner can join with the 6-character invite code.</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => setMode('join')}
            activeOpacity={0.8}>
            <Text style={styles.optionTitle}>Join a household</Text>
            <Text style={styles.optionDesc}>Enter the 6-character invite code your partner shared with you.</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <TouchableOpacity
          onPress={() => {
            setMode('choose');
            setError(null);
            setPreviewHousehold(null);
            setInviteCode('');
          }}
          style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          {mode === 'create' ? 'Create a household' : 'Join a household'}
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {mode === 'create' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Household name (e.g. The Olivers)"
              placeholderTextColor={Colors.textSecondary}
              value={householdName}
              onChangeText={setHouseholdName}
              autoCapitalize="words"
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={loading}
              activeOpacity={0.8}>
              {loading
                ? <ActivityIndicator color={Colors.textPrimary} />
                : <Text style={styles.buttonText}>Create household</Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.hintText}>
              Ask your household member for their 6-character invite code from the Profile screen.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Invite code (e.g. A1B2C3)"
              placeholderTextColor={Colors.textSecondary}
              value={inviteCode}
              onChangeText={(text) => {
                setInviteCode(text.toUpperCase());
                setPreviewHousehold(null);
                setError(null);
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
            />

            {/* Preview card shown after successful lookup */}
            {previewHousehold ? (
              <View style={styles.previewCard}>
                <Text style={styles.previewLabel}>Household found:</Text>
                <Text style={styles.previewName}>{previewHousehold.name}</Text>
              </View>
            ) : null}

            {!previewHousehold ? (
              <TouchableOpacity
                style={[styles.button, lookupLoading && styles.buttonDisabled]}
                onPress={handleLookup}
                disabled={lookupLoading}
                activeOpacity={0.8}>
                {lookupLoading
                  ? <ActivityIndicator color={Colors.textPrimary} />
                  : <Text style={styles.buttonText}>Find household</Text>
                }
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleConfirmJoin}
                disabled={loading}
                activeOpacity={0.8}>
                {loading
                  ? <ActivityIndicator color={Colors.textPrimary} />
                  : <Text style={styles.buttonText}>Join this household</Text>
                }
              </TouchableOpacity>
            )}
          </>
        )}
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
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  back: {
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing.xl,
  },
  backText: {
    color: Colors.blue,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.medium,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
    lineHeight: 22,
    marginTop: -Spacing.sm,
  },
  hintText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    lineHeight: 18,
    marginTop: -Spacing.sm,
  },
  optionCard: {
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  optionTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  optionDesc: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    lineHeight: 18,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
  },
  previewCard: {
    backgroundColor: Colors.surface,
    borderWidth: Border.width,
    borderColor: Colors.green,
    borderRadius: Radius.sm,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  previewLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
  previewName: {
    color: Colors.green,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.medium,
  },
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
  errorText: {
    color: Colors.red,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
});
