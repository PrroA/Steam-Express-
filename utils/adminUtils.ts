export {
  FULFILLMENT_STATUS,
  FULFILLMENT_STATUS_LABELS,
  FULFILLMENT_STATUS_OPTIONS,
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_OPTIONS,
  getFulfillmentStatusLabel,
  getOrderStatusLabel,
} from './orderStatus';

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
