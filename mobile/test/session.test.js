import React from 'react';
import { Text, Pressable } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { api } from '../src/api/store';
import { readToken, saveToken, removeToken } from '../src/storage/session';
import { setToken } from '../src/api/client';
jest.mock('../src/api/store', () => ({ api: { me: jest.fn(), login: jest.fn(), register: jest.fn(), logout: jest.fn() } }));
jest.mock('../src/storage/session', () => ({ readToken: jest.fn(), saveToken: jest.fn(), removeToken: jest.fn() }));
jest.mock('../src/api/client', () => ({ setToken: jest.fn(), onUnauthorized: jest.fn() }));
function SessionView() {
  const a = useAuth();
  return <><Text>{a.loading ? 'loading' : a.user ? a.user.email : 'guest'}</Text><Text>{a.startupError}</Text><Pressable onPress={() => a.login({ email: 'user@test.com', password: 'secret' }).catch(() => {})}><Text>login</Text></Pressable><Pressable onPress={() => a.logout().catch(() => {})}><Text>logout</Text></Pressable></>;
}
const mount = () => render(<AuthProvider><SessionView /></AuthProvider>);
beforeEach(() => { readToken.mockResolvedValue(null); saveToken.mockResolvedValue(); removeToken.mockResolvedValue(); });
test('login persists the token securely and logout clears it even when offline', async () => {
  api.login.mockResolvedValue({ token: 'session-token', user: { id: 'u1', email: 'user@test.com', role: 'customer' } });
  api.logout.mockRejectedValue(new Error('offline'));
  mount(); await screen.findByText('guest'); fireEvent.press(screen.getByText('login'));
  await screen.findByText('user@test.com'); expect(saveToken).toHaveBeenCalledWith('session-token');
  fireEvent.press(screen.getByText('logout')); await screen.findByText('guest');
  expect(removeToken).toHaveBeenCalled(); expect(setToken).toHaveBeenLastCalledWith(null);
});
test('restores a saved authenticated customer session', async () => {
  readToken.mockResolvedValue('saved-token'); api.me.mockResolvedValue({ id: 'u1', email: 'user@test.com', role: 'customer' });
  mount(); await screen.findByText('user@test.com'); expect(setToken).toHaveBeenCalledWith('saved-token');
});
test('temporary network failure keeps stored credentials available for retry', async () => {
  readToken.mockResolvedValue('saved-token'); api.me.mockRejectedValue(new Error('Không kết nối được'));
  mount(); await screen.findByText('Không kết nối được'); expect(removeToken).not.toHaveBeenCalled();
});
test('expired stored session is cleared instead of restoring a user', async () => {
  readToken.mockResolvedValue('expired-token'); api.me.mockRejectedValue(Object.assign(new Error('Expired'), { status: 401 }));
  mount(); await screen.findByText('guest'); await waitFor(() => expect(removeToken).toHaveBeenCalled());
});
