import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Settings, Sparkles } from 'lucide-react-native';
import { GlassCard } from '@/components/ui/GlassBackground';
import BrandLogo from '@/components/ui/BrandLogo';
import { colors, spacing, typography } from '@/theme';

type DashboardTab = 'overview' | 'tools' | 'settings';

interface BusinessDashboardHeaderProps {
  name: string;
  type: string;
  plan?: string;
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
  logoUrl,
  activeTab,
  onTabChange,
  onOpenSettings,
}: BusinessDashboardHeaderProps) {
  return (
    <View style={styles.wrap}>
      <GlassCard style={styles.hero}>
        <View style={styles.heroTop}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.logo} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Sparkles size={28} color={colors.primary} />
            </View>
          )}
          <View style={styles.heroText}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.type}>{type}</Text>
            {plan ? (
              <View style={styles.planBadge}>
                <Text style={styles.planText}>{plan === 'premium' ? 'Premium' : 'Basic'} Plan</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity style={styles.gear} onPress={onOpenSettings}>
            <Settings size={22} color={colors.primaryDark} />
          </TouchableOpacity>
        </View>
        <BrandLogo size="sm" centered={false} />
      </GlassCard>

      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => onTabChange(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  hero: { marginBottom: spacing.sm },
  heroTop: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  logo: { width: 56, height: 56, borderRadius: 28 },
  logoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.glass.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1, marginLeft: spacing.md },
  name: { ...typography.h2, fontSize: 20 },
  type: { ...typography.caption },
  planBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: colors.accentLight,
  },
  planText: { ...typography.label, color: colors.accent, fontSize: 11 },
  gear: { padding: spacing.sm },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.glass.backgroundStrong,
    borderRadius: 14,
    padding: 4,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: colors.white, shadowColor: colors.glass.shadow, shadowOpacity: 0.15, shadowRadius: 4, elevation: 2 },
  tabText: { ...typography.caption, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.primaryDark },
});
