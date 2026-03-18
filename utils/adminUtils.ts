export const ORDER_STATUS_OPTIONS = ['未付款', '付款失敗', '已付款', '已取消', '已退款'];
export const FULFILLMENT_STATUS_OPTIONS = ['待出貨', '已出貨', '已送達'];

export function getApiErrorMessage(error: any, fallback = '操作失敗') {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

export function normalizeImagePreviewUrl(rawValue: string) {
  const value = String(rawValue || '').trim();
  if (!value) {
    return { url: '', error: '' };
  }
  if (value.startsWith('data:image/')) {
    return { url: value, error: '' };
  }
  if (value.startsWith('/')) {
    return { url: value, error: '' };
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return { url: value, error: '' };
    }
    return { url: '', error: '僅支援 http/https 或站內路徑（/xxx）' };
  } catch (error) {
    return { url: '', error: '圖片 URL 格式不正確' };
  }
}
