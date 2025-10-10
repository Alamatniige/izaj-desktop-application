import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    if (!provider || provider !== 'google') {
		return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
	}

	const supabase = await getSupabaseServerClient();
	const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
    });

	if (error || !data?.url) {
		return NextResponse.json({ error: error?.message || 'OAuth init failed' }, { status: 400 });
	}

	return NextResponse.redirect(data.url);
}


