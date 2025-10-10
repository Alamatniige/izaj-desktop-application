import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

type UpdateProfileBody = {
	firstName?: string;
	lastName?: string;
	phone?: string;
};

export async function PUT(request: Request) {
	try {
		const supabase = await getSupabaseServerClient();
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = (await request.json()) as Partial<UpdateProfileBody>;
		const firstName = (body.firstName || '').toString().trim();
		const lastName = (body.lastName || '').toString().trim();
		const name = [firstName, lastName].filter(Boolean).join(' ').trim() || null;
		let phone = (body.phone || '').toString();

		if (phone) {
			// Normalize phone and canonicalize to 63xxxxxxxxxx when possible
			const digits = phone.replace(/\D/g, '');
			if (!/^\d{10,15}$/.test(digits)) {
				return NextResponse.json({ error: 'Invalid phone format' }, { status: 400 });
			}
			let canonical = digits;
			if (digits.length === 11 && digits.startsWith('0')) {
				canonical = `63${digits.slice(1)}`;
			} else if (digits.length === 10 && digits.startsWith('9')) {
				canonical = `63${digits}`;
			} else if (digits.length === 12 && digits.startsWith('63')) {
				canonical = digits;
			}
			phone = canonical;

			// Ensure phone is unique across profiles (excluding current user)
			const { data: existing, error: existingErr } = await supabaseAdmin
				.from('profiles')
				.select('id')
				.eq('phone', phone)
				.neq('id', user.id)
				.maybeSingle();
			if (existingErr) {
				return NextResponse.json({ error: 'Update failed' }, { status: 400 });
			}
			if (existing?.id) {
				return NextResponse.json({ error: 'Phone already in use' }, { status: 409 });
			}
		}

		// Update profiles table (service role)
		const { error: profileError } = await supabaseAdmin
			.from('profiles')
			.upsert({ id: user.id, name, phone: phone || null }, { onConflict: 'id' });
		if (profileError) {
			return NextResponse.json({ error: 'Could not update profile' }, { status: 400 });
		}

		// Update auth metadata (user can update own metadata)
		const { data: updated, error: metaErr } = await supabase.auth.updateUser({
			data: { ...(name ? { name } : {}), ...(phone ? { phone } : {}), },
		});
		if (metaErr) {
			return NextResponse.json({ error: 'Could not update user' }, { status: 400 });
		}

		return NextResponse.json({ user: updated.user }, { status: 200 });
	} catch (err) {
		return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
	}
}


