import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'orders.json');

// Helper to read orders
const readOrders = () => {
  try {
    if (!fs.existsSync(DATA_PATH)) return [];
    const data = fs.readFileSync(DATA_PATH, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading orders:', e);
    return [];
  }
};

// Helper to write orders
const writeOrders = (orders) => {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(orders, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing orders:', e);
  }
};

export async function GET() {
  const orders = readOrders();
  return NextResponse.json(orders);
}

export async function POST(req) {
  try {
    const newOrder = await req.json();
    const orders = readOrders();
    const updatedOrders = [newOrder, ...orders];
    writeOrders(updatedOrders);
    return NextResponse.json({ success: true, order: newOrder });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const { id, status } = await req.json();
    const orders = readOrders();
    const updatedOrders = orders.map(o => o.id === id ? { ...o, status } : o);
    writeOrders(updatedOrders);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id'));
    const orders = readOrders();
    const updatedOrders = orders.filter(o => o.id !== id);
    writeOrders(updatedOrders);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
