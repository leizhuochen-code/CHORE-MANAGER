# CLAUDE.md

本文件提供项目概览与索引。更深的架构细节见各源码文件头注释与 `README.md`。

## 项目概述

办公室杂务管理（Chore Manager）是一个纯前端 React 单页应用：管理杂务任务（含每天/每周/每月/自定义重复规则）、分配团队成员负责人。数据全部存浏览器 localStorage，无后端、无登录，刷新不丢失。

## 技术栈

- 框架：React 19 + TypeScript + Vite 8
- UI：Ant Design 6（中文包）、@ant-design/icons、FullCalendar 7（日/周/月日历）
- 状态：zustand 5 + persist（自动写入 localStorage）
- 路由：react-router-dom 7（HashRouter，支持 file:// 直接打开）
- 日期/重复：dayjs（antd 配套）、rrule（RFC 5545 重复规则）、temporal-polyfill（FullCalendar 依赖）
- 质量：Vitest（纯函数单测）、oxlint

## 关键目录与用途

| 路径 | 用途 |
|---|---|
| `src/main.tsx` | 入口：antd 中文包 + dayjs 语言 + 种子数据初始化 |
| `src/App.tsx` | 应用壳：侧边导航 + 路由（日历/任务/团队） |
| `src/types.ts` | 数据模型：Member / Chore / ChoreInstance / RecurrenceRule |
| `src/constants.ts` | 全局常量：物化范围、头像色板、星期标签 |
| `src/store/useStore.ts` | zustand 全局状态 + localStorage 持久化 + 版本迁移 |
| `src/lib/` | 领域纯函数：dates（日期工具）、recurrence（重复引擎）、seed（示例数据）及单测 |
| `src/components/` | UI 组件：弹窗、表单、抽屉、头像 |
| `src/pages/` | 三个路由页：CalendarPage / TasksPage / TeamPage |
| `dist/` | 构建产物（相对路径，可 file:// 直接打开） |

## 常用命令

```bash
npm install       # 安装依赖（Node ≥ 20.19，开发验证于 Node 24）
npm run dev       # 启动开发服务器 → http://localhost:5173
npm test          # Vitest 单元测试（重复规则引擎）
npm run build     # tsc 类型检查 + 生产构建到 dist/
npm run preview   # 本地预览构建产物
npm run lint      # oxlint 静态检查
```

## 核心设计约定

- 日期一律以 `YYYY-MM-DD` 字符串存储（`src/lib/dates.ts`），字典序即时间序；与 Date 互转只在边界发生（本地正午 / rrule 用 UTC 正午），规避时区/夏令时偏移。
- 循环任务 = 物化实例：创建时生成未来约 2 年（翻页可扩展）的具体实例；实例只存 `{choreId, dueDate, completed}`（`src/types.ts:47`），标题/负责人渲染时实时 join。
- 编辑循环规则只重建「未来未完成」的实例，已完成历史保留；删除单次实例 = 永久跳过（`src/store/useStore.ts:110`、`src/store/useStore.ts:228`）。
- 所有数据变更走 store action；数据持久化于 localStorage 键 `chore-manager:v1`，侧边栏「重置数据」按钮可恢复示例数据。

## 加入新功能 / 改 bug

开始开发新功能或修复缺陷时，**务必先创建新的 Git 分支**，本次会话中所有代码改动都在该分支上进行，严禁直接在 main 或 master 分支修改代码：

- 分支命名：`feature/<功能名>` 或 `fix/<缺陷名>`
- 从当前主分支（main/master）分叉出来再开发
- 完成开发后，通过合并请求或手动合并到主分支
