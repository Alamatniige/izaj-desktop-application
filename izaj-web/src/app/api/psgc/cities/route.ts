import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provinceCode = searchParams.get('provinceCode');
    if (!provinceCode) {
      return NextResponse.json({ error: 'provinceCode is required' }, { status: 400 });
    }
    const res = await fetch(`https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities/`);
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch cities' }, { status: 502 });
    }
    const data = await res.json();
    const cities = (Array.isArray(data) ? data : []).map((c: any) => ({
      code: c.code,
      name: c.name,
      provinceCode: c.provinceCode,
      isCity: c.isCity,
    }));
    return NextResponse.json({ cities });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

