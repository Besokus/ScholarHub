import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export function authOptional(req: Request, _res: Response, next: NextFunction) {
  const h = req.headers.authorization
  if (h && h.startsWith('Bearer ')) {
    const token = h.slice(7)
    try {
      const secret = process.env.JWT_SECRET || 'dev-secret'
      const payload = jwt.verify(token, secret) as any
      ;(req as any).userId = typeof payload.sub === 'string' ? payload.sub : String(payload.sub)
      ;(req as any).userRole = payload.role
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
