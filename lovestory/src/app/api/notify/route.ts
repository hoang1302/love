import { NextResponse } from 'next/server';
import webpush from 'web-push';

export const dynamic = 'force-dynamic';

const vapidPublicKey = process.env.NEXT_PUBLIC_NATIVE_VAPID_KEY || '';
const vapidPrivateKey = process.env.NATIVE_VAPID_PRIVATE_KEY || '';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:hoang1302@example.com',
    vapidPublicKey,
    vapidPrivateKey
  );
}

export async function POST(req: Request) {
  try {
    const { subscriptions, title, body, url } = await req.json();

    if (!subscriptions || subscriptions.length === 0) {
       return NextResponse.json({ success: false, message: 'No subscriptions provided' });
    }

    const payload = JSON.stringify({
      title,
      body,
      url: url || '/'
    });

    const promises = subscriptions.map((sub: any) => 
       webpush.sendNotification(sub, payload).catch(err => console.error("Push failed for a sub", err))
    );
    
    const results = await Promise.allSettled(promises);
    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Error sending native push:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
