import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { Download, Printer, MessageCircle, Link2, Check } from 'lucide-react-native';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import { auth, getDb } from '@/lib/firebase';
import { getLoyaltySettings } from '@/lib/loyalty';
import { buildPrintedQrValue } from '@/lib/qrLink';
import { getAppWebOrigin } from '@/lib/referral';
import { copyToClipboard } from '@/lib/clipboard';
import { shareBase64File, sharePosterPdf } from '@/lib/deviceFile';
import { runOwnerTestScan } from '@/lib/ownerTestScan';
import {
  deliverWebPng,
  popupOpened,
  posterDownloadName,
  posterHtmlForQr,
  qrDownloadName,
} from '@/lib/printKit';
import { qrPngDataUrl } from '@/lib/qrPng';
import {
  STAFF_SENTENCE,
  customerPost,
  loadGoLiveFlags,
  markGoLive,
  whatsAppShareUrl,
} from '@/lib/businessStart';
import { colors, radius, spacing } from '@/theme';

type Props = {
  businessId: string;
  businessName: string;
};

export default function GoLiveKit({ businessId, businessName }: Props) {
  const [loyalty, setLoyalty] = useState<{ scansRequired: number; reward: string } | null>(null);
  const [scans, setScans] = useState(0);
  const [flags, setFlags] = useState({ printed: false, shared: false });
  const [notice, setNotice] = useState('');
  const [noticeError, setNoticeError] = useState(false);
  const [cardStamps, setCardStamps] = useState(0);
  const [testing, setTesting] = useState(false);

  const qrUrl = buildPrintedQrValue(businessId, getAppWebOrigin());
  const post = loyalty
    ? customerPost({
        name: businessName,
        scansRequired: loyalty.scansRequired,
        reward: loyalty.reward,
        url: qrUrl,
      })
    : '';

  useEffect(() => {
    let cancelled = false;
    getLoyaltySettings(businessId)
      .then((settings) => {
        if (!cancelled) {
          setLoyalty({ scansRequired: settings.scansRequired, reward: settings.reward });
        }
      })
      .catch((err) => console.warn('[go-live] loyalty', err));
    loadGoLiveFlags(businessId)
      .then((next) => {
        if (!cancelled) setFlags(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  useEffect(() => {
    return onSnapshot(doc(getDb(), 'businesses', businessId, 'statistics', 'scans'), (snap) => {
      const total = snap.data()?.totalScans;
      setScans(typeof total === 'number' ? total : 0);
    });
  }, [businessId]);

  useEffect(() => {
    if (!auth.currentUser || auth.currentUser.uid !== businessId) return;
    return onSnapshot(
      doc(getDb(), 'users', auth.currentUser.uid, 'scans', businessId),
      (snap) => {
        const total = snap.data()?.totalScans;
        setCardStamps(typeof total === 'number' ? total : 0);
      },
      (err) => console.warn('[go-live] card', err)
    );
  }, [businessId]);

  const mark = async (flag: 'printed' | 'shared') => {
    await markGoLive(businessId, flag);
    setFlags(await loadGoLiveFlags(businessId));
  };

  const tell = (text: string, error = false) => {
    setNoticeError(error);
    setNotice(text);
  };

  const printPoster = async () => {
    if (!loyalty) {
      tell('The poster is still loading.', true);
      return;
    }
    const reward = `${loyalty.scansRequired} stamps, then ${loyalty.reward}`;
    if (Platform.OS === 'web') {
      const popup = typeof window !== 'undefined' ? window.open('', '_blank') : null;
      if (!popupOpened(popup) || !popup) {
        tell('Allow popups to print the poster.', true);
        return;
      }
      try {
        popup.document.write(posterHtmlForQr({ name: businessName, reward, staff: STAFF_SENTENCE, qrUrl }));
        popup.document.close();
        popup.focus();
        popup.print();
      } catch {
        popup.close();
        tell('Could not prepare the poster.', true);
        return;
      }
      await mark('printed');
      tell('Poster ready to print.');
      return;
    }
    try {
      const html = posterHtmlForQr({ name: businessName, reward, staff: STAFF_SENTENCE, qrUrl });
      const shared = await sharePosterPdf(html, posterDownloadName(businessName));
      if (!shared) {
        tell('Could not create the poster file.', true);
        return;
      }
      await mark('printed');
      tell('Poster file ready.');
    } catch {
      tell('Could not create the poster file.', true);
    }
  };

  const downloadQr = async () => {
    try {
      const dataUrl = qrPngDataUrl(qrUrl);
      const filename = qrDownloadName(businessName);
      if (Platform.OS === 'web') {
        const saved = await deliverWebPng(dataUrl, filename);
        if (!saved) {
          tell('Could not save the QR image.', true);
          return;
        }
        await mark('printed');
        tell('QR image downloaded.');
        return;
      }
      const shared = await shareBase64File({
        filename,
        base64: dataUrl.slice(dataUrl.indexOf(',') + 1),
        mimeType: 'image/png',
        uti: 'public.png',
        dialogTitle: 'Download QR',
      });
      if (!shared) {
        tell('Could not save the QR image.', true);
        return;
      }
      await mark('printed');
      tell('QR image saved.');
    } catch {
      tell('Could not save the QR image.', true);
    }
  };

  const testScan = async () => {
    if (testing) return;
    setTesting(true);
    try {
      const result = await runOwnerTestScan(qrUrl);
      setCardStamps(result.totalScans);
      tell(
        result.alreadyOnCard
          ? 'Test stamp is on your card.'
          : 'Test stamp landed on your card. First stamp stays to do until a customer scans.'
      );
    } catch (err) {
      tell(err instanceof Error ? err.message : 'Could not test this QR.', true);
    } finally {
      setTesting(false);
    }
  };

  const sharePost = async (channel: 'whatsapp' | 'copy') => {
    if (!post) return;
    if (channel === 'whatsapp') {
      await Linking.openURL(whatsAppShareUrl(post));
    } else {
      const ok = await copyToClipboard(post);
      if (!ok) return;
    }
    await mark('shared');
    tell(channel === 'copy' ? 'Post copied.' : 'Opening WhatsApp.');
  };

  const requiredStamps = Math.max(1, loyalty?.scansRequired || 1);
  const filledStamps =
    cardStamps > 0 && cardStamps % requiredStamps === 0 ? requiredStamps : cardStamps % requiredStamps;

  const rows = [
    { done: flags.printed, label: 'Print the counter poster' },
    { done: scans > 0, label: 'First stamp' },
    { done: flags.shared, label: 'Share a post' },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Put it on the counter</Text>
      <View style={styles.poster}>
        <Text style={styles.posterName}>{businessName}</Text>
        {loyalty ? (
          <Text style={styles.reward}>
            {loyalty.scansRequired} stamps, then {loyalty.reward}
          </Text>
        ) : null}
        <QRCodeGenerator value={qrUrl} size={180} />
        <Text style={styles.staff}>{STAFF_SENTENCE}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.action} onPress={printPoster} accessibilityLabel="Print poster">
          <Printer size={16} color={colors.white} />
          <Text style={styles.actionText}>Print poster</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action} onPress={downloadQr} accessibilityLabel="Download QR">
          <Download size={16} color={colors.white} />
          <Text style={styles.actionText}>Download QR</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.whatsapp}
          onPress={() => sharePost('whatsapp')}
          accessibilityLabel="Share post on WhatsApp"
        >
          <MessageCircle size={16} color={colors.white} />
          <Text style={styles.actionText}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={() => sharePost('copy')} accessibilityLabel="Copy post">
          <Link2 size={16} color={colors.primaryDark} />
          <Text style={styles.secondaryText}>Copy post</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.testButton, testing && styles.testButtonDisabled]}
          onPress={testScan}
          disabled={testing}
          accessibilityLabel="Test scan"
        >
          <Text style={styles.secondaryText}>{testing ? 'Stamping...' : 'Test scan'}</Text>
        </TouchableOpacity>
      </View>
      {loyalty && cardStamps > 0 ? (
        <View style={styles.testResult}>
          <View style={styles.stamps}>
            {Array.from({ length: requiredStamps }).map((_, index) => (
              <View key={index} style={[styles.stamp, index < filledStamps && styles.stampFilled]} />
            ))}
          </View>
          <Text style={styles.testLine}>
            {filledStamps} of {requiredStamps} toward {loyalty.reward}
          </Text>
        </View>
      ) : null}
      {notice ? <Text style={[styles.notice, noticeError && styles.noticeError]}>{notice}</Text> : null}
      {post ? (
        <Text selectable style={styles.post}>
          {post}
        </Text>
      ) : null}

      <Text style={styles.checklistTitle}>First week</Text>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          {row.done ? <Check size={16} color={colors.success} /> : <View style={styles.empty} />}
          <Text style={styles.rowText}>
            {row.done ? 'Done' : 'To do'} · {row.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.navy },
  poster: {
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#f8fafc',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  posterName: { fontSize: 22, fontWeight: '800', color: colors.navy, textAlign: 'center' },
  reward: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  staff: { fontSize: 14, lineHeight: 20, color: colors.navy, textAlign: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryDark,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  whatsapp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  actionText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  secondaryText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  notice: { color: colors.success, fontSize: 13 },
  noticeError: { color: colors.error },
  testButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  testButtonDisabled: { opacity: 0.6 },
  testResult: { alignItems: 'center', gap: spacing.xs },
  stamps: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  stamp: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.offWhite,
  },
  stampFilled: { backgroundColor: colors.primary, borderColor: colors.primaryDark },
  testLine: { fontSize: 14, color: colors.navy, textAlign: 'center' },
  post: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  checklistTitle: { fontSize: 16, fontWeight: '800', color: colors.navy, marginTop: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  empty: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
  },
  rowText: { fontSize: 14, color: colors.navy, flex: 1 },
});
