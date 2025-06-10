import { exec, ChildProcess } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ProcessManager {
  private readonly port: number;
  private readonly managedProcesses = new Set<ChildProcess>();

  constructor(port: number = 3737) {
    this.port = port;
  }

  /**
   * 既存のプロセスをクリーンアップ
   */
  async cleanupExistingProcesses(): Promise<void> {
    try {
      console.log('🧹 Cleaning up existing processes...');
      
      // プロセス名でkill
      await execAsync('pkill -f "simple-http-server.js" 2>/dev/null || true');
      
      // ポートでkill  
      await execAsync(`lsof -ti:${this.port} | xargs kill -9 2>/dev/null || true`);
      
      // 少し待つ
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('⚠️  Cleanup warning:', errorMessage);
    }
  }

  /**
   * プロセスを管理対象に追加
   */
  addManagedProcess(process: ChildProcess): void {
    this.managedProcesses.add(process);
    
    // プロセス終了時に管理対象から削除
    process.on('exit', () => {
      this.managedProcesses.delete(process);
    });
  }

  /**
   * 管理中の全プロセスを終了
   */
  async terminateAllProcesses(): Promise<void> {
    console.log('🛑 Terminating managed processes...');
    
    const termPromises = Array.from(this.managedProcesses).map(process => {
      return new Promise<void>((resolve) => {
        if (process.killed) {
          resolve();
          return;
        }

        // SIGTERM送信
        process.kill('SIGTERM');
        
        // 5秒後に強制終了
        const forceTimeout = setTimeout(() => {
          if (!process.killed) {
            console.log('⚡ Force killing process...');
            process.kill('SIGKILL');
          }
          resolve();
        }, 5000);

        // プロセス終了を監視
        process.on('exit', () => {
          clearTimeout(forceTimeout);
          resolve();
        });
      });
    });

    await Promise.all(termPromises);
  }

  /**
   * ポートのクリーンアップ
   */
  async cleanupPort(): Promise<void> {
    try {
      await execAsync(`lsof -ti:${this.port} | xargs kill -9 2>/dev/null || true`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('⚠️  Port cleanup warning:', errorMessage);
    }
  }

  /**
   * グレースフルシャットダウンハンドラーを設定
   */
  setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 ${signal} received. Stopping server...`);
      
      // 管理中のプロセスを終了
      await this.terminateAllProcesses();
      
      // ポートのクリーンアップ
      await this.cleanupPort();
      
      console.log('✅ Cleanup completed');
      process.exit(0);
    };

    // シグナルハンドラーを設定
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

    // 未処理例外のハンドラー
    process.on('uncaughtException', async (error) => {
      console.error('💥 Uncaught Exception:', error);
      await gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      await gracefulShutdown('UNHANDLED_REJECTION');
    });
  }
} 