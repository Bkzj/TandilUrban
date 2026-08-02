import { ApiError } from '@/lib/api-error';
import { getServerEnvironment } from '@/lib/validation/environment';

export function assertTrustedMutationRequest(request: Request): void {
  const trustedOrigin = new URL(getServerEnvironment().APP_URL).origin;
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site')?.toLowerCase();
  if (origin !== null) {
    try {
      if (new URL(origin).origin !== trustedOrigin) throw new Error('foreign origin');
    } catch {
      throw new ApiError('FORBIDDEN');
    }
  }
  if (fetchSite && !['same-origin', 'none'].includes(fetchSite)) {
    throw new ApiError('FORBIDDEN');
  }
}
