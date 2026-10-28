const PROFILE_BASE = 'https://emweb.securities.eastmoney.com/PC_HSF10/CompanySurvey/PageAjax';

function cleanText(value, limit = 420) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

export function eastmoneyCode(thscode) {
  const match = /^(\d{6})\.(SZ|SH|BJ)$/i.exec(String(thscode ?? '').trim());
  if (!match) throw new TypeError('thscode must be a canonical A-share code');
  return `${match[2].toUpperCase()}${match[1]}`;
}

export function createCompanyProfileProvider(fetchFn = globalThis.fetch) {
  return async function getCompanyProfile(thscode) {
    const code = eastmoneyCode(thscode);
    const url = `${PROFILE_BASE}?code=${encodeURIComponent(code)}`;
    try {
      const response = await fetchFn(url, { headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error(`profile http ${response.status}`);
      const payload = await response.json();
      const row = Array.isArray(payload?.jbzl) ? payload.jbzl[0] : null;
      if (!row) throw new Error('profile empty');
      return {
        status: 'ok',
        data: {
          name: cleanText(row.SECURITY_NAME_ABBR, 80),
          industry: cleanText(row.EM2016 || row.INDUSTRYCSRC1, 120),
          summary: cleanText(row.ORG_PROFILE, 360),
          businessScope: cleanText(row.BUSINESS_SCOPE, 420),
        },
        source: {
          id: `PROFILE:${String(thscode).toUpperCase()}`,
          name: `${cleanText(row.SECURITY_NAME_ABBR, 80) || thscode}公司概况`,
          publisher: '东方财富 F10',
          url,
          disclosed: new Date().toISOString().slice(0, 10),
          period: '最新可用公司概况',
          unitNote: '文本字段；以公司公告和定期报告为最终核验依据。',
          sourceType: 'company_profile',
        },
        errors: [],
      };
    } catch {
      return {
        status: 'unavailable',
        data: null,
        source: null,
        errors: [{ code: 'profile_unavailable', message: '公司概况服务暂不可用', requestId: null }],
      };
    }
  };
}
