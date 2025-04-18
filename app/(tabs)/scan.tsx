import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Platform, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, QrCode, Shield, Gift } from 'lucide-react-native';
import { doc, getDoc, setDoc, increment, runTransaction } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { router } from 'expo-router';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<{
    totalScans: number;
    scansUntilReward: number;
    newRewardEarned: boolean;
  } | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    if (!auth.currentUser) {
      router.replace('/(auth)/login');
      return;
    }
    
    requestPermission();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (!isMounted.current || !auth.currentUser) return;
    
    setScanned(true);
    setError(null);
    setSuccess(null);
    setScanProgress(null);

    try {
      // Parse QR code data
      const qrData = JSON.parse(data);
      const { businessId } = qrData;
      
      if (!businessId) {
        throw new Error('Invalid QR code format');
      }

      // Verify business exists
      const businessRef = doc(db, 'businesses', businessId);
      const businessDoc = await getDoc(businessRef);

      if (!businessDoc.exists()) {
        throw new Error('Business not found');
      }

      // Get user's scan history
      const userScansRef = doc(db, 'users', auth.currentUser.uid, 'scans', businessId);
      const userScansDoc = await getDoc(userScansRef);

      // Check for daily scan limit
      if (userScansDoc.exists()) {
        const lastScan = userScansDoc.data().lastScan?.toDate();
        if (lastScan && isToday(lastScan)) {
          throw new Error('You can only scan once per day at this business');
        }
      }

      // Use a transaction to update both user and business statistics
      await runTransaction(db, async (transaction) => {
        // Update user's scan count
        transaction.set(userScansRef, {
          totalScans: increment(1),
          lastScan: new Date(),
        }, { merge: true });

        // Update business statistics
        const businessStatsRef = doc(db, 'businesses', businessId, 'statistics', 'scans');
        transaction.set(businessStatsRef, {
          totalScans: increment(1),
          uniqueCustomers: increment(userScansDoc.exists() ? 0 : 1),
          lastScanAt: new Date(),
        }, { merge: true });

        // Update business analytics
        const businessAnalyticsRef = doc(db, 'businesses', businessId, 'analytics', 'daily');
        const today = new Date().toISOString().split('T')[0];
        transaction.set(businessAnalyticsRef, {
          [`${today}.scans`]: increment(1),
          [`${today}.uniqueCustomers`]: increment(userScansDoc.exists() ? 0 : 1),
        }, { merge: true });
      });

      // Get updated scan count
      const updatedScansDoc = await getDoc(userScansRef);
      const totalScans = updatedScansDoc.data()?.totalScans || 1;
      const scansUntilReward = 10 - (totalScans % 10);
      const newRewardEarned = totalScans % 10 === 0;

      // Create reward if milestone reached
      if (newRewardEarned) {
        const rewardRef = doc(db, 'users', auth.currentUser.uid, 'rewards', `${businessId}_${totalScans}`);
        await setDoc(rewardRef, {
          businessId,
          createdAt: new Date(),
          redeemed: false,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days expiry
        });

        // Update business reward statistics
        const businessRewardsRef = doc(db, 'businesses', businessId, 'statistics', 'rewards');
        await setDoc(businessRewardsRef, {
          totalRewardsIssued: increment(1),
          lastRewardIssuedAt: new Date(),
        }, { merge: true });
      }

      if (isMounted.current) {
        setScanProgress({
          totalScans,
          scansUntilReward,
          newRewardEarned,
        });
        
        if (newRewardEarned) {
          setSuccess('Congratulations! You\'ve earned a new reward! 🎉');
        } else {
          setSuccess(`Scan successful! ${scansUntilReward} more scans until your next reward.`);
        }

        // Reset scan after 3 seconds
        setTimeout(() => {
          if (isMounted.current) {
            setScanned(false);
            setSuccess(null);
            setScanProgress(null);
          }
        }, 3000);
      }
    } catch (err: any) {
      if (isMounted.current) {
        setError(err.message || 'Failed to process QR code');
        setTimeout(() => {
          if (isMounted.current) {
            setScanned(false);
            setError(null);
          }
        }, 2000);
      }
    }
  };

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Shield size={48} color="#64748b" style={styles.permissionIcon} />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan QR codes and earn you points.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Camera size={24} color="#fff" />
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webContainer}>
          <View style={styles.webImagePlaceholder}>
            <QrCode size={48} color="#64748b" />
          </View>
          <Text style={styles.webTitle}>QR Code Scanning</Text>
          <Text style={styles.webText}>
            Please use our mobile app to scan QR codes and earn points.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.scanFrame}>
            <QrCode size={32} color="#fff" />
          </View>
          <Text style={styles.scanText}>Scan Business QR Code</Text>
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          {success && scanProgress && (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>{success}</Text>
              {scanProgress.newRewardEarned && (
                <View style={styles.rewardBadge}>
                  <Gift size={24} color="#16a34a" />
                  <Text style={styles.rewardText}>New Reward Available!</Text>
                </View>
              )}
            </View>
          )}

          {scanProgress && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { width: `${((10 - scanProgress.scansUntilReward) / 10) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {scanProgress.scansUntilReward} scans until next reward
              </Text>
            </View>
          )}
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

function isToday(date: Date) {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scanText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 24,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
    borderRadius: 12,
  },
  errorContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 16,
    textAlign: 'center',
  },
  successContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#dcfce7',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  successText: {
    color: '#16a34a',
    fontSize: 16,
    textAlign: 'center',
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 20,
    marginTop: 12,
    gap: 8,
  },
  rewardText: {
    color: '#16a34a',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
    borderRadius: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0891b2',
    borderRadius: 4,
  },
  progressText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionIcon: {
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0891b2',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  webTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  webText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 400,
  },
});