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
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const path_1 = __importDefault(require("path"));
const uploads_1 = __importDefault(require("./routes/uploads"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
app.use('/api/auth', auth_1.default);
app.use('/api/resources', resources_1.default);
app.use('/api/qa', qa_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/courses', courses_1.default);
app.use('/api/uploads', uploads_1.default);
app.get('/', (req, res) => {
    res.send('Hello from ULEP Server!');
});
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    if (process.env.DATABASE_URL) {
        void bootstrapAdmin();
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
