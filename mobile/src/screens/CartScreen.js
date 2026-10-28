import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/store';
import { AuthGate, Button, ErrorText, Loading, money, Page, Picture } from '../components/UI';
import { styles as s } from '../theme';
function Cart({ navigation }) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); setError(''); try { setData(await api.cart()); } catch (e) { setError(e.message); } finally { setLoading(false); } }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const change = async (id, qty) => {
    if (busy) return; setBusy(true); setError('');
    try { setData(await (qty === 0 ? api.removeItem(id) : api.updateItem(id, qty))); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  if (loading && !data) return <Loading />;
  return <Page><Text style={s.title}>Giỏ hàng của bạn</Text><ErrorText message={error} /><Button ghost title="Làm mới giỏ hàng" busy={loading} onPress={load} />
    {data?.items.map((item) => <View key={item.productId} style={s.card}><View style={s.row}><Picture small uri={item.image} /><View style={{ flex: 1 }}><Text style={s.subtitle}>{item.name}</Text><Text style={s.muted}>{money(item.unitPrice)}</Text></View></View>{item.issue && <ErrorText message="Sản phẩm ngừng bán hoặc không đủ tồn kho. Vui lòng chỉnh giỏ hàng." />}<View style={s.between}><Button title="−" ghost disabled={busy || item.quantity <= 1} onPress={() => change(item.productId, item.quantity - 1)} /><Text style={s.subtitle}>{item.quantity}</Text><Button title="+" ghost disabled={busy || item.quantity >= Math.min(99, item.stockQuantity)} onPress={() => change(item.productId, item.quantity + 1)} /><Button title="Xóa" ghost disabled={busy} onPress={() => change(item.productId, 0)} /></View><Text style={s.subtitle}>{money(item.lineTotal)}</Text></View>)}
    {data && !data.items.length && <Text style={s.muted}>Giỏ hàng đang trống. Hãy chọn sản phẩm yêu thích.</Text>}
    {data?.items.length > 0 && <><View style={s.between}><Text style={s.subtitle}>Tạm tính</Text><Text style={s.subtitle}>{money(data.subtotal)}</Text></View><Text style={s.muted}>Khuyến mãi và tổng tiền chính thức được tính ở bước thanh toán.</Text><Button title="Tiến hành đặt hàng" disabled={busy || loading || data.issues.length > 0} onPress={() => navigation.navigate('Checkout')} /></>}
  </Page>;
}
export default function CartScreen(props) { return <AuthGate navigation={props.navigation}><Cart {...props} /></AuthGate>; }
