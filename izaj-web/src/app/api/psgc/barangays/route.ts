import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cityCode = searchParams.get('cityCode');
    if (!cityCode) {
      return NextResponse.json({ error: 'cityCode is required' }, { status: 400 });
    }
    const res = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${cityCode}/barangays/`);
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch barangays' }, { status: 502 });
    }
    const data = await res.json();
    const barangays = (Array.isArray(data) ? data : []).map((b: any) => ({
      code: b.code,
      name: b.name,
      cityCode: b.cityCode || b.municipalityCode,
    }));
    return NextResponse.json({ barangays });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

