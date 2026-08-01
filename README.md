# 🏢 办公室杂务管理（Chore Manager）

一个轻量的**办公室杂务管理 Web 应用**，纯前端 React SPA，数据保存在浏览器本地（localStorage），无需后端、无需登录、刷新页面数据不丢失。

## ✨ 功能

- **日历视图**：Outlook 风格，支持 **日 / 周 / 月** 三种视图切换
- **杂务管理**：新增、编辑、删除、标记「已完成」；逾期任务高亮
- **重复任务**：每天 / 每周 / 每月 / 自定义间隔，自动生成未来实例
  - 例如「每周一倒垃圾」「每月最后一天整理文件」
  - 日历翻页自动补生成实例；编辑规则只重建「未来未完成」的实例，已完成历史保留
- **人员分配**：为每个任务分配一个或多个负责人，按负责人头像区分
- **团队管理**：添加/编辑/删除成员（姓名、角色、头像颜色、图标）；点成员查看其承担的全部任务
- **数据持久化**：所有数据存入浏览器 `localStorage`（键 `chore-manager:v1`）

## 🚀 快速开始

需要 **Node.js ≥ 20.19**（推荐 22/24，本项目在 Node 24 上开发验证）。

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev
# → 打开 http://localhost:5173
```

### 生产构建

```bash
npm run build      # 输出到 dist/
npm run preview    # 本地预览构建产物
```

构建产物采用**相对路径 + Hash 路由**。最稳妥的运行方式是 `npm run preview`（一条命令的本地静态服务器）。也可以双击 `dist/index.html` 直接打开——Firefox 可用；Chrome/Edge 出于安全默认禁止 `file://` 加载 ES 模块（以 `--allow-file-access-from-files` 启动参数可放行）。

### 运行测试

```bash
npm test           # vitest：重复规则引擎单元测试（每天/每周/每月/月末含闰年/时区）
```

## 📂 项目结构

```
chore-manager/
├─ index.html                # 入口 HTML（中文标题）
├─ vite.config.ts            # Vite + Vitest 配置（base: './' 支持 file://）
└─ src/
   ├─ main.tsx               # 入口：antd 中文包 + dayjs zh-cn + 种子数据初始化
   ├─ App.tsx                # 布局：侧边导航 + 路由（日历/任务/团队）
   ├─ types.ts               # 数据模型（Member / Chore / ChoreInstance / RecurrenceRule）
   ├─ constants.ts           # 全局常量（物化范围、头像色板…）
   ├─ lib/
   │  ├─ dates.ts            # 日期工具（时区防火墙，统一 YYYY-MM-DD）
   │  ├─ recurrence.ts       # 重复规则引擎（rrule 映射/实例生成/再生语义/文案）
   │  ├─ seed.ts             # 首次运行的示例数据
   │  └─ __tests__/          # recurrence 单元测试
   ├─ store/useStore.ts      # zustand 全局状态 + localStorage 持久化 + 版本迁移
   ├─ components/            # 弹窗/表单/抽屉/头像等 UI 组件
   │  ├─ ChoreModal.tsx      #   杂务新增/编辑
   │  ├─ RecurrenceForm.tsx  #   重复规则表单（实时中文预览）
   │  ├─ ChoreDetailDrawer.tsx # 详情：完成/改期/删除该次/编辑/删除
   │  ├─ MemberModal.tsx  MemberPicker.tsx  AvatarChip.tsx
   └─ pages/
      ├─ CalendarPage.tsx    # FullCalendar 日/周/月日历
      ├─ TasksPage.tsx       # 任务列表（状态/负责人/日期筛选）
      └─ TeamPage.tsx        # 团队管理 + 按成员查看任务
```

## 🛠 技术栈

| 分类 | 选型 | 说明 |
|---|---|---|
| 框架 | **React 19 + Vite 8 + TypeScript** | 组件化、构建快、类型安全 |
| UI | **Ant Design 6** | 办公管理类组件齐全，中文开箱即用 |
| 日历 | **FullCalendar 7** | 日/周/月三视图切换，Outlook 风格 |
| 状态 | **zustand 5**（persist） | 轻量；自动写入 localStorage |
| 重复规则 | **rrule 2** | RFC 5545 标准，支持月末/自定义间隔 |
| 日期 | **dayjs** | antd 配套日期库 |

## 💡 设计要点

1. **日期全部存 `YYYY-MM-DD` 字符串**：与 `Date` 互转走「UTC 正午」，彻底规避时区/夏令时导致的日期偏移（有专门单元测试锁定）。
2. **重复任务 = 物化实例**：创建循环任务时生成未来约 2 年（可翻页自动扩展至 10 年）的具体实例；实例只存 `{choreId, dueDate, completed}`，标题/负责人渲染时实时关联——改标题/改负责人零同步成本。
3. **编辑循环规则**：只重建「未来未完成」的实例；已完成（历史）与已逾期实例保留；新规则按日期去重，不会重复生成。
4. **删除单次实例** = 「跳过这一次」，形成永久空隙，不会在翻页时被重新补回。

## 🔄 数据备份 / 重置

- 数据都在浏览器 `localStorage`（键 `chore-manager:v1`）。
- **备份**：DevTools → Application → Local Storage，复制该键的值。
- **恢复**：把备份值写回该键后刷新页面。
- **重置**：侧边栏底部「重置数据」按钮，一键恢复示例数据。

## ⚠️ 已知说明

- npm `audit` 会提示 react-router 若干告警——均为 **SSR/RSC/服务端** 相关漏洞；本应用是纯客户端 HashRouter 静态 SPA，不使用相关代码路径，**实际不可利用**。坚持使用最新稳定版（7.18.2）而非降级（降级版本命中更多告警）。
