import { PrismaClient } from '../prisma/generated/client'

async function main() {
  const prisma = new PrismaClient()
  try {
    const res = await prisma.user.create({
      data: {
        id: 'S12350',
        username: 'student_test_50',
        password: 'nopass',
        email: 'student_test_50@example.com',
        role: 'STUDENT'
      }
    })
    console.log(JSON.stringify(res))
    const admin = await prisma.user.findFirst({ where: { username: 'admin' } })
    console.log('admin:', JSON.stringify(admin))
  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
