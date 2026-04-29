import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const adminId = searchParams.get('admin_id');
  const idsParam = searchParams.get('ids');

  let query = supabase.from('orders').select('*').order('id', { ascending: false });

  // Filter by admin if provided (admin dashboard view)
  if (adminId) {
    query = query.eq('admin_id', adminId);
  }

  // Filter by specific IDs if provided (customer polling view)
  if (idsParam) {
    const ids = idsParam.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    if (ids.length > 0) {
      query = query.in('id', ids);
    } else {
      // If idsParam was provided but were invalid, return empty array to save bandwidth
      return NextResponse.json([]);
    }
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(req) {
  try {
    const newOrder = await req.json();

    // Payload validation
    if (!newOrder.name || typeof newOrder.name !== 'string' || newOrder.name.trim() === '') {
      return NextResponse.json({ error: 'Valid name is required' }, { status: 400 });
    }
    const phoneDigits = (newOrder.phone || '').replace(/\D/g, '');
    if (!phoneDigits || phoneDigits.length < 10) {
      return NextResponse.json({ error: 'Valid phone number is required (min 10 digits)' }, { status: 400 });
    }
    if (!newOrder.plates || typeof newOrder.plates !== 'number' || newOrder.plates < 1) {
      return NextResponse.json({ error: 'At least 1 plate is required' }, { status: 400 });
    }
    if (!newOrder.location || typeof newOrder.location !== 'string' || newOrder.location.trim() === '') {
      return NextResponse.json({ error: 'Valid delivery location is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('orders')
      .insert([newOrder])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, order: data[0] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const secret = req.headers.get('x-dashboard-secret');
    if (secret !== 'secure-momo-dashboard') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, status } = await req.json();
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const secret = req.headers.get('x-dashboard-secret');
    if (secret !== 'secure-momo-dashboard') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
