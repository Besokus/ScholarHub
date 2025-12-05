## 项目目标
- 用 Go 1.20+ + Gin + GORM + PostgreSQL 构建后端，提供统一 REST API，与现有前端直接对接。
- 架构：MVC + Service + Repository 分层；JWT 会话；bcrypt 密码；统一响应；CORS；Docker 化。

## 目录结构
- cmd/server/main.go（启动入口）
- internal/
  - config/（配置加载：config.yaml 或 config.go + 环境变量覆盖）
  - server/router.go（路由与中间件注册）
  - middleware/
    - cors.go（允许前端域）
    - jwt.go（鉴权与角色提取）
  - models/*.go（GORM 模型）
  - repository/*.go（数据访问）
  - service/*.go（业务逻辑）
  - controller/*.go（控制器/HTTP）
  - dto/*.go（请求/响应体）
- pkg/
  - utils/jwt.go（签发/解析）
  - utils/password.go（bcrypt）
  - storage/files.go（本地上传存储）
- uploads/（静态文件目录）
- Dockerfile、docker-compose.yml、.env（数据库连接与 JWT 秘钥）
- go.mod、Makefile（可选）

## 模型设计（与前端契约一致）
- User：
  - ID string（学生学号/教师编号为主键，满足你的需求）
  - Username、Email、PasswordHash、Role(enum: STUDENT/TEACHER/ADMIN)、Avatar、Title、CreatedAt
- Course：ID string、Name
- Resource：ID uuid、Title、Summary、CourseID、Size、Type、DownloadCount、FileURL、UploaderID、CreatedAt
- ResourceDownload：ID uuid、ResourceID、UserID、CreatedAt
- Question：ID uuid、CourseID、Title、ContentText、ContentHTML、Images(JSON)、Status(enum: open/solved)、Hot(int)、CreatedByID、CreatedAt
- Answer（预留）：ID uuid、QuestionID、ContentHTML、AuthorID、CreatedAt
- Notification：ID uuid、Type('answer')、QuestionID、Title、UserID、Read(bool)、CreatedAt

## 统一响应格式
- 所有接口返回：`{ code, msg, data }`
  - 成功：`code=0`、`msg="success"`
  - 失败：`code>0`（如 1001 未登录，1002 校验失败等），`msg=错误原因`

## 中间件
- CORS：允许 `http://localhost:5174`（Vite）及生产域；允许 Authorization、X-User-Id（兼容前端现状）
- JWT：
  - 认证接口签发 token（HS256 + 过期时间 + userID/role）
  - 受保护路由校验 token，将 userID 注入 `context`

## 配置
- config.yaml：
  - server：port、corsOrigins
  - db：dsn（或从 `.env` 的 `DATABASE_URL` 读取）
  - jwt：secret、ttl
- 支持环境变量覆盖（12-factor），生产通过 docker-compose 注入。

## 路由与接口（与前端现有路径一致）
- Auth（公开 + 受保护）
  - POST `/api/auth/register`：{ id, username, email, password, role } → 创建用户（ID=学号/教师编号）
  - POST `/api/auth/login`：{ id|username, password } → 返回 JWT
  - GET `/api/auth/me`：解析 JWT 返回用户基础信息
- Courses（公开）
  - GET `/api/courses`：返回课程列表
- Resources（受保护）
  - GET `/api/resources?q&courseId&page&pageSize`：分页与检索（标题模糊，课程筛选）
  - GET `/api/resources/:id`：详情
  - POST `/api/resources`：创建元数据（Title/Summary/CourseID/Type/Size/FileURL），`UploaderID` 来自 JWT
  - POST `/api/resources/:id/downloads`：记录下载日志 + 计数 + 返回最新 `downloadCount`
  - GET `/api/resources/downloads/me`：我的下载列表
  - GET `/api/resources/me/uploads`：我上传的资源列表
- Uploads（受保护）
  - POST `/api/uploads/images`：`multipart/form-data`，字段 `images`（≤3、JPEG/PNG、≤2MB/张），返回 `urls`
  - POST `/api/uploads/files`：字段 `file`（PDF/JPG/PNG/ZIP/RAR，≤50MB），返回 `url/size/type`
  - 静态文件：`/uploads/*`（Gin Static）
- Q&A（受保护）
  - GET `/api/qa/questions?courseId&sort&status&my&page&pageSize`：分页 + 排序（latest/hot） + 状态（unanswered） + 我发布的（my=1）
  - GET `/api/qa/questions/:id`：详情（含 HTML 与图片）
  - POST `/api/qa/questions`：创建问题（支持 contentHTML + images），`CreatedByID` 来自 JWT
- Notifications（受保护）
  - GET `/api/notifications?type=answer&status=unread`：未读答疑提醒
  - POST `/api/notifications/:id/read`：标记已读
  - POST `/api/notifications/read-all`：全部已读

## Service/Repository 职责
- Repository：封装 GORM 查询，提供分页与筛选（like/equals）、事务接口
- Service：组合领域逻辑（如资源上传 + 元数据落库；下载日志 + 计数；答疑提醒生成/读取）
- Controller：参数校验、调用 Service、统一响应输出

## 兼容性与安全
- 密码：bcrypt（注册时 hash，登录时对比）
- HTML：存储 `ContentHTML`（前端已清洗），后端可选再做白名单清洗（可拓展）
- 文件上传：校验 MIME 与大小；保存到 `uploads/`；文件名去重；返回相对 URL
- CORS：仅允许指定来源与头；预检缓存提升性能

## 初始化与迁移
- GORM AutoMigrate：User、Course、Resource、ResourceDownload、Question、Answer、Notification
- 初始课程种子（Data Seeder）
- 初始管理员（可从 env：ADMIN_ID/ADMIN_PASSWORD）

## Docker 化
- Dockerfile（多阶段）
  - builder：`golang:1.20` 构建可执行文件
  - runtime：`alpine` 复制可执行文件与 config，暴露 `8080`
- docker-compose.yml
  - services:
    - api：环境变量 `DATABASE_URL`、`JWT_SECRET`、挂载 `uploads/`，依赖 postgres
    - postgres：`postgres:15`，挂载数据卷，初始化用户/库
  - 网络与健康检查

## 运行方式
- 本地：
  - 设置 `.env` 或 `config.yaml`（数据库、JWT）
  - `go run cmd/server/main.go`
  - 前端请求 `http://localhost:8080/api/*`
- Docker：
  - `docker-compose up -d` 一键启动（API + PostgreSQL）

## 对接说明（前端）
- 保持现有前端路径与请求体；JWT 存在 `localStorage.token`，请求带 `Authorization: Bearer <token>`（保留 `X-User-Id` 兼容，优先 JWT）
- 列表分页与检索参数与当前前端一致；上传接口为 `multipart/form-data`

---
确认后我将：
1) 初始化 Go 项目与目录；2) 编写模型/仓库/服务/控制器；3) 配置路由与中间件；4) 实现上传/静态服务；5) 编写 Dockerfile 与 docker-compose；6) 提供运行文档与环境变量示例；7) 本地启动并用前端实际验收。