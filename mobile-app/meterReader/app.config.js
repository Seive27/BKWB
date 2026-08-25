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
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
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
          backgroundColor: '#208AEF',
          image: './assets/images/splash-icon.png',
          imageWidth: 76,
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
    },
  },
};
