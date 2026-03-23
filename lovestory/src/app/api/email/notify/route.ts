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
      <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333; padding: 10px;">
        ${body}
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
