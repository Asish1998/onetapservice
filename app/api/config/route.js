import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// GET - fetch business config by slug or return first approved admin
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');

  try {
    let query = supabase
      .from('admins')
      .select('id, phone, business_name, username, approved')
      .eq('approved', true);

    if (slug) {
      query = query.eq('username', slug);
    }

    const { data, error } = await query.limit(1).single();

    if (data) {
      return NextResponse.json({ 
        adminId: data.id,
        phone: data.phone, 
        businessName: data.business_name,
        slug: data.username
      });
    }

    return NextResponse.json({ adminId: null, phone: '+9779860196101', businessName: 'One Tap Momo', slug: null });
  } catch (e) {
    return NextResponse.json({ adminId: null, phone: '+9779860196101', businessName: 'One Tap Momo', slug: null });
  }
}
