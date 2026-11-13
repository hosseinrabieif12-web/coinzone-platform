import { handleEdgeApiRequest, type CloudflareEdgeEnv } from '../../server/edgeApiHandler.ts';

interface CloudflareEventContext {
  request: Request;
  env: CloudflareEdgeEnv;
  params: { path?: string | string[] };
}

export async function onRequest(context: CloudflareEventContext): Promise<Response> {
  const pathParam = context.params?.path;
  const subPath = Array.isArray(pathParam) ? pathParam.join('/') : pathParam;
  return handleEdgeApiRequest(context.request, context.env, subPath);
}
