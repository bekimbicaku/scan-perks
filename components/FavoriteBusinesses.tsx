import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { Heart, MapPin, Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import { auth, getDb } from '@/lib/firebase';
import { toggleFavorite } from '@/lib/engagement';
import { GlassCard } from '@/components/ui/GlassBackground';
import SectionHeader from '@/components/ui/SectionHeader';
import { colors, spacing, stamp, outfit, venueMark } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';

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

    const unsub = onSnapshot(doc(getDb(), 'users', auth.currentUser.uid), async (snap) => {
      const ids: string[] = snap.data()?.favorites || [];
      setFavoriteIds(ids);

      const loaded = await Promise.all(
        ids.slice(0, 8).map(async (id) => {
          const biz = await getDoc(doc(getDb(), 'businesses', id));
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

  return (
    <View style={styles.wrap}>
      <SectionHeader
        title="Favorites"
        subtitle="Quick access to places you love"
        icon={<Heart size={26} color={stamp.danger} />}
        iconEnd
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
        {favorites.map((biz) => (
          <TouchableOpacity key={biz.id} style={styles.cardHit} onPress={() => router.push(`/business/${biz.id}`)}>
            <GlassCard stamp style={styles.card}>
              {biz.logoUrl ? (
                <Image source={{ uri: biz.logoUrl }} style={styles.logo} />
              ) : (
                <LinearGradient
                  colors={[stamp.sky, stamp.deep]}
                  start={{ x: 0.1, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logo}
                >
                  <Text style={styles.mark}>{venueMark(biz.name)}</Text>
                </LinearGradient>
              )}
              <Text style={styles.name} numberOfLines={1}>{biz.name}</Text>
              <View style={styles.meta}>
                <MapPin size={16} color={stamp.muted} />
                <Text style={styles.type}>{biz.type}</Text>
              </View>
            </GlassCard>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.find} onPress={() => router.push('/scan')} accessibilityRole="button">
          <View style={styles.findIcon}>
            <Plus size={22} color={stamp.deep} />
          </View>
          <Text style={styles.findText}>Find places</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export function FavoriteButton({ businessId }: { businessId: string }) {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = onSnapshot(doc(getDb(), 'users', auth.currentUser.uid), (snap) => {
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
  wrap: { paddingHorizontal: 20, marginTop: 28, marginBottom: spacing.md },
  list: { flexDirection: 'row', gap: 12, marginTop: 14, paddingRight: 4 },
  cardHit: { width: 168 },
  card: { borderRadius: 26, gap: 8, minHeight: 150, width: 168 },
  logo: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  mark: { fontFamily: outfit.extra, fontSize: 20, color: stamp.white },
  name: { fontFamily: outfit.extra, fontSize: 17, color: stamp.deep },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  type: { fontFamily: outfit.regular, fontSize: 13, color: stamp.muted },
  find: {
    width: 168,
    minHeight: 150,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: stamp.dash,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  findIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: stamp.skyTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  findText: { fontFamily: outfit.bold, fontSize: 14, color: stamp.deep },
  favBtn: { padding: spacing.sm },
});
