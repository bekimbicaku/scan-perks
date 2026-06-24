import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { Heart, MapPin } from 'lucide-react-native';
import { router } from 'expo-router';
import { auth, db } from '@/lib/firebase';
import { toggleFavorite } from '@/lib/engagement';
import { GlassCard } from '@/components/ui/GlassBackground';
import SectionHeader from '@/components/ui/SectionHeader';
import { colors, spacing, typography } from '@/theme';

interface FavoriteBusiness {
  id: string;
  name: string;
  type: string;
  logoUrl?: string;
}

export default function FavoriteBusinesses() {
  const [favorites, setFavorites] = useState<FavoriteBusiness[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), async (snap) => {
      const ids: string[] = snap.data()?.favorites || [];
      setFavoriteIds(ids);

      const loaded = await Promise.all(
        ids.slice(0, 8).map(async (id) => {
          const biz = await getDoc(doc(db, 'businesses', id));
          if (!biz.exists()) return null;
          const d = biz.data();
          return {
            id,
            name: d.name,
            type: d.type,
            logoUrl: d.logoUrl,
          } as FavoriteBusiness;
        })
      );

      setFavorites(loaded.filter(Boolean) as FavoriteBusiness[]);
    });

    return () => unsub();
  }, []);

  if (favorites.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <SectionHeader title="Favorites" subtitle="Quick access to places you love" icon={<Heart size={20} color={colors.error} />} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
        {favorites.map((biz) => (
          <TouchableOpacity key={biz.id} onPress={() => router.push(`/business/${biz.id}`)}>
            <GlassCard style={styles.card}>
              <Image
                source={{ uri: biz.logoUrl || 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&q=80' }}
                style={styles.logo}
              />
              <Text style={styles.name} numberOfLines={1}>{biz.name}</Text>
              <View style={styles.meta}>
                <MapPin size={12} color={colors.textMuted} />
                <Text style={styles.type}>{biz.type}</Text>
              </View>
            </GlassCard>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export function FavoriteButton({ businessId }: { businessId: string }) {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snap) => {
      const ids: string[] = snap.data()?.favorites || [];
      setIsFavorite(ids.includes(businessId));
    });
    return () => unsub();
  }, [businessId]);

  const handleToggle = async () => {
    if (!auth.currentUser) return;
    await toggleFavorite(auth.currentUser.uid, businessId);
  };

  return (
    <TouchableOpacity onPress={handleToggle} style={styles.favBtn}>
      <Heart size={22} color={isFavorite ? colors.error : colors.textMuted} fill={isFavorite ? colors.error : 'transparent'} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.md, marginBottom: spacing.md },
  list: { gap: spacing.sm, paddingRight: spacing.md },
  card: { width: 140, alignItems: 'center' },
  logo: { width: 56, height: 56, borderRadius: 28, marginBottom: spacing.sm },
  name: { ...typography.body, fontWeight: '700', fontSize: 14 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  type: { ...typography.caption, fontSize: 11 },
  favBtn: { padding: spacing.sm },
});
