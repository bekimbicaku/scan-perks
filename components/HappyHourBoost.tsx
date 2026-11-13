import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Zap } from 'lucide-react-native';
import { getDb } from '@/lib/firebase';
import { DEFAULT_HAPPY_HOUR, HappyHourConfig } from '@/lib/features';
import { GlassCard } from '@/components/ui/GlassBackground';
import GlassButton from '@/components/ui/GlassButton';
import SectionHeader from '@/components/ui/SectionHeader';
import { colors, spacing, typography, stamp } from '@/theme';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface HappyHourBoostProps {
  businessId: string;
}

export default function HappyHourBoost({ businessId }: HappyHourBoostProps) {
  const [config, setConfig] = useState<HappyHourConfig>(DEFAULT_HAPPY_HOUR);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    getDoc(doc(getDb(), 'businesses', businessId, 'settings', 'happyHour')).then((snap) => {
      if (snap.exists()) setConfig({ ...DEFAULT_HAPPY_HOUR, ...snap.data() });
    });
  }, [businessId]);

  const toggleDay = (day: number) => {
    setConfig((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day].sort(),
    }));
  };

  const save = async () => {
    setSaving(true);
    await setDoc(doc(getDb(), 'businesses', businessId, 'settings', 'happyHour'), config, { merge: true });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <View style={styles.wrap}>
      <SectionHeader
        title="Happy Hour Boost"
        subtitle="2× scan credit during power hours — unique to Scan Perks"
        icon={<Zap size={20} color={colors.warning} />}
      />
      <GlassCard stamp style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Enable boost</Text>
          <Switch
            value={config.enabled}
            onValueChange={(v) => setConfig((p) => ({ ...p, enabled: v }))}
            trackColor={{ true: stamp.deep, false: stamp.toggleOff }}
            thumbColor={stamp.white}
          />
        </View>

        <Text style={styles.timeLabel}>
          {config.startHour}:00 – {config.endHour}:00 · {config.multiplier}× scan credit
        </Text>

        <View style={styles.days}>
          {DAY_LABELS.map((label, i) => (
            <TouchableOpacity
              key={label}
              style={[styles.dayChip, config.days.includes(i) && styles.dayChipActive]}
              onPress={() => toggleDay(i)}
            >
              <Text style={[styles.dayText, config.days.includes(i) && styles.dayTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.multiplierRow}>
          {[2, 3].map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.multBtn, config.multiplier === m && styles.multBtnActive]}
              onPress={() => setConfig((p) => ({ ...p, multiplier: m }))}
            >
              <Text style={[styles.multText, config.multiplier === m && styles.multTextActive]}>{m}×</Text>
            </TouchableOpacity>
          ))}
        </View>

        {saved ? <Text style={styles.saved}>Boost schedule saved!</Text> : null}
        <GlassButton appearance="stamp" label={saving ? 'Saving...' : 'Save Boost Schedule'} onPress={save} loading={saving} />
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.md, marginBottom: spacing.md },
  card: { gap: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { ...typography.body, fontWeight: '600' },
  timeLabel: { ...typography.caption },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: stamp.skyTint,
  },
  dayChipActive: { backgroundColor: stamp.sky },
  dayText: { ...typography.caption, fontSize: 12, fontWeight: '600', color: stamp.deep },
  dayTextActive: { color: stamp.ink },
  multiplierRow: { flexDirection: 'row', gap: spacing.sm },
  multBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass.tint,
  },
  multBtnActive: { backgroundColor: stamp.amber },
  multText: { fontWeight: '800', color: stamp.deep },
  multTextActive: { color: stamp.ink },
  saved: { color: colors.success, textAlign: 'center', fontWeight: '600' },
});
