import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { api } from '../api/store';
import { AuthGate, Button, ErrorText, Loading, money, Page, statusLabel } from '../components/UI';
import { styles as s } from '../theme';
function Orders({ navigation }) {
  const [history, setHistory] = useState(false), [page, setPage] = useState(1), [data, setData] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [revision, setRevision] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true; setLoading(true); setError('');
    (history ? api.history : api.orders)({ page, limit: 10 }).then((r) => { if (active) setData(r); }).catch((e) => { if (active) { setData(null); setError(e.message); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [history, page, revision]));
  return <Page><Text style={s.title}>Đơn hàng của tôi</Text><View style={s.row}><Button title="Đang xử lý" ghost={history} onPress={() => { setHistory(false); setPage(1); }} /><Button title="Lịch sử" ghost={!history} onPress={() => { setHistory(true); setPage(1); }} /></View><ErrorText message={error} /><Button ghost title="Làm mới" busy={loading} onPress={() => setRevision((n) => n + 1)} />
    {!loading && data?.items.length === 0 && <Text style={s.muted}>Chưa có đơn hàng trong mục này.</Text>}
    {data?.items.map((o) => <View key={o._id} style={s.card}><Text style={s.subtitle}>#{o.orderCode}</Text><Text style={s.badge}>{statusLabel(o.status)}</Text><Text style={s.muted}>{new Date(o.createdAt).toLocaleString('vi-VN')} · {o.itemCount} sản phẩm</Text><Text style={s.subtitle}>{money(o.totalAmount)}</Text><Button title="Xem chi tiết" ghost onPress={() => navigation.navigate('OrderDetail', { id: o._id })} /></View>)}
    <View style={s.between}><Button ghost title="Trước" disabled={page <= 1 || loading} onPress={() => setPage(page - 1)} /><Text style={s.muted}>Trang {page}</Text><Button ghost title="Sau" disabled={!data || page * data.limit >= data.total || loading} onPress={() => setPage(page + 1)} /></View>
  </Page>;
}
export function OrderHistoryScreen(props) { return <AuthGate navigation={props.navigation}><Orders {...props} /></AuthGate>; }
export function OrderDetailScreen({ navigation, route }) {
  const [order, setOrder] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const started = useRef(false), inFlight = useRef(false);
  const load = useCallback(async () => { setError(''); try { const o = await api.order(route.params.id); setOrder(o); return o; } catch (e) { setError(e.message); return null; } finally { setLoading(false); } }, [route.params.id]);
  const pay = async (method) => {
    if (inFlight.current) return; inFlight.current = true; setBusy(true); setError('');
    try {
      const result = await api.payment(route.params.id, method);
      // The existing backend returns to the web result page. Close the browser
      // to return here; only server state determines whether payment succeeded.
      await WebBrowser.openBrowserAsync(result.paymentUrl);
      await load();
    } catch (e) { setError(e.message); } finally { inFlight.current = false; setBusy(false); }
  };
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { const sub = AppState.addEventListener('change', (state) => { if (state === 'active') load(); }); return () => sub.remove(); }, [load]);
  useEffect(() => {
    if (!order || order.status !== 'pending_payment') return undefined;
    const timer = setInterval(() => { if (AppState.currentState === 'active') load(); }, 15000);
    return () => clearInterval(timer);
  }, [order?.status, load]);
  useEffect(() => { if (order && route.params.startPayment && !started.current) { started.current = true; if (order.status === 'pending_payment') pay(order.paymentMethod); } }, [order]);
  if (loading) return <Loading />;
  return <Page><ErrorText message={error} />{order && <><Text style={s.title}>#{order.orderCode}</Text><Text style={s.badge}>{statusLabel(order.status)}</Text><Text style={s.muted}>{new Date(order.createdAt).toLocaleString('vi-VN')}</Text><View style={s.card}>{order.items.map((item, n) => <View key={n} style={s.between}><Text style={[s.text, { flex: 1 }]}>{item.name} × {item.quantity}</Text><Text style={s.text}>{money(item.lineTotal)}</Text></View>)}<Text style={s.subtitle}>Tổng: {money(order.totalAmount)}</Text><Text style={s.text}>Thanh toán: {order.paymentMethod} · {order.paymentStatus === 'paid' ? 'Đã thanh toán' : order.paymentStatus === 'failed' ? 'Thất bại' : 'Chưa thanh toán'}</Text></View>
    <View style={s.card}><Text style={s.subtitle}>Nhận tại cửa hàng</Text><Text style={s.text}>{order.store?.name}</Text><Text style={s.muted}>{order.store?.address}</Text><Text style={s.text}>Đọc mã {order.orderCode} khi nhận hàng.</Text>{order.customerNote ? <Text style={s.muted}>Ghi chú: {order.customerNote}</Text> : null}</View>
    {order.status === 'pending_payment' && <><Text style={s.muted}>Thanh toán mở trong trình duyệt. Sau khi hoàn tất, đóng trình duyệt để trở lại ứng dụng và cập nhật kết quả.</Text><Button title="Thanh toán VNPay" busy={busy} onPress={() => pay('vnpay')} /><Button title="Thanh toán MoMo" ghost disabled={busy} onPress={() => pay('momo')} /></>}
    <View style={s.card}><Text style={s.subtitle}>Tiến trình đơn hàng</Text>{order.statusHistory?.map((h, i) => <Text style={s.text} key={i}>{statusLabel(h.status)} · {new Date(h.changedAt).toLocaleString('vi-VN')}</Text>)}</View>
  </>}<Button title="Cập nhật trạng thái" ghost disabled={busy} onPress={load} /><Button title="Về đơn hàng" ghost onPress={() => navigation.navigate('Main', { screen: 'Orders' })} /></Page>;
}
