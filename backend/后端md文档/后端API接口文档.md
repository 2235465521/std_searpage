# 标准信息平台 - 后端 API 接口文档 (最新修复版)

## 1. 全局说明
- **基础路径**：`/api/v1`
- **请求格式**：`application/json`（除下载文件流外）
- **鉴权方式**：`Bearer Token` (JWT)，将 `token` 放在 Header 的 `Authorization` 中。
- **全局返回结构**：
  ```json
  {
      "code": 0,          // 0 代表成功，非 0 代表失败
      "message": "success", // 错误信息或成功提示
      "data": {}          // 业务数据载体
  }
  ```

---

## 2. 鉴权相关接口

### 2.1 用户登录
- **路径**：`POST /auth/login`
- **参数**：
  ```json
  { "username": "admin", "password": "yourpassword" }
  ```
- **返回结果**：
  ```json
  {
      "code": 0,
      "message": "success",
      "data": {
          "token": "ey...",
          "refresh": "ey...",
          "user": { "id": 1, "username": "admin", "role": "superadmin" }
      }
  }
  ```

---

## 3. 标准检索与详情

### 3.1 综合检索 (支持 ES/DB 降级)
- **路径**：`GET /standards/search`
- **认证**：需要 Bearer Token
- **Query 参数**：
  - `keyword` (String, 可选): 关键字
  - `std_type` (String, 可选): `GB`, `HB`, `DB`, `TB`
  - `status` (Int, 可选): 1 (现行), 0 (废止)
  - `page` (Int, 默认 1): 当前页
  - `size` (Int, 默认 20): 每页条数
- **返回结果**：
  ```json
  {
      "data": {
          "total": 1500,
          "page": 1,
          "size": 20,
          "items": [
              { "std_id": "GB 1234", "std_chinesename": "...", "std_type": "GB", "ex_state": 1 }
          ]
      }
  }
  ```

### 3.2 标准详情聚合
- **路径**：`GET /standards/<std_id>/`
- **说明**：`std_id` 请在前端进行 URL Encode (如 `GB%2FT%20123`)。
- **返回结果**：
  ```json
  {
      "data": {
          "base_info": { "std_id": "GB 123", ... },
          "detail_info": { "ics": "...", "drafter": "..." },
          "pedigree": [],
          "replace_history": []
      }
  }
  ```

### 3.3 源文件下载
- **路径**：`GET /standards/<std_id>/download`
- **返回类型**：`application/pdf` 二进制流
- **说明**：触发浏览器直接下载行为，后端会从挂载的物理存储目录中读取文件。

---

## 4. AI 与异步任务轮询

### 4.1 提取引用文件
- **路径**：`POST /ai/parse-references`
- **参数**：
  ```json
  { "std_id": "GB 123" }
  ```
- **返回结果** (HTTP 202)：
  ```json
  {
      "code": 0,
      "data": { "task_id": "abc-123-celery-id" }
  }
  ```

### 4.2 业务合规性评估
- **路径**：`POST /ai/compliance-evaluation`
- **参数**：
  ```json
  { 
      "std_id": "GB 123",
      "business_description": "我公司主要生产新能源电池..."
  }
  ```
- **返回结果**：同 4.1 获得 `task_id`。

### 4.3 轮询任务状态
- **路径**：`GET /tasks/<task_id>/status`
- **返回结果**：
  ```json
  {
      "data": {
          "task_id": "abc-123-celery-id",
          "status": "SUCCESS", // PENDING, PROCESSING, SUCCESS, FAILURE
          "result": { "answer": "大模型的长篇分析报告..." } 
      }
  }
  ```
