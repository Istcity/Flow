/** Release build'de .env yüklenmezse TestFlight çöker — plist değerleri yedek */
const FIREBASE_DEFAULTS = {
  apiKey: 'AIzaSyCyOBzZ9mKSb5-98qC4J4DkMDMhACzi-i4',
  authDomain: 'flow-e5f5a.firebaseapp.com',
  projectId: 'flow-e5f5a',
  storageBucket: 'flow-e5f5a.firebasestorage.app',
  messagingSenderId: '626955387756',
  appId: '1:626955387756:ios:8ce73e5f9d4fc4ffeb2949',
};

const ADMOB_APP_ID = 'ca-app-pub-8420759480841389~8354224627';

const appJson = require('./app.json');

export default {
  expo: {
    ...appJson.expo,
    plugins: [
      ...(appJson.expo.plugins ?? []),
      [
        'react-native-google-mobile-ads',
        {
          androidAppId: ADMOB_APP_ID,
          iosAppId: ADMOB_APP_ID,
        },
      ],
    ],
    extra: {
      ...appJson.expo.extra,
      firebase: {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? FIREBASE_DEFAULTS.apiKey,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? FIREBASE_DEFAULTS.authDomain,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? FIREBASE_DEFAULTS.projectId,
        storageBucket:
          process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? FIREBASE_DEFAULTS.storageBucket,
        messagingSenderId:
          process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? FIREBASE_DEFAULTS.messagingSenderId,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? FIREBASE_DEFAULTS.appId,
      },
    },
  },
  'react-native-google-mobile-ads': {
    android_app_id: ADMOB_APP_ID,
    ios_app_id: ADMOB_APP_ID,
  },
};
