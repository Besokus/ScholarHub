import nodemailer from 'nodemailer'
import fs from 'fs'

type MailInput = { to: string; subject: string; text?: string; html?: string; attachments?: Array<{ filename: string; content?: any; path?: string }>} 

function createTransport() {
  const host = process.env.SMTP_HOST || ''
  const port = parseInt(process.env.SMTP_PORT || '465', 10)
  const user = process.env.SMTP_USER || ''
  const pass = process.env.SMTP_PASS || ''
  const secure = port === 465
  if (!host || !user || !pass) throw new Error('SMTP config missing')
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } })
}

export async function sendMail(input: MailInput, retries = 3): Promise<void> {
  const log = (ok: boolean, detail: any) => {
    try { fs.appendFileSync('mail.log', `[SEND-${ok ? 'OK' : 'ERR'}] ${new Date().toISOString()} ${JSON.stringify(detail)}\n`) } catch {}
  }
  let lastErr: any = null
  for (let i = 0; i < retries; i++) {
    try {
      const t = createTransport()
      await t.verify()
      await t.sendMail({ from: process.env.SMTP_USER, to: input.to, subject: input.subject, text: input.text, html: input.html, attachments: input.attachments })
      log(true, { to: input.to, subject: input.subject })
      return
    } catch (e: any) {
      lastErr = e
      log(false, { to: input.to, subject: input.subject, error: e?.message || String(e) })
      await new Promise(r => setTimeout(r, 1000 * (i + 1)))
    }
  }
  throw lastErr || new Error('Failed to send mail')
}

export function buildCodeTemplate(email: string, code: string) {
  return {
    subject: 'ScholarHub 密码重置验证码',
    html: `
      <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;padding:20px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#111827;margin:0 0 8px">验证码：<span style="color:#2563eb">${code}</span></h2>
        <p style="color:#6b7280;margin:6px 0">该验证码在 5 分钟内有效，请勿泄露。</p>
        <p style="color:#6b7280;margin:6px 0">如非本人操作，请忽略此邮件。</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
        <div style="font-size:12px;color:#9ca3af">发送至：${email}</div>
      </div>
    `,
    text: `验证码：${code}（5分钟内有效）。如非本人操作，请忽略此邮件。发送至：${email}`
  }
}
