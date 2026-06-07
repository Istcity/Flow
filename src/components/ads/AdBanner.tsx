import { View, StyleSheet } from 'react-native';
import { getBannerModule, isAdsAvailable } from '@/services/adMobService';
import { ADMOB_BANNER_UNIT_ID } from '@/constants/ads';
import { useThemeColors } from '@/constants/theme';

interface Props {
  placement: 'top' | 'bottom';
}

export function AdBanner({ placement }: Props) {
  const colors = useThemeColors();

  if (!isAdsAvailable()) return null;

  const mod = getBannerModule();
  if (!mod) return null;

  const { BannerAd, BannerAdSize } = mod;

  return (
    <View
      style={[
        styles.wrap,
        placement === 'top' ? styles.top : styles.bottom,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <BannerAd
        unitId={ADMOB_BANNER_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  top: { borderBottomWidth: StyleSheet.hairlineWidth },
  bottom: { borderTopWidth: StyleSheet.hairlineWidth },
});
