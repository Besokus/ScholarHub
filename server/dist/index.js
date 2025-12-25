"use strict";
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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const resources_1 = __importDefault(require("./routes/resources"));
const qa_1 = __importDefault(require("./routes/qa"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const courses_1 = __importDefault(require("./routes/courses"));
const db_1 = __importDefault(require("./db"));
const mail_1 = require("./mail");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const path_1 = __importDefault(require("path"));
const uploads_1 = __importDefault(require("./routes/uploads"));
const swagger_1 = require("./swagger");
const answers_1 = __importDefault(require("./routes/answers"));
const auth_2 = require("./middleware/auth");
const fs_1 = __importDefault(require("fs"));
const cache_1 = require("./cache");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const corsOptions = { origin: allowed.length ? allowed : true, credentials: true, optionsSuccessStatus: 204 };
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
const uploadsPath = path_1.default.join(process.cwd(), 'uploads');
console.log('Serving uploads from:', uploadsPath);
console.log('Allowed origins:', allowed.length ? allowed : ['*']);
console.log('Env:', (process.env.NODE_ENV || 'development'));
console.log('Database URL set:', !!process.env.DATABASE_URL);
app.use('/uploads', (req, res, next) => {
    try {
        const ref = String(req.headers.referer || '');
        const ok = !ref || (Array.isArray(allowed) && allowed.length ? allowed.some(o => ref.startsWith(o)) : true);
        if (!ok)
            return res.status(403).send('Forbidden');
    }
    catch (_a) { }
    next();
}, express_1.default.static(uploadsPath));
app.use(auth_2.authOptional);
app.use((req, _res, next) => {
    try {
        const headers = Object.assign({}, req.headers);
        if (headers.authorization)
            headers.authorization = 'Bearer ***';
        const body = Object.assign({}, req.body);
        if (body && body.password)
            body.password = '***';
        const entry = { t: new Date().toISOString(), m: req.method, u: req.url, h: headers, b: body };
        fs_1.default.appendFileSync('req.log', JSON.stringify(entry) + '\n');
    }
    catch (_a) { }
    next();
});
app.use('/api/auth', auth_1.default);
app.use('/api/resources', resources_1.default);
app.use('/api/qa', qa_1.default);
app.use('/api', answers_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/courses', courses_1.default);
app.use('/api/uploads', uploads_1.default);
(0, swagger_1.registerSwagger)(app);
app.get('/', (req, res) => {
    res.send('Hello from ULEP Server!');
});
app.get('/api/health/redis', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!cache_1.redis || (cache_1.redis.status && cache_1.redis.status !== 'ready')) {
            return res.json({ ok: true, mode: 'memory', ping: 'PONG' });
        }
        const r = yield cache_1.redis.ping();
        res.json({ ok: true, mode: 'redis', ping: r });
    }
    catch (_a) {
        res.json({ ok: true, mode: 'memory', ping: 'PONG' });
    }
}));
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    if ((process.env.NODE_ENV || '').toLowerCase() === 'production' && (process.env.JWT_SECRET || 'dev-secret') === 'dev-secret') {
        console.warn('Unsafe JWT_SECRET in production');
    }
    if (process.env.DATABASE_URL) {
        void bootstrapAdmin();
        void bootstrapResourceCategories();
    }
    else {
        console.warn('DATABASE_URL not set; skipping admin bootstrap');
    }
});
function bootstrapAdmin() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const username = 'admin';
            const existing = yield db_1.default.user.findUnique({ where: { username } });
            if (!existing) {
                const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
                const hashed = yield bcryptjs_1.default.hash(defaultPassword, 10);
                yield db_1.default.user.create({
                    data: {
                        id: username,
                        username,
                        password: hashed,
                        email: process.env.ADMIN_EMAIL || 'admin@example.com',
                        role: 'ADMIN',
                    },
                });
                console.log('Default admin user created with username "admin"');
            }
        }
        catch (err) {
            console.error('Failed to bootstrap admin user', err);
        }
    });
}
function bootstrapResourceCategories() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield db_1.default.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "ResourceCategoryDict" (code TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE)`);
            yield db_1.default.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "ResourceCategoryMap" (resource_id INTEGER PRIMARY KEY, category_code TEXT NOT NULL, FOREIGN KEY(category_code) REFERENCES "ResourceCategoryDict"(code))`);
            const defaults = ['课件', '真题', '作业', '代码', '答案', '笔记', '教材', '其他'];
            let rows = [];
            try {
                rows = yield db_1.default.$queryRawUnsafe(`SELECT code FROM "ResourceCategoryDict"`);
            }
            catch (_a) {
                rows = [];
            }
            const existing = new Set((rows || []).map((r) => r.code));
            for (const name of defaults) {
                const code = name;
                if (!existing.has(code)) {
                    try {
                        yield db_1.default.$executeRawUnsafe(`INSERT INTO "ResourceCategoryDict"(code, name) VALUES ($1, $2)`, code, name);
                    }
                    catch (_b) { }
                }
            }
            let resRows = [];
            try {
                resRows = yield db_1.default.$queryRawUnsafe(`SELECT id FROM "Resource"`);
            }
            catch (_c) {
                resRows = [];
            }
            let mappedRows = [];
            try {
                mappedRows = yield db_1.default.$queryRawUnsafe(`SELECT resource_id FROM "ResourceCategoryMap"`);
            }
            catch (_d) {
                mappedRows = [];
            }
            const mapped = new Set((mappedRows || []).map((r) => r.resource_id));
            for (const r of resRows || []) {
                const rid = r.id;
                if (!mapped.has(rid)) {
                    try {
                        yield db_1.default.$executeRawUnsafe(`INSERT INTO "ResourceCategoryMap"(resource_id, category_code) VALUES ($1, $2)`, rid, '其他');
                    }
                    catch (_e) { }
                }
            }
            console.log('Resource categories ensured and backfilled');
        }
        catch (err) {
            console.error('Failed to bootstrap resource categories', err);
        }
    });
}
app.post('/api/send-email-code', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const email = String(((_a = req.body) === null || _a === void 0 ? void 0 : _a.email) || '').trim();
        if (!email)
            return res.status(400).json({ error: 'bad_request', message: 'Email required' });
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!re.test(email))
            return res.status(400).json({ error: 'bad_request', message: 'Invalid email' });
        const user = yield db_1.default.user.findUnique({ where: { email } });
        if (!user)
            return res.status(404).json({ error: 'not_found', message: '注册邮箱不存在' });
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
        const ipKey = `emailcode:ip:${ip}`;
        const ipCount = yield (0, cache_1.incrWithTTL)(ipKey, 3600);
        if (ipCount > 10)
            return res.status(429).json({ error: 'too_frequent', retry_after: 3600 });
        const now = Date.now();
        const coolKey = `user:${user.id}:email_code_cooldown`;
        const cool = yield (0, cache_1.cacheGet)(coolKey);
        if (cool) {
            let sendTime = 0;
            try {
                sendTime = ((_b = JSON.parse(cool)) === null || _b === void 0 ? void 0 : _b.send_time) || 0;
            }
            catch (_c) { }
            const elapsed = Math.floor((now - sendTime) / 1000);
            const remain = Math.max(0, 60 - elapsed);
            if (remain > 0)
                return res.status(429).json({ error: 'too_frequent', retry_after: remain });
        }
        const n = Math.floor(Math.random() * 1000000);
        const code = String(n).padStart(6, '0');
        yield (0, cache_1.cacheSet)(`user:${user.id}:email_code`, JSON.stringify({ code, send_time: now }), 300);
        yield (0, cache_1.cacheSet)(coolKey, JSON.stringify({ send_time: now }), 60);
        try {
            yield (0, mail_1.sendMail)({ to: email, subject: 'ScholarHub 邮件验证码', text: `验证码：${code}（5分钟内有效）`, html: `<p>验证码：<b>${code}</b>（5分钟内有效）</p>` });
        }
        catch (e) {
            try {
                fs_1.default.appendFileSync('mail.log', `[CODE-FALLBACK] ${new Date().toISOString()} to=${email} code=${code} err=${e === null || e === void 0 ? void 0 : e.message}\n`);
            }
            catch (_d) { }
        }
        try {
            fs_1.default.appendFileSync('password_reset.log', `${new Date().toISOString()} ${JSON.stringify({ phase: 'send', email, ip })}\n`);
        }
        catch (_e) { }
        res.json({ status: 'success', next_request: 60 });
    }
    catch (err) {
        res.status(500).json({ error: 'server_error', message: (err === null || err === void 0 ? void 0 : err.message) || 'Server error' });
    }
}));
