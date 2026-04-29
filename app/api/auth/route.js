import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// POST - Register or Login
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, username, password, businessName } = body;

    if (action === 'register') {
      // Check if username already exists
      const { data: existing } = await supabase
        .from('admins')
        .select('*')
        .eq('username', username)
        .single();

      if (existing) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
      }

      // Create new admin
      const { data, error } = await supabase
        .from('admins')
        .insert([{ username, password, business_name: businessName }])
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ 
        success: true, 
        admin: { id: data.id, username: data.username, businessName: data.business_name } 
      });
    }

    if (action === 'login') {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (!data) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      return NextResponse.json({ 
        success: true, 
        admin: { id: data.id, username: data.username, businessName: data.business_name } 
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
