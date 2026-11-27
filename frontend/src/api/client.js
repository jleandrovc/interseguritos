export const ENDORSEMENT_API = '/endorsement-api';
export const ROUTES_API = '/routes-api';

export class ApiError extends Error {
  constructor({ status, code, message, details }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function postJson(url, body, { token, fetchImpl = fetch } = {}) {
  let response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'No se pudo contactar al servicio' });
  }

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      code: payload?.code ?? `HTTP_${response.status}`,
      message: payload?.message ?? response.statusText ?? 'Error inesperado',
      details: payload?.details,
    });
  }
  return { data: payload, headers: response.headers };
}

export const requestToken = (clientId, clientSecret, options) =>
  postJson(`${ENDORSEMENT_API}/api/v1/auth/token`, { clientId, clientSecret }, options);

export const translateEndorsement = (payload, token, options) =>
  postJson(`${ENDORSEMENT_API}/api/v1/endorse/translate`, payload, { ...options, token });

export const calculateRoute = (payload, token, options) =>
  postJson(`${ROUTES_API}/api/v1/routes/optimal`, payload, { ...options, token });
