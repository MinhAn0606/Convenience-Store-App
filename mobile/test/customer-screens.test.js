import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen, RegisterScreen } from '../src/screens/AuthScreens';
import CheckoutScreen from '../src/screens/CheckoutScreen';
import CartScreen from '../src/screens/CartScreen';
import { OrderHistoryScreen } from '../src/screens/OrderScreens';
import ProfileScreen from '../src/screens/ProfileScreen';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/api/store';
jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../src/api/store', () => ({ api: {
  preview: jest.fn(), checkout: jest.fn(), cart: jest.fn(), updateItem: jest.fn(), removeItem: jest.fn(), orders: jest.fn(), history: jest.fn(), profile: jest.fn(), updateProfile: jest.fn(), password: jest.fn(),
} }));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: (callback) => { require('react').useEffect(callback, [callback]); } }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'stable-checkout-key') }));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
const navigation = { navigate: jest.fn(), replace: jest.fn() };
let auth;
beforeEach(() => {
  auth = { user: { id: 'u1', email: 'customer@test.com' }, login: jest.fn(), register: jest.fn(), logout: jest.fn(), updateUser: jest.fn() };
  useAuth.mockReturnValue(auth);
});
test('login submits normalized credentials and shows API errors', async () => {
  auth.login.mockRejectedValueOnce(new Error('Sai mật khẩu'));
  render(<LoginScreen navigation={navigation} />);
  fireEvent.changeText(screen.getByLabelText('Email'), ' CUSTOMER@test.com ');
  fireEvent.changeText(screen.getByLabelText('Mật khẩu'), 'wrong');
  fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  await screen.findByText('Sai mật khẩu');
  expect(auth.login).toHaveBeenCalledWith(expect.objectContaining({ email: 'customer@test.com', password: 'wrong' }));
});
test('register rejects mismatched password before API call', async () => {
  render(<RegisterScreen navigation={navigation} />);
  fireEvent.changeText(screen.getByLabelText('Email'), 'user@test.com');
  fireEvent.changeText(screen.getByLabelText('Họ và tên'), 'Khách');
  fireEvent.changeText(screen.getByLabelText('Mật khẩu'), 'Password123');
  fireEvent.changeText(screen.getByLabelText('Nhập lại mật khẩu'), 'different');
  fireEvent.press(screen.getByRole('button', { name: 'Đăng ký' }));
  expect(auth.register).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toBeTruthy();
});
test('guest cart prompts for login', () => {
  useAuth.mockReturnValue({ user: null });
  render(<CartScreen navigation={navigation} />);
  fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(navigation.navigate).toHaveBeenCalledWith('Login');
  expect(api.cart).not.toHaveBeenCalled();
});
test('cart adjusts quantity using backend totals', async () => {
  const cart = { items: [{ productId: 'p1', name: 'Trà', unitPrice: 12000, quantity: 1, stockQuantity: 5, lineTotal: 12000 }], issues: [], subtotal: 12000 };
  api.cart.mockResolvedValue(cart);
  api.updateItem.mockResolvedValue({ ...cart, items: [{ ...cart.items[0], quantity: 2, lineTotal: 24000 }], subtotal: 24000 });
  render(<CartScreen navigation={navigation} />);
  await screen.findByText('Trà');
  fireEvent.press(screen.getByRole('button', { name: '+' }));
  await waitFor(() => expect(api.updateItem).toHaveBeenCalledWith('p1', 2));
  await screen.findByText('2');
});
const summary = { items: [{ productId: 'p1', name: 'Trà', quantity: 1, lineTotal: 12000 }], subtotal: 12000, promotionDiscount: 0, totalAmount: 12000, issues: [], canCheckout: true, store: { name: 'Store', address: '123 Street' } };
test('checkout preserves idempotency key on an unknown network outcome', async () => {
  api.preview.mockResolvedValue(summary);
  api.checkout.mockRejectedValueOnce(new Error('Mất kết nối')).mockResolvedValueOnce({ order: { _id: 'order1' } });
  render(<CheckoutScreen navigation={navigation} />);
  await screen.findByRole('button', { name: 'Đặt hàng' });
  fireEvent.press(screen.getByRole('button', { name: 'Đặt hàng' }));
  await screen.findByText('Mất kết nối');
  fireEvent.press(screen.getByRole('button', { name: 'Đặt hàng' }));
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('OrderDetail', { id: 'order1', startPayment: false }));
  expect(api.checkout).toHaveBeenNthCalledWith(1, expect.objectContaining({ expectedTotal: 12000, paymentMethod: 'cash' }), 'stable-checkout-key');
  expect(api.checkout.mock.calls[1][1]).toBe(api.checkout.mock.calls[0][1]);
});
test('checkout blocks submission when stock is unavailable', async () => {
  api.preview.mockResolvedValue({ ...summary, canCheckout: false, issues: [{ name: 'Trà' }] });
  render(<CheckoutScreen navigation={navigation} />);
  const button = await screen.findByRole('button', { name: 'Đặt hàng' });
  fireEvent.press(button);
  expect(api.checkout).not.toHaveBeenCalled();
});
test('orders switch from active orders to completed history', async () => {
  api.orders.mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 });
  api.history.mockResolvedValue({ items: [{ _id: 'o1', orderCode: 'CM-01', status: 'completed', createdAt: '2026-10-28T00:00:00Z', itemCount: 1, totalAmount: 12000 }], total: 1, page: 1, limit: 10 });
  render(<OrderHistoryScreen navigation={navigation} />);
  await waitFor(() => expect(api.orders).toHaveBeenCalled());
  fireEvent.press(screen.getByRole('button', { name: 'Lịch sử' }));
  await screen.findByText('#CM-01');
  fireEvent.press(screen.getByRole('button', { name: 'Xem chi tiết' }));
  expect(navigation.navigate).toHaveBeenCalledWith('OrderDetail', { id: 'o1' });
});
test('profile saves only editable customer fields', async () => {
  api.profile.mockResolvedValue({ fullName: 'Khách', phone: '0900000000' });
  api.updateProfile.mockResolvedValue({ fullName: 'Tên mới', phone: '0900000000' });
  render(<ProfileScreen navigation={navigation} />);
  await screen.findByLabelText('Họ và tên');
  fireEvent.changeText(screen.getByLabelText('Họ và tên'), 'Tên mới');
  fireEvent.press(screen.getByRole('button', { name: 'Lưu thông tin' }));
  await screen.findByText('Đã lưu thông tin.');
  expect(api.updateProfile).toHaveBeenCalledWith({ fullName: 'Tên mới', phone: '0900000000' });
});
