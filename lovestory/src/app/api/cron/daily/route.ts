import { NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    // Nếu có thiết lập CRON_SECRET trên Vercel, kiểm tra để bảo mật
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!adminDb || !adminMessaging) {
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

      const allTokens = [
        ...(couple.fcmTokens_partner1 || []),
        ...(couple.fcmTokens_partner2 || [])
      ].filter(t => t); // Lọc các giá trị rỗng

      if (allTokens.length > 0) {
        const message = {
          notification: {
            title: `Kỷ niệm tình yêu ❤️`,
            body: `Hôm nay là ngày kỷ niệm thứ ${diffDays} hai bạn ở bên nhau! Mở ứng dụng ngay thôi.`,
          },
          tokens: allTokens,
        };
        await adminMessaging!.sendEachForMulticast(message);
        sentCount++;
      }
    }

    return NextResponse.json({ success: true, sentCouples: sentCount });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
