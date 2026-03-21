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
    const authHeader = req.headers.get('authorization');
    // Nếu có thiết lập CRON_SECRET trên Vercel, kiểm tra để bảo mật
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    const couplesSnap = await adminDb.collection('Couples').get();
    let sentCount = 0;

    for (const doc of couplesSnap.docs) {
      const couple = doc.data();
      if (!couple.startDate) continue;

      const startDate = couple.startDate.toDate ? couple.startDate.toDate() : new Date(couple.startDate);
      const today = new Date();
      
      const diffTime = Math.abs(today.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      const p1Subs = couple.nativePushSubs_partner1 || [];
      const p2Subs = couple.nativePushSubs_partner2 || [];
      const allSubs = [...p1Subs, ...p2Subs];

      if (allSubs.length > 0) {
        const payload = JSON.stringify({
          title: `Chúc mừng kỷ niệm ${diffDays} ngày yêu nhau! 🎉`,
          body: `Cùng vào LoveStory để xem lại chặng đường của hai bạn nhé ❤️`,
          url: '/'
        });
        
        await Promise.allSettled(allSubs.map(sub => 
          webpush.sendNotification(sub, payload).catch(e => console.error("Cron push err", e))
        ));

        sentCount++;
      }
    }

    return NextResponse.json({ success: true, sentCouples: sentCount });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
