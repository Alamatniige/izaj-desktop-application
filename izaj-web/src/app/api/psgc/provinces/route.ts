import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    const res = await fetch('https://psgc.gitlab.io/api/provinces/');
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch provinces' }, { status: 502 });
    }
    const data = await res.json();
    const provinces = (Array.isArray(data) ? data : []).map((p: any) => ({
      code: p.code,
      name: p.name,
      regionCode: p.regionCode,
    }));
    return NextResponse.json({ provinces });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

