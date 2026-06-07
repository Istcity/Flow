import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { spacing, useThemeColors, radius } from '@/constants/theme';
import { subscribeSavedContacts } from '@/services/firebase/contacts';
import { subscribeContactGroups } from '@/services/firebase/contactGroups';
import { resolveContactsByIds } from '@/services/firebase/contacts';
import type { ContactGroup, PendingAssignment, SavedContact, UserRole } from '@/types';

interface PersonnelPickerProps {
  orgId: string;
  onSelectContact: (contact: SavedContact) => void;
  onSelectGroup: (members: PendingAssignment[], groupName: string) => void;
  selectedEmails?: string[];
}

export function PersonnelPicker({
  orgId,
  onSelectContact,
  onSelectGroup,
  selectedEmails = [],
}: PersonnelPickerProps) {
  const colors = useThemeColors();
  const [contacts, setContacts] = useState<SavedContact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);

  useEffect(() => {
    if (!orgId) return;
    const unsubContacts = subscribeSavedContacts(orgId, setContacts);
    const unsubGroups = subscribeContactGroups(orgId, setGroups);
    return () => {
      unsubContacts();
      unsubGroups();
    };
  }, [orgId]);

  const handleGroupPress = (group: ContactGroup) => {
    const members = resolveContactsByIds(contacts, group.contactIds);
    if (members.length === 0) {
      Alert.alert('Boş grup', 'Bu grupta kayıtlı kişi yok.');
      return;
    }
    Alert.alert(
      group.name,
      `${members.length} kişiyi listeye eklemek istiyor musunuz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Ekle',
          onPress: () =>
            onSelectGroup(
              members.map((m) => ({
                email: m.email,
                displayName: m.displayName,
                role: m.defaultRole,
              })),
              group.name
            ),
        },
      ]
    );
  };

  const roleLabel = (role: Exclude<UserRole, 'admin'>) =>
    role === 'workshop' ? 'Atölye' : 'Takip';

  if (contacts.length === 0 && groups.length === 0) {
    return (
      <Text variant="caption" muted>
        Henüz kayıtlı kişi yok. Personel Rehberi'nden ekleyin veya atama yapınca otomatik kaydedilir.
      </Text>
    );
  }

  return (
    <View style={styles.wrap}>
      {groups.length > 0 ? (
        <View style={styles.block}>
          <Text variant="caption" muted>
            Gruplar
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
            {groups.map((group) => {
              const count = group.contactIds.length;
              return (
                <Pressable
                  key={group.id}
                  onPress={() => handleGroupPress(group)}
                  style={[styles.groupChip, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                >
                  <Text variant="label">{group.name}</Text>
                  <Text variant="caption" muted>
                    {count} kişi
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {contacts.length > 0 ? (
        <View style={styles.block}>
          <Text variant="caption" muted>
            Kayıtlı kişiler
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
            {contacts.map((contact) => {
              const selected = selectedEmails.includes(contact.email);
              return (
                <Pressable
                  key={contact.id}
                  onPress={() => onSelectContact(contact)}
                  style={[
                    styles.contactChip,
                    {
                      backgroundColor: selected ? colors.accent : colors.inputBackground,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{ color: selected ? colors.accentText : colors.text }}
                  >
                    {contact.displayName}
                  </Text>
                  <Text
                    variant="caption"
                    style={{ color: selected ? colors.accentText : colors.textMuted, fontSize: 10 }}
                  >
                    {roleLabel(contact.defaultRole)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  block: { gap: spacing.xs },
  row: { flexGrow: 0 },
  contactChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    marginRight: spacing.sm,
    minWidth: 88,
  },
  groupChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    marginRight: spacing.sm,
    minWidth: 100,
  },
});
