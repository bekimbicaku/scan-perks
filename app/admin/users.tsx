import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Search, ShieldBan, Trash2, ShieldCheck } from 'lucide-react-native';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { loadAdminUsers, type AdminUserRow } from '@/lib/adminMetrics';
import { banUserAsAdmin, deleteUserAsAdmin, unbanUserAsAdmin } from '@/lib/adminApi';
import { stamp, outfit } from '@/theme';

type ConfirmState =
  | { type: 'ban'; user: AdminUserRow }
  | { type: 'unban'; user: AdminUserRow }
  | { type: 'delete'; user: AdminUserRow }
  | null;

function formatDate(value: Date | null): string {
  if (!value) return '—';
  return value.toLocaleDateString();
}

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setUsers(await loadAdminUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.id.toLowerCase().includes(q)
    );
  }, [users, search]);

  const runConfirmedAction = async () => {
    if (!confirm) return;
    setBusy(true);
    setActionError(null);
    try {
      if (confirm.type === 'ban') {
        await banUserAsAdmin(confirm.user.id);
      } else if (confirm.type === 'unban') {
        await unbanUserAsAdmin(confirm.user.id);
      } else {
        await deleteUserAsAdmin(confirm.user.id);
      }
      setConfirm(null);
      await load(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer
      scroll
      scrollProps={{
        refreshControl: <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />,
      }}
      contentStyle={styles.content}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/admin')}>
          <ArrowLeft size={18} color={stamp.deep} />
          <Text style={styles.backText}>Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.kicker}>Moderation</Text>
        <Text style={styles.title}>Users</Text>
        <Text style={styles.subtitle}>
          Ban disables sign-in and deactivates an owned venue. Delete removes the Auth user and
          profile (scans/rewards); owned venues are soft-deactivated, not cascade-deleted.
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <Search size={18} color={stamp.input} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, email, or id"
          placeholderTextColor={stamp.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {loading && users.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={stamp.sky} />
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {filtered.map((user) => (
        <View key={user.id} style={styles.card}>
          <View style={styles.cardMain}>
            <Text style={styles.name}>{user.name || 'Unnamed'}</Text>
            <Text style={styles.email}>{user.email || user.id}</Text>
            <Text style={styles.meta}>
              {user.hasBusiness ? 'Owner' : 'Customer'}
              {user.subscribed ? ' · paid' : user.planStatus ? ` · ${user.planStatus}` : ''}
              {user.banned ? ' · banned' : ''}
              {' · '}joined {formatDate(user.createdAt)}
            </Text>
          </View>
          <View style={styles.actions}>
            {user.banned ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.unbanButton]}
                onPress={() => setConfirm({ type: 'unban', user })}
              >
                <ShieldCheck size={16} color={stamp.mintText} />
                <Text style={[styles.actionText, { color: stamp.mintText }]}>Unban</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.banButton]}
                onPress={() => setConfirm({ type: 'ban', user })}
              >
                <ShieldBan size={16} color={stamp.amberText} />
                <Text style={[styles.actionText, { color: stamp.amberText }]}>Ban</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => setConfirm({ type: 'delete', user })}
            >
              <Trash2 size={16} color={stamp.danger} />
              <Text style={[styles.actionText, { color: stamp.danger }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {!loading && filtered.length === 0 ? (
        <Text style={styles.empty}>No users match.</Text>
      ) : null}

      <Modal visible={!!confirm} transparent animationType="fade" onRequestClose={() => !busy && setConfirm(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => !busy && setConfirm(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>
              {confirm?.type === 'ban'
                ? 'Ban this profile?'
                : confirm?.type === 'unban'
                  ? 'Unban this profile?'
                  : 'Delete this profile?'}
            </Text>
            <Text style={styles.modalBody}>
              {confirm?.type === 'ban'
                ? `${confirm.user.email || confirm.user.name} will be blocked from signing in. Prefer ban before hard delete.`
                : confirm?.type === 'unban'
                  ? `${confirm?.user.email || confirm?.user.name} will be able to sign in again. Their venue stays inactive until they or you re-enable it.`
                  : `Permanently delete ${confirm?.user.email || confirm?.user.name}? This removes Auth + user profile data (scans, rewards). Owned venues are deactivated, not fully cascade-deleted.`}
            </Text>
            {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                disabled={busy}
                onPress={() => {
                  setActionError(null);
                  setConfirm(null);
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  confirm?.type === 'delete' ? styles.confirmDelete : styles.confirmWarn,
                  busy && styles.disabled,
                ]}
                disabled={busy}
                onPress={runConfirmedAction}
              >
                <Text style={styles.confirmText}>{busy ? 'Working…' : 'Confirm'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  header: { gap: 4, marginBottom: 6 },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  backText: {
    fontFamily: outfit.medium,
    fontSize: 14,
    color: stamp.deep,
  },
  kicker: {
    fontFamily: outfit.semibold,
    fontSize: 12,
    color: stamp.sky,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  title: {
    fontFamily: outfit.extra,
    fontSize: 30,
    color: stamp.ink,
  },
  subtitle: {
    fontFamily: outfit.regular,
    fontSize: 13,
    color: stamp.muted,
    lineHeight: 18,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: stamp.white,
    borderWidth: 1,
    borderColor: stamp.line,
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    fontFamily: outfit.regular,
    fontSize: 15,
    color: stamp.ink,
    paddingVertical: 10,
  },
  center: { paddingVertical: 32, alignItems: 'center' },
  error: {
    fontFamily: outfit.medium,
    color: stamp.danger,
    fontSize: 14,
  },
  empty: {
    fontFamily: outfit.regular,
    color: stamp.muted,
    paddingVertical: 12,
  },
  card: {
    backgroundColor: stamp.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: stamp.line,
    padding: 16,
    gap: 12,
  },
  cardMain: { gap: 3 },
  name: {
    fontFamily: outfit.semibold,
    fontSize: 16,
    color: stamp.ink,
  },
  email: {
    fontFamily: outfit.regular,
    fontSize: 13,
    color: stamp.muted,
  },
  meta: {
    fontFamily: outfit.medium,
    fontSize: 12,
    color: stamp.dash,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  banButton: {
    backgroundColor: stamp.amberBg,
    borderColor: '#F5D9A0',
  },
  unbanButton: {
    backgroundColor: stamp.mintBg,
    borderColor: '#A7E8C7',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  actionText: {
    fontFamily: outfit.semibold,
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 42, 68, 0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: stamp.white,
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontFamily: outfit.bold,
    fontSize: 18,
    color: stamp.deep,
  },
  modalBody: {
    fontFamily: outfit.regular,
    fontSize: 14,
    color: stamp.muted,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: stamp.mist,
  },
  cancelText: {
    fontFamily: outfit.semibold,
    color: stamp.muted,
  },
  confirmButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 14,
  },
  confirmWarn: { backgroundColor: stamp.amber },
  confirmDelete: { backgroundColor: stamp.danger },
  confirmText: {
    fontFamily: outfit.semibold,
    color: stamp.white,
  },
  disabled: { opacity: 0.7 },
});
