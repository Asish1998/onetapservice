import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// GET - fetch approved business config (phone number)
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('phone, business_name')
      .eq('approved', true)
      .limit(1)
      .single();

    if (data) {
      return NextResponse.json({ phone: data.phone, businessName: data.business_name });
    }

    // Fallback if no approved admin yet
    return NextResponse.json({ phone: '+9779860196101', businessName: 'One Tap Momo' });
  } catch (e) {
    return NextResponse.json({ phone: '+9779860196101', businessName: 'One Tap Momo' });
  }
}
