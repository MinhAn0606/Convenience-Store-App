import * as SecureStore from 'expo-secure-store';
const KEY = 'convenience-store-token';
export const readToken = () => SecureStore.getItemAsync(KEY);
export const saveToken = (token) => SecureStore.setItemAsync(KEY, token);
export const removeToken = () => SecureStore.deleteItemAsync(KEY);
