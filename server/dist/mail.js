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
exports.sendMail = sendMail;
exports.buildCodeTemplate = buildCodeTemplate;
const nodemailer_1 = __importDefault(require("nodemailer"));
const fs_1 = __importDefault(require("fs"));
function createTransport() {
    const host = process.env.SMTP_HOST || '';
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';
    const secure = port === 465;
    if (!host || !user || !pass)
        throw new Error('SMTP config missing');
    return nodemailer_1.default.createTransport({ host, port, secure, auth: { user, pass } });
}
function sendMail(input_1) {
    return __awaiter(this, arguments, void 0, function* (input, retries = 3) {
        const log = (ok, detail) => {
            try {
                fs_1.default.appendFileSync('mail.log', `[SEND-${ok ? 'OK' : 'ERR'}] ${new Date().toISOString()} ${JSON.stringify(detail)}\n`);
            }
            catch (_a) { }
        };
        let lastErr = null;
        for (let i = 0; i < retries; i++) {
            try {
                const t = createTransport();
                yield t.verify();
                yield t.sendMail({ from: process.env.SMTP_USER, to: input.to, subject: input.subject, text: input.text, html: input.html, attachments: input.attachments });
                log(true, { to: input.to, subject: input.subject });
                return;
            }
            catch (e) {
                lastErr = e;
                log(false, { to: input.to, subject: input.subject, error: (e === null || e === void 0 ? void 0 : e.message) || String(e) });
                yield new Promise(r => setTimeout(r, 1000 * (i + 1)));
            }
        }
        throw lastErr || new Error('Failed to send mail');
    });
}
function buildCodeTemplate(email, code) {
    return {
        subject: 'ScholarHub 密码重置验证码',
        html: `
      <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;padding:20px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#111827;margin:0 0 8px">验证码：<span style="color:#2563eb">${code}</span></h2>
        <p style="color:#6b7280;margin:6px 0">该验证码在 5 分钟内有效，请勿泄露。</p>
        <p style="color:#6b7280;margin:6px 0">如非本人操作，请忽略此邮件。</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
        <div style="font-size:12px;color:#9ca3af">发送至：${email}</div>
      </div>
    `,
        text: `验证码：${code}（5分钟内有效）。如非本人操作，请忽略此邮件。发送至：${email}`
    };
}
