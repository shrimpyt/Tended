import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {supabase} from '../../lib/supabase';
import {Colors, Typography, Spacing, Radius, Border} from '../../constants/theme';

interface Props {
  onNavigateToSignUp: () => void;
}

export default function SignInScreen({onNavigateToSignUp}: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setLoading(true);

    const {error: signInError} = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);
    if (signInError) setError(signInError.message);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.appName}>Tended</Text>
          <Text style={styles.tagline}>Your home, tended to.</Text>
        </View>

        <View style={styles.form}>
          {error && <Text style={styles.errorText}>{error}</Text>}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.8}>
            {loading
              ? <ActivityIndicator color={Colors.textPrimary} />
              : <Text style={styles.buttonText}>Sign in</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={onNavigateToSignUp} style={styles.link}>
            <Text style={styles.linkText}>
              Don't have an account?{' '}
              <Text style={styles.linkAccent}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl * 2,
  },
  appName: {
    color: Colors.textPrimary,
    fontSize: 36,
    fontWeight: Typography.weights.medium,
    letterSpacing: -0.5,
  },
  tagline: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    marginTop: Spacing.xs,
  },
  form: {
    gap: Spacing.md,
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
    marginTop: Spacing.xs,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  link: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  linkText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
  linkAccent: {
    color: Colors.blue,
  },
  errorText: {
    color: Colors.red,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    textAlign: 'center',
  },
});
