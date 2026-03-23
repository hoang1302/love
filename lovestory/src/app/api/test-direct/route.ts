import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
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

export async function GET(req: Request) {
  try {
    const couplesSnap = await adminDb!.collection('Couples').get();
    let foundSub = null;
    
    for (const doc of couplesSnap.docs) {
      const data = doc.data();
      if (data.nativePushSubs_partner1 && data.nativePushSubs_partner1.length > 0) {
        foundSub = data.nativePushSubs_partner1[data.nativePushSubs_partner1.length - 1];
        break;
      }
      if (data.nativePushSubs_partner2 && data.nativePushSubs_partner2.length > 0) {
        foundSub = data.nativePushSubs_partner2[data.nativePushSubs_partner2.length - 1];
        break;
      }
    }

    if (!foundSub) {
      return NextResponse.json({ success: false, msg: "Không có Subcription nào trong Database" });
    }

    const payload = JSON.stringify({
      title: "Test Đâm Thẳng Server Apple",
      body: "Đây là thông báo từ API cục bộ!",
      url: "/"
    });

    try {
      const resp = await webpush.sendNotification(foundSub, payload);
      return NextResponse.json({ success: true, statusCode: resp.statusCode, headers: resp.headers });
    } catch (e: any) {
      return NextResponse.json({ success: false, errorCode: e.statusCode, body: e.body });
    }

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
