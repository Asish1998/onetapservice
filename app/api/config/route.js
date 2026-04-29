import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// GET - fetch approved business config (phone, name, admin_id)
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('id, phone, business_name')
      .eq('approved', true)
      .limit(1)
      .single();

    if (data) {
      return NextResponse.json({ 
        adminId: data.id,
        phone: data.phone, 
        businessName: data.business_name 
      });
    }

    return NextResponse.json({ adminId: null, phone: '+9779860196101', businessName: 'One Tap Momo' });
  } catch (e) {
    return NextResponse.json({ adminId: null, phone: '+9779860196101', businessName: 'One Tap Momo' });
  }
}
