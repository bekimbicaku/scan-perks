import { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as QRCodeWeb from 'qrcode';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
}

export default function QRCodeGenerator({ value, size = 200 }: QRCodeGeneratorProps) {
  const [qrDataURL, setQrDataURL] = useState<string>('');

  useEffect(() => {
    if (Platform.OS === 'web') {
      QRCodeWeb.toDataURL(value, { width: size })
        .then(url => setQrDataURL(url))
        .catch(err => console.error('QR Code generation error:', err));
    }
  }, [value, size]);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <img src={qrDataURL} width={size} height={size} alt="QR Code" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <QRCode
        value={value}
        size={size}
        backgroundColor="white"
        color="black"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
});