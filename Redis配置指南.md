# Redis 配置指南

本项目使用 Redis 作为 **Celery 消息队列** 和 **Django 查询缓存** 的后端存储。

---

## 1. 项目中 Redis 的用途

| 用途 | Redis DB 编号 | 对应配置项 | 说明 |
|------|:---:|---|---|
| Celery 消息队列 | db 0 | `CELERY_BROKER_URL` | 异步任务（AI 分析等）的消息通道 |
| Celery 结果存储 | db 1 | `CELERY_RESULT_BACKEND` | 异步任务的执行结果 |
| Django 查询缓存 | db 2 | `CACHES['default']` | 所有查询接口的结果缓存，提升响应速度 |

---

## 2. Django 中的配置（已就绪）

文件：`backend/config/settings.py`

```python
# Celery & Redis
CELERY_BROKER_URL = 'redis://127.0.0.1:6379/0'
CELERY_RESULT_BACKEND = 'redis://127.0.0.1:6379/1'

# Django 查询缓存
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/2',
    }
}
```

> 如果 Redis 不在同一台机器上，将 `127.0.0.1` 改为 Redis 服务器的内网 IP。

---

## 3. 服务器安装 Redis

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install -y redis-server
```

### CentOS / RHEL

```bash
sudo yum install -y redis
```

### Docker（可选）

```bash
docker run -d --name redis \
  -p 6379:6379 \
  --restart always \
  redis:7-alpine \
  redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
```

---

## 4. Redis 配置文件修改

配置文件路径：`/etc/redis/redis.conf`

```bash
sudo vi /etc/redis/redis.conf
```

需修改的配置项：

```conf
# ---- 网络 ----
# Django 和 Redis 在同一台机器：保持默认即可
bind 127.0.0.1
port 6379

# ---- 运行方式 ----
daemonize yes

# ---- 内存限制 ----
# 建议 256M~512M，根据服务器内存调整
maxmemory 512mb

# 内存满时自动淘汰最久没用的 key（缓存场景推荐）
maxmemory-policy allkeys-lru

# ---- 持久化（可选） ----
# 内网缓存场景可以关闭持久化，重启后缓存自动重建
# save ""
# appendonly no
```

---

## 5. 启动与验证

```bash
# 启动
sudo systemctl enable redis-server
sudo systemctl start redis-server

# 验证连接
redis-cli ping
# 返回 PONG 表示正常

# 查看内存使用
redis-cli info memory | grep used_memory_human
```

---

## 6. 验证缓存生效

启动 Django 后，执行一次查询，然后检查 Redis 中是否写入了缓存 key：

```bash
# 查看查询缓存（db 2）
redis-cli -n 2 keys '*'

# 正常情况下会看到类似：
# :1:first_part:v1:北京市:::00
# :1:drafter_rank_search:v7:2026:1:00:::
# :1:std_search:v1::::::1
# :1:summary:v4:::::00
```

---

## 7. 缓存接口清单与过期时间

| 接口 | 缓存 Key 前缀 | 过期时间 |
|------|--------------|---------|
| 起草单位查询 | `drafter_rank_search:v7:` | 5 分钟 |
| 首家牵头国标 | `first_lead:v1:` | 5 分钟 |
| 单位首次参与（单查） | `unit_first_part:v1:` | 5 分钟 |
| 单位首次参与（区域列表） | `first_part:v1:` | 15 分钟 |
| 数据分析 - 区域统计 | `summary:v4:` | 5 分钟 |
| 数据分析 - 年度对比 | `yrcmp:v4:` | 5 分钟 |
| 标准检索 | `std_search:v1:` | 5 分钟 |

> 缓存到期后下次查询会重新计算并写入，无需手动清理。

---

## 8. 常用运维命令

```bash
# 查看 Redis 状态
sudo systemctl status redis-server

# 重启 Redis
sudo systemctl restart redis-server

# 手动清空所有缓存（db 2）
redis-cli -n 2 flushdb

# 清空全部 Redis 数据（慎用，会影响 Celery）
redis-cli flushall

# 查看当前连接数
redis-cli info clients | grep connected_clients

# 查看缓存命中率
redis-cli info stats | grep keyspace
```

---

## 9. 注意事项

1. **内网使用无需设密码**：如果 Redis 只在 `127.0.0.1` 监听，不需要配置 `requirepass`。
2. **重启后缓存为空是正常的**：缓存会在首次查询时自动重建，无需预热。
3. **Python 依赖已包含**：`requirements.txt` 中已有 `redis>=5.0.0`，Django 4.2+ 内置 Redis 缓存后端，无需额外安装。
4. **不影响已有功能**：Redis 挂掉时查询会直接走数据库，只是响应变慢，不会报错。
