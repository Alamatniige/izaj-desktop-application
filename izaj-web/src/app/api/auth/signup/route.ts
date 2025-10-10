import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { emailService } from '@/lib/email-service';
import { randomBytes } from 'crypto';

type SignupBody = {
	email: string;
	password: string;
	name?: string;
	phone?: string;
	address?: {
		province: string;
		city: string;
		barangay: string;
		address: string;
	};
};

export async function POST(request: Request) {
	let body: Partial<SignupBody> = {};
	try {
		body = (await request.json()) as Partial<SignupBody>;
		
		if (!body?.email || !body?.password) {
			return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
		}

		const supabase = await getSupabaseServerClient();
		const metadata: Record<string, string> = {};
		if (body.name) {
			metadata.name = body.name;
		}
		let normalizedPhone: string | undefined;
		if (body.phone) {
			const raw = body.phone.toString();
			const digits = raw.replace(/\D/g, '');
			if (digits && /^\d{10,15}$/.test(digits)) {
				let canonical = digits;
				// Canonicalize PH mobiles to 63xxxxxxxxxx
				if (digits.length === 11 && digits.startsWith('0')) {
					canonical = `63${digits.slice(1)}`;
				} else if (digits.length === 10 && digits.startsWith('9')) {
					canonical = `63${digits}`;
				} else if (digits.length === 12 && digits.startsWith('63')) {
					canonical = digits;
				}
				normalizedPhone = canonical;
				metadata.phone = canonical;
			}
		}
		// Check if user already exists
		const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({
			page: 1,
			perPage: 1000
		});
		
		const existingUser = existingUsers?.users?.find(user => user.email === body.email);
		
		if (existingUser) {
			return NextResponse.json({ 
				error: 'User with this email already exists',
				code: 'user_exists'
			}, { status: 400 });
		}

		// Create user without email confirmation
		// Use admin API to create user directly without triggering email confirmation
		const { data, error } = await supabaseAdmin.auth.admin.createUser({
			email: body.email,
			password: body.password,
			email_confirm: true, // Set to true to skip email confirmation
		});

		if (error || !data?.user) {
			return NextResponse.json({ 
				error: error?.message || 'Signup failed'
			}, { status: 400 });
		}

		// Update user with metadata if we have any
		if (Object.keys(metadata).length > 0) {
			await supabaseAdmin.auth.admin.updateUserById(
				data.user.id,
				{
					user_metadata: metadata
				}
			);
		}

		// Generate confirmation token
		const confirmationToken = randomBytes(32).toString('hex');
		const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

		// Store confirmation token in database
		await supabaseAdmin.auth.admin.updateUserById(
			data.user.id,
			{
				user_metadata: {
					...metadata,
					confirmationToken,
					tokenExpiry: tokenExpiry.toISOString(),
					emailConfirmed: false,
				}
			}
		);

	// Create a profile row so data is visible immediately
	const profileName = body.name && body.name.trim() ? body.name.trim() : null;
	
	// Small delay to ensure any database triggers complete
	await new Promise(resolve => setTimeout(resolve, 100));
	
	// Check if phone number conflicts with another user
	let finalPhone: string | null = normalizedPhone ?? null;
	if (normalizedPhone) {
		const { data: phoneConflict } = await supabaseAdmin
			.from('profiles')
			.select('id')
			.eq('phone', normalizedPhone)
			.maybeSingle();
		
		if (phoneConflict) {
			finalPhone = null; // Don't set phone to avoid conflict
		}
	}
	
	// First, check if profile already exists (might be created by a trigger)
	const { data: existingProfile } = await supabaseAdmin
		.from('profiles')
		.select('id')
		.eq('id', data.user.id)
		.maybeSingle();
	
	if (existingProfile) {
		// Profile exists, update it
		const { error: updateError } = await supabaseAdmin
			.from('profiles')
			.update({ 
				name: profileName, 
				phone: finalPhone,
				user_type: 'customer',
				updated_at: new Date().toISOString()
			})
			.eq('id', data.user.id)
			.select();
		
		if (updateError) {
			console.error('Profile update error:', updateError);
		}
	} else {
		// Profile doesn't exist, insert it
		const { error: insertError } = await supabaseAdmin
			.from('profiles')
			.insert({ 
				id: data.user.id, 
				name: profileName, 
				phone: finalPhone,
				user_type: 'customer',
				updated_at: new Date().toISOString()
			})
			.select();
		
		if (insertError) {
			console.error('Profile insert error:', insertError);
		}
	}

		// If address was provided during signup, create it in the database
		if (body.address && body.address.province && body.address.city && body.address.barangay && body.address.address) {
			const composedAddress = `${body.address.address.trim()}, ${body.address.barangay.trim()}, ${body.address.city.trim()}, ${body.address.province.trim()}`.replace(/,\s*,/g, ', ').trim();
			
			await supabaseAdmin
				.from('user_addresses')
				.insert([{
					user_id: data.user.id,
					name: profileName || 'User',
					phone: finalPhone || '',
					address: composedAddress,
					is_default: true // Set as default since it's the first address
				}]);
		}

		// Send confirmation email
		try {
			await emailService.sendConfirmationEmail(
				body.email,
				confirmationToken,
				profileName || 'User'
			);
		} catch (emailError) {
			// Don't fail the signup if email fails
			console.error('Email send error:', emailError);
		}
		
		return NextResponse.json({ 
			user: data.user, 
			message: 'Signup successful. Please check your email to confirm your account.',
			address: body.address,
			emailSent: true
		}, { status: 200 });
	} catch (err) {
		console.error('Signup error:', err);
		return NextResponse.json({ 
			error: 'Signup failed'
		}, { status: 500 });
	}
}


