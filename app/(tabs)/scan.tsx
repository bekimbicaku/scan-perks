import { useState, useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, Text, View, Platform, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera, QrCode } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { auth } from '@/lib/firebase';
import { router } from 'expo-router';
import ScanPulseModal from '@/components/ScanPulseModal';
import { getSurpriseBonus, PulseMood } from '@/lib/features';
import { submitScanPulse, updateLocalPassport, applySurpriseBonus } from '@/lib/pulse';
import { processBusinessScan } from '@/lib/scan';
import GlassButton from '@/components/ui/GlassButton';
import BrandLogo from '@/components/ui/BrandLogo';
import { colors, stamp, outfit } from '@/theme';

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

  const cameraReady = Boolean(permission?.granted) && Platform.OS !== 'web';

  if (!permission?.granted && Platform.OS !== 'web') {
    return (
      <View style={styles.screen}>
        <ScanChrome cameraReady={false} insetsBottom={insets.bottom}>
          <View style={styles.center}>
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionText}>
              We need camera access to scan QR codes and earn rewards.
            </Text>
            <GlassButton
              appearance="stamp"
              label="Grant Permission"
              onPress={requestPermission}
              icon={<Camera size={20} color={stamp.ink} />}
            />
          </View>
        </ScanChrome>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.screen}>
        <ScanChrome cameraReady={false} insetsBottom={insets.bottom}>
          <Viewfinder />
          <View style={styles.scanLabel}>
            <QrCode size={18} color={stamp.ink} />
            <Text style={styles.scanLabelText}>Scan Business QR Code</Text>
          </View>
          <Text style={styles.webNote}>Please use our mobile app to scan QR codes and earn points.</Text>
          <ScanSteps />
        </ScanChrome>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      <View style={styles.dim} pointerEvents="none" />
      <ScanChrome cameraReady={cameraReady} insetsBottom={insets.bottom}>
        {success && scanProgress ? (
          <StampResultPanel
            totalScans={scanProgress.totalScans}
            scansRequired={scanProgress.scansRequired}
            line={success}
            onDone={dismissResult}
          />
        ) : (
          <>
            <Viewfinder />
            <View style={styles.scanLabel}>
              <QrCode size={18} color={stamp.ink} />
              <Text style={styles.scanLabelText}>Scan Business QR Code</Text>
            </View>
            <ScanSteps />
          </>
        )}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScanChrome>
      <ScanPulseModal
        visible={pulseVisible}
        businessName={pulseBusinessName}
        onSubmit={handlePulse}
        onSkip={() => setPulseVisible(false)}
      />
    </View>
  );
}

function ScanChrome({
  cameraReady,
  insetsBottom,
  children,
}: {
  cameraReady: boolean;
  insetsBottom: number;
  children: ReactNode;
}) {
  return (
    <View style={[styles.chrome, { paddingBottom: Math.max(insetsBottom, 16) + 108 }]} pointerEvents="box-none">
      <View style={styles.header}>
        <BrandLogo size="sm" centered={false} tone="light" />
        {cameraReady ? (
          <View style={styles.ready}>
            <Text style={styles.readyText}>Camera ready</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.title}>Collect a stamp</Text>
      <Text style={styles.subtitle}>Point your camera at the QR on the counter.</Text>
      {children}
    </View>
  );
}

function Viewfinder() {
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 2400, useNativeDriver: false }),
        Animated.timing(sweep, { toValue: 0, duration: 2400, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [sweep]);

  const top = sweep.interpolate({ inputRange: [0, 1], outputRange: [24, 220] });

  return (
    <View style={styles.finder}>
      <View style={styles.brackets}>
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />
      </View>
      <QrCode size={72} color="rgba(125, 211, 252, 0.35)" />
      <Animated.View style={[styles.sweep, { top }]} />
    </View>
  );
}

function ScanSteps() {
  const steps = ['Scan the counter QR', 'Collect a stamp', 'Unlock rewards'];
  return (
    <View style={styles.steps}>
      {steps.map((step, index) => (
        <View key={step} style={styles.step}>
          <View style={styles.stepNum}>
            <Text style={styles.stepNumText}>{index + 1}</Text>
          </View>
          <Text style={styles.stepText}>{step}</Text>
        </View>
      ))}
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
  screen: { flex: 1, backgroundColor: stamp.scanBg },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(4, 20, 33, 0.45)' },
  chrome: { flex: 1, paddingTop: 26 },
  header: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  ready: {
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyText: { fontFamily: outfit.bold, fontSize: 12, color: stamp.white },
  title: {
    marginTop: 22,
    textAlign: 'center',
    fontFamily: outfit.extra,
    fontSize: 32,
    letterSpacing: -0.8,
    color: stamp.white,
  },
  subtitle: {
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 24,
    fontFamily: outfit.regular,
    fontSize: 16,
    color: stamp.scanMuted,
  },
  finder: {
    width: 272,
    height: 272,
    marginTop: 34,
    alignSelf: 'center',
    borderRadius: 30,
    backgroundColor: '#0F3350',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brackets: { ...StyleSheet.absoluteFillObject, margin: 18 },
  corner: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderColor: stamp.sky,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 6, borderLeftWidth: 6, borderTopLeftRadius: 26 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 6, borderRightWidth: 6, borderTopRightRadius: 26 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 6, borderLeftWidth: 6, borderBottomLeftRadius: 26 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 6, borderRightWidth: 6, borderBottomRightRadius: 26 },
  sweep: {
    position: 'absolute',
    left: 28,
    right: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: stamp.sky,
  },
  scanLabel: {
    marginTop: 30,
    marginHorizontal: 20,
    minHeight: 54,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: stamp.sky,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  scanLabelText: { fontFamily: outfit.bold, fontSize: 16, color: stamp.ink, textAlign: 'center' },
  webNote: {
    marginTop: 14,
    marginHorizontal: 24,
    textAlign: 'center',
    fontFamily: outfit.regular,
    fontSize: 14,
    lineHeight: 20,
    color: stamp.scanMuted,
  },
  steps: { flexDirection: 'row', gap: 10, marginTop: 34, marginHorizontal: 24 },
  step: { flex: 1, alignItems: 'center' },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontFamily: outfit.extra, fontSize: 14, color: stamp.sky },
  stepText: {
    marginTop: 8,
    textAlign: 'center',
    fontFamily: outfit.regular,
    fontSize: 13,
    lineHeight: 17,
    color: stamp.scanMuted,
  },
  errorContainer: {
    marginTop: 16,
    marginHorizontal: 20,
    backgroundColor: colors.errorLight,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
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
    backgroundColor: stamp.sky,
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: stamp.radiusButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: { color: stamp.ink, fontFamily: outfit.bold, fontSize: 16 },
  center: { marginTop: 28, paddingHorizontal: 24, gap: 12 },
  permissionTitle: {
    fontFamily: outfit.extra,
    fontSize: 22,
    color: stamp.white,
    textAlign: 'center',
  },
  permissionText: {
    fontFamily: outfit.regular,
    fontSize: 15,
    lineHeight: 22,
    color: stamp.scanMuted,
    textAlign: 'center',
  },
});
