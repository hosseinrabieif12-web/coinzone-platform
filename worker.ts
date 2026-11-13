import { handleEdgeApiRequest, type CloudflareEdgeEnv } from './server/edgeApiHandler.ts';

interface WorkerEnv extends CloudflareEdgeEnv {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return handleEdgeApiRequest(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
