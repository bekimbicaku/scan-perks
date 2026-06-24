import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Save, Building2, Clock, MapPin, Phone, Mail } from 'lucide-react-native';
import { db } from '@/lib/firebase';
import { GlassCard } from '@/components/ui/GlassBackground';
import GlassInput from '@/components/ui/GlassInput';
import GlassButton from '@/components/ui/GlassButton';
import SectionHeader from '@/components/ui/SectionHeader';
import { colors, spacing, typography } from '@/theme';

interface BusinessHours {
  open: string;
  close: string;
}

interface DaysHours {
  [key: string]: BusinessHours;
}

interface SettingsForm {
  name: string;
  description: string;
  address: { street: string; city: string; state: string; zipCode: string };
  contact: { phone: string; email: string };
  hours: DaysHours;
  closedSunday: boolean;
}

const DEFAULT_HOURS: DaysHours = {
  monday: { open: '09:00', close: '17:00' },
  tuesday: { open: '09:00', close: '17:00' },
  wednesday: { open: '09:00', close: '17:00' },
  thursday: { open: '09:00', close: '17:00' },
  friday: { open: '09:00', close: '17:00' },
  saturday: { open: '10:00', close: '15:00' },
  sunday: { open: '10:00', close: '15:00' },
};

interface BusinessSettingsProps {
  businessId: string;
}

export default function BusinessSettings({ businessId }: BusinessSettingsProps) {
  const [form, setForm] = useState<SettingsForm>({
    name: '',
    description: '',
    address: { street: '', city: '', state: '', zipCode: '' },
    contact: { phone: '', email: '' },
    hours: DEFAULT_HOURS,
    closedSunday: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [businessId]);

  const loadSettings = async () => {
    const snap = await getDoc(doc(db, 'businesses', businessId));
    if (!snap.exists()) return;
    const data = snap.data();
    setForm({
      name: data.name || '',
      description: data.description || '',
      address: {
        street: data.address?.street || '',
        city: data.address?.city || '',
        state: data.address?.state || data.address?.postalCode || '',
        zipCode: data.address?.zipCode || data.address?.postalCode || '',
      },
      contact: {
        phone: data.contact?.phone || data.phone || '',
        email: data.contact?.email || data.email || '',
      },
      hours: data.hours || DEFAULT_HOURS,
      closedSunday: data.closedSunday || false,
    });
  };

  const save = async () => {
    if (!form.name || !form.contact.email || !form.contact.phone) {
      setError('Name, email and phone are required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'businesses', businessId), {
        name: form.name,
        description: form.description,
        phone: form.contact.phone,
        email: form.contact.email,
        address: {
          street: form.address.street,
          city: form.address.city,
          postalCode: form.address.zipCode,
          state: form.address.state,
        },
        contact: form.contact,
        hours: form.hours,
        closedSunday: form.closedSunday,
        updatedAt: new Date(),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch {
      setError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const updateHour = (day: string, field: 'open' | 'close', value: string) => {
    setForm((prev) => ({
      ...prev,
      hours: { ...prev.hours, [day]: { ...prev.hours[day], [field]: value } },
    }));
  };

  return (
    <View style={styles.wrap}>
      <SectionHeader
        title="Business Profile"
        subtitle="How customers see you in Scan Perks"
        icon={<Building2 size={22} color={colors.primaryDark} />}
      />

      <GlassCard style={styles.block}>
        <Text style={styles.blockTitle}>Basics</Text>
        <GlassInput
          placeholder="Business name *"
          value={form.name}
          onChangeText={(t) => setForm((p) => ({ ...p, name: t }))}
          icon={<Building2 size={18} color={colors.textMuted} />}
        />
        <GlassInput
          placeholder="Short description for customers"
          value={form.description}
          onChangeText={(t) => setForm((p) => ({ ...p, description: t }))}
          containerStyle={styles.gap}
          multiline
        />
      </GlassCard>

      <GlassCard style={styles.block}>
        <Text style={styles.blockTitle}>Contact</Text>
        <GlassInput
          placeholder="Phone *"
          value={form.contact.phone}
          onChangeText={(t) => setForm((p) => ({ ...p, contact: { ...p.contact, phone: t } }))}
          icon={<Phone size={18} color={colors.textMuted} />}
          keyboardType="phone-pad"
        />
        <GlassInput
          placeholder="Email *"
          value={form.contact.email}
          onChangeText={(t) => setForm((p) => ({ ...p, contact: { ...p.contact, email: t } }))}
          icon={<Mail size={18} color={colors.textMuted} />}
          containerStyle={styles.gap}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </GlassCard>

      <GlassCard style={styles.block}>
        <Text style={styles.blockTitle}>Location</Text>
        <GlassInput
          placeholder="Street address"
          value={form.address.street}
          onChangeText={(t) => setForm((p) => ({ ...p, address: { ...p.address, street: t } }))}
          icon={<MapPin size={18} color={colors.textMuted} />}
        />
        <View style={styles.row}>
          <GlassInput
            placeholder="City"
            value={form.address.city}
            onChangeText={(t) => setForm((p) => ({ ...p, address: { ...p.address, city: t } }))}
            containerStyle={styles.flex}
          />
          <GlassInput
            placeholder="ZIP"
            value={form.address.zipCode}
            onChangeText={(t) => setForm((p) => ({ ...p, address: { ...p.address, zipCode: t } }))}
            containerStyle={styles.flex}
            keyboardType="numeric"
          />
        </View>
      </GlassCard>

      <GlassCard style={styles.block}>
        <View style={styles.hoursHeader}>
          <Clock size={18} color={colors.primaryDark} />
          <Text style={styles.blockTitle}>Hours</Text>
        </View>
        {Object.entries(form.hours).map(([day, h]) => (
          <View key={day} style={styles.hourRow}>
            <Text style={styles.day}>{day.slice(0, 3).toUpperCase()}</Text>
            <GlassInput
              placeholder="09:00"
              value={h.open}
              onChangeText={(t) => updateHour(day, 'open', t)}
              containerStyle={styles.timeInput}
            />
            <Text style={styles.to}>–</Text>
            <GlassInput
              placeholder="17:00"
              value={h.close}
              onChangeText={(t) => updateHour(day, 'close', t)}
              containerStyle={styles.timeInput}
            />
          </View>
        ))}
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Closed on Sundays</Text>
          <Switch
            value={form.closedSunday}
            onValueChange={(v) => setForm((p) => ({ ...p, closedSunday: v }))}
            trackColor={{ true: colors.primary }}
          />
        </View>
      </GlassCard>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>Settings saved!</Text> : null}

      <GlassButton
        label={loading ? 'Saving...' : 'Save Profile'}
        onPress={save}
        loading={loading}
        icon={<Save size={18} color={colors.white} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg, gap: spacing.sm },
  block: { gap: spacing.sm },
  blockTitle: { ...typography.h3, fontSize: 16 },
  gap: { marginTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  flex: { flex: 1 },
  hoursHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hourRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  day: { width: 36, ...typography.label, fontSize: 11 },
  timeInput: { flex: 1 },
  to: { color: colors.textMuted },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  switchLabel: { ...typography.body, fontSize: 14 },
  error: { color: colors.error, textAlign: 'center' },
  success: { color: colors.success, textAlign: 'center', fontWeight: '600' },
});
