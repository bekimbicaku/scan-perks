import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Coffee } from 'lucide-react-native';
import { auth } from '@/lib/firebase';
import { loadUsualCafe, saveUsualCafe } from '@/lib/cafeRequest';
import { validateCafeName } from '@/lib/cafeRequestRecord';
import { LAUNCH_CITY } from '@/lib/launchCity';
import { GlassCard } from '@/components/ui/GlassBackground';
import GlassInput from '@/components/ui/GlassInput';
import GlassButton from '@/components/ui/GlassButton';
import { colors, spacing, typography } from '@/theme';

export default function EmptyMarketHome() {
  const [cafeName, setCafeName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    let cancelled = false;
    loadUsualCafe(userId)
      .then((name) => {
        if (cancelled || !name) return;
        setCafeName(name);
        setSavedName(name);
      })
      .catch((err) => {
        console.warn('[cafe] load failed', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    const invalid = validateCafeName(cafeName);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const record = await saveUsualCafe(userId, cafeName, LAUNCH_CITY);
      setCafeName(record.cafeName);
      setSavedName(record.cafeName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that cafe');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard>
      <View style={styles.wrap}>
        <View style={styles.icon}>
          <Coffee size={28} color={colors.primaryDark} />
        </View>
        <Text style={styles.city}>Opening in {LAUNCH_CITY}</Text>
        <Text style={styles.note}>Bekim is signing those places up.</Text>
        <Text style={styles.label}>Tell us your usual cafe</Text>
        <GlassInput
          value={cafeName}
          onChangeText={(text) => {
            setCafeName(text);
            setError('');
          }}
          placeholder="Cafe name"
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          accessibilityLabel="Tell us your usual cafe"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {savedName ? (
          <Text style={styles.saved}>
            Saved. Bekim will use {savedName} for the next visit in {LAUNCH_CITY}.
          </Text>
        ) : null}
        <GlassButton
          label={saving ? 'Saving...' : 'Send'}
          onPress={handleSubmit}
          disabled={saving}
          loading={saving}
        />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass.tint,
    alignSelf: 'center',
  },
  city: { ...typography.h2, textAlign: 'center', fontSize: 22 },
  note: { ...typography.body, textAlign: 'center', color: colors.textSecondary },
  label: { ...typography.h3, fontSize: 16, marginTop: spacing.xs },
  error: { color: colors.error, fontSize: 14 },
  saved: { ...typography.caption, color: colors.success, lineHeight: 20 },
});
