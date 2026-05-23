# 标准检索与AI分析系统 - 架构与API设计文档

## 1. 整体架构设计

### 1.1 技术栈选型
*   **后端:** Python 3.10+, Django 4.2+, DRF
*   **异步任务:** Celery + Redis (消息队列及结果存储)
*   **前端:** React 18 (Vite), Tailwind CSS, Headless UI / Ant Design, Axios (采用基于侧边栏的UI布局)
*   **数据库:** MySQL 8.0+ (根据提供的配置 `DB_CONFIG`)
*   **搜索引擎:** Elasticsearch (用于基于宽表的高性能全文检索)
*   **文件存储:** 共享磁盘阵列 (未来如需高并发和弹性扩展建议引入 MinIO)

### 1.2 目录结构规范
严格按照 `技术文档.md` 的规范执行：

**后端 (Django):**
*   `models.py`: 负责基于 ER 图的数据库表结构定义。
*   `serializers.py`: 负责数据序列化与校验 (基于 DRF 及 Pydantic 思想)。
*   `crud.py`: 封装基础的 DB 查询与写入操作，解耦业务逻辑。
*   `services.py`: **核心层**，包含搜索聚合逻辑、Dify API 调用、业务规则等。
*   `tasks.py`: 异步任务定义，封装 `services.py` 逻辑以供 Celery 调用。
*   `views.py`: API 控制层，处理请求参数校验，调用 service 并返回 Response。

**前端 (React):**
*   `src/api/`: 统一 Axios 实例及 API 请求封装。
*   `src/components/`: 通用 UI 组件 (如 `SearchBar`, `StandardList`, `FileCard`, `StatusBadge`)。
*   `src/hooks/`: 封装自定义 Hooks (如 `useStandardSearch`, `useTaskPolling`)。
*   `src/pages/`: 页面级组件 (如 `SearchPage`, `DetailPage`, `AIAssistantPage`)。

---

## 2. API 接口预设计 (Mock API)

### 2.1 认证模块 (Authentication)

#### 2.1.1 用户登录
*   **Endpoint:** `POST /api/v1/auth/login`
*   **描述:** 用户登录获取 Token (建议使用 JWT)
*   **Request:**
    ```json
    {
        "username": "admin",
        "password": "password123"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
        "code": 0,
        "message": "success",
        "data": {
            "token": "eyJhbGciOiJIUzI1NiIsInR...",
            "user": {
                "id": 1,
                "username": "admin",
                "email": "admin@example.com",
                "status": 1,
                "role": "superadmin" // 或 "user"
            }
        }
    }
    ```

### 2.2 标准检索模块 (Standard Search)

#### 2.2.1 全文检索与高级过滤
*   **Endpoint:** `GET /api/v1/standards/search`
*   **描述:** 基于宽表 (`industry_search_flat` / `view_std_full`) 提供全文检索及过滤。
*   **Request (Query Params):**
    *   `keyword`: 检索关键字 (匹配名称、标准号等)
    *   `std_type`: 标准类型 (GB, HB, DB, TB 等)
    *   `status`: 标准状态 (现行、废止等)
    *   `page`: 页码 (默认 1)
    *   `size`: 每页数量 (默认 20)
*   **Response (200 OK):**
    ```json
    {
        "code": 0,
        "message": "success",
        "data": {
            "total": 105,
            "page": 1,
            "size": 20,
            "items": [
                {
                    "std_id": "GB/T 12345-2023",
                    "std_chinesename": "测试标准名称",
                    "std_englishname": "Test Standard Name",
                    "std_type": "GB",
                    "release_date": "2023-01-01",
                    "implement_date": "2023-07-01",
                    "ex_state": 1,
                    "drafter": "起草单位A"
                }
            ]
        }
    }
    ```

#### 2.2.2 标准详情获取
*   **Endpoint:** `GET /api/v1/standards/{std_id}/`
*   **描述:** 获取单一标准的详细信息（关联的基础信息与扩展信息）。
*   **Response (200 OK):**
    ```json
    {
        "code": 0,
        "message": "success",
        "data": {
            "base_info": {
                "id": 101,
                "std_id": "GB/T 12345-2023",
                "std_chinesename": "测试标准名称",
                "std_status": "现行"
            },
            "detail_info": {
                "ccs": "A01",
                "ics": "01.040.01",
                "scope": "本标准规定了...",
                "drafter": "起草单位A, 起草单位B"
            },
            "pedigree": [ ... ],
            "replace_history": [ ... ]
        }
    }
    ```

#### 2.2.3 文件下载流
*   **Endpoint:** `GET /api/v1/standards/{std_id}/download`
*   **描述:** 获取标准的原文附件 (PDF/Word)。
*   **Response:**
    *   **Content-Type:** `application/pdf` 或 `application/octet-stream`
    *   直接返回文件二进制流。

### 2.3 AI 评价与解析模块 (AI Analysis via Celery + Dify)

#### 2.3.1 提交规范性引用解析任务
*   **Endpoint:** `POST /api/v1/ai/parse-references`
*   **描述:** 异步触发 Dify 解析标准的引用文件。
*   **Request:**
    ```json
    {
        "std_id": "GB/T 12345-2023"
    }
    ```
*   **Response (202 Accepted):**
    ```json
    {
        "code": 0,
        "message": "Task accepted",
        "data": {
            "task_id": "celery-task-uuid-1234-5678"
        }
    }
    ```

#### 2.3.2 提交合规性评价任务
*   **Endpoint:** `POST /api/v1/ai/compliance-evaluation`
*   **描述:** 对比标准条文与业务描述。
*   **Request:**
    ```json
    {
        "std_id": "GB/T 12345-2023",
        "business_description": "我们的业务流程包含..."
    }
    ```
*   **Response (202 Accepted):**
    ```json
    {
        "code": 0,
        "message": "Task accepted",
        "data": {
            "task_id": "celery-task-uuid-9876-5432"
        }
    }
    ```

#### 2.3.3 查询异步任务状态 (轮询)
*   **Endpoint:** `GET /api/v1/tasks/{task_id}/status`
*   **描述:** 前端轮询获取 Celery 的执行进度和 Dify 返回的结果。
*   **Response (200 OK):**
    ```json
    {
        "code": 0,
        "message": "success",
        "data": {
            "task_id": "celery-task-uuid-...",
            "status": "SUCCESS", 
            "result": {
                "references": ["GB/T 111-2000", "GB/T 222-2001"],
                "compliance_score": 85,
                "analysis_text": "业务符合标准要求，但在细节部分..."
            }
        }
    }
    ```

---

## 3. 需求确认记录 (已达成一致)
1. **用户角色与权限:** 采用基于 JWT 的登录认证，且**区分普通用户与超级管理员**，用于实现差异化的权限控制。
2. **全文搜索引擎:** 后台核心检索将**接入 Elasticsearch**，以保障海量标准的高性能检索需求。
3. **文件存储架构:** 标准文件流目前**从共享磁盘阵列读取**。*建议：目前共享磁盘阵列完全能满足需求。若未来业务扩展需要更好的并发性能或跨节点访问，可无缝切换至轻量级对象存储服务（如 MinIO）。*
4. **AI分析结果存储:** 当前阶段**暂不考虑将 AI 结果持久化入库**，系统仅负责中转并呈递 Dify 结果给前端。
5. **异步交互机制:** **接受前端轮询拉取** Celery 结果的方案，该方案易于维护且状态可控。
6. **前端UI布局:** 界面整体将采用**侧边栏（Sidebar）布局**。
