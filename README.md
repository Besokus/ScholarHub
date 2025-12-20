# 🎓 ScholarHub - University Learning Efficiency Platform

> **A High-Performance Collaborative Learning Platform for Universities.**
> **基于云原生架构的分布式高校资源协作与答疑平台**

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Stack](https://img.shields.io/badge/Tech-React%20%7C%20Node.js%20%7C%20PostgreSQL-blue)
![Docker](https://img.shields.io/badge/Deployment-Docker-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 📖 Introduction (项目简介)

**ScholarHub** is an enterprise-grade learning resource sharing and Q&A platform designed for universities. Unlike traditional LMS, it leverages modern cloud-native architecture to solve the fragmentation of learning materials and the latency of feedback.

**ScholarHub** 是一个专为高校设计的现代化资源协作与答疑平台。不同于传统的教务系统，本项目采用**前后端分离**架构，引入 **PostgreSQL 全文检索**、**Redis 缓存**与 **Docker 容器化部署**，致力于提供高性能、高可用的校园知识共享服务。

## ✨ Key Features (核心特性)

* **🚀 Advanced Search (高性能检索)**: Built-in **PostgreSQL `tsvector`** full-text search engine, replacing traditional SQL `LIKE` queries for millisecond-level response. (基于 PG 向量的全文检索)
* **🐳 Containerized (容器化交付)**: Fully dockerized environment. One command (`docker-compose up`) to spin up Backend, Frontend, Database, and Redis. (一键部署)
* **🛡️ RBAC Security (企业级权限)**: Strict Role-Based Access Control middleware securing APIs for Admins, Teachers, and Students. (基于角色的权限控制)
* **📂 Smart Storage (智能存储)**: Supports object storage strategy for managing course materials (PDF/Images) and rich-text Q&A attachments. (非结构化数据管理)

---

## 🛠 Tech Stack (技术栈)

* **Frontend**: React 18, TypeScript, TailwindCSS
* **Backend**: Node.js, Express
* **Database**: **PostgreSQL 15** (Utilizing `JSONB` for flexible schemas & `Array` types for tags/attachments)
* **Caching**: Redis (Session management & Hot resource caching)
* **DevOps**: Docker, Docker Compose

---

## 🧩 Functional Modules (功能模块)

### 1. General & Auth (通用模块)
* JWT Authentication & Secure Password Hashing.
* Profile Management (Avatar, Email).
* File Upload/Download Service.

### 2. Admin Module (管理员)
* **Course Management**: CRUD operations for courses and departments.
* **User Governance**: Manage Teacher/Student accounts.
* **Content Audit**: Moderate resources and Q&A to ensure compliance.

### 3. Student Module (学生)
* **Resource Center**: Browse/Search materials; Upload personal notes.
* **Q&A Forum**: Ask questions with multi-image support (Stored via PG Arrays); Real-time notifications for answers.
* **Personal Dashboard**: Track uploaded resources and question history.

### 4. Teacher Module (教师)
* **Work Bench**: "To-Do" alerts for unanswered questions.
* **Resource Publishing**: Publish course materials with visibility control (Public vs. Class-only).
* **Q&A Interaction**: Rich-text answers with attachments.

---

## 🗄️ Database Schema Design (数据库设计)

> Optimized for PostgreSQL features.

1.  **Users**: `ID, Username, Password, Role, Avatar, Email, Title`
2.  **Courses**: `ID, Name, Description, Department, TeacherID (FK)`
3.  **Resources**: `ID, Title, FilePath, ViewType, DownloadCount, SearchVector (tsvector)`
4.  **Questions**: `ID, Title, Content, Images (JSON/Array), Status, CreatedAt`
5.  **Answers**: `ID, Content, Attachments (JSON/Array), TeacherID`

## 📑 Admin API Notes
- `POST /api/admin/teachers` 接收 `fullName, employeeId, password, title`，登录账号由系统自动生成为 `employeeId@edu`，`id` 字段为工号。
- 工号需为 8 位数字，账号与工号均进行唯一校验；返回对象包含 `username`、`employeeId` 等字段。
- `PUT /api/admin/teachers/:id` 支持更新 `fullName/employeeId/title/password`，不修改已生成的登录账号。

---

## 🚀 Quick Start (快速开始)

### Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop) (Recommended)
* **Or**: Node.js >= 16 + PostgreSQL >= 14 + Redis

### Method 1: Docker Compose (Recommended)
The fastest way to run the full stack.

```bash
# 1. Clone the repository
git clone [https://github.com/your-username/ScholarHub.git](https://github.com/your-username/ScholarHub.git)
cd ScholarHub

# 2. Start all services (App + DB + Redis)
docker-compose up -d

# 3. Access the App
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
### SMTP Email Configuration (SMTP 邮件配置)

To enable password reset and verification emails, configure SMTP in the environment file.

1. Create `.env` in project root or server directory with:

```
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_USER=your_account@example.com
SMTP_PASS=your_app_password
```

2. The backend loads environment via `dotenv`. Ensure `.env` is not committed (server/.gitignore includes `.env`).

3. Mail usage example (server):

```ts
import { sendMail, buildCodeTemplate } from './src/mail'
const tpl = buildCodeTemplate('user@example.com', '123456')
await sendMail({ to: 'user@example.com', subject: tpl.subject, text: tpl.text, html: tpl.html })
```

4. Test script:

```bash
cd server
npx ts-node tests/send_mail_demo.ts
```

Notes:
- Uses TLS when `SMTP_PORT=465`.
- Logs are written to `mail.log` for auditing.
- Retries are enabled with exponential backoff.
---

## 🧭 Usage (使用说明)
- 前端入口：`http://localhost:3000`（默认开发端口，或 Docker 映射端口）
- 后端入口：`http://localhost:3000` 或 `http://localhost:<PORT>`（`PORT` 由后端环境变量决定）
- 角色与权限：
  - 管理员：管理用户、课程、内容审核、公告发布
  - 教师：发布资源、回答学生提问、管理课程
  - 学生：浏览与检索资源、发布问题、查看通知
- 资源上传：前端通过 `上传` 模块提交文件，后端在 `uploads/` 目录提供静态访问（受 `ALLOWED_ORIGINS` 控制）
- 答疑模块：学生发布问题后，教师在工作台进行回复；支持富文本与附件
- 邮件验证码：调用 `POST /api/send-email-code`，需配置 `SMTP_*` 环境变量

## ⚙️ Installation (安装指南)
- 系统要求：
  - Node.js ≥ 18（推荐 20）
  - PostgreSQL ≥ 14
  - Redis（可选，用于缓存与限流，无 Redis 时自动降级为内存模式）
  - 可选：Go ≥ 1.22（如需启用 Go 后端）
- 依赖安装：
  ```bash
  # 根目录仅用于前端构建开发（vite）
  npm install

  # 前端
  cd client
  npm install

  # 后端（Node + Express + Prisma）
  cd ../server
  npm install
  npx prisma generate
  ```
- 环境配置：
  在 `server/.env`（或根目录 `.env`）设置：
  ```env
  # 基础服务
  PORT=3000
  DATABASE_URL=postgresql://user:pass@localhost:5432/scholarhub
  JWT_SECRET=replace-with-strong-secret
  ALLOWED_ORIGINS=http://localhost:3000

  # 管理员引导
  ADMIN_EMAIL=admin@example.com
  ADMIN_PASSWORD=admin123

  # 邮件服务
  SMTP_HOST=smtp.example.com
  SMTP_PORT=465
  SMTP_USER=your_account@example.com
  SMTP_PASS=your_app_password
  ```
- 启动服务：
  ```bash
  # 启动学生端后端
  cd server
  npm run dev

  # 启动管理员后端
  go run backend-go/cmd/server/main.go

  # 另启前端
  cd ../client
  npm run dev
  ```
  
  根目录中提供了前后端一键启动的shell脚本（start.sh）
  ```bash
  ./start.sh
  ```

- Docker 一键启动（可选）：
  ```bash
  # 使用 backend-go 的 docker-compose（含 DB/Redis/可选 Go 后端）
  cd backend-go
  docker-compose up -d
  ```

## 🧱 Project Structure (项目结构)
```text
ScholarHub/
├─ client/                 # 前端（React + Vite + Tailwind）
│  ├─ src/
│  │  ├─ assets/images/    # 静态资源（含 Logo、登录页截图）
│  │  ├─ components/       # 通用组件、富文本编辑器等
│  │  ├─ pages/            # 管理员/教师/学生模块页面
│  │  ├─ services/         # API 封装（如 `server/src` 路由对应）
│  │  ├─ utils/            # 工具（含时间本地化 `date.ts`）
│  │  ├─ workers/          # Web Worker（健康状态采集）
│  │  ├─ App.tsx           # 路由与应用框架
│  │  └─ main.tsx          # 应用入口
│  └─ vite.config.js       # Vite 配置
├─ server/                 # 后端（Node + Express + Prisma）
│  ├─ src/
│  │  ├─ routes/           # 路由：auth/resources/qa/notifications/uploads 等
│  │  ├─ middleware/       # 中间件（JWT 可选）
│  │  ├─ db.ts             # Prisma 客户端实例（PostgreSQL）
│  │  ├─ mail.ts           # 邮件发送模块（SMTP + 重试 + 日志）
│  │  └─ index.ts          # Express 服务入口
│  ├─ prisma/              # Prisma schema 与生成客户端
│  └─ tests/               # 邮件等演示测试脚本
├─ backend-go/             # 可选 Go 后端（Gin + GORM）
│  ├─ internal/            # 业务与路由
│  ├─ cmd/server/          # 程序入口
│  └─ docker-compose.yml   # 一键启动栈
├─ LICENSE                 # 开源许可证（MIT）
└─ README.md               # 项目文档
```

## 👨‍💻 Development Guide (开发指南)
- 代码规范：
  - 前端：TypeScript，ESLint（`npm run lint`），Tailwind 设计规范
  - 后端：TypeScript（`ts-node` + `nodemon`），Prisma 模型变更通过 `schema.prisma`
- 提交约定：
  - 使用语义化提交（feat/fix/docs/refactor/test/chore）
  - 变更路由或数据结构时同步更新对应前端 `services/api.ts`
- 测试方法：
  - 轻量前端单元校验在开发模式自动执行（`client/src/utils/date.test.ts`）
  - 后端邮件演示：
    ```bash
    cd server
    npx ts-node tests/send_mail_demo.ts
    node tests/mail.test.js
    ```
- 调试建议：
  - 设置 `ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000` 以允许多端口联调
  - 无 Redis 时自动切换为内存缓存（健康检查接口：`GET /api/health/redis`）

## 📜 License (许可证)
- 本项目使用 `MIT License`，详见根目录 `LICENSE`
- 版权：© 2025 Besokus

## 🙏 Acknowledgements (致谢)
- 前端：React、Vite、TailwindCSS、Framer Motion、Lucide React
- 后端：Express、Prisma、Nodemailer、ioredis、Gin、GORM（Go）
- 数据库与缓存：PostgreSQL、Redis
- 其他：社区生态与所有贡献者

## 🖼 Screenshots (截图)
- 项目 Logo：  
  ![Logo](client/src/assets/images/usst_logo.jpg)
- 登录页：  
  ![Login 1](client/src/assets/images/loginpage1.jpg)  
- 学生端：
  ![Student](client/src/assets/images/student.jpg)
- 管理员端
  ![Admin](client/src/assets/images/admin.jpg)
  ![health](client/src/assets/images/health.jpg)
