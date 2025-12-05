## 总览
- 目标：为学生用户提供专属的 UI 与功能模块，保持与现有系统风格一致，并通过严格的权限控制实现安全访问。
- 现状对齐：项目使用 React 18、React Router、Vite、Tailwind v4、framer-motion、lucide-react；已存在基于角色的重定向与受保护路由（client/src/App.tsx:25-45）。

## 技术栈与约束
- 前端：React + React Router + Tailwind v4 + framer-motion + lucide-react
- 架构：模块化目录划分；共享组件抽象；路由守卫与角色鉴权
- 设计：延续现有配色与动效规范；响应式布局；语义化与无障碍

## 目录与架构
- pages/student/
  - Dashboard.tsx（核心）
  - Courses.tsx（课程与选课）
  - Resources.tsx（资源浏览下载）
  - QA.tsx（问答与互动）
  - Assignments.tsx（作业与提交）
  - Schedule.tsx（日程与课表）
  - Notifications.tsx（消息与公告）
  - Profile.tsx（学生资料）
- components/common/
  - Layout、Navbar、Sidebar、PageHeader、Card、Button、Tag、Badge、Modal、Drawer、Tabs、Table、Pagination、EmptyState、Skeleton
- hooks/
  - useAuth、useRole、usePermission、useFetch（带错误与加载态处理）
- services/
  - api.ts（统一请求封装，携带 token 与错误处理）
- 路由：在受保护路由下挂载 /student/*；学生登录后由分发器跳转（client/src/App.tsx:30-45）。

## UI/UX 规范
- 统一视觉：延续 Login/Register 的渐变、毛玻璃卡片、阴影、圆角（Tailwind 类）；图标统一用 lucide-react
- 响应式断点：sm/md/lg/xl/2xl；侧边栏在 md 以下折叠；主要内容区域最大宽度 `max-w-7xl`
- 动效：页面过渡与卡片微动使用 framer-motion，避免过度动画
- 可访问性：语义化标签、可聚焦元素、按键可操作、ARIA 标签

## 功能模块（学生特有）
- Dashboard：学习概览、今日课程、作业待办、最新资源与消息
- Courses：课程列表、选课/退课、课程详情
- Resources：按课程/标签筛选资源、下载权限控制、资源预览
- QA：发布问题、回答、点赞、采纳，按课程分区
- Assignments：作业列表、提交、评分查看、截止提醒
- Schedule：个人课表、周视图、考试安排
- Notifications：系统公告与课程通知，支持既读与筛选
- Profile：个人资料与安全设置（含学号/教师编号 ID 展示）

## 权限控制
- 路由守卫：已存在的 PrivateRoute（client/src/App.tsx:25-28）保证登录态；RoleBasedRedirect（client/src/App.tsx:31-45）分流到 /student/dashboard
- 组件级控制：usePermission(role, feature) 控制按钮/入口显示；未授权时展示 EmptyState 或引导页
- 数据访问：请求统一在 services/api.ts 注入 token 与 role（localStorage）并校验 401/403

## 共用部分抽象
- 公共组件库：Card、Table、Pagination、Modal、Tabs、EmptyState、Skeleton、Toast（可后续引入）
- 可配置扩展点：
  - 主题：通过 Tailwind 自定义类组合与 CSS 变量隔离
  - 组件 Props：支持图标、颜色、尺寸、交互（onAction、onSelect 等）
  - 列表组件：列定义、渲染器与空态占位插槽

## 开发优先级（分阶段）
- 第一阶段（核心页面）：Student Dashboard、Courses、Resources（含基本筛选与下载权限）、QA（提问/回答基础）
- 第二阶段（辅助模块）：Assignments、Schedule、Notifications
- 第三阶段（共用整合与测试）：将各页面复用到公共组件库、完善 hooks 与 services、统一测试

## 数据与接口（对后端的对齐原则）
- 用户 ID：采用学号/教师编号为唯一 ID（已在前端登录/注册文案统一）。
- 资源与权限：按 role=STUDENT 限制访问；课程/作业/资源接口按课程 ID 维度聚合。
- 错误处理：统一错误边界与 Toast；401/403 自动重定向到登录或无权限页。
- 过渡方案：先使用 mock 数据/占位接口，后按后端契约替换。

## 质量保证
- 响应式设计：断点覆盖、侧栏折叠、表格在小屏切换为卡片视图
- 兼容性测试：Chrome/Edge/Firefox；定位 CSS 与事件兼容问题
- 测试：
  - 单元测试：组件与 hooks（计划引入 Vitest + React Testing Library）
  - 集成测试：路由守卫、权限控制、列表筛选与提交流程
  - 静态检查：ESLint + TypeScript 严格模式

## 性能与可维护性
- 代码分割：路由懒加载（已启用，client/src/App.tsx:5-12）
- 加载体验：Skeleton、Lazy Image、并发请求与缓存（useFetch）
- 可维护：类型定义统一在 `types/`；API 层与视图解耦；组件文档与 Story 可后续补充

## 交付物
- 学生专属页面与路由 `/student/*`
- 公共组件库基础版本与 hooks
- 权限控制与统一请求封装
- 测试用例与使用说明（开发者）

---
是否按此计划开始实现第一阶段（学生核心页面：Dashboard、Courses、Resources、QA）？我会在你确认后开始编码与测试。