import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Shield, Gift, CheckCircle, ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { auth } from '@/lib/firebase';
import { processRewardRedemption } from '@/lib/scan';
import GlassBackground, { GlassCard } from '@/components/ui/GlassBackground';
import GlassButton from '@/components/ui/GlassButton';
import { colors, spacing, typography } from '@/theme';

export default function RedeemRoute() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    if (!auth.currentUser) {
      router.replace('/(auth)/login');
      return;
    }
    requestPermission();
    return () => { isMounted.current = false; };
  }, []);

  if (!businessId) {
    return (
      <GlassBackground>
        <SafeAreaView style={styles.flex}>
          <Text style={styles.webMsg}>Missing business ID.</Text>
          <GlassButton label="Go Back" onPress={() => router.back()} />
        </SafeAreaView>
      </GlassBackground>
    );
  }

  const handleScan = async ({ data }: { data: string }) => {
    if (!isMounted.current || scanned) return;
    setScanned(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await processRewardRedemption(data, businessId);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setSuccess(`Reward redeemed: ${result.rewardDescription}`);
      setTimeout(() => {
        if (isMounted.current) {
          setScanned(false);
          setSuccess(null);
        }
      }, 3000);
    } catch (err: any) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setError(err.message || 'Failed to redeem');
      setTimeout(() => {
        if (isMounted.current) {
          setScanned(false);
          setError(null);
        }
      }, 2500);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <GlassBackground>
        <SafeAreaView style={styles.flex}>
          <Text style={styles.webMsg}>Use the mobile app to scan reward QR codes.</Text>
        </SafeAreaView>
      </GlassBackground>
    );
  }

  if (!permission?.granted) {
    return (
      <GlassBackground>
        <SafeAreaView style={styles.flex}>
          <View style={styles.center}>
            <Shield size={48} color={colors.primary} />
            <Text style={styles.title}>Camera Required</Text>
            <GlassButton label="Grant Permission" onPress={requestPermission} icon={<Camera size={20} color={colors.white} />} />
          </View>
        </SafeAreaView>
      </GlassBackground>
    );
  }

  return (
    <View style={styles.flex}>
      <CameraView style={styles.camera} onBarcodeScanned={scanned ? undefined : handleScan}>
        <SafeAreaView style={styles.overlay}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.white} />
          </TouchableOpacity>

          <GlassCard style={styles.headerCard}>
            <Gift size={24} color={colors.primary} />
            <Text style={styles.headerText}>Staff Redeem Mode</Text>
            <Text style={styles.subText}>Scan customer's reward QR code</Text>
          </GlassCard>

          {error && (
            <View style={styles.toastError}>
              <Text style={styles.toastErrorText}>{error}</Text>
            </View>
          )}
          {success && (
            <View style={styles.toastSuccess}>
              <CheckCircle size={20} color={colors.success} />
              <Text style={styles.toastSuccessText}>{success}</Text>
            </View>
          )}
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  camera: { flex: 1 },
  overlay: { flex: 1, padding: spacing.md },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(12, 74, 110, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  headerCard: { alignItems: 'center', marginBottom: 'auto' },
  headerText: { ...typography.h3, marginTop: spacing.sm },
  subText: { ...typography.caption, marginTop: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  title: { ...typography.h2 },
  webMsg: { ...typography.body, textAlign: 'center', padding: spacing.lg },
  toastError: {
    backgroundColor: colors.errorLight,
    padding: spacing.md,
    borderRadius: 12,
    marginTop: 'auto',
  },
  toastErrorText: { color: colors.error, textAlign: 'center' },
  toastSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successLight,
    padding: spacing.md,
    borderRadius: 12,
    marginTop: 'auto',
  },
  toastSuccessText: { color: colors.success, fontWeight: '600', flex: 1 },
});
