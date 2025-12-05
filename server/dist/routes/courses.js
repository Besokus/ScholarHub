"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
const courses = [
    { id: '数据结构', name: '数据结构' },
    { id: '线性代数', name: '线性代数' },
    { id: '大学英语', name: '大学英语' }
];
router.get('/', (_req, res) => {
    res.json({ items: courses });
});
exports.default = router;
