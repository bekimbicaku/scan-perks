import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Gift, Save, TriangleAlert as AlertTriangle } from 'lucide-react-native';

interface LoyaltySettings {
  scansRequired: number;
  reward: string;
  lastModified: Date;
}

interface LoyaltyProgramSettingsProps {
  businessId: string;
}

export default function LoyaltyProgramSettings({ businessId }: LoyaltyProgramSettingsProps) {
  const [settings, setSettings] = useState<LoyaltySettings>({
    scansRequired: 10,
    reward: '',
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
      const settingsDoc = await getDoc(doc(db, 'businesses', businessId, 'settings', 'loyalty'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setSettings({
          scansRequired: data.scansRequired,
          reward: data.reward,
          lastModified: data.lastModified.toDate(),
        });
        
        // Calculate next modification date (1 month from last modification)
        const nextDate = new Date(data.lastModified.toDate());
        nextDate.setMonth(nextDate.getMonth() + 1);
        setNextModificationDate(nextDate);
      }
    } catch (err) {
      console.error('Error loading loyalty settings:', err);
      setError('Failed to load loyalty program settings');
    }
  };

  const canModifySettings = () => {
    if (!nextModificationDate) return true;
    return new Date() >= nextModificationDate;
  };

  const handleSave = async () => {
    if (!canModifySettings()) {
      Alert.alert(
        'Cannot Modify Settings',
        'Settings can only be modified once per month. Next modification available on ' +
        nextModificationDate?.toLocaleDateString()
      );
      return;
    }

    if (!settings.reward || settings.scansRequired < 1) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await setDoc(doc(db, 'businesses', businessId, 'settings', 'loyalty'), {
        scansRequired: settings.scansRequired,
        reward: settings.reward,
        lastModified: new Date(),
      }, { merge: true });

      // Update next modification date
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + 1);
      setNextModificationDate(nextDate);

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

      {!canModifySettings() && (
        <View style={styles.warningBox}>
          <AlertTriangle size={20} color="#f59e0b" />
          <Text style={styles.warningText}>
            Settings can be modified again on {nextModificationDate?.toLocaleDateString()}
          </Text>
        </View>
      )}

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Required Scans for Reward</Text>
          <TextInput
            style={styles.input}
            value={settings.scansRequired.toString()}
            onChangeText={(text) => setSettings(prev => ({
              ...prev,
              scansRequired: parseInt(text) || 0
            }))}
            keyboardType="number-pad"
            placeholder="Enter number of scans"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Reward Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={settings.reward}
            onChangeText={(text) => setSettings(prev => ({
              ...prev,
              reward: text
            }))}
            placeholder="e.g., Free coffee or 20% discount"
            multiline
            numberOfLines={3}
          />
        </View>

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <TouchableOpacity 
          style={[
            styles.saveButton,
            (!canModifySettings() || loading) && styles.saveButtonDisabled
          ]} 
          onPress={handleSave}
          disabled={!canModifySettings() || loading}
        >
          <Save size={20} color="#fff" />
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save Settings'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.currentSettings}>
        <Text style={styles.settingsTitle}>Current Program</Text>
        <Text style={styles.settingsText}>
          Customers need to scan {settings.scansRequired} times to earn:
        </Text>
        <Text style={styles.rewardText}>{settings.reward || 'No reward set'}</Text>
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
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8fafc',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
  lastModified: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
});