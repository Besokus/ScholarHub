import { PrismaClient } from '../prisma/generated/client'

async function main() {
  const prisma = new PrismaClient()
  try {
    const ids = ['2235051227', 'S10001']
    for (const id of ids) {
      const uRec = await prisma.user.findUnique({ where: { id } })
      console.log(id, JSON.stringify(uRec))
    }
  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
