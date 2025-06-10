import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import open from 'open';
import { ProcessManager } from './process-manager.js';

// 設定定数
const MCP_SERVER_STARTUP_DELAY = 1000; // 1秒
const EXPRESS_SERVER_STARTUP_DELAY = 2000; // 2秒  
const BROWSER_OPEN_DELAY = 3000; // 3秒

export class ServerStarter {
  private readonly projectRoot: string;
  private readonly port: number;

  constructor(projectRoot: string, port: number = 3737) {
    this.projectRoot = projectRoot;
    this.port = port;
  }

  /**
   * MCP serverを起動
   */
  startMcpServer(processManager: ProcessManager): Promise<ChildProcess> {
    return new Promise((resolve, reject) => {
      console.log('🔌 MCP Server starting...');

      const mcpServerProcess = spawn('node', [join(this.projectRoot, 'dist/index.js')], {
        cwd: this.projectRoot,
        stdio: ['pipe', 'pipe', 'inherit'],
        detached: false,
        env: { ...process.env }
      });

      processManager.addManagedProcess(mcpServerProcess);

      mcpServerProcess.on('error', (error) => {
        console.error('❌ MCP Server process error:', error);
        reject(error);
      });

      mcpServerProcess.on('exit', (code) => {
        if (code !== null && code !== 0) {
          console.error(`❌ MCP Server exited with code: ${code}`);
        }
      });

      setTimeout(() => {
        console.log('✅ MCP Server started');
        resolve(mcpServerProcess);
      }, MCP_SERVER_STARTUP_DELAY);
    });
  }

  /**
   * Express server（フロントエンド配信用）を起動
   */
  startExpressServer(frontendDistPath: string, processManager: ProcessManager): Promise<ChildProcess> {
    return new Promise((resolve, reject) => {
      console.log(`📡 Express Server: http://localhost:${this.port}`);

      const expressServerProcess = spawn('node', [join(this.projectRoot, 'dist/simple-http-server.js')], {
        cwd: this.projectRoot,
        stdio: 'inherit',
        detached: false,
        env: { 
          ...process.env, 
          PORT: String(this.port),
          FRONTEND_DIST_PATH: frontendDistPath
        }
      });

      processManager.addManagedProcess(expressServerProcess);

      expressServerProcess.on('error', (error) => {
        console.error('❌ Express Server process error:', error);
        reject(error);
      });

      expressServerProcess.on('exit', (code) => {
        if (code !== null && code !== 0) {
          console.error(`❌ Express Server exited with code: ${code}`);
        }
      });

      setTimeout(() => {
        resolve(expressServerProcess);
      }, EXPRESS_SERVER_STARTUP_DELAY);
    });
  }

  /**
   * ブラウザを開く
   */
  async openBrowser(delay: number = BROWSER_OPEN_DELAY): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          console.log('🔗 ブラウザを開いています...');
          await open(`http://localhost:${this.port}`);
          resolve();
        } catch (error) {
          console.warn('⚠️  Failed to open browser:', this.getErrorMessage(error));
          resolve(); // ブラウザが開けなくても続行
        }
      }, delay);
    });
  }

  /**
   * MCP server + Express server + ブラウザを起動
   */
  async start(frontendDistPath: string, processManager: ProcessManager): Promise<{ mcpServer: ChildProcess; expressServer: ChildProcess }> {
    try {
      console.log('🚀 Starting MCP Collaborative TaskMap servers...');
      
      // 並列でサーバー起動
      const [mcpServer, expressServer] = await Promise.all([
        this.startMcpServer(processManager),
        this.startExpressServer(frontendDistPath, processManager)
      ]);
      
      // ブラウザを開く（非同期で実行）
      this.openBrowser();
      
      return { mcpServer, expressServer };
    } catch (error) {
      throw new Error(`サーバー起動に失敗: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * エラーメッセージを統一的に取得
   */
  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
} 