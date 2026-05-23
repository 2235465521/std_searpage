# 标准检索与分析平台 (std_searpage)

面向标准文献的检索、详情谱系、数据分析与起草单位查询的 Web 应用。

## 文档索引

| 文档 | 说明 |
|------|------|
| **[docs/开发者指南.md](docs/开发者指南.md)** | **主文档**：架构、目录、API、会话缓存、各模块说明、扩展指引 |
| [启动指令.md](启动指令.md) | 本地启动步骤、默认账号、部署排查 |
| [Redis配置指南.md](Redis配置指南.md) | Redis / Celery / 缓存键说明 |
| [标准谱系全链路逻辑方案.md](标准谱系全链路逻辑方案.md) | 演进谱系图数据与展示逻辑 |
| `backend/后端md文档/` | 后端 API、架构补充文档 |
| `frontend/前端md文档/` | 前端接口、设计方案、历史修复记录 |

## 快速启动

```powershell
# 后端（8001）
cd backend
.\venv\Scripts\activate
python manage.py runserver 8001

# 前端（5173）
cd frontend
npm install
npm run dev
```

默认登录：`admin` / `adminpassword`

详细说明见 [启动指令.md](启动指令.md)。

## 技术栈概览

- **前端**：React 19 + Vite 8 + Ant Design 6 + Tailwind CSS 4 + ECharts + D3
- **后端**：Django 4.2 + DRF + SimpleJWT + MySQL + Redis + Celery（可选 ES）

## 主要功能模块

1. **标准检索** — 关键词 / 类型 / 状态筛选，支持 ES 与 MySQL 双路径
2. **标准详情** — 元数据、替代关系、D3 演进谱系图、文件下载
3. **数据分析** — 按区划与类别统计，两年对比与年段统计
4. **起草单位查询** — 排位检索、首家牵头国标、单位首次参与
5. **用户与权限** — JWT 登录，超级管理员可分配账号

新成员请优先阅读 **[docs/开发者指南.md](docs/开发者指南.md)**。
