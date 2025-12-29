import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export function authOptional(req: Request, _res: Response, next: NextFunction) {
  const h = req.headers.authorization
  if (h && h.startsWith('Bearer ')) {
    const token = h.slice(7)
    try {
      const secret = process.env.JWT_SECRET || 'dev-secret'
      const payload = jwt.verify(token, secret) as any
      const rawId = (payload && (payload.sub ?? (payload as any).uid)) as any
      if (rawId !== undefined && rawId !== null) {
        ;(req as any).userId = typeof rawId === 'string' ? rawId : String(rawId)
      }
      ;(req as any).userRole = payload && (payload as any).role
    } catch {}
  }
  next()
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req as any).userId) return res.status(401).json({ message: 'Unauthorized' })
  next()
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!(req as any).userId) return res.status(401).json({ message: 'Unauthorized' })
  if ((req as any).userRole !== 'ADMIN') return res.status(403).json({ message: 'Forbidden: Admin only' })
  next()
}
