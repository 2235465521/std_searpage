# 修复登录闪退（401 Unauthorized 重定向） Bug 文档

## 1. 现象描述
用户在全新优化的 `Login.jsx` 登录页面输入正确的账号密码后，点击“登录系统”。页面成功跳转到 `/search` 标准检索页，但在大约 1 秒左右，页面突然闪退，又强制回到了 `/login` 登录页。

## 2. 根因分析 (Root Cause Analysis)
这是由于**前端 Token 存储键名 (Key) 不一致**引发的连锁反应：
1. **存储阶段 (`Login.jsx`)**：重构登录页时，将后端返回的 `token` 错误地使用 `localStorage.setItem('access_token', data.token)` 存储。
2. **请求阶段 (`SearchPage.jsx`)**：进入 `/search` 页面后，React 组件立即发起 `searchStandards` 数据请求。
3. **拦截阶段 (`axios.js`)**：在全局 Axios 拦截器中，代码试图通过 `const token = localStorage.getItem('token')` 读取 Token。由于存储时用的是 `access_token`，拦截器读取到的值为 `null`。
4. **报错阶段 (`后端 API`)**：后端接口配置了 `permission_classes = [IsAuthenticated]`。因为请求头中没有合法的 Bearer Token，后端直接返回 HTTP `401 Unauthorized`。
5. **闪退阶段 (`axios.js`)**：前端响应拦截器捕获到状态码 401，判定为无权限或身份过期，触发 `window.location.href = '/login'`，导致页面强制闪退。

## 3. 修复方案
### 3.1 统一 Token 存储键名
- 修改文件：`src/pages/Login.jsx`
- 修复逻辑：将保存逻辑由 `'access_token'` 修改为 `'token'`。
```javascript
// 修改前
localStorage.setItem('access_token', data.token);
// 修改后
localStorage.setItem('token', data.token);
```

### 3.2 完善 401 清理机制
- 修改文件：`src/api/axios.js`
- 修复逻辑：在触发 401 登出时，除了清理 `token`，同时把 `user_role` 和 `refresh_token` 等鉴权附属状态一并清理干净，防止产生页面权限判断残留。
```javascript
// 触发 401 时全面清理
localStorage.removeItem('token');
localStorage.removeItem('user');
localStorage.removeItem('user_role');
localStorage.removeItem('refresh_token');
```

## 4. 验证测试
- 重新在登录页输入 `admin`/`admin123`，观察浏览器的 `Application -> Local Storage`，确认出现键名为 `token` 的值。
- 跳转 `/search` 页面后，Network 能够正确看到带有 `Authorization: Bearer eyJhbG...` 请求头的搜索请求，获得 200 状态码，闪退问题彻底解决。
