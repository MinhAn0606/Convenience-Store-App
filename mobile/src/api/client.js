const baseURL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
let token = null;
let unauthorized = null;
export const setToken = (value) => { token = value; };
export const onUnauthorized = (callback) => { unauthorized = callback; };
export async function request(path, { method = 'GET', body, headers = {} } = {}) {
  if (!baseURL) throw new Error('Chưa cấu hình EXPO_PUBLIC_API_URL trong mobile/.env.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  const sentToken = token;
  try {
    const response = await fetch(`${baseURL}${path}`, {
      method, signal: controller.signal,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(sentToken ? { Authorization: `Bearer ${sentToken}` } : {}), ...headers },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { throw new Error('Backend trả về dữ liệu không hợp lệ. Kiểm tra URL API.'); }
    if (!response.ok) {
      if (response.status === 401 && sentToken && sentToken === token) await unauthorized?.();
      const error = new Error(data.message || `Yêu cầu thất bại (${response.status})`);
      error.status = response.status; error.data = data; throw error;
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Kết nối quá thời gian. Vui lòng thử lại.');
    throw error;
  } finally { clearTimeout(timeout); }
}
export const query = (values) => {
  const pairs = Object.entries(values).filter(([, v]) => v !== '' && v != null);
  return pairs.length ? `?${pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')}` : '';
};
