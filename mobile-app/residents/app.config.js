import 'dotenv/config';

export default {
  expo: {
    name: 'residents',
    slug: 'residents',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'residents',
    userInterfaceStyle: 'automatic',
    android: {
      package: 'com.bkwb.residents',
      versionCode: 1,
      adaptiveIcon: {
        backgroundColor: '#EEF7F4',
        foregroundImage: './assets/images/android-icon-foreground.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-sharing',
      '@react-native-community/datetimepicker',
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
          photosPermission: 'Allow Residents to access your photos to update your profile picture.',
          cameraPermission: 'Allow Residents to use your camera to take a profile selfie.',
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
        projectId: '3dd64929-f6b2-42cc-8200-8a981b369a92',
      },
    },
  },
};
