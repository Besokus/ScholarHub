"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
const uploadDir = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadDir))
    fs_1.default.mkdirSync(uploadDir);
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
    }
});
const imageFilter = (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png'];
    if (!allowed.includes(file.mimetype))
        return cb(new Error('Unsupported image type'));
    cb(null, true);
};
const fileFilter = (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'application/zip', 'application/x-rar-compressed'];
    if (!allowed.includes(file.mimetype))
        return cb(new Error('Unsupported file type'));
    cb(null, true);
};
const imagesUpload = (0, multer_1.default)({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });
const filesUpload = (0, multer_1.default)({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });
router.post('/images', imagesUpload.array('images', 3), (req, res) => {
    const files = req.files || [];
    const urls = files.map(f => ({ url: `/uploads/${path_1.default.basename(f.path)}`, size: f.size }));
    res.json({ urls });
});
router.post('/files', filesUpload.single('file'), (req, res) => {
    const f = req.file;
    if (!f)
        return res.status(400).json({ message: 'No file' });
    const url = `/uploads/${path_1.default.basename(f.path)}`;
    res.json({ url, size: f.size, type: f.mimetype });
});
exports.default = router;
