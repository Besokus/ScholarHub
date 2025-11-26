# 🤖 **ScholarHub Agents Specification**

> **A Collaborative Learning Platform Powered by Modular Agents**
> **模块化智能协作平台 · ScholarHub**

This document defines the **Agent roles**, **capabilities**, and **frontend–backend cooperation model** within the **ScholarHub** system.
It is designed for AI agents, developers, and contributors to understand **how each module communicates, interacts, and executes tasks** across the platform.

---

# 📌 **1. Overview / 概述**

**ScholarHub** is a cloud-native university learning platform built on a modular architecture suitable for **multi-agent collaboration**, enabling efficient knowledge sharing, Q&A, resource management, and role-based workflows.

The platform is structured around the idea that **each functional module can be represented by an Agent**, and Agents communicate through well-defined APIs and database schemas.

---

# 🧩 **2. Agent Roles & Responsibilities / Agent 角色与职责**

Below are the core Agents of ScholarHub.
Each Agent corresponds to a front-end module + back-end service + database entities.

---

## **2.1 Auth Agent (Authentication & User Identity)**

Handles authentication, session management, profile operations.

### **Capabilities**

* Issue & validate JWT tokens
* Secure password hashing
* Manage session & Redis-based login state
* Handle profile updates (email, avatar, user data)

### **Frontend Mapping**

* Login / Register pages
* Settings / Profile center

### **Backend Modules**

* `/auth/login`
* `/auth/register`
* `/auth/refresh`
* `/users/profile`

---

## **2.2 Admin Agent (Administrator Control Panel)**

Manages institutional governance and content moderation.

### **Capabilities**

* CRUD Courses & Departments
* Manage Teachers / Students
* Audit course materials, Q&A content
* RBAC policy assignment

### **Frontend Mapping**

* Admin Dashboard
* User Management
* Course Management
* Audit Center

### **Backend Modules**

* `/admin/users/*`
* `/admin/courses/*`
* `/admin/moderation/*`

---

## **2.3 Student Agent (Student Learning & Q&A)**

### **Capabilities**

* Search & browse course materials
* Upload notes / personal learning resources
* Ask questions with multi-image support
* Track Q&A history
* Access personalized dashboard data

### **Frontend Mapping**

* Resource Center
* Q&A Forum
* Personal Dashboard

### **Backend Modules**

* `/resources/*`
* `/questions/*`
* `/students/dashboard/*`

---

## **2.4 Teacher Agent (Teaching & Resource Publishing)**

### **Capabilities**

* Publish course resources (PDF, media)
* Answer student questions (rich-text + attachments)
* Manage course visibility
* Track unanswered question queue

### **Frontend Mapping**

* Teacher Workbench
* Resource Publishing Panel
* Q&A Interaction Area

### **Backend Modules**

* `/teacher/resources/*`
* `/teacher/answers/*`
* `/teacher/tasks/*`

---

# 🔍 **3. System Architecture / 系统架构**

ScholarHub uses a modern cloud-native, agent-friendly architecture:

```
Frontend (React + TS) → Backend API (Node.js + Express)
                            ↓
     PostgreSQL ← Models & Full-text Search → Redis Cache
                            ↓
                 Docker Compose / Containerized
```

### **Key Architecture Features**

* **Full-Text Search Agent** using PostgreSQL `tsvector`
* **Session/Cache Agent** using Redis
* **RBAC Gatekeeper Agent** enforcing user roles
* **Docker Orchestration Agent** for unified deployment

---

# 🗄️ **4. Database Entities (Mapped to Agents)**

Each Agent interacts with clearly defined DB schemas.

## **Users**

```
id, username, password, role,
avatar, email, title
```

Agents: **Auth Agent / Admin Agent**

---

## **Courses**

```
id, name, description,
department, teacher_id (FK)
```

Agents: **Admin Agent / Teacher Agent**

---

## **Resources**

```
id, title, file_path, view_type,
download_count,
search_vector (tsvector)
```

Agents: **Teacher Agent / Student Agent**
Features: **PG full-text search index**

---

## **Questions**

```
id, title, content,
images (array/json),
status, created_at
```

Agents: **Student Agent / Teacher Agent**

---

## **Answers**

```
id, content,
attachments (array/json),
teacher_id, question_id
```

Agents: **Teacher Agent**

---

# 💬 **5. Agent Communication Model / Agent 通讯模型**

Below defines how Agents collaborate.

| Action           | Primary Agent | Secondary Agents       |
| ---------------- | ------------- | ---------------------- |
| User login       | Auth Agent    | Redis Agent            |
| Upload resource  | Teacher Agent | Storage Agent          |
| Search materials | Student Agent | Search Agent (PG)      |
| Publish answer   | Teacher Agent | Student Agent (notify) |
| Course CRUD      | Admin Agent   | Teacher Agent          |
| Question audit   | Admin Agent   | Teacher Agent          |

Each Agent works independently but communicates via **REST API contracts**, ensuring decoupling and scalability.

---

# 🛠 **6. Development Workflow for Agents / 开发工作流**

To maintain consistency, each Agent follows:

### **1. Define responsibilities**

→ What API routes does this Agent own?

### **2. Data it requires**

→ DB tables, fields, search index, cache keys.

### **3. Frontend responsibilities**

→ Component mapping, state management, UI routes.

### **4. Backend responsibilities**

→ Controllers, services, middleware, validation.

### **5. Cross-agent communication**

→ e.g., Teacher Agent notifying Student Agent.

---

# 🚀 **7. Running Agents Locally (Docker)**

### **One Command Deployment**

```bash
docker-compose up -d
```

### Services started:

* **frontend** → `localhost:3000`
* **backend** → `localhost:5000`
* **postgres** → `5432`
* **redis** → `6379`

---

# 📌 **8. Goals of the Agent System / Agent 系统目标**

* Ensure **clear responsibilities** for each module
* Allow **agents (or developers)** to collaborate without conflict
* Make the platform scalable & maintainable
* Enable **AI-assisted development** across modules
* Modern, high-performance knowledge-sharing environment

---

# 🏁 **9. Conclusion**

The Agents described in this document form the backbone of **ScholarHub’s modular, scalable, and collaborative architecture**.
Each Agent maps cleanly to real frontend features, backend services, and database entities—ensuring consistent development, deployment, and future automation.

