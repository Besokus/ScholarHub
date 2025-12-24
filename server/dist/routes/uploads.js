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
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
const uploadDir = path_1.default.join(process.cwd(), 'uploads');
const profileDir = path_1.default.join(uploadDir, 'profile');
const questionsDir = path_1.default.join(uploadDir, 'questions');
const resourcesDir = path_1.default.join(uploadDir, 'resources');
for (const d of [uploadDir, profileDir, questionsDir, resourcesDir]) {
    if (!fs_1.default.existsSync(d))
        fs_1.default.mkdirSync(d, { recursive: true, mode: 0o755 });
}
const tsName = (ext) => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).slice(2, 8);
    return `${yyyy}${mm}${dd}_${rand}${ext}`;
};
const imagesStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, questionsDir),
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        cb(null, tsName(ext));
    }
});
const genericStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
    }
});
const imageFilter = (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.mimetype))
        return cb(new Error('Unsupported image type'));
    cb(null, true);
};
const fileFilter = (_req, file, cb) => {
    // Allow all, validate later with magic numbers
    cb(null, true);
};
const imagesUpload = (0, multer_1.default)({ storage: imagesStorage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const filesUpload = (0, multer_1.default)({ storage: genericStorage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });
const avatarUpload = (0, multer_1.default)({ storage: multer_1.default.diskStorage({
        destination: (_req, _file, cb) => cb(null, profileDir),
        filename: (req, file, cb) => {
            const ext = path_1.default.extname(file.originalname).toLowerCase();
            const uid = req.userId || 'user';
            cb(null, `${uid}-${Date.now()}${ext}`);
        }
    }), fileFilter: (req, file, cb) => {
        const ok = ['image/jpeg', 'image/png', 'image/gif'].includes(file.mimetype);
        if (!ok)
            return cb(new Error('Unsupported image type'));
        cb(null, true);
    }, limits: { fileSize: 5 * 1024 * 1024 } });
function sha256File(p) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield new Promise((resolve, reject) => {
            const h = crypto_1.default.createHash('sha256');
            const s = fs_1.default.createReadStream(p);
            s.on('data', (chunk) => h.update(chunk));
            s.on('error', reject);
            s.on('end', () => resolve(h.digest('hex')));
        });
    });
}
function isExecutable(buffer) {
    const sig = buffer.slice(0, 4);
    const hex = sig.toString('hex').toUpperCase();
    if (hex.startsWith('4D5A'))
        return true;
    if (hex.startsWith('7F454C46'))
        return true;
    return false;
}
function validateImageMagic(p) {
    const fd = fs_1.default.openSync(p, 'r');
    const buffer = Buffer.alloc(16);
    fs_1.default.readSync(fd, buffer, 0, 16, 0);
    fs_1.default.closeSync(fd);
    const hex = buffer.toString('hex').toUpperCase();
    if (hex.startsWith('FFD8FF'))
        return true;
    if (hex.startsWith('89504E47'))
        return true;
    if (hex.startsWith('47494638'))
        return true;
    if (hex.startsWith('52494646'))
        return true;
    return false;
}
router.post('/images', auth_1.requireAuth, imagesUpload.array('images', 9), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const key = `uploads:day:${new Date().toISOString().slice(0, 10)}`;
    try {
        const { incrWithTTL } = yield Promise.resolve().then(() => __importStar(require('../cache')));
        const c = yield incrWithTTL(key, 86400);
        if (c > 5000)
            return res.status(429).json({ message: 'Daily upload limit reached' });
    }
    catch (_a) { }
    const files = req.files || [];
    const indexPath = path_1.default.join(uploadDir, 'uploads_index.json');
    let index = {};
    try {
        index = JSON.parse(fs_1.default.readFileSync(indexPath, 'utf-8'));
    }
    catch (_b) { }
    const urls = [];
    for (const f of files) {
        try {
            const fd = fs_1.default.openSync(f.path, 'r');
            const chunk = Buffer.alloc(16);
            fs_1.default.readSync(fd, chunk, 0, 16, 0);
            fs_1.default.closeSync(fd);
            if (isExecutable(chunk)) {
                fs_1.default.unlinkSync(f.path);
                return res.status(400).json({ message: 'Executable files are not allowed' });
            }
            if (!validateImageMagic(f.path)) {
                fs_1.default.unlinkSync(f.path);
                return res.status(400).json({ message: 'Invalid image content' });
            }
            const hash = yield sha256File(f.path);
            if (index[hash]) {
                urls.push({ url: index[hash], size: f.size });
                fs_1.default.unlinkSync(f.path);
                continue;
            }
            fs_1.default.chmodSync(f.path, 0o644);
            const url = `/uploads/questions/${path_1.default.basename(f.path)}`;
            urls.push({ url, size: f.size });
            index[hash] = url;
            try {
                fs_1.default.appendFileSync(path_1.default.join(process.cwd(), 'uploads.log'), `${new Date().toISOString()} ${JSON.stringify({ user: req.userId, url, size: f.size, hash, type: 'question_image' })}\n`);
            }
            catch (_c) { }
        }
        catch (_d) {
            try {
                if (fs_1.default.existsSync(f.path))
                    fs_1.default.unlinkSync(f.path);
            }
            catch (_e) { }
            return res.status(500).json({ message: 'Image validation failed' });
        }
    }
    try {
        fs_1.default.writeFileSync(indexPath, JSON.stringify(index));
    }
    catch (_f) { }
    res.json({ urls });
}));
router.post('/files', auth_1.requireAuth, filesUpload.single('file'), (req, res) => {
    const f = req.file;
    if (!f)
        return res.status(400).json({ message: 'No file' });
    // Magic number check
    try {
        const fd = fs_1.default.openSync(f.path, 'r');
        const buffer = Buffer.alloc(262);
        fs_1.default.readSync(fd, buffer, 0, 262, 0);
        fs_1.default.closeSync(fd);
        const header = buffer.toString('hex', 0, 20).toUpperCase(); // First 20 bytes enough for most
        let type = 'UNKNOWN';
        if (header.startsWith('504B0304'))
            type = 'ZIP'; // Could be DOCX/XLSX/PPTX
        else if (header.startsWith('52617221'))
            type = 'RAR';
        else if (header.startsWith('377ABCAF'))
            type = '7Z';
        else if (header.startsWith('25504446'))
            type = 'PDF';
        else if (header.startsWith('FFD8FF'))
            type = 'JPG';
        else if (header.startsWith('89504E47'))
            type = 'PNG';
        else if (header.startsWith('47494638'))
            type = 'GIF';
        else if (header.startsWith('494433') || header.startsWith('FFFB'))
            type = 'MP3';
        else if (f.mimetype === 'video/mp4')
            type = 'MP4'; // MP4 magic number is variable (ftyp), trust mimetype if extension matches? 
        // MP4 check: usually 4th byte is 'ftyp'
        else if (buffer.toString('ascii', 4, 8) === 'ftyp')
            type = 'MP4';
        // Check extension for ZIP/Office distinction
        const ext = path_1.default.extname(f.originalname).toLowerCase();
        if (type === 'ZIP') {
            if (['.docx', '.xlsx', '.pptx', '.doc', '.ppt', '.xls'].includes(ext)) {
                type = ext.substring(1).toUpperCase();
            }
        }
        if (type === 'UNKNOWN') {
            // Fallback to extension for text files or others if magic number fails but we want to allow it?
            // User requirement: "Use file header information for accurate type judgment" and "Provide friendly error message when uploading unsupported file types"
            if (ext === '.txt')
                type = 'TXT';
            else {
                fs_1.default.unlinkSync(f.path);
                return res.status(400).json({ message: 'Unsupported file type or content mismatch' });
            }
        }
        const url = `/uploads/${path_1.default.basename(f.path)}`;
        res.json({ url, size: f.size, type });
    }
    catch (err) {
        if (fs_1.default.existsSync(f.path))
            fs_1.default.unlinkSync(f.path);
        res.status(500).json({ message: 'File validation failed' });
    }
});
const resMimes = {
    pdf: ['application/pdf'],
    video: ['video/mp4', 'video/mpeg', 'video/quicktime'],
    audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/aac']
};
router.post('/resources', auth_1.requireAuth, (0, multer_1.default)({ storage: genericStorage, fileFilter, limits: { fileSize: 200 * 1024 * 1024 } }).single('file'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const f = req.file;
    const body = req.body || {};
    const resourceType = String(body.resourceType || '').toLowerCase();
    const resourceId = String(body.resourceId || '').trim();
    const version = String(body.version || '').trim();
    if (!f)
        return res.status(400).json({ message: 'No file' });
    if (!['pdf', 'video', 'audio'].includes(resourceType))
        return res.status(400).json({ message: 'Invalid resource type' });
    const allowed = resMimes[resourceType] || [];
    if (!allowed.includes(f.mimetype)) {
        try {
            fs_1.default.unlinkSync(f.path);
        }
        catch (_a) { }
        ;
        return res.status(400).json({ message: 'Unsupported MIME type' });
    }
    if (!resourceId || !version) {
        try {
            fs_1.default.unlinkSync(f.path);
        }
        catch (_b) { }
        ;
        return res.status(400).json({ message: 'resourceId and version required' });
    }
    const ext = path_1.default.extname(f.originalname).toLowerCase();
    const subDir = path_1.default.join(resourcesDir, resourceType);
    if (!fs_1.default.existsSync(subDir))
        fs_1.default.mkdirSync(subDir, { recursive: true, mode: 0o755 });
    let sizeLimit = 50 * 1024 * 1024;
    if (resourceType === 'pdf')
        sizeLimit = 50 * 1024 * 1024;
    if (resourceType === 'audio')
        sizeLimit = 100 * 1024 * 1024;
    if (resourceType === 'video')
        sizeLimit = 500 * 1024 * 1024;
    if (f.size > sizeLimit) {
        try {
            fs_1.default.unlinkSync(f.path);
        }
        catch (_c) { }
        ;
        return res.status(413).json({ message: 'File too large' });
    }
    const targetName = `${resourceId}_${version}${ext}`;
    const targetPath = path_1.default.join(subDir, targetName);
    try {
        fs_1.default.renameSync(f.path, targetPath);
        fs_1.default.chmodSync(targetPath, 0o644);
        const hash = yield sha256File(targetPath);
        const url = `/uploads/resources/${resourceType}/${targetName}`;
        try {
            fs_1.default.appendFileSync(path_1.default.join(process.cwd(), 'uploads.log'), `${new Date().toISOString()} ${JSON.stringify({ user: req.userId, url, size: fs_1.default.statSync(targetPath).size, hash, type: `resource_${resourceType}` })}\n`);
        }
        catch (_d) { }
        res.json({ url, size: fs_1.default.statSync(targetPath).size });
    }
    catch (_e) {
        try {
            fs_1.default.unlinkSync(f.path);
        }
        catch (_f) { }
        res.status(500).json({ message: 'Save failed' });
    }
}));
router.post('/avatar', auth_1.requireAuth, avatarUpload.single('file'), (req, res) => {
    const f = req.file;
    if (!f)
        return res.status(400).json({ message: 'No file' });
    try {
        const url = `/uploads/profile/${path_1.default.basename(f.path)}`;
        fs_1.default.appendFileSync('settings.log', `${new Date().toISOString()} ${JSON.stringify({ op: 'avatar_upload', user: req.userId, url })}\n`);
        res.json({ url });
    }
    catch (err) {
        res.status(500).json({ message: (err === null || err === void 0 ? void 0 : err.message) || 'Server error' });
    }
});
exports.default = router;
