require('dotenv').config();

const appJson = require('./app.json');

module.exports = {
  ...appJson,
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    googlePlacesApiKey: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '',
    googlePlacesApiKeyAndroid: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY_ANDROID ?? '',
  },
};
