import { PrismaClient } from '../prisma/generated/client'

async function main() {
  const prisma = new PrismaClient()
  try {
    const users = await prisma.user.findMany({ select: { id: true, username: true, email: true, role: true } })
    console.log(JSON.stringify(users))
  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
