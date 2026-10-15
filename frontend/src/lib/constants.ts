import { Platform } from 'react-native';

// Android Emulator uses this address to reach the development computer.
const localApi = Platform.OS === 'android' ? 'http://10.0.2.2:3012/api' : 'http://localhost:3012/api';
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || localApi).replace(/\/$/, '');
