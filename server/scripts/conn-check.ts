import { PrismaClient } from '../prisma/generated/client'

async function main() {
  const prisma = new PrismaClient()
  try {
    const id = `CONN_TEST_${Date.now()}`
    const res = await prisma.user.create({
      data: {
        id,
        username: id,
        password: 'nopass',
        email: `${id}@example.com`,
        role: 'STUDENT'
      }
    })
    console.log(JSON.stringify({ ok: true, inserted: res.id }))
  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
