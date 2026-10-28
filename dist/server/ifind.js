function safeError(error, fallbackCode = 'ifind_unavailable') {
  return {
    code: error?.code ?? fallbackCode,
    message: error?.message ?? 'iFinD MCP enhancement is unavailable',
    requestId: error?.requestId ?? null,
  };
}

export function unavailableIfindContext(error = null) {
  const reason = error ?? Object.assign(new Error('iFinD MCP is not configured'), { code: 'ifind_not_configured' });
  return {
    status: 'unavailable',
    source: '同花顺 iFinD MCP',
    data: null,
    requestIds: [],
    errors: [safeError(reason)],
  };
}

export async function resolveIfindContext(contextProvider, input) {
  if (typeof contextProvider !== 'function') return unavailableIfindContext();
  try {
    const result = await contextProvider(input);
    if (!result || typeof result !== 'object') return unavailableIfindContext(Object.assign(new Error('iFinD MCP returned no usable context'), { code: 'ifind_empty' }));
    return {
      status: result.status === 'partial' ? 'partial' : 'ok',
      source: '同花顺 iFinD MCP',
      data: result.data ?? result,
      requestIds: Array.isArray(result.requestIds) ? result.requestIds.filter(Boolean) : [],
      errors: Array.isArray(result.errors) ? result.errors.map((error) => safeError(error)) : [],
    };
  } catch (error) {
    return unavailableIfindContext(error);
  }
}
