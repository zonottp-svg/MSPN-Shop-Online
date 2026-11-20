import app from '../server-api.js';

export default function handler(req: any, res: any) {
  const origUrl = req.headers?.['x-vercel-original-url'] || req.headers?.['x-invoke-path'];
  if (
    typeof origUrl === 'string' &&
    origUrl.startsWith('/api') &&
    (req.url === '/api' || req.url === '/api/index' || req.url === '/')
  ) {
    req.url = origUrl;
  } else if (typeof req.url === 'string' && !req.url.startsWith('/api')) {
    req.url = req.url.startsWith('/') ? `/api${req.url}` : `/api/${req.url}`;
  }
  return app(req, res);
}
