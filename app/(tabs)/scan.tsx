import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { Camera, QrCode, Shield, Gift } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { auth } from '@/lib/firebase';
import { router } from 'expo-router';
import ScanPulseModal from '@/components/ScanPulseModal';
import { getSurpriseBonus, PulseMood } from '@/lib/features';
import { submitScanPulse, updateLocalPassport, applySurpriseBonus } from '@/lib/pulse';
import { processBusinessScan } from '@/lib/scan';
import GlassBackground, { GlassCard } from '@/components/ui/GlassBackground';
import GlassButton from '@/components/ui/GlassButton';
import { colors, spacing, typography } from '@/theme';

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<{
    totalScans: number;
    scansRequired: number;
    scansUntilReward: number;
    newRewardEarned: boolean;
    progressPercent: number;
    businessName: string;
    happyHourActive?: boolean;
    rewardEtaDays?: number | null;
  } | null>(null);
  const [pulseVisible, setPulseVisible] = useState(false);
  const [pulseBusinessId, setPulseBusinessId] = useState('');
  const [pulseBusinessName, setPulseBusinessName] = useState('');
  const [surpriseMsg, setSurpriseMsg] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    if (!auth.currentUser) {
      router.replace('/login');
      return;
    }
    requestPermission();
    return () => { isMounted.current = false; };
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (!isMounted.current || !auth.currentUser || scanned) return;

    setScanned(true);
    setError(null);
    setSuccess(null);
    setScanProgress(null);

    try {
      const result = await processBusinessScan(data);

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(
          result.newRewardEarned
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Warning
        );
      }

      if (isMounted.current) {
        setScanProgress({
          totalScans: result.totalScans,
          scansRequired: result.scansRequired,
          scansUntilReward: result.scansUntilReward,
          newRewardEarned: result.newRewardEarned,
          progressPercent: result.progressPercent,
          businessName: result.businessName,
          happyHourActive: result.happyHourActive,
          rewardEtaDays: result.rewardEtaDays,
        });

        const badge = await updateLocalPassport(result.businessType);
        const surprise = getSurpriseBonus();
        if (surprise) {
          await applySurpriseBonus(surprise.bonusScans);
          setSurpriseMsg(surprise.label);
        }

        if (result.newRewardEarned) {
          setSuccess(`Congratulations! You earned: ${result.rewardDescription}${badge ? ` · Badge: ${badge}` : ''}`);
        } else if (result.happyHourActive) {
          setSuccess(`Happy Hour Boost! ${result.happyHourMultiplier}× credit at ${result.businessName}`);
        } else {
          setSuccess(
            `Scan at ${result.businessName} successful! ${result.scansUntilReward} more until your reward.`
          );
        }

        setPulseBusinessId(result.businessId);
        setPulseBusinessName(result.businessName);
        setPulseVisible(true);

        setTimeout(() => {
          if (isMounted.current) {
            setScanned(false);
            setSuccess(null);
            setScanProgress(null);
            setSurpriseMsg(null);
          }
        }, 4500);
      }
    } catch (err: any) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      if (isMounted.current) {
        setError(err.message || 'Failed to process QR code');
        setTimeout(() => {
          if (isMounted.current) {
            setScanned(false);
            setError(null);
          }
        }, 2500);
      }
    }
  };

  const handlePulse = async (mood: PulseMood) => {
    await submitScanPulse(pulseBusinessId, mood);
    setPulseVisible(false);
  };

  if (!permission?.granted) {
    return (
      <GlassBackground>
        <ScreenContainer>
          <View style={styles.center}>
            <Shield size={48} color={colors.primary} />
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionText}>
              We need camera access to scan QR codes and earn rewards.
            </Text>
            <GlassButton
              label="Grant Permission"
              onPress={requestPermission}
              icon={<Camera size={20} color={colors.white} />}
            />
          </View>
        </ScreenContainer>
      </GlassBackground>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <GlassBackground>
        <ScreenContainer>
          <View style={styles.center}>
            <QrCode size={48} color={colors.primary} />
            <Text style={styles.permissionTitle}>QR Code Scanning</Text>
            <Text style={styles.permissionText}>
              Please use our mobile app to scan QR codes and earn points.
            </Text>
          </View>
        </ScreenContainer>
      </GlassBackground>
    );
  }

  return (
    <View style={styles.flex}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.scanFrameOuter}>
          <View style={styles.scanFrame}>
            <QrCode size={32} color={colors.white} />
          </View>
        </View>
        <Text style={styles.scanText}>Scan Business QR Code</Text>

        {error && (
          <View style={[styles.errorContainer, { bottom: Math.max(insets.bottom, 16) + 88 }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {success && scanProgress && (
          <View style={[styles.successContainer, { bottom: Math.max(insets.bottom, 16) + 88 }]}>
            <Text style={styles.successText}>{success}</Text>
            {scanProgress.newRewardEarned && (
              <View style={styles.rewardBadge}>
                <Gift size={24} color={colors.success} />
                <Text style={styles.rewardText}>New Reward Available!</Text>
              </View>
            )}
          </View>
        )}

        {scanProgress && (
          <View style={[styles.progressContainer, { top: Math.max(insets.top, 12) + 12 }]}>
            <Text style={styles.progressBusiness}>{scanProgress.businessName}</Text>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${scanProgress.progressPercent}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              {scanProgress.newRewardEarned
                ? 'Reward unlocked!'
                : scanProgress.rewardEtaDays != null
                  ? `~${scanProgress.rewardEtaDays} days to reward at your pace`
                  : `${scanProgress.scansUntilReward} scans until next reward`}
            </Text>
          </View>
        )}
      </View>

      <ScanPulseModal
        visible={pulseVisible}
        businessName={pulseBusinessName}
        onSubmit={handlePulse}
        onSkip={() => setPulseVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrameOuter: {
    padding: 4,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(125, 211, 252, 0.6)',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: colors.white,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(12, 74, 110, 0.35)',
  },
  scanText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 24,
    backgroundColor: 'rgba(12, 74, 110, 0.75)',
    padding: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: colors.errorLight,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: { color: colors.error, fontSize: 16, textAlign: 'center' },
  successContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: colors.successLight,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  successText: { color: colors.success, fontSize: 16, textAlign: 'center', fontWeight: '600' },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 20,
    marginTop: 12,
    gap: 8,
  },
  rewardText: { color: colors.success, fontSize: 16, fontWeight: '600' },
  progressContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(12, 74, 110, 0.8)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.3)',
  },
  progressBusiness: { color: colors.lightBlue, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  progressText: { color: colors.white, fontSize: 14, textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  permissionTitle: { ...typography.h2, textAlign: 'center' },
  permissionText: { ...typography.caption, textAlign: 'center', maxWidth: 300, marginBottom: spacing.md },
});
