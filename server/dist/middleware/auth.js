"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authOptional = authOptional;
exports.requireAuth = requireAuth;
exports.requireAdmin = requireAdmin;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function authOptional(req, _res, next) {
    const h = req.headers.authorization;
    if (h && h.startsWith('Bearer ')) {
        const token = h.slice(7);
        try {
            const secret = process.env.JWT_SECRET || 'dev-secret';
            const payload = jsonwebtoken_1.default.verify(token, secret);
            req.userId = typeof payload.sub === 'string' ? payload.sub : String(payload.sub);
            req.userRole = payload.role;
        }
        catch (_a) { }
    }
    next();
}
function requireAuth(req, res, next) {
    if (!req.userId)
        return res.status(401).json({ message: 'Unauthorized' });
    next();
}
function requireAdmin(req, res, next) {
    if (!req.userId)
        return res.status(401).json({ message: 'Unauthorized' });
    if (req.userRole !== 'ADMIN')
        return res.status(403).json({ message: 'Forbidden: Admin only' });
    next();
}
