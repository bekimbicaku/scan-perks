import { renderVenueRequest, venueIdFromPath } from './lib/server/venuePage.mjs';

export const config = {
  runtime: 'nodejs',
  matcher: ['/business/((?!start$)[^/]+)'],
};

function continueRequest() {
  return new Response(null, {
    headers: { 'x-middleware-next': '1' },
  });
}

export default async function middleware(request) {
  const id = venueIdFromPath(new URL(request.url).pathname);
  if (!id) return continueRequest();
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 });
  }

  const result = await renderVenueRequest(id);
  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': result.status === 200 ? 'public, max-age=60' : 'no-store',
    'X-Robots-Tag': result.robots,
  };
  return new Response(request.method === 'HEAD' ? null : result.html, {
    status: result.status,
    headers,
  });
}
