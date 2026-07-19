import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Gift } from 'lucide-react-native';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import { buildRewardQRData } from '@/lib/qr';
import { auth } from '@/lib/firebase';
import { colors, spacing, typography, radius } from '@/theme';
import type { Reward } from '@/components/RewardsWallet';

interface RewardQRModalProps {
  visible: boolean;
  onClose: () => void;
  reward: Reward | null;
}

export default function RewardQRModal({ visible, onClose, reward }: RewardQRModalProps) {
  if (!reward || !auth.currentUser) return null;

  const qrData = buildRewardQRData(reward.id, auth.currentUser.uid, reward.businessId);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Redeem Reward</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Gift size={40} color={colors.primary} />
          </View>
          <Text style={styles.businessName}>{reward.businessName}</Text>
          <Text style={styles.rewardDesc}>{reward.rewardDescription}</Text>

          <View style={styles.qrWrap}>
            <QRCodeGenerator value={qrData} size={220} />
          </View>

          <Text style={styles.instruction}>
            Show this QR code to staff at {reward.businessName} to redeem your reward.
          </Text>
          <Text style={styles.expiry}>
            Valid until {reward.expiresAt.toLocaleDateString()}
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  headerTitle: { ...typography.h2 },
  closeBtn: { padding: spacing.sm },
  content: { flex: 1, alignItems: 'center', padding: spacing.lg },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  businessName: { ...typography.h3, marginBottom: spacing.xs },
  rewardDesc: { ...typography.body, textAlign: 'center', marginBottom: spacing.lg },
  qrWrap: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  instruction: {
    ...typography.caption,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
  },
  expiry: { ...typography.label, marginTop: spacing.sm },
});
