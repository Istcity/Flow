import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { spacing, useThemeColors, radius } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import {
  subscribeSavedContacts,
  createSavedContact,
  deleteSavedContact,
} from '@/services/firebase/contacts';
import {
  subscribeContactGroups,
  createContactGroup,
  deleteContactGroup,
} from '@/services/firebase/contactGroups';
import type { ContactGroup, SavedContact, UserRole } from '@/types';
import { ScreenWithAds } from '@/components/ads/ScreenWithAds';

type Tab = 'contacts' | 'groups';

export function PersonnelScreen() {
  const colors = useThemeColors();
  const profile = useAuthStore((s) => s.profile);
  const [tab, setTab] = useState<Tab>('contacts');

  const [contacts, setContacts] = useState<SavedContact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);

  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<Exclude<UserRole, 'admin'>>('workshop');
  const [saving, setSaving] = useState(false);

  const [groupName, setGroupName] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [groupSaving, setGroupSaving] = useState(false);

  useEffect(() => {
    if (!profile?.orgId) return;
    const unsubC = subscribeSavedContacts(profile.orgId, setContacts);
    const unsubG = subscribeContactGroups(profile.orgId, setGroups);
    return () => {
      unsubC();
      unsubG();
    };
  }, [profile?.orgId]);

  const handleAddContact = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await createSavedContact(profile, {
        email: newEmail,
        displayName: newName,
        defaultRole: newRole,
      });
      setNewEmail('');
      setNewName('');
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Kayıt başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContact = (contact: SavedContact) => {
    Alert.alert('Sil', `${contact.displayName} rehberden silinsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void deleteSavedContact(contact.id).catch((err: unknown) => {
            Alert.alert('Hata', err instanceof Error ? err.message : 'Silinemedi.');
          });
        },
      },
    ]);
  };

  const toggleContactForGroup = (contactId: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
  };

  const handleCreateGroup = async () => {
    if (!profile) return;
    setGroupSaving(true);
    try {
      await createContactGroup(profile, {
        name: groupName,
        contactIds: selectedContactIds,
      });
      setGroupName('');
      setSelectedContactIds([]);
      Alert.alert('Grup oluşturuldu', `"${groupName.trim()}" kaydedildi.`);
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Grup oluşturulamadı.');
    } finally {
      setGroupSaving(false);
    }
  };

  const handleDeleteGroup = (group: ContactGroup) => {
    Alert.alert('Sil', `"${group.name}" grubu silinsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void deleteContactGroup(group.id).catch((err: unknown) => {
            Alert.alert('Hata', err instanceof Error ? err.message : 'Silinemedi.');
          });
        },
      },
    ]);
  };

  const roleLabel = (role: Exclude<UserRole, 'admin'>) =>
    role === 'workshop' ? 'Atölye' : 'Takip';

  return (
    <ScreenWithAds>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text variant="hero">Personel Rehberi</Text>
          <Button title="Geri" variant="ghost" onPress={() => router.back()} />
        </View>

        <Text variant="caption" muted>
          Daha önce atadığınız kişiler burada saklanır. Gruplar oluşturup siparişlere hızlı atayabilirsiniz.
        </Text>

        <View style={styles.tabs}>
          <Button
            title="Kişiler"
            variant={tab === 'contacts' ? 'primary' : 'secondary'}
            onPress={() => setTab('contacts')}
            style={styles.tabBtn}
          />
          <Button
            title="Gruplar"
            variant={tab === 'groups' ? 'primary' : 'secondary'}
            onPress={() => setTab('groups')}
            style={styles.tabBtn}
          />
        </View>

        {tab === 'contacts' ? (
          <>
            <Card padding="lg" style={styles.section}>
              <Text variant="subtitle">Yeni Kişi Kaydet</Text>
              <Input label="E-posta" value={newEmail} onChangeText={setNewEmail} autoCapitalize="none" />
              <Input label="Ad Soyad" value={newName} onChangeText={setNewName} />
              <View style={styles.roleRow}>
                <Button
                  title="Atölye"
                  variant={newRole === 'workshop' ? 'primary' : 'secondary'}
                  onPress={() => setNewRole('workshop')}
                  style={styles.roleBtn}
                />
                <Button
                  title="Takip Elemanı"
                  variant={newRole === 'tracker' ? 'primary' : 'secondary'}
                  onPress={() => setNewRole('tracker')}
                  style={styles.roleBtn}
                />
              </View>
              <Button title="Rehbere Ekle" onPress={handleAddContact} loading={saving} fullWidth />
            </Card>

            <Card padding="lg" style={styles.section}>
              <Text variant="subtitle">Kayıtlı Kişiler ({contacts.length})</Text>
              {contacts.length === 0 ? (
                <Text muted>Henüz kişi yok. Atama yaptıkça otomatik eklenir.</Text>
              ) : (
                contacts.map((contact) => (
                  <View key={contact.id} style={[styles.listRow, { borderColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text variant="label">{contact.displayName}</Text>
                      <Text variant="caption" muted>
                        {contact.email} · {roleLabel(contact.defaultRole)}
                      </Text>
                    </View>
                    <Button title="Sil" variant="ghost" onPress={() => handleDeleteContact(contact)} />
                  </View>
                ))
              )}
            </Card>
          </>
        ) : (
          <>
            <Card padding="lg" style={styles.section}>
              <Text variant="subtitle">Yeni Grup</Text>
              <Input label="Grup Adı" value={groupName} onChangeText={setGroupName} placeholder="Örn: Kesim Ekibi" />
              <Text variant="caption" muted>
                Gruba eklenecek kişileri seçin ({selectedContactIds.length} seçili)
              </Text>
              {contacts.length === 0 ? (
                <Text muted>Önce kişi kaydedin.</Text>
              ) : (
                contacts.map((contact) => {
                  const selected = selectedContactIds.includes(contact.id);
                  return (
                    <Pressable
                      key={contact.id}
                      onPress={() => toggleContactForGroup(contact.id)}
                      style={[
                        styles.selectRow,
                        {
                          backgroundColor: selected ? colors.progressTrack : colors.inputBackground,
                          borderColor: selected ? colors.accent : colors.border,
                        },
                      ]}
                    >
                      <Text variant="label">{contact.displayName}</Text>
                      <Text variant="caption" muted>
                        {selected ? '✓ Seçili' : roleLabel(contact.defaultRole)}
                      </Text>
                    </Pressable>
                  );
                })
              )}
              <Button
                title="Grubu Kaydet"
                onPress={handleCreateGroup}
                loading={groupSaving}
                fullWidth
                disabled={contacts.length === 0}
              />
            </Card>

            <Card padding="lg" style={styles.section}>
              <Text variant="subtitle">Kayıtlı Gruplar ({groups.length})</Text>
              {groups.length === 0 ? (
                <Text muted>Henüz grup yok.</Text>
              ) : (
                groups.map((group) => {
                  const members = contacts.filter((c) => group.contactIds.includes(c.id));
                  return (
                    <View key={group.id} style={[styles.listRow, { borderColor: colors.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text variant="label">{group.name}</Text>
                        <Text variant="caption" muted>
                          {members.map((m) => m.displayName).join(', ') || 'Üye yok'}
                        </Text>
                      </View>
                      <Button title="Sil" variant="ghost" onPress={() => handleDeleteGroup(group)} />
                    </View>
                  );
                })
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
    </ScreenWithAds>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabs: { flexDirection: 'row', gap: spacing.sm },
  tabBtn: { flex: 1 },
  section: { gap: spacing.sm },
  roleRow: { flexDirection: 'row', gap: spacing.sm },
  roleBtn: { flex: 1 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  selectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
});
