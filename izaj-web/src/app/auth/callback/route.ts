import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
	const url = new URL(request.url);
	const code = url.searchParams.get('code');
	const type = url.searchParams.get('type');
	const redirectPath = url.searchParams.get('redirect') || '/';

	const supabase = await getSupabaseServerClient();
	
	if (code) {
		if (type === 'recovery') {
			// For password reset, redirect to reset page with the code (don't auto-login)
			const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
			return NextResponse.redirect(new URL(`/reset-password?code=${code}`, base));
		} else {
			// Exchange the OAuth code for a session and set cookies
			await supabase.auth.exchangeCodeForSession(code);
		}
	}

	const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
	return NextResponse.redirect(new URL(redirectPath, base));
}


