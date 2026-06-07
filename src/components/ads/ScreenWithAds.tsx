import { type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { AdBanner } from './AdBanner';

interface Props {
  children: ReactNode;
}

/** Üst + alt banner ile ekran sarmalayıcı */
export function ScreenWithAds({ children }: Props) {
  return (
    <View style={styles.root}>
      <AdBanner placement="top" />
      <View style={styles.content}>{children}</View>
      <AdBanner placement="bottom" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
});
