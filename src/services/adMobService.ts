import { Platform } from 'react-native';
import { ADMOB_INTERSTITIAL_UNIT_ID, AD_TAP_INTERVAL } from '@/constants/ads';

type MobileAdsModule = typeof import('react-native-google-mobile-ads');

let adsModule: MobileAdsModule | null | undefined;
let interstitial: ReturnType<MobileAdsModule['InterstitialAd']['createForAdRequest']> | null = null;
let interstitialLoaded = false;
let initialized = false;
let tapCount = 0;

function loadAdsModule(): MobileAdsModule | null {
  if (adsModule !== undefined) return adsModule;
  try {
    adsModule = require('react-native-google-mobile-ads') as MobileAdsModule;
  } catch {
    adsModule = null;
  }
  return adsModule;
}

export function isAdsAvailable(): boolean {
  return Platform.OS !== 'web' && loadAdsModule() != null;
}

export async function initializeAds(): Promise<void> {
  if (initialized || !isAdsAvailable()) return;
  initialized = true;

  const mod = loadAdsModule();
  if (!mod) return;

  try {
    await mod.default().initialize();
    preloadInterstitial(mod);
  } catch (err) {
    console.warn('[FLOW] AdMob init failed:', err);
  }
}

function preloadInterstitial(mod: MobileAdsModule): void {
  try {
    interstitial = mod.InterstitialAd.createForAdRequest(ADMOB_INTERSTITIAL_UNIT_ID);
    interstitial.addAdEventListener(mod.AdEventType.LOADED, () => {
      interstitialLoaded = true;
    });
    interstitial.addAdEventListener(mod.AdEventType.CLOSED, () => {
      interstitialLoaded = false;
      interstitial?.load();
    });
    interstitial.addAdEventListener(mod.AdEventType.ERROR, () => {
      interstitialLoaded = false;
    });
    interstitial.load();
  } catch (err) {
    console.warn('[FLOW] Interstitial preload failed:', err);
  }
}

function showInterstitialIfReady(): void {
  if (!interstitial || !interstitialLoaded) return;
  try {
    interstitial.show();
    interstitialLoaded = false;
  } catch {
    interstitialLoaded = false;
  }
}

/** Uygulama genelinde tıklama sayacı — her 5 tıklamada interstitial */
export function registerAdTap(): void {
  if (!isAdsAvailable()) return;
  tapCount += 1;
  if (tapCount % AD_TAP_INTERVAL === 0) {
    showInterstitialIfReady();
  }
}

export function wrapWithAdTap<T extends (...args: never[]) => void>(handler?: T): T | undefined {
  if (!handler) return undefined;
  const wrapped = ((...args: never[]) => {
    registerAdTap();
    handler(...args);
  }) as T;
  return wrapped;
}

export function getBannerModule(): MobileAdsModule | null {
  return loadAdsModule();
}
