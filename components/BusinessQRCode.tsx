import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Platform } from 'react-native';
import { Download } from 'lucide-react-native';
import QRCodeGenerator from './QRCodeGenerator';
import { generateQRData } from '@/lib/qr';

interface BusinessQRCodeProps {
  businessId: string;
  type: 'static' | 'dynamic';
  transactionId?: string;
}

export default function BusinessQRCode({ businessId, type, transactionId }: BusinessQRCodeProps) {
  const [qrData, setQrData] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    generateQRData(businessId, type, transactionId)
      .then(data => setQrData(data))
      .catch(err => setError(err.message));
  }, [businessId, type, transactionId]);

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

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.qrContainer}>
        <QRCodeGenerator value={qrData} size={250} />
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>
          {type === 'static' ? 'Static QR Code' : 'Dynamic Transaction QR'}
        </Text>
        <Text style={styles.infoText}>
          {type === 'static'
            ? 'This QR code can be printed and displayed at your business location.'
            : 'This unique QR code is valid for this transaction only.'}
        </Text>
      </View>

      {Platform.OS !== 'web' && (
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Download size={24} color="#fff" />
          <Text style={styles.shareButtonText}>Share QR Code</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  qrContainer: {
    marginBottom: 24,
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 300,
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
  errorContainer: {
    padding: 20,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    marginVertical: 20,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 16,
    textAlign: 'center',
  },
});