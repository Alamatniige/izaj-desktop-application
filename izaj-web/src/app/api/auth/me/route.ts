import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
    try {
        const supabase = await getSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ user: null }, { status: 200 });
        }

        // Merge profile phone into user metadata so client always sees phone
        try {
            const { data: prof } = await supabaseAdmin
                .from('profiles')
                .select('phone')
                .eq('id', user.id)
                .maybeSingle();
            if (prof?.phone) {
                (user as any).user_metadata = { ...(user as any).user_metadata, phone: prof.phone };
            }
        } catch {}

        return NextResponse.json({ user }, { status: 200 });
    } catch {
        return NextResponse.json({ user: null }, { status: 200 });
    }
}

 
