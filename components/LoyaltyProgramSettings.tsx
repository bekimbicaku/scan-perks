import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';
import { Gift, Save, TriangleAlert as AlertTriangle, Percent } from 'lucide-react-native';

interface LoyaltySettings {
  scansRequired: number;
  reward: string;
  memberPerkTitle: string;
  memberPerkDescription: string;
  memberDiscountPercent: number;
  lastModified: Date;
}

interface LoyaltyProgramSettingsProps {
  businessId: string;
}

export default function LoyaltyProgramSettings({ businessId }: LoyaltyProgramSettingsProps) {
  const [settings, setSettings] = useState<LoyaltySettings>({
    scansRequired: 10,
    reward: '',
    memberPerkTitle: '',
    memberPerkDescription: '',
    memberDiscountPercent: 0,
    lastModified: new Date(),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextModificationDate, setNextModificationDate] = useState<Date | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(getDb(), 'businesses', businessId, 'settings', 'loyalty'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        const lastModified = data.lastModified?.toDate?.() || new Date();
        setSettings({
          scansRequired: data.scansRequired || 10,
          reward: data.reward || '',
          memberPerkTitle: data.memberPerkTitle || '',
          memberPerkDescription: data.memberPerkDescription || '',
          memberDiscountPercent: Number(data.memberDiscountPercent) || 0,
          lastModified,
        });

        const nextDate = new Date(lastModified);
        nextDate.setMonth(nextDate.getMonth() + 1);
        setNextModificationDate(nextDate);
      }
    } catch (err) {
      console.error('Error loading loyalty settings:', err);
      setError('Failed to load loyalty program settings');
    }
  };

  const canModifyStampSettings = () => {
    if (!nextModificationDate) return true;
    return new Date() >= nextModificationDate;
  };

  const handleSave = async () => {
    if (!settings.reward || settings.scansRequired < 1) {
      setError('Please fill in stamp reward fields');
      return;
    }

    if (settings.memberDiscountPercent < 0 || settings.memberDiscountPercent > 100) {
      setError('Member discount must be between 0 and 100');
      return;
    }

    const stampLocked = !canModifyStampSettings();

    setLoading(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        memberPerkTitle: settings.memberPerkTitle.trim(),
        memberPerkDescription: settings.memberPerkDescription.trim(),
        memberDiscountPercent: settings.memberDiscountPercent || 0,
      };

      if (!stampLocked) {
        payload.scansRequired = settings.scansRequired;
        payload.reward = settings.reward;
        payload.lastModified = new Date();
      } else {
        const current = await getDoc(doc(getDb(), 'businesses', businessId, 'settings', 'loyalty'));
        if (current.exists()) {
          const data = current.data();
          if (
            data.scansRequired !== settings.scansRequired ||
            data.reward !== settings.reward
          ) {
            Alert.alert(
              'Stamp settings locked',
              'Scans required and reward can only change once per month. Member perks were saved.'
            );
          }
        }
      }

      await setDoc(
        doc(getDb(), 'businesses', businessId, 'settings', 'loyalty'),
        payload,
        { merge: true }
      );

      if (!stampLocked) {
        const nextDate = new Date();
        nextDate.setMonth(nextDate.getMonth() + 1);
        setNextModificationDate(nextDate);
        setSettings((prev) => ({ ...prev, lastModified: new Date() }));
      }

      Alert.alert('Success', 'Loyalty program settings have been updated');
    } catch (err) {
      console.error('Error saving loyalty settings:', err);
      setError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Gift size={24} color="#0891b2" />
        <Text style={styles.title}>Loyalty Program Settings</Text>
      </View>

      {!canModifyStampSettings() && (
        <View style={styles.warningBox}>
          <AlertTriangle size={20} color="#f59e0b" />
          <Text style={styles.warningText}>
            Stamp reward settings can be modified again on {nextModificationDate?.toLocaleDateString()}.
            Member discounts can still be updated anytime.
          </Text>
        </View>
      )}

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Required Scans for Reward</Text>
          <TextInput
            style={[styles.input, !canModifyStampSettings() && styles.inputDisabled]}
            value={settings.scansRequired.toString()}
            onChangeText={(text) =>
              setSettings((prev) => ({
                ...prev,
                scansRequired: parseInt(text) || 0,
              }))
            }
            keyboardType="number-pad"
            editable={canModifyStampSettings()}
            placeholder="Enter number of scans"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Reward Description</Text>
          <TextInput
            style={[styles.input, styles.textArea, !canModifyStampSettings() && styles.inputDisabled]}
            value={settings.reward}
            onChangeText={(text) =>
              setSettings((prev) => ({
                ...prev,
                reward: text,
              }))
            }
            placeholder="e.g., Free coffee or 20% discount"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
            editable={canModifyStampSettings()}
          />
        </View>

        <View style={styles.perkHeader}>
          <Percent size={20} color="#0891b2" />
          <Text style={styles.perkTitle}>Member Discounts & Exclusive Perks</Text>
        </View>
        <Text style={styles.perkHint}>
          Visible only to customers who have scanned your QR at least once.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Member discount %</Text>
          <TextInput
            style={styles.input}
            value={settings.memberDiscountPercent ? String(settings.memberDiscountPercent) : ''}
            onChangeText={(text) =>
              setSettings((prev) => ({
                ...prev,
                memberDiscountPercent: Math.min(100, Math.max(0, parseInt(text) || 0)),
              }))
            }
            keyboardType="number-pad"
            placeholder="e.g., 10"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Perk title</Text>
          <TextInput
            style={styles.input}
            value={settings.memberPerkTitle}
            onChangeText={(text) =>
              setSettings((prev) => ({
                ...prev,
                memberPerkTitle: text,
              }))
            }
            placeholder="e.g., Member Monday special"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Perk description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={settings.memberPerkDescription}
            onChangeText={(text) =>
              setSettings((prev) => ({
                ...prev,
                memberPerkDescription: text,
              }))
            }
            placeholder="Tell members what exclusive perk they get"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
          />
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Save size={20} color="#fff" />
          <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Settings'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.currentSettings}>
        <Text style={styles.settingsTitle}>Current Program</Text>
        <Text style={styles.settingsText}>
          Customers need to scan {settings.scansRequired} times to earn:
        </Text>
        <Text style={styles.rewardText}>{settings.reward || 'No reward set'}</Text>
        {(settings.memberDiscountPercent > 0 || settings.memberPerkTitle) && (
          <Text style={styles.memberText}>
            Members:{' '}
            {settings.memberDiscountPercent > 0
              ? `${settings.memberDiscountPercent}% off`
              : ''}
            {settings.memberDiscountPercent > 0 && settings.memberPerkTitle ? ' Â· ' : ''}
            {settings.memberPerkTitle || 'Exclusive perk'}
          </Text>
        )}
        <Text style={styles.lastModified}>
          Last modified: {settings.lastModified.toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#f8fafc',
    color: '#0C4A6E',
    minHeight: 48,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  perkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  perkTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  perkHint: {
    fontSize: 13,
    color: '#64748b',
    marginTop: -8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#0891b2',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  currentSettings: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f0fdfa',
    borderRadius: 8,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
  },
  settingsText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 8,
  },
  rewardText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0891b2',
    marginBottom: 12,
  },
  memberText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 12,
  },
  lastModified: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
});

