import { Modal, View, Text, StyleSheet, TouchableOpacity, Share, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Download } from 'lucide-react-native';
import QRCodeGenerator from './QRCodeGenerator';

interface ViewQRCodeModalProps {
  visible: boolean;
  onClose: () => void;
  businessId: string;
  qrType: 'static' | 'dynamic';
}

export default function ViewQRCodeModal({
  visible,
  onClose,
  businessId,
  qrType,
}: ViewQRCodeModalProps) {
  const qrData = JSON.stringify({
    businessId,
    type: qrType,
    timestamp: new Date().toISOString(),
  });

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Scan this QR code to earn points!',
        url: qrData, // On iOS, this will be used for sharing
        title: 'Business QR Code',
      });
    } catch (err) {
      console.error('Error sharing QR code:', err);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Your QR Code</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.qrContainer}>
            <QRCodeGenerator value={qrData} size={250} />
          </View>

          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>How to use your QR code:</Text>
            <Text style={styles.instructionText}>
              1. Display this QR code prominently at your business location
            </Text>
            <Text style={styles.instructionText}>
              2. Customers can scan it using their phone's camera
            </Text>
            <Text style={styles.instructionText}>
              3. Each scan earns them points towards rewards
            </Text>
          </View>

          {Platform.OS !== 'web' && (
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Download size={24} color="#fff" />
              <Text style={styles.shareButtonText}>Share QR Code</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
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
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  qrContainer: {
    marginVertical: 32,
  },
  instructions: {
    width: '100%',
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0891b2',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});