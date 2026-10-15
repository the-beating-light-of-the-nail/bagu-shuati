// 题库完整数据接口（服务端路径）。
// 客户端工作台走的是静态资源 /data/bank.json（可 CDN 缓存、不占 Workers CPU），
// 本接口保留给服务端调用与联调校验使用。
import { bank } from '../utils/bank'

export default defineEventHandler(() => bank)
