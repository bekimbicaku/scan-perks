import { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteUserAccount } from '@/lib/auth';
import { TriangleAlert as AlertTriangle, X } from 'lucide-react-native';
import { router } from 'expo-router';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function DeleteAccountModal({ visible, onClose }: DeleteAccountModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await deleteUserAccount(password);
      onClose();
      router.replace('/login');
    } catch (err: any) {
      setError(err.message || 'Failed to delete account');
    } finally {
      setLoading(false);
    }
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
            <Text style={styles.headerText}>Delete Account</Text>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={onClose}
              disabled={loading}
            >
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.warning}>
            <AlertTriangle size={48} color="#ef4444" />
            <Text style={styles.warningTitle}>Warning: This cannot be undone</Text>
            <Text style={styles.warningText}>
              Deleting your account will permanently remove:
            </Text>
            <View style={styles.bulletPoints}>
              <Text style={styles.bulletPoint}>• All your scan history</Text>
              <Text style={styles.bulletPoint}>• Earned rewards and points</Text>
              <Text style={styles.bulletPoint}>• Account settings and preferences</Text>
              <Text style={styles.bulletPoint}>• All associated data</Text>
            </View>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>
              Enter your password to confirm deletion
            </Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              autoCapitalize="none"
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.buttons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.deleteButton, loading && styles.deleteButtonDisabled]} 
                onPress={handleDelete}
                disabled={loading}
              >
                <Text style={styles.deleteButtonText}>
                  {loading ? 'Deleting...' : 'Delete Account'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  warning: {
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: 12,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 12,
  },
  bulletPoints: {
    alignSelf: 'stretch',
    paddingLeft: 8,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f8fafc',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
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
  deleteButtonDisabled: {
    opacity: 0.7,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});