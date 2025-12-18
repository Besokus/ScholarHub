import { sendMail, buildCodeTemplate } from '../src/mail'

async function run() {
  const to = process.env.SMTP_USER || ''
  console.log('SMTP_USER:', to)
  if (!to) { console.error('Missing SMTP_USER'); process.exit(1) }
  try {
    await sendMail({ to, subject: 'Text Mail', text: 'Hello from ScholarHub' })
    const tpl = buildCodeTemplate(to, '654321')
    await sendMail({ to, subject: tpl.subject, html: tpl.html })
    await sendMail({ to, subject: 'Attachment', text: 'See attached', attachments: [{ filename: 'readme.txt', content: 'hi' }] })
    console.log('All mails sent')
  } catch (e) {
    console.error('Send failed:', e)
    process.exit(1)
  }
}

run()
