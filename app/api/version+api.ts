import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const versionPath = path.join(process.cwd(), 'public', 'version.json');
    const raw = fs.readFileSync(versionPath, 'utf8');
    return new Response(raw, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch {
    return Response.json(
      {
        version: '1.0.0',
        buildNumber: 1,
        releaseNotes: 'Scan Perks',
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }
}
