"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../db"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = require("../middleware/auth");
const cache_1 = require("../cache");
const mail_1 = require("../mail");
const router = (0, express_1.Router)();
const RATE_LIMIT_WINDOW = 10 * 60;
const RATE_LIMIT_MAX = 10;
const RESET_CODE_TTL_SEC = 5 * 60;
const RESET_FAIL_LOCK_SEC = 60 * 60;
function genCode() {
    const n = Math.floor(Math.random() * 1000000);
    return String(n).padStart(6, '0');
}
function logReset(entry) {
    try {
        fs_1.default.appendFileSync('password_reset.log', `${new Date().toISOString()} ${JSON.stringify(entry)}\n`);
    }
    catch (_a) { }
}
function sendResetMail(email, code) {
    return __awaiter(this, void 0, void 0, function* () {
        const tpl = (0, mail_1.buildCodeTemplate)(email, code);
        yield (0, mail_1.sendMail)({ to: email, subject: tpl.subject, text: tpl.text, html: tpl.html });
    });
}
// User Registration (Student/Teacher)
router.post('/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id, username, password, email, role } = req.body;
    const idTrim = String(id || '').trim();
    if (!idTrim || !username || !password || !email) {
        return res.status(400).json({ message: 'Id, username, password, and email are required' });
    }
    const uname = String(username).trim();
    const emailStr = String(email).trim();
    const passStr = String(password);
    if (!/^[A-Za-z0-9_\-\.]{3,64}$/.test(uname)) {
        return res.status(400).json({ message: 'Invalid username' });
    }
    if (!/^[A-Za-z0-9_\-]{3,64}$/.test(idTrim)) {
        return res.status(400).json({ message: 'Invalid id' });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailStr)) {
        return res.status(400).json({ message: 'Invalid email' });
    }
    if (passStr.length < 8 || !/[A-Za-z]/.test(passStr) || !/[0-9]/.test(passStr)) {
        return res.status(400).json({ message: 'Weak password' });
    }
    if (role === 'ADMIN') {
        return res.status(403).json({ message: 'Admin registration is not allowed' });
    }
    const userRole = role === 'TEACHER' ? 'TEACHER' : 'STUDENT';
    try {
        console.log('register', JSON.stringify({ id, username, email, role }));
        const ors = [{ username }, { email }];
        if (id)
            ors.push({ id });
        const existingUser = yield db_1.default.user.findFirst({ where: { OR: ors } });
        if (existingUser) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }
        const hashedPassword = yield bcryptjs_1.default.hash(passStr, 12);
        const data = {
            id: idTrim,
            username: uname,
            fullName: userRole === 'TEACHER' ? username : undefined,
            password: hashedPassword,
            email: emailStr,
            role: userRole,
        };
        console.log('register.data', JSON.stringify(data));
        try {
            fs_1.default.appendFileSync('register.log', `[REQ] ${new Date().toISOString()} ${JSON.stringify({ body: { id, username, email, role }, data })}\n`);
        }
        catch (_b) { }
        const user = yield db_1.default.user.create({ data });
        try {
            fs_1.default.appendFileSync('register.log', `[OK ] ${new Date().toISOString()} ${JSON.stringify({ userId: user.id })}\n`);
        }
        catch (_c) { }
        res.status(201).json({ message: 'User created successfully', userId: user.id, role: userRole });
    }
    catch (error) {
        try {
            fs_1.default.appendFileSync('register.log', `[ERR] ${new Date().toISOString()} ${JSON.stringify({ code: error === null || error === void 0 ? void 0 : error.code, meta: error === null || error === void 0 ? void 0 : error.meta, message: error === null || error === void 0 ? void 0 : error.message })}\n`);
        }
        catch (_d) { }
        if ((error === null || error === void 0 ? void 0 : error.code) === 'P2002') {
            return res.status(400).json({ message: 'User already exists', target: (_a = error === null || error === void 0 ? void 0 : error.meta) === null || _a === void 0 ? void 0 : _a.target });
        }
        if ((error === null || error === void 0 ? void 0 : error.code) === 'P2011') {
            return res.status(400).json({ message: 'Invalid id', id: idTrim });
        }
        res.status(500).json({ message: 'Error creating user', error, id: idTrim });
    }
}));
// User Login
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }
    try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
        const key = `login:${ip}:${String(username).trim()}`;
        const count = yield (0, cache_1.incrWithTTL)(key, RATE_LIMIT_WINDOW);
        if (count > RATE_LIMIT_MAX) {
            return res.status(429).json({ message: 'Too many attempts' });
        }
        const account = String(username).trim();
        const user = yield db_1.default.user.findFirst({ where: { OR: [{ username: account }, { id: account }, { email: account }] } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        let valid = false;
        try {
            valid = yield bcryptjs_1.default.compare(password, user.password);
        }
        catch (_a) {
            valid = false;
        }
        if (!valid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const secret = process.env.JWT_SECRET || 'dev-secret';
        const token = jsonwebtoken_1.default.sign({ sub: user.id, role: user.role }, secret, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    }
    catch (error) {
        res.status(500).json({ message: 'Error logging in', error });
    }
}));
// Get current user profile
router.get('/me', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.substring(7);
    try {
        const secret = process.env.JWT_SECRET || 'dev-secret';
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        const payload = typeof decoded === 'string' ? {} : decoded;
        const sub = typeof payload.sub === 'string' ? payload.sub : String(payload.sub || '');
        if (!sub) {
            return res.status(401).json({ message: 'Invalid token payload' });
        }
        const user = yield db_1.default.user.findUnique({
            where: { id: sub },
            select: { id: true, username: true, fullName: true, role: true, email: true, avatar: true, title: true },
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        try {
            const rows = yield db_1.default.$queryRawUnsafe(`SELECT uploads, downloads FROM "User" WHERE id = $1`, sub);
            const stats = rows && rows[0] ? rows[0] : { uploads: 0, downloads: 0 };
            res.json({ user: Object.assign(Object.assign({}, user), { uploads: (_a = stats.uploads) !== null && _a !== void 0 ? _a : 0, downloads: (_b = stats.downloads) !== null && _b !== void 0 ? _b : 0 }) });
        }
        catch (_c) {
            res.json({ user });
        }
    }
    catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
}));
// Update username (students only)
router.patch('/username', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uid = req.userId;
        const { username } = req.body;
        if (!username || !username.trim())
            return res.status(400).json({ message: 'Username required' });
        const user = yield db_1.default.user.findUnique({ where: { id: uid } });
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        if (user.role !== 'STUDENT')
            return res.status(403).json({ message: 'Only students can update username' });
        const exists = yield db_1.default.user.findUnique({ where: { username } });
        if (exists && exists.id !== uid)
            return res.status(400).json({ message: 'Username already exists' });
        const updated = yield db_1.default.user.update({ where: { id: uid }, data: { username } });
        res.json({ user: { id: updated.id, username: updated.username, role: updated.role, email: updated.email, avatar: updated.avatar, title: updated.title } });
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
// Username unique check
router.get('/username/check', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const u = String(req.query.u || '').trim();
        if (!u)
            return res.json({ exists: false });
        const found = yield db_1.default.user.findUnique({ where: { username: u } });
        res.json({ exists: !!found });
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
exports.default = router;
router.get('/stats', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uid = req.userId;
        const rows = yield db_1.default.$queryRawUnsafe(`SELECT uploads, downloads FROM "User" WHERE id = $1`, uid);
        const stats = rows && rows[0] ? rows[0] : { uploads: 0, downloads: 0 };
        res.json(stats);
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
// Request password reset code
router.post('/reset-password', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    const em = String(email || '').trim();
    if (!em)
        return res.status(400).json({ message: 'Email required' });
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(em))
        return res.status(400).json({ message: 'Invalid email' });
    try {
        const user = yield db_1.default.user.findUnique({ where: { email: em } });
        if (!user) {
            logReset({ phase: 'request', email: em, ok: false, reason: 'not_found' });
            return res.status(404).json({ message: '注册邮箱不存在' });
        }
        const code = genCode();
        yield (0, cache_1.cacheSet)(`pwd:code:${em}`, JSON.stringify({ code, ts: Date.now() }), RESET_CODE_TTL_SEC);
        yield (0, cache_1.cacheDel)(`pwd:fail:${em}`);
        yield sendResetMail(em, code);
        logReset({ phase: 'request', email: em, ok: true });
        res.json({ message: '验证码已发送至您的邮箱' });
    }
    catch (err) {
        logReset({ phase: 'request', email: em, ok: false, error: err === null || err === void 0 ? void 0 : err.message });
        res.status(500).json({ message: (err === null || err === void 0 ? void 0 : err.message) || 'Server error' });
    }
}));
// Confirm password reset with code
router.post('/reset-password/confirm', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, code, newPassword } = req.body;
    const em = String(email || '').trim();
    const cd = String(code || '').trim();
    const np = String(newPassword || '');
    if (!em || !cd || !np)
        return res.status(400).json({ message: 'Params required' });
    if (!/^\d{6}$/.test(cd))
        return res.status(400).json({ message: '验证码错误或已过期' });
    try {
        const lock = yield (0, cache_1.cacheGet)(`pwd:lock:${em}`);
        if (lock) {
            logReset({ phase: 'confirm', email: em, ok: false, reason: 'locked' });
            return res.status(429).json({ message: '尝试过多，邮箱已锁定，请稍后再试' });
        }
        const cached = yield (0, cache_1.cacheGet)(`pwd:code:${em}`);
        if (!cached) {
            yield incrFail(em);
            logReset({ phase: 'confirm', email: em, ok: false, reason: 'code_missing' });
            return res.status(400).json({ message: '验证码错误或已过期' });
        }
        let parsed = null;
        try {
            parsed = JSON.parse(cached);
        }
        catch (_a) { }
        const valid = parsed && parsed.code === cd && (Date.now() - (parsed.ts || 0)) <= RESET_CODE_TTL_SEC * 1000;
        if (!valid) {
            yield incrFail(em);
            logReset({ phase: 'confirm', email: em, ok: false, reason: 'code_invalid' });
            return res.status(400).json({ message: '验证码错误或已过期' });
        }
        // Password strength: ≥8, contains upper, lower, digit
        const strong = np.length >= 8 && /[A-Z]/.test(np) && /[a-z]/.test(np) && /[0-9]/.test(np);
        if (!strong)
            return res.status(400).json({ message: '密码需至少8位，包含大小写字母和数字' });
        const user = yield db_1.default.user.findUnique({ where: { email: em } });
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        const hashed = yield bcryptjs_1.default.hash(np, 12);
        yield db_1.default.user.update({ where: { id: user.id }, data: { password: hashed } });
        yield (0, cache_1.cacheDel)(`pwd:code:${em}`);
        yield (0, cache_1.cacheDel)(`pwd:fail:${em}`);
        logReset({ phase: 'confirm', email: em, ok: true });
        res.json({ message: '密码修改成功' });
    }
    catch (err) {
        logReset({ phase: 'confirm', email: em, ok: false, error: err === null || err === void 0 ? void 0 : err.message });
        res.status(500).json({ message: (err === null || err === void 0 ? void 0 : err.message) || 'Server error' });
    }
}));
function incrFail(email) {
    return __awaiter(this, void 0, void 0, function* () {
        const n = yield (0, cache_1.incrWithTTL)(`pwd:fail:${email}`, RESET_FAIL_LOCK_SEC);
        if (n >= 3)
            yield (0, cache_1.cacheSet)(`pwd:lock:${email}`, '1', RESET_FAIL_LOCK_SEC);
    });
}
// Email format + MX check
router.get('/email/check', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const em = String(req.query.email || '').trim();
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!re.test(em))
            return res.json({ valid: false, reason: '格式不合法' });
        try {
            const domain = em.split('@')[1];
            const dns = yield Promise.resolve().then(() => __importStar(require('dns')));
            const p = dns.promises;
            const mx = yield p.resolveMx(domain);
            return res.json({ valid: !!(mx && mx.length) });
        }
        catch (_a) {
            return res.json({ valid: false, reason: 'MX记录不可用' });
        }
    }
    catch (err) {
        res.status(500).json({ message: (err === null || err === void 0 ? void 0 : err.message) || 'Server error' });
    }
}));
// Update password (self)
router.post('/password', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uid = req.userId;
        const { newPassword } = (req.body || {});
        const np = String(newPassword || '');
        if (!np)
            return res.status(400).json({ message: '新密码需填写' });
        const strong = (np.length >= 8 && /[A-Za-z]/.test(np) && /[0-9]/.test(np)) || (np.length > 12 && /[A-Z]/.test(np) && /[a-z]/.test(np) && /[0-9]/.test(np) && /[^A-Za-z0-9]/.test(np));
        if (!strong)
            return res.status(400).json({ message: '密码需至少8位且包含字母与数字（更强建议含大小写和特殊符号）' });
        const hashed = yield bcryptjs_1.default.hash(np, 12);
        yield db_1.default.user.update({ where: { id: uid }, data: { password: hashed } });
        try {
            fs_1.default.appendFileSync('settings.log', `${new Date().toISOString()} ${JSON.stringify({ op: 'password_update', user: uid })}\n`);
        }
        catch (_a) { }
        res.json({ message: '密码已更新' });
    }
    catch (err) {
        res.status(500).json({ message: (err === null || err === void 0 ? void 0 : err.message) || 'Server error' });
    }
}));
// Update avatar (self)
router.post('/avatar', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uid = req.userId;
        const { avatarUrl } = (req.body || {});
        const url = String(avatarUrl || '').trim();
        if (!url)
            return res.status(400).json({ message: '头像地址需填写' });
        if (!/^\/uploads\//.test(url))
            return res.status(400).json({ message: '非法头像地址' });
        const user = yield db_1.default.user.findUnique({ where: { id: uid } });
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        yield db_1.default.user.update({ where: { id: uid }, data: { avatar: url } });
        try {
            fs_1.default.appendFileSync('settings.log', `${new Date().toISOString()} ${JSON.stringify({ op: 'avatar_set', user: uid, url })}\n`);
        }
        catch (_a) { }
        res.json({ message: '头像已更新', avatar: url });
    }
    catch (err) {
        res.status(500).json({ message: (err === null || err === void 0 ? void 0 : err.message) || 'Server error' });
    }
}));
// Start email change (send code to new email)
router.post('/email', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uid = req.userId;
        const { email } = (req.body || {});
        const em = String(email || '').trim();
        if (!em)
            return res.status(400).json({ message: 'Email required' });
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!re.test(em))
            return res.status(400).json({ message: 'Invalid email' });
        const exists = yield db_1.default.user.findFirst({ where: { email: em } });
        if (exists)
            return res.status(400).json({ message: '该邮箱已被使用' });
        try {
            const domain = em.split('@')[1];
            const dns = yield Promise.resolve().then(() => __importStar(require('dns')));
            const p = dns.promises;
            const mx = yield p.resolveMx(domain);
            if (!mx || mx.length === 0)
                return res.status(400).json({ message: '邮箱域名无有效MX记录' });
        }
        catch (_a) {
            return res.status(400).json({ message: '邮箱域名验证失败' });
        }
        yield db_1.default.user.update({ where: { id: uid }, data: { email: em } });
        try {
            fs_1.default.appendFileSync('settings.log', `${new Date().toISOString()} ${JSON.stringify({ op: 'email_update', user: uid, email: em })}\n`);
        }
        catch (_b) { }
        res.json({ message: '邮箱已更新', email: em });
    }
    catch (err) {
        res.status(500).json({ message: (err === null || err === void 0 ? void 0 : err.message) || 'Server error' });
    }
}));
// Confirm email change
router.post('/email/confirm', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uid = req.userId;
        const { code } = (req.body || {});
        const cd = String(code || '').trim();
        if (!/^\d{6}$/.test(cd))
            return res.status(400).json({ message: '验证码错误或已过期' });
        const cached = yield (0, cache_1.cacheGet)(`emailchg:${uid}`);
        if (!cached)
            return res.status(400).json({ message: '验证码错误或已过期' });
        let parsed = null;
        try {
            parsed = JSON.parse(cached);
        }
        catch (_a) { }
        const valid = parsed && parsed.code === cd && (Date.now() - (parsed.ts || 0)) <= 600000;
        if (!valid)
            return res.status(400).json({ message: '验证码错误或已过期' });
        const email = String(parsed.email || '').trim();
        if (!email)
            return res.status(400).json({ message: '邮箱信息缺失' });
        yield db_1.default.user.update({ where: { id: uid }, data: { email } });
        yield (0, cache_1.cacheDel)(`emailchg:${uid}`);
        try {
            fs_1.default.appendFileSync('settings.log', `${new Date().toISOString()} ${JSON.stringify({ op: 'email_update', user: uid, email })}\n`);
        }
        catch (_b) { }
        res.json({ message: '邮箱已更新', email });
    }
    catch (err) {
        res.status(500).json({ message: (err === null || err === void 0 ? void 0 : err.message) || 'Server error' });
    }
}));
