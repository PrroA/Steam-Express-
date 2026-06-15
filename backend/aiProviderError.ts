export function isExpectedAiProviderFallback(error: unknown) {
  const typedError = error as { status?: number; code?: string; type?: string; message?: string };
  const message = typedError?.message || '';

  return (
    typedError?.status === 429 ||
    typedError?.code === 'insufficient_quota' ||
    typedError?.type === 'insufficient_quota' ||
    /quota|rate limit|billing/i.test(message)
  );
}
