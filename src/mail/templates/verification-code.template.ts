export interface VerificationCodeEmail {
  subject: string;
  html: string;
  text: string;
}

export function buildVerificationCodeEmail(
  firstName: string,
  code: string,
): VerificationCodeEmail {
  const subject = `${code} is your Noemdek HR verification code`;

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(15,23,42,0.08);">
            <tr>
              <td style="background-color:#0f172a;padding:24px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:600;letter-spacing:0.4px;">Noemdek HR</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:24px;">Hi ${firstName},</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:24px;color:#334155;">
                  Use the code below to verify your email address. It is valid for <strong style="color:#0f172a;">2 hours</strong>.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 0;">
                      <span style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:32px;font-weight:700;letter-spacing:10px;color:#0f172a;">${code}</span>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:14px;line-height:20px;color:#64748b;">
                  If you did not create this account, you can safely ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;">
                <p style="margin:0;font-size:12px;line-height:18px;color:#94a3b8;">
                  This is an automated message from Noemdek HR. Please do not reply.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `Hi ${firstName},\n\nYour Noemdek HR verification code is ${code}.\nIt is valid for 2 hours.\n\nIf you did not create this account, you can safely ignore this email.`;

  return { subject, html, text };
}
