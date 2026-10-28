import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Button, ErrorText, Loading, Page } from '../components/UI';
import { LoginScreen, RegisterScreen } from '../screens/AuthScreens';
import { ProductDetailScreen, ProductListScreen } from '../screens/ProductScreens';
import CartScreen from '../screens/CartScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import { OrderDetailScreen, OrderHistoryScreen } from '../screens/OrderScreens';
import ProfileScreen from '../screens/ProfileScreen';
import { colors, styles as s } from '../theme';
const Stack = createNativeStackNavigator(), Tabs = createBottomTabNavigator();
const icons = { Products: 'storefront-outline', Cart: 'bag-outline', Orders: 'receipt-outline', Profile: 'person-outline' };
function MainTabs() {
  const { user } = useAuth();
  return <Tabs.Navigator key={user?.id || 'guest'} screenOptions={({ route }) => ({ tabBarActiveTintColor: colors.primary, headerStyle: { backgroundColor: 'white' }, headerTintColor: colors.text, tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} size={size} color={color} /> })}>
    <Tabs.Screen name="Products" component={ProductListScreen} options={{ title: 'Sản phẩm' }} />
    <Tabs.Screen name="Cart" component={CartScreen} options={{ title: 'Giỏ hàng' }} />
    <Tabs.Screen name="Orders" component={OrderHistoryScreen} options={{ title: 'Đơn hàng' }} />
    <Tabs.Screen name="Profile" component={ProfileScreen} options={{ title: 'Tài khoản' }} />
  </Tabs.Navigator>;
}
export default function RootNavigator() {
  const { user, loading, startupError, restore, clear } = useAuth();
  if (loading) return <Loading />;
  if (startupError) return <Page><Text style={s.title}>Chưa thể khôi phục phiên</Text><ErrorText message={startupError} /><Button title="Thử kết nối lại" onPress={restore} /><Button ghost title="Tiếp tục với tư cách khách" onPress={clear} /></Page>;
  return <NavigationContainer><Stack.Navigator screenOptions={{ headerTintColor: colors.text, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
    <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Chi tiết sản phẩm' }} />
    {user ? <Stack.Group navigationKey="customer"><Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Đặt hàng' }} /><Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Chi tiết đơn hàng' }} /></Stack.Group> : <Stack.Group navigationKey="guest"><Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Đăng nhập' }} /><Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Đăng ký' }} /></Stack.Group>}
  </Stack.Navigator></NavigationContainer>;
}
