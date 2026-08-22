import nodemailer from "nodemailer";
import { getDb } from "./db";

export interface PaymentNotificationData {
  userName: string;
  orderNumber: string;
  orderId: string;
  orderItems: { product_name: string; design_name: string; size_name: string; fit: string; quantity: number }[];
  paymentMethod: string;
  amountUsd?: number;
  amountCrc?: number;
  reference?: string;
  paymentId: number;
}

interface SMTPSettings {
  host: string;
  port: number;
  secure: number;
  username: string;
  password: string;
  from_email: string;
}

async function getSMTPSettings(): Promise<SMTPSettings | null> {
  try {
    const db = getDb();
    const settings = db.prepare("SELECT * FROM smtp_settings WHERE id = 1").get() as SMTPSettings | undefined;
    return settings || null;
  } catch {
    return null;
  }
}

async function getAdminEmails(): Promise<string[]> {
  try {
    const db = getDb();
    const emails = db.prepare("SELECT email FROM admin_emails ORDER BY created_at ASC").all() as { email: string }[];
    return emails.map(e => e.email);
  } catch {
    return [];
  }
}

export async function sendPaymentNotification(data: PaymentNotificationData): Promise<boolean> {
  try {
    const smtpSettings = await getSMTPSettings();
    const adminEmails = await getAdminEmails();

    if (!smtpSettings || adminEmails.length === 0) {
      console.log("SMTP not configured or no admin emails configured. Payment notification skipped.");
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: smtpSettings.host,
      port: smtpSettings.port,
      secure: smtpSettings.secure === 1,
      auth: {
        user: smtpSettings.username,
        pass: smtpSettings.password,
      },
    });

    const itemsHtml = data.orderItems
      .map(
        item =>
          `<tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.product_name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.design_name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.size_name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.fit || "unisex"}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${item.quantity}</td>
      </tr>`
      )
      .join("");

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
            .header { background-color: #2c3e50; color: white; padding: 20px; border-radius: 4px 4px 0 0; }
            .content { background-color: white; padding: 20px; border-radius: 0 0 4px 4px; }
            .section { margin: 20px 0; }
            .label { font-weight: bold; color: #555; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th { background-color: #e8e8e8; padding: 10px; text-align: left; font-weight: bold; border-bottom: 2px solid #ccc; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">New Payment Submitted</h2>
            </div>
            <div class="content">
              <div class="section">
                <p><span class="label">User Name:</span> ${data.userName}</p>
                <p><span class="label">Order Number:</span> ${data.orderNumber}</p>
                <p><span class="label">Payment Method:</span> ${data.paymentMethod.toUpperCase()}</p>
                ${data.reference ? `<p><span class="label">Reference/Note:</span> ${data.reference}</p>` : ""}
                ${data.amountUsd ? `<p><span class="label">Amount (USD):</span> $${data.amountUsd.toFixed(2)}</p>` : ""}
                ${data.amountCrc ? `<p><span class="label">Amount (CRC):</span> ₡${data.amountCrc.toLocaleString()}</p>` : ""}
              </div>

              <div class="section">
                <h3>Order Items:</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Design</th>
                      <th>Size</th>
                      <th>Fit</th>
                      <th>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                </table>
              </div>

              <div class="section" style="background-color: #f0f0f0; padding: 15px; border-radius: 4px;">
                <p style="margin: 0; font-size: 12px; color: #666;">
                  Payment ID: ${data.paymentId}<br/>
                  Status: Pending Review
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: smtpSettings.from_email,
      to: adminEmails.join(","),
      subject: `[ThinkMTB] Payment Received - ${data.userName} (#${data.paymentId})`,
      html: htmlContent,
    });

    return true;
  } catch (error) {
    console.error("Failed to send payment notification email:", error);
    return false;
  }
}
