/** API 根地址，可通过 .env 中 VITE_API_BASE 配置 */
export const API_BASE =
  import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8001/api/v1';
