import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { Camera, QrCode, Shield } from 'lucide-react-native';
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
  } | null>(null);
  const [pulseVisible, setPulseVisible] = useState(false);
  const [pulseBusinessId, setPulseBusinessId] = useState('');
  const [pulseBusinessName, setPulseBusinessName] = useState('');
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
        });

        await updateLocalPassport(result.businessType);
        const surprise = getSurpriseBonus();
        if (surprise) {
          await applySurpriseBonus(surprise.bonusScans);
        }

        setSuccess(stampResultLine(result));

        setPulseBusinessId(result.businessId);
        setPulseBusinessName(result.businessName);
        setPulseVisible(true);
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

  const dismissResult = () => {
    setScanned(false);
    setSuccess(null);
    setScanProgress(null);
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
        {success && scanProgress ? (
          <StampResultPanel
            totalScans={scanProgress.totalScans}
            scansRequired={scanProgress.scansRequired}
            line={success}
            onDone={dismissResult}
          />
        ) : (
          <>
            <View style={styles.scanFrameOuter}>
              <View style={styles.scanFrame}>
                <QrCode size={32} color={colors.white} />
              </View>
            </View>
            <Text style={styles.scanText}>Scan Business QR Code</Text>
          </>
        )}

        {error && (
          <View style={[styles.errorContainer, { bottom: Math.max(insets.bottom, 16) + 88 }]}>
            <Text style={styles.errorText}>{error}</Text>
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

function stampResultLine(result: {
  totalScans: number;
  scansRequired: number;
  rewardDescription: string;
  welcomeStampApplied: boolean;
  happyHourActive: boolean;
}) {
  const required = Math.max(1, result.scansRequired);
  const inCycle = result.totalScans % required;
  const current = result.totalScans > 0 && inCycle === 0 ? required : inCycle;
  const reward = result.rewardDescription.trim() || 'your reward';
  const notes: string[] = [];
  if (result.welcomeStampApplied) notes.push('Welcome stamp');
  if (result.happyHourActive) notes.push('Happy hour');
  const lead = notes.length > 0 ? `${notes.join('. ')}. ` : '';
  return `${lead}${current} of ${required} toward ${reward}. Next stamp tomorrow.`;
}

function StampResultPanel({
  totalScans,
  scansRequired,
  line,
  onDone,
}: {
  totalScans: number;
  scansRequired: number;
  line: string;
  onDone: () => void;
}) {
  const required = Math.max(1, scansRequired);
  const inCycle = totalScans % required;
  const filled = totalScans > 0 && inCycle === 0 ? required : inCycle;
  return (
    <View style={styles.resultCard}>
      <View style={styles.stamps}>
        {Array.from({ length: required }).map((_, index) => (
          <View key={index} style={[styles.stamp, index < filled && styles.stampFilled]} />
        ))}
      </View>
      <Text style={styles.resultLine}>{line}</Text>
      <TouchableOpacity
        style={styles.dismiss}
        onPress={onDone}
        accessibilityRole="button"
        accessibilityLabel="Done"
      >
        <Text style={styles.dismissText}>Done</Text>
      </TouchableOpacity>
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
  stamps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  stamp: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.offWhite,
  },
  stampFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  resultCard: {
    marginHorizontal: 20,
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    gap: 16,
  },
  resultLine: {
    color: colors.navy,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '600',
  },
  dismiss: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  dismissText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  permissionTitle: { ...typography.h2, textAlign: 'center' },
  permissionText: { ...typography.caption, textAlign: 'center', maxWidth: '100%', paddingHorizontal: spacing.md, marginBottom: spacing.md },
});
