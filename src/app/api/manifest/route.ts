import { NextResponse } from 'next/server';
import manifest from '../../../../public/manifest.json';

// Stable public identity: independent of login, RLS and company uploads.
export function GET() {
  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
