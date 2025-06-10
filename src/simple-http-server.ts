#!/usr/bin/env node
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const port = Number(process.env.PORT) || 3737;
  const frontendDistPath = process.env.FRONTEND_DIST_PATH || 
                           path.join(__dirname, '../human-ui/dist');

  console.log(`📁 Looking for frontend at: ${frontendDistPath}`);

  // フロントエンドファイルの存在確認
  if (!existsSync(frontendDistPath)) {
    console.error(`❌ Frontend build not found at: ${frontendDistPath}`);
    process.exit(1);
  }

  // Express アプリケーションを作成
  const app = express();

  // 静的ファイルを配信
  app.use(express.static(frontendDistPath));

  // API エンドポイント（将来のMCP API用）
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'mcp-collaborative-taskmap' });
  });

  // SPA フォールバック（特定の拡張子以外はindex.htmlを返す）
  app.get(/^(?!.*\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$).*$/, (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });

  // HTTPサーバーを起動
  const server = app.listen(port, () => {
    console.log(`🚀 HTTP Server running on http://localhost:${port}`);
    console.log(`📁 Serving frontend from: ${frontendDistPath}`);
    console.log(`🔸 Process ID: ${process.pid}`);
    console.log(`⌨️  Press Ctrl+C to stop the server`);
  });

  server.on('error', (error) => {
    console.error('HTTP Server error:', error);
  });

  // シンプルなシャットダウン処理（ProcessManagerが管理）
  const gracefulShutdown = (signal: string) => {
    console.log(`🛑 ${signal} received. Shutting down server...`);
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT')); 
  process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
}); 