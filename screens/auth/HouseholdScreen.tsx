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
import {supabase} from '../../lib/supabase';
import {useAuthStore} from '../../store/authStore';
import {Colors, Typography, Spacing, Radius, Border} from '../../constants/theme';

type Mode = 'choose' | 'create' | 'join';

export default function HouseholdScreen() {
  const {user, fetchProfile} = useAuthStore();
  const [mode, setMode] = useState<Mode>('choose');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    const {error: updateError} = await supabase
      .from('profiles')
      .update({household_id: householdId})
      .eq('id', user!.id);

    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    await fetchProfile();
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter a household ID.');
      return;
    }
    setError(null);
    setLoading(true);

    // Verify the household exists
    const {data: household, error: fetchError} = await supabase
      .from('households')
      .select('id')
      .eq('id', inviteCode.trim())
      .single();

    if (fetchError || !household) {
      setError('Household not found. Check the ID and try again.');
      setLoading(false);
      return;
    }

    // Link user to household
    const {error: updateError} = await supabase
      .from('profiles')
      .update({household_id: household.id})
      .eq('id', user!.id);

    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    await fetchProfile();
  };

  if (mode === 'choose') {
    return (
      <SafeAreaView style={styles.container}>
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
            <Text style={styles.optionDesc}>Start fresh — your partner can join with the household ID.</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => setMode('join')}
            activeOpacity={0.8}>
            <Text style={styles.optionTitle}>Join a household</Text>
            <Text style={styles.optionDesc}>Enter the household ID your partner shared with you.</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <TouchableOpacity onPress={() => { setMode('choose'); setError(null); }} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          {mode === 'create' ? 'Create a household' : 'Join a household'}
        </Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {mode === 'create' ? (
          <TextInput
            style={styles.input}
            placeholder="Household name (e.g. The Olivers)"
            placeholderTextColor={Colors.textSecondary}
            value={householdName}
            onChangeText={setHouseholdName}
            autoCapitalize="words"
          />
        ) : (
          <TextInput
            style={styles.input}
            placeholder="Household ID"
            placeholderTextColor={Colors.textSecondary}
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="none"
            autoCorrect={false}
          />
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={mode === 'create' ? handleCreate : handleJoin}
          disabled={loading}
          activeOpacity={0.8}>
          {loading
            ? <ActivityIndicator color={Colors.textPrimary} />
            : <Text style={styles.buttonText}>
                {mode === 'create' ? 'Create household' : 'Join household'}
              </Text>
          }
        </TouchableOpacity>
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
