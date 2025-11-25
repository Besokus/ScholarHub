# University Learning Efficiency Platform (ULEP)

## 项目简介
University Learning Efficiency Platform (ULEP) 是一个专为大学生设计的在线学习资源共享与答疑互动平台，旨在解决学习资料分散、答疑反馈不及时的问题。平台集资源共享、在线问答、教学管理于一体，提升学习效率。

## 功能概述

### 通用功能
- **账号安全**：修改登录密码。
- **个人资料**：编辑头像、邮箱、昵称等信息。
- **文件服务**：支持图片、PDF、压缩包等格式的上传与下载。

### 管理员功能
- **课程管理**：增删改查课程信息。
- **教师管理**：管理教师账号信息。
- **内容风控**：审计资源与问答内容，删除违规内容。

### 学生功能
- **注册与登录**：通过学号/邮箱注册并登录。
- **通知中心**：接收问题回答通知。
- **学习资源中心**：浏览、搜索、上传学习资源。
- **在线问答区**：提问、查看回答、管理个人提问。

### 教师功能
- **待办提醒**：查看未回答的问题。
- **资源发布**：上传教学资料并设置可见性权限。
- **答疑工作台**：回答学生提问并管理回答记录。

## 数据库设计

### 数据表
1. **Users (用户表)**
   - 字段：ID, Username, Password, Role (Admin/Student/Teacher), Avatar, Email, Title (Teacher only)
2. **Courses (课程表)**
   - 字段：ID, Name, Description, Department, TeacherID (Foreign Key)
3. **Resources (资源表)**
   - 字段：ID, Title, Description, FilePath, UploaderID, CourseID, ViewType (Public/Class), DownloadCount, CreateTime
4. **Questions (提问表)**
   - 字段：ID, Title, Content, StudentID, CourseID, Status (Unanswered/Answered), CreateTime, Images
5. **Answers (回答表)**
   - 字段：ID, QuestionID, TeacherID, Content, Attachments, CreateTime

## 技术栈
- **前端**：React, TypeScript
- **后端**：Node.js, Express
- **数据库**：MySQL
- **其他**：Webpack, RESTful API

## 项目结构
```
ScholarHub/
├── client/                # 前端代码
│   ├── src/
│   │   ├── components/   # 组件
│   │   ├── pages/        # 页面
│   │   ├── App.tsx       # 应用入口
│   │   └── main.tsx      # 渲染入口
├── server/                # 后端代码
│   ├── controllers/      # 控制器
│   ├── models/           # 数据模型
│   ├── routes/           # 路由
│   └── app.js            # 应用入口
└── README.md              # 项目说明
```

## 安装与运行

### 环境要求
- Node.js >= 16.x
- MySQL >= 8.x

### 本地运行
1. 克隆项目：
   ```bash
   git clone <repository-url>
   ```
2. 安装依赖：
   ```bash
   cd ScholarHub
   npm install
   ```
3. 配置数据库：
   - 创建 MySQL 数据库并导入初始数据。
   - 在 `server/config` 文件夹中配置数据库连接。
4. 启动后端服务：
   ```bash
   cd server
   npm start
   ```
5. 启动前端服务：
   ```bash
   cd client
   npm start
   ```
6. 打开浏览器访问：
   ```
   http://localhost:3000
   ```

## 开发计划
- [ ] 路由功能开发
- [ ] 平台布局与导航
- [ ] 登录与注册功能
- [ ] 管理员模块开发
- [ ] 学生模块开发
- [ ] 教师模块开发

## 贡献
欢迎提交 Issue 和 Pull Request！