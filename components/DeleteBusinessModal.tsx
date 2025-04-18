import { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { TriangleAlert as AlertTriangle, X, Save, Building2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface BusinessHours {
  open: string;
  close: string;
}

interface DaysHours {
  [key: string]: BusinessHours;
}

interface BusinessSettings {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  contact: {
    phone: string;
    email: string;
  };
  hours: DaysHours;
  description: string;
}

interface DeleteBusinessModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  businessId: string;
  initialSettings?: BusinessSettings;
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

const DEFAULT_SETTINGS: BusinessSettings = {
  name: '',
  address: {
    street: '',
    city: '',
    state: '',
    zipCode: '',
  },
  contact: {
    phone: '',
    email: '',
  },
  hours: DEFAULT_HOURS,
  description: '',
};

export default function DeleteBusinessModal({
  visible,
  onClose,
  onConfirm,
  loading,
  businessId,
  initialSettings = DEFAULT_SETTINGS,
}: DeleteBusinessModalProps) {
  const [showDelete, setShowDelete] = useState(false);
  const [settings, setSettings] = useState<BusinessSettings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
    contact: {
      ...DEFAULT_SETTINGS.contact,
      ...initialSettings?.contact,
    },
    address: {
      ...DEFAULT_SETTINGS.address,
      ...initialSettings?.address,
    },
    hours: {
      ...DEFAULT_HOURS,
      ...initialSettings?.hours,
    },
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!settings.name || !settings.contact.email || !settings.contact.phone) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const businessRef = doc(db, 'businesses', businessId);
      await updateDoc(businessRef, {
        name: settings.name,
        address: settings.address,
        contact: settings.contact,
        hours: settings.hours,
        description: settings.description,
        updatedAt: new Date(),
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving business settings:', err);
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const updateHours = (day: string, type: 'open' | 'close', value: string) => {
    setSettings(prev => ({
      ...prev,
      hours: {
        ...prev.hours,
        [day]: {
          ...prev.hours[day],
          [type]: value,
        },
      },
    }));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Building2 size={24} color="#0891b2" />
            <Text style={styles.headerText}>Business Settings</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent}>
            {/* Basic Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Business Name *</Text>
                <TextInput
                  style={styles.input}
                  value={settings.name}
                  onChangeText={(text) => setSettings(prev => ({ ...prev, name: text }))}
                  placeholder="Enter business name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={settings.description}
                  onChangeText={(text) => setSettings(prev => ({ ...prev, description: text }))}
                  placeholder="Tell customers about your business"
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            {/* Contact Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  value={settings.contact.phone}
                  onChangeText={(text) => setSettings(prev => ({
                    ...prev,
                    contact: { ...prev.contact, phone: text }
                  }))}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address *</Text>
                <TextInput
                  style={styles.input}
                  value={settings.contact.email}
                  onChangeText={(text) => setSettings(prev => ({
                    ...prev,
                    contact: { ...prev.contact, email: text }
                  }))}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Address */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Address</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Street Address</Text>
                <TextInput
                  style={styles.input}
                  value={settings.address.street}
                  onChangeText={(text) => setSettings(prev => ({
                    ...prev,
                    address: { ...prev.address, street: text }
                  }))}
                  placeholder="Enter street address"
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>City</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.address.city}
                    onChangeText={(text) => setSettings(prev => ({
                      ...prev,
                      address: { ...prev.address, city: text }
                    }))}
                    placeholder="City"
                  />
                </View>

                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>State</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.address.state}
                    onChangeText={(text) => setSettings(prev => ({
                      ...prev,
                      address: { ...prev.address, state: text }
                    }))}
                    placeholder="State"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 0.8 }]}>
                  <Text style={styles.label}>ZIP Code</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.address.zipCode}
                    onChangeText={(text) => setSettings(prev => ({
                      ...prev,
                      address: { ...prev.address, zipCode: text }
                    }))}
                    placeholder="ZIP"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Business Hours */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Business Hours</Text>
              
              {Object.entries(settings.hours).map(([day, hours]) => (
                <View key={day} style={styles.hoursRow}>
                  <Text style={styles.dayLabel}>
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </Text>
                  <View style={styles.hoursInputs}>
                    <TextInput
                      style={[styles.input, styles.timeInput]}
                      value={hours.open}
                      onChangeText={(text) => updateHours(day, 'open', text)}
                      placeholder="09:00"
                    />
                    <Text style={styles.toText}>to</Text>
                    <TextInput
                      style={[styles.input, styles.timeInput]}
                      value={hours.close}
                      onChangeText={(text) => updateHours(day, 'close', text)}
                      placeholder="17:00"
                    />
                  </View>
                </View>
              ))}
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {success && (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>Changes saved successfully!</Text>
              </View>
            )}

            {/* Save Button */}
            <TouchableOpacity 
              style={[styles.saveButton, saving && styles.buttonDisabled]} 
              onPress={handleSave}
              disabled={saving}
            >
              <Save size={20} color="#fff" />
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>

            {/* Delete Business Section */}
            <View style={styles.deleteSection}>
              <TouchableOpacity 
                style={styles.deleteTrigger}
                onPress={() => setShowDelete(true)}
              >
                <AlertTriangle size={20} color="#ef4444" />
                <Text style={styles.deleteTriggerText}>Delete Business</Text>
              </TouchableOpacity>

              {showDelete && (
                <View style={styles.deleteWarning}>
                  <AlertTriangle size={48} color="#ef4444" />
                  <Text style={styles.warningTitle}>Warning: This action cannot be undone</Text>
                  <Text style={styles.warningText}>
                    Deleting your business will permanently remove all associated data including:
                  </Text>
                  <View style={styles.bulletPoints}>
                    <Text style={styles.bulletPoint}>• Business profile and settings</Text>
                    <Text style={styles.bulletPoint}>• Customer scan history</Text>
                    <Text style={styles.bulletPoint}>• All rewards and loyalty points</Text>
                    <Text style={styles.bulletPoint}>• Analytics data</Text>
                  </View>

                  <View style={styles.deleteActions}>
                    <TouchableOpacity 
                      style={styles.cancelButton} 
                      onPress={() => setShowDelete(false)}
                      disabled={loading}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.deleteButton, loading && styles.buttonDisabled]} 
                      onPress={onConfirm}
                      disabled={loading}
                    >
                      <Text style={styles.deleteButtonText}>
                        {loading ? 'Deleting...' : 'Delete Business'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 12,
  },
  headerText: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 8,
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayLabel: {
    width: 100,
    fontSize: 16,
    color: '#0f172a',
  },
  hoursInputs: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInput: {
    flex: 1,
    textAlign: 'center',
  },
  toText: {
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    margin: 20,
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  successContainer: {
    margin: 20,
    padding: 12,
    backgroundColor: '#dcfce7',
    borderRadius: 8,
  },
  successText: {
    color: '#16a34a',
    fontSize: 14,
    textAlign: 'center',
  },
  saveButton: {
    margin: 20,
    backgroundColor: '#0891b2',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteSection: {
    padding: 20,
  },
  deleteTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  deleteTriggerText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteWarning: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    alignItems: 'center',
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 12,
  },
  bulletPoints: {
    alignSelf: 'stretch',
    paddingLeft: 8,
    marginBottom: 20,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  deleteActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  deleteButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});