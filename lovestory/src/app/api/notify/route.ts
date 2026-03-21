import { NextResponse } from 'next/server';
import { adminMessaging } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { tokens, title, body } = await req.json();

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ success: false, message: 'No tokens provided' }, { status: 400 });
    }

    if (!adminMessaging) {
      return NextResponse.json({ success: false, message: 'Admin messaging not initialized' }, { status: 500 });
    }

    const message = {
      notification: {
        title: title,
        body: body,
      },
      webpush: {
        headers: {
          Urgency: 'high'
        },
        notification: {
          badge: '/favicon.ico',
          icon: '/favicon.ico'
        }
      },
      tokens: tokens,
    };

    const response = await adminMessaging!.sendEachForMulticast(message);
    return NextResponse.json({ success: true, results: response });
  } catch (error: any) {
    console.error("Error sending push:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
