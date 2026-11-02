import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { Download, Printer, MessageCircle, Link2, Check } from 'lucide-react-native';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import { getDb } from '@/lib/firebase';
import { getLoyaltySettings } from '@/lib/loyalty';
import { buildPrintedQrValue } from '@/lib/qrLink';
import { getAppWebOrigin } from '@/lib/referral';
import { copyToClipboard } from '@/lib/clipboard';
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

  const mark = async (flag: 'printed' | 'shared') => {
    await markGoLive(businessId, flag);
    setFlags(await loadGoLiveFlags(businessId));
  };

  const printPoster = async () => {
    if (!loyalty) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const QRCode = await import('qrcode');
      const dataUrl = await QRCode.toDataURL(qrUrl, { width: 480, margin: 1 });
      const popup = window.open('', '_blank');
      if (popup) {
        const name = escapeHtml(businessName);
        const reward = escapeHtml(`${loyalty.scansRequired} stamps, then ${loyalty.reward}`);
        popup.document.write(
          `<!doctype html><html><head><title>${name} poster</title><style>body{font-family:sans-serif;text-align:center;padding:32px}h1{font-size:32px;margin:0 0 8px}p{font-size:18px}img{width:280px;height:280px}</style></head><body><h1>${name}</h1><p>${reward}</p><img src="${dataUrl}" alt="QR code"/><p>${escapeHtml(STAFF_SENTENCE)}</p></body></html>`
        );
        popup.document.close();
        popup.focus();
        popup.print();
      }
    }
    await mark('printed');
    setNotice('Poster ready to print.');
  };

  const downloadQr = async () => {
    const QRCode = await import('qrcode');
    const dataUrl = await QRCode.toDataURL(qrUrl, { width: 512, margin: 2 });
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${businessName.replace(/\s+/g, '-').toLowerCase() || 'scan-perks'}-qr.png`;
      link.click();
    } else {
      await copyToClipboard(qrUrl);
    }
    await mark('printed');
    setNotice('QR image downloaded.');
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
    setNotice(channel === 'copy' ? 'Post copied.' : 'Opening WhatsApp.');
  };

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
      </View>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
