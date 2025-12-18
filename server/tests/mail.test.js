const { sendMail, buildCodeTemplate } = require('../dist/mail')

describe('Mail Service', () => {
  test('send text mail', async () => {
    const to = process.env.SMTP_USER
    await expect(sendMail({ to, subject: 'Test Text', text: 'Hello' }, 1)).resolves.toBeUndefined()
  })

  test('send html mail', async () => {
    const to = process.env.SMTP_USER
    const tpl = buildCodeTemplate(to, '123456')
    await expect(sendMail({ to, subject: tpl.subject, html: tpl.html }, 1)).resolves.toBeUndefined()
  })

  test('send attachment', async () => {
    const to = process.env.SMTP_USER
    await expect(sendMail({ to, subject: 'Attachment', text: 'See attached', attachments: [{ filename: 'readme.txt', content: 'hi' }] }, 1)).resolves.toBeUndefined()
  })
})
