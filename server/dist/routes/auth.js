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
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
// User Registration (Student/Teacher)
router.post('/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password, email, role } = req.body;
    if (!username || !password || !email) {
        return res.status(400).json({ message: 'Username, password, and email are required' });
    }
    if (role === 'ADMIN') {
        return res.status(403).json({ message: 'Admin registration is not allowed' });
    }
    const userRole = role === 'TEACHER' ? 'TEACHER' : 'STUDENT';
    try {
        const existingUser = yield db_1.default.user.findFirst({
            where: {
                OR: [{ username }, { email }],
            },
        });
        if (existingUser) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        const user = yield db_1.default.user.create({
            data: {
                username,
                password: hashedPassword,
                email,
                role: userRole,
            },
        });
        res.status(201).json({ message: 'User created successfully', userId: user.id, role: userRole });
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating user', error });
    }
}));
// User Login
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }
    try {
        const user = yield db_1.default.user.findUnique({ where: { username } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const valid = yield bcryptjs_1.default.compare(password, user.password);
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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.substring(7);
    try {
        const secret = process.env.JWT_SECRET || 'dev-secret';
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        const payload = typeof decoded === 'string' ? {} : decoded;
        const sub = typeof payload.sub === 'string' ? parseInt(payload.sub, 10) : payload.sub;
        if (!sub || Number.isNaN(sub)) {
            return res.status(401).json({ message: 'Invalid token payload' });
        }
        const user = yield db_1.default.user.findUnique({
            where: { id: sub },
            select: { id: true, username: true, role: true, email: true, avatar: true, title: true },
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ user });
    }
    catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
}));
exports.default = router;
