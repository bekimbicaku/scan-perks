import { View, Text, StyleSheet, Image } from 'react-native';
import { QrCode, Printer, Smartphone } from 'lucide-react-native';

interface QRInstructionsProps {
  type: 'static' | 'dynamic';
}

export default function QRInstructions({ type }: QRInstructionsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {type === 'static' ? 'Static QR Code Setup' : 'POS Integration Setup'}
      </Text>

      {type === 'static' ? (
        <View style={styles.steps}>
          <View style={styles.step}>
            <View style={styles.stepIcon}>
              <QrCode size={24} color="#0891b2" />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Generate QR Code</Text>
              <Text style={styles.stepDescription}>
                Your unique QR code will be generated automatically after registration
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepIcon}>
              <Printer size={24} color="#0891b2" />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Print and Display</Text>
              <Text style={styles.stepDescription}>
                Print your QR code and display it prominently at your business location
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepIcon}>
              <Smartphone size={24} color="#0891b2" />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Customer Scanning</Text>
              <Text style={styles.stepDescription}>
                Customers can scan the QR code with their phones to earn points
              </Text>
            </View>
          </View>

          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1621768216002-5ac171876625?w=400&q=80' }}
            style={styles.image}
          />
        </View>
      ) : (
        <View style={styles.steps}>
          <View style={styles.step}>
            <View style={styles.stepIcon}>
              <QrCode size={24} color="#0891b2" />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>API Integration</Text>
              <Text style={styles.stepDescription}>
                We'll provide you with API credentials to integrate with your POS system
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepIcon}>
              <Smartphone size={24} color="#0891b2" />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Automatic QR Generation</Text>
              <Text style={styles.stepDescription}>
                Unique QR codes will be generated automatically for each transaction
              </Text>
            </View>
          </View>

          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1622836931373-5e3451faf45e?w=400&q=80' }}
            style={styles.image}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 20,
  },
  steps: {
    gap: 16,
  },
  step: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0fdfa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 16,
  },
});