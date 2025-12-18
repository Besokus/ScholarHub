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
