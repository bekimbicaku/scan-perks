import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Gift, QrCode } from 'lucide-react-native';
import GlassButton from '@/components/ui/GlassButton';
import { stamp, outfit, venueMark } from '@/theme';

interface LiveVenueCardProps {
  name: string;
  type?: string;
  reward: string;
  scansRequired: number;
  totalScans?: number;
  onOpen: () => void;
  onScan: () => void;
}

export default function LiveVenueCard({
  name,
  type,
  reward,
  scansRequired,
  totalScans = 0,
  onOpen,
  onScan,
}: LiveVenueCardProps) {
  const required = Math.max(1, scansRequired || 1);
  const inCycle = totalScans % required;
  const filled = totalScans > 0 && inCycle === 0 ? required : inCycle;
  const newest = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    if (filled <= 0) return;
    newest.setValue(0.6);
    Animated.spring(newest, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }, [filled, newest]);

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.identity}>
          <LinearGradient
            colors={[stamp.sky, stamp.deep]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mark}
          >
            <Text style={styles.markText}>{venueMark(name)}</Text>
          </LinearGradient>
          <View style={styles.identityText}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            {type ? <Text style={styles.type}>{type}</Text> : null}
          </View>
          <View style={styles.live}>
            <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
            <Text style={styles.liveText}>Now live</Text>
          </View>
        </View>

        <View style={styles.rewardRow}>
          <Gift size={20} color={stamp.deep} />
          <Text style={styles.reward}>
            {required} stamps · {reward}
          </Text>
        </View>

        <View style={styles.grid}>
          {Array.from({ length: required }).map((_, index) => {
            const last = index === required - 1;
            const earned = index < filled;
            const slot = (
              <View
                style={[
                  styles.slot,
                  earned && !last && styles.slotFilled,
                  last && styles.slotGift,
                ]}
              >
                {last ? (
                  <Gift size={20} color={stamp.amberText} />
                ) : earned ? (
                  <Check size={18} color={stamp.ink} strokeWidth={3} />
                ) : (
                  <Text style={styles.slotNum}>{index + 1}</Text>
                )}
              </View>
            );
            if (earned && index === filled - 1) {
              return (
                <Animated.View key={index} style={[styles.cell, { transform: [{ scale: newest }] }]}>
                  {slot}
                </Animated.View>
              );
            }
            return (
              <View key={index} style={styles.cell}>
                {slot}
              </View>
            );
          })}
        </View>
        <Text style={styles.count}>
          {filled} of {required}
          {filled === 0 ? ' · your first stamp is one scan away' : ''}
        </Text>
      </View>

      <View style={styles.perforation}>
        <View style={styles.notchLeft} />
        <View style={styles.notchRight} />
      </View>

      <View style={styles.bottom}>
        <Text style={styles.instruction}>Open the Scan tab. Your camera app will not open this QR.</Text>
        <GlassButton
          appearance="stamp"
          label="Open Scan tab"
          onPress={onScan}
          icon={<QrCode size={20} color={stamp.ink} />}
        />
        <GlassButton appearance="stamp" variant="ghost" label="View venue" onPress={onOpen} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: stamp.white,
    borderRadius: stamp.radiusTicket,
    shadowColor: stamp.deep,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 40,
    elevation: 6,
  },
  top: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 18 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mark: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: stamp.sky,
  },
  markText: { fontFamily: outfit.extra, fontSize: 20, color: stamp.white },
  identityText: { flex: 1, minWidth: 0 },
  name: { fontFamily: outfit.extra, fontSize: 21, letterSpacing: -0.3, color: stamp.deep },
  type: { fontFamily: outfit.regular, fontSize: 14, color: stamp.muted, marginTop: 2 },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: stamp.mintBg,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: stamp.live },
  liveText: { fontFamily: outfit.bold, fontSize: 12, color: stamp.mintText },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 14 },
  reward: { fontFamily: outfit.bold, fontSize: 15, color: stamp.deep, flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '20%', aspectRatio: 1, padding: 5 },
  slot: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: stamp.dash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotFilled: {
    backgroundColor: stamp.sky,
    borderStyle: 'solid',
    borderColor: stamp.sky,
  },
  slotGift: {
    backgroundColor: stamp.amberBg,
    borderStyle: 'solid',
    borderColor: stamp.amber,
  },
  slotNum: { fontFamily: outfit.bold, fontSize: 14, color: stamp.muted },
  count: { marginTop: 12, fontFamily: outfit.semibold, fontSize: 13, color: stamp.muted },
  perforation: {
    height: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#BFD9E8',
    marginHorizontal: 18,
  },
  notchLeft: {
    position: 'absolute',
    left: -32,
    top: -15,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: stamp.mist,
  },
  notchRight: {
    position: 'absolute',
    right: -32,
    top: -15,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: stamp.mist,
  },
  bottom: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20, gap: 10 },
  instruction: { fontFamily: outfit.regular, fontSize: 14, lineHeight: 20, color: stamp.muted },
});
