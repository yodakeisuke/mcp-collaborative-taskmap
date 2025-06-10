import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import open from 'open';
import { ProcessManager } from './process-manager.js';

export class ServerStarter {
  private readonly projectRoot: string;
  private readonly port: number;

  constructor(projectRoot: string, port: number = 3737) {
    this.projectRoot = projectRoot;
    this.port = port;
  }

  /**
   * MCPサーバーを起動
   */
  startServer(frontendDistPath: string, processManager: ProcessManager): Promise<ChildProcess> {
    return new Promise((resolve, reject) => {
      console.log(`📡 MCPサーバー: http://localhost:${this.port}`);
      console.log(`🌐 フロントエンド: http://localhost:${this.port}`);

      const serverProcess = spawn('node', [join(this.projectRoot, 'dist/simple-http-server.js')], {
        cwd: this.projectRoot,
        stdio: 'inherit',
        env: { 
          ...process.env, 
          PORT: String(this.port),
          FRONTEND_DIST_PATH: frontendDistPath
        }
      });

      // プロセス管理に登録
      processManager.addManagedProcess(serverProcess);

      // エラーハンドリング
      serverProcess.on('error', (error) => {
        console.error('❌ Server process error:', error);
        reject(error);
      });

      serverProcess.on('exit', (code) => {
        if (code !== null && code !== 0) {
          console.error(`❌ MCPサーバーがエラーで終了しました (code: ${code})`);
        }
      });

      // 少し待ってから成功とみなす
      setTimeout(() => {
        resolve(serverProcess);
      }, 2000);
    });
  }

  /**
   * ブラウザを開く
   */
  async openBrowser(delay: number = 3000): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          console.log('🔗 ブラウザを開いています...');
          await open(`http://localhost:${this.port}`);
          resolve();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.warn('⚠️  Failed to open browser:', errorMessage);
          resolve(); // ブラウザが開けなくても続行
        }
      }, delay);
    });
  }

  /**
   * サーバーとブラウザを起動
   */
  async start(frontendDistPath: string, processManager: ProcessManager): Promise<ChildProcess> {
    try {
      // サーバー起動
      const serverProcess = await this.startServer(frontendDistPath, processManager);
      
      // ブラウザを開く（非同期で実行）
      this.openBrowser();
      
      return serverProcess;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`サーバー起動に失敗: ${errorMessage}`);
    }
  }
} 