import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings } from 'lucide-react-native';
import BrandLogo from '@/components/ui/BrandLogo';
import { stamp, outfit, venueMark } from '@/theme';

type DashboardTab = 'overview' | 'tools' | 'settings';

interface BusinessDashboardHeaderProps {
  name: string;
  type: string;
  plan?: string;
  planLabel?: string;
  logoUrl?: string;
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  onOpenSettings: () => void;
}

const TABS: { id: DashboardTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'tools', label: 'Tools' },
  { id: 'settings', label: 'Settings' },
];

export default function BusinessDashboardHeader({
  name,
  type,
  plan,
  planLabel,
  logoUrl,
  activeTab,
  onTabChange,
  onOpenSettings,
}: BusinessDashboardHeaderProps) {
  const planText = planLabel || (plan ? `${plan === 'premium' ? 'Premium' : 'Basic'} Plan` : '');

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['#0E4C78', stamp.deep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.glow} />
        <View style={styles.heroTop}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.logo} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoMark}>{venueMark(name)}</Text>
            </View>
          )}
          <View style={styles.heroText}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            <Text style={styles.type}>{type}</Text>
            {planText ? (
              <View style={styles.planBadge}>
                <Text style={styles.planText}>{planText}</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.gear}
            onPress={onOpenSettings}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Settings size={20} color={stamp.white} />
          </TouchableOpacity>
        </View>
        <BrandLogo size="sm" centered={false} tone="light" />
      </LinearGradient>

      <View style={styles.tabs}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => onTabChange(tab.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingTop: 8 },
  hero: {
    borderRadius: 28,
    padding: 18,
    overflow: 'hidden',
    marginBottom: 14,
  },
  glow: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(56, 189, 248, 0.35)',
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  logo: { width: 56, height: 56, borderRadius: 18 },
  logoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMark: { fontFamily: outfit.extra, fontSize: 18, color: stamp.white },
  heroText: { flex: 1, marginLeft: 12, minWidth: 0 },
  name: { fontFamily: outfit.extra, fontSize: 22, letterSpacing: -0.4, color: stamp.white },
  type: { fontFamily: outfit.regular, fontSize: 14, color: 'rgba(255,255,255,0.82)', marginTop: 2 },
  planBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  planText: { fontFamily: outfit.bold, fontSize: 12, color: stamp.white },
  gear: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: stamp.white,
    borderRadius: 18,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: stamp.line,
  },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  tabActive: { backgroundColor: stamp.ink },
  tabText: { fontFamily: outfit.semibold, fontSize: 15, color: stamp.muted },
  tabTextActive: { fontFamily: outfit.bold, color: stamp.white },
});
