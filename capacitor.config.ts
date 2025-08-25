import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kiosk.app',
  appName: 'Interactive Kiosk',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
