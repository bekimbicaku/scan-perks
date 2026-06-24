import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { Clock, Building2 } from 'lucide-react-native';
import { auth, getDb } from '@/lib/firebase';
import { GlassCard } from '@/components/ui/GlassBackground';
import { colors, spacing, typography } from '@/theme';

interface ScanEntry {
  id: string;
  businessName: string;
  lastScan: Date;
  totalScans: number;
}

export default function ScanHistory() {
  const [history, setHistory] = useState<ScanEntry[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const scansRef = collection(getDb(), 'users', auth.currentUser.uid, 'scans');
    const q = query(scansRef, orderBy('lastScan', 'desc'), limit(10));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const entries = await Promise.all(
        snapshot.docs.map(async (scanDoc) => {
          const businessDoc = await getDoc(doc(getDb(), 'businesses', scanDoc.id));
          return {
            id: scanDoc.id,
            businessName: businessDoc.data()?.name || 'Business',
            lastScan: scanDoc.data().lastScan?.toDate?.() || new Date(),
            totalScans: scanDoc.data().totalScans || 0,
          };
        })
      );
      setHistory(entries);
    });

    return () => unsubscribe();
  }, []);

  if (history.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recent Scans</Text>
      <GlassCard noPadding>
        {history.map((entry, index) => (
          <View
            key={entry.id}
            style={[styles.row, index < history.length - 1 && styles.rowBorder]}
          >
            <View style={styles.icon}>
              <Building2 size={18} color={colors.primary} />
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{entry.businessName}</Text>
              <View style={styles.metaRow}>
                <Clock size={12} color={colors.textMuted} />
                <Text style={styles.meta}>
                  {entry.lastScan.toLocaleDateString()} · {entry.totalScans} scans
                </Text>
              </View>
            </View>
          </View>
        ))}
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  title: { ...typography.h3, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  name: { ...typography.body, fontWeight: '600', fontSize: 15 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  meta: { ...typography.caption, fontSize: 12 },
});
