import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { recipientEmail, title, body, url } = await req.json();

    if (!recipientEmail) {
      return NextResponse.json({ success: false, error: 'Thiếu email người nhận' }, { status: 400 });
    }

    const { SMTP_USER, SMTP_PASS } = process.env;

    if (!SMTP_USER || !SMTP_PASS) {
      return NextResponse.json({ success: false, error: 'Chưa cấu hình tên đăng nhập/mật khẩu SMTP trong môi trường' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail', // Mặc định hỗ trợ Gmail
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background-color: #fce4ec; padding: 20px; border-radius: 12px; max-width: 500px; margin: 0 auto; text-align: center;">
        <h2 style="color: #d81b60;">💌 NoteLove Notification</h2>
        <p style="font-size: 16px; color: #333;"><strong>${title}</strong></p>
        <p style="font-size: 14px; color: #555; background: rgba(255,255,255,0.7); padding: 15px; border-radius: 8px; font-style: italic;">
          "${body}"
        </p>
        <div style="margin-top: 25px;">
          <a href="${url || 'https://lovestory.io'}" style="background-color: #e91e63; color: white; text-decoration: none; padding: 12px 24px; border-radius: 20px; font-weight: bold; font-size: 14px; display: inline-block;">
            Mở Ứng Dụng Ngay
          </a>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"NoteLove" <${SMTP_USER}>`,
      to: recipientEmail,
      subject: title,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (err: any) {
    console.error("Lỗi gửi Email:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
