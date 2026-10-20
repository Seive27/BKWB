import 'dotenv/config';

export default {
  expo: {
    name: 'meterReader',
    slug: 'meterReader',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'meterreader',
    userInterfaceStyle: 'automatic',
    android: {
      package: 'com.bkwb.meterreader',
      versionCode: 1,
      adaptiveIcon: {
        backgroundColor: '#EEF7F4',
        foregroundImage: './assets/images/android-icon-foreground.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#114C41',
          image: './assets/images/splash-icon.png',
          imageWidth: 76,
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission:
            'Allow Meter Reader to access your photos for profile pictures and meter readings.',
          cameraPermission:
            'Allow Meter Reader to use your camera to photograph meters and update your profile picture.',
          microphonePermission: false,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      SUPABASE_URL: process.env.VITE_SUPABASE_URL || '',
      SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || '',
      eas: {
        projectId: '1523cba8-e029-4ceb-a1b4-9137933c59ac',
      },
    },
  },
};
