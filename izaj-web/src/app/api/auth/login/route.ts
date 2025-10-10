import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

type LoginBody = {
    identifier?: string; // email or phone
    email?: string; // legacy support
    password: string;
    rememberMe?: boolean;
};

export async function POST(request: Request) {
	try {
        const body = (await request.json()) as Partial<LoginBody>;
        const identifier = (body?.identifier || body?.email || '').toString().trim();
        const password = (body?.password || '').toString();
        if (!identifier || !password) {
            return NextResponse.json({ error: 'Identifier and password are required' }, { status: 400 });
        }

		const isProbablyPhone = /^\+?\d{10,15}$/.test(identifier.replace(/[^\d+]/g, ''));

        const supabase = await getSupabaseServerClient();

        let finalEmail = '';
        if (isProbablyPhone) {
            // Normalize to digits only and build canonical variants
            const digits = identifier.replace(/\D/g, '');
            const candidates: string[] = [];
            if (digits) {
                // Derive a stable local 10-digit mobile number if possible
                let local10 = digits;
                if (digits.startsWith('63') && digits.length >= 12) {
                    local10 = digits.slice(-10);
                } else if (digits.startsWith('0') && digits.length >= 11) {
                    local10 = digits.slice(-10);
                } else if (digits.length >= 10) {
                    local10 = digits.slice(-10);
                }

                const local0 = `0${local10}`;
                const cc63 = `63${local10}`;
                const plus63 = `+63${local10}`;

                candidates.push(
                    digits,
                    local10,
                    local0,
                    cc63,
                    plus63,
                );
            }

			// Try to find profile by any candidate value
            let profile: { id: string } | null = null;
            let hadProfileQueryError = false;
            for (const cand of Array.from(new Set(candidates))) {
                const { data, error } = await supabaseAdmin
                    .from('profiles')
                    .select('id')
                    .eq('phone', cand)
                    .maybeSingle();
                if (!error && data?.id) { profile = data; break; }
                if (error) hadProfileQueryError = true;
            }

            let userEmail: string | undefined;
            if (profile?.id) {
                // Fetch the auth user to get their email
                const { data: userResp } = await supabaseAdmin.auth.admin.getUserById(profile.id);
                userEmail = userResp?.user?.email || undefined;
            } else {
                // Fallback: scan auth users for matching metadata.phone (works even if profiles table is missing or empty)
                try {
                    const uniqueCands = new Set(candidates);
                    // Compute target local10 for tolerant comparison
                    const raw = identifier.replace(/\D/g, '');
                    let targetLocal10 = raw;
                    if (raw.startsWith('63') && raw.length >= 12) targetLocal10 = raw.slice(-10);
                    else if (raw.startsWith('0') && raw.length >= 11) targetLocal10 = raw.slice(-10);
                    else if (raw.length >= 10) targetLocal10 = raw.slice(-10);

                    let page = 1;
                    const perPage = 100;
                    let found: string | null = null;
                    // Hard cap to 10 pages for safety
                    while (!found && page <= 10) {
                        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
                        const users = list?.users || [];
                        for (const u of users) {
                            const m = (u as any)?.user_metadata || {};
                            const metaPhone = (m.phone || '').toString();
                            const metaDigits = metaPhone.replace(/\D/g, '');
                            let metaLocal10 = metaDigits;
                            if (metaDigits.startsWith('63') && metaDigits.length >= 12) metaLocal10 = metaDigits.slice(-10);
                            else if (metaDigits.startsWith('0') && metaDigits.length >= 11) metaLocal10 = metaDigits.slice(-10);
                            else if (metaDigits.length >= 10) metaLocal10 = metaDigits.slice(-10);

                            if (
                                (metaPhone && uniqueCands.has(metaPhone)) ||
                                (metaDigits && uniqueCands.has(metaDigits)) ||
                                (metaLocal10 && metaLocal10 === targetLocal10)
                            ) {
                                found = u.email || null;
                                break;
                            }
                        }
                        if (found) break;
                        if (!list || users.length < perPage) break; // end reached
                        page += 1;
                    }
                    if (found) userEmail = found;
                } catch {}
            }

            if (!userEmail) {
                return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
            }
            finalEmail = userEmail;
        } else {
            finalEmail = identifier; // treat as email
        }

		const { data, error } = await supabase.auth.signInWithPassword({
            email: finalEmail,
            password,
        });

		if (error || !data?.user || !data?.session) {
			return NextResponse.json({ error: error?.message || 'Invalid credentials' }, { status: 401 });
		}

		// Merge profile phone if available so clients always see phone
		let mergedUser = data.user as any;
		try {
			const { data: prof } = await supabaseAdmin
				.from('profiles')
				.select('phone')
				.eq('id', data.user.id)
				.maybeSingle();
			if (prof?.phone) {
				mergedUser = {
					...data.user,
					user_metadata: { ...(data.user.user_metadata || {}), phone: prof.phone },
				};
			}
		} catch {}

		// Set session cookie with appropriate expiration based on rememberMe
		const response = NextResponse.json({ 
			user: mergedUser, 
			session: data.session, 
			message: 'Login successful',
			rememberMe: body.rememberMe || false
		}, { status: 200 });

		// Set session cookie with appropriate expiration
		if (data.session) {
			const maxAge = body.rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 days or 1 day
			response.cookies.set('sb-access-token', data.session.access_token, {
				maxAge,
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				path: '/'
			});
			response.cookies.set('sb-refresh-token', data.session.refresh_token, {
				maxAge,
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				path: '/'
			});
		}

		return response;
	} catch (err) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
	}
}


