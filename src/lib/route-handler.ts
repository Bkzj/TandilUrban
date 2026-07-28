import { AuthError } from '@/lib/auth';
import { ApiError, apiErrorResponse, requestIdFrom } from '@/lib/api-error';
import { serverLogger } from '@/lib/server-logger';

export async function runRouteHandler(
  request: Request,
  event: string,
  handler: (requestId: string) => Promise<Response>,
): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    const response = await handler(requestId);
    response.headers.set('x-request-id', requestId);
    return response;
  } catch (error) {
    if (error instanceof ApiError) return apiErrorResponse(error, requestId);
    if (error instanceof AuthError) {
      const code = error.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN';
      return apiErrorResponse(new ApiError(code, { message: error.message }), requestId);
    }
    serverLogger.error(event, {
      requestId,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return apiErrorResponse(new ApiError('INTERNAL_ERROR'), requestId);
  }
}
