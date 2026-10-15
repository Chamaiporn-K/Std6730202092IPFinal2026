import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './constants';

type ApiOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

const AUTH_TOKEN_KEY = 'stockwise_auth_token';
let authToken: string | null = null;

export async function loadAuthToken() {
  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  authToken = token;
  return token;
}

export async function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export async function clearAuthSession() {
  authToken = null;
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
}

export async function apiCall(endpoint: string, options: ApiOptions = {}) {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${path}`;

  const config: ApiOptions = {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {}),
    },
  };

  const response = await fetch(url, config);
  const text = await response.text();

  let data: any;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const errorMessage = data?.error || data || response.statusText;
    throw new Error(errorMessage);
  }

  return data;
}
