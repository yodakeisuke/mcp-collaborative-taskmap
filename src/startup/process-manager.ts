import { exec, ChildProcess } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// 設定定数
const PROCESS_TERMINATION_TIMEOUT = 3000; // 3秒
const CLEANUP_WAIT_TIME = 1000; // 1秒

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
      await execAsync(`lsof -ti:${this.port} | xargs kill -9 2>/dev/null || true`);
      await new Promise(resolve => setTimeout(resolve, CLEANUP_WAIT_TIME));
    } catch (error) {
      console.warn('⚠️  Cleanup warning:', this.getErrorMessage(error));
    }
  }

  /**
   * プロセスを管理対象に追加
   */
  addManagedProcess(process: ChildProcess): void {
    this.managedProcesses.add(process);
    process.once('exit', () => {
      this.managedProcesses.delete(process);
    });
  }

  /**
   * 管理中の全プロセスを終了
   */
  async terminateAllProcesses(): Promise<void> {
    if (this.managedProcesses.size === 0) return;

    console.log('🛑 Terminating managed processes...');
    
    const termPromises = Array.from(this.managedProcesses).map(process => 
      this.terminateProcess(process)
    );

    await Promise.all(termPromises);
    console.log('✅ All processes terminated');
  }

  /**
   * 単一プロセスを終了
   */
  private terminateProcess(process: ChildProcess): Promise<void> {
    return new Promise<void>((resolve) => {
      if (process.killed) {
        resolve();
        return;
      }

      // SIGTERM送信
      process.kill('SIGTERM');
      
      // タイムアウト後に強制終了
      const forceTimeout = setTimeout(() => {
        if (!process.killed) {
          console.log('⚡ Force killing process:', process.pid);
          try {
            process.kill('SIGKILL');
          } catch (error) {
            console.warn('⚠️  Failed to kill process:', this.getErrorMessage(error));
          }
        }
        resolve();
      }, PROCESS_TERMINATION_TIMEOUT);

      // プロセス終了を監視
      process.once('exit', () => {
        clearTimeout(forceTimeout);
        resolve();
      });
    });
  }

  /**
   * ポートのクリーンアップ
   */
  async cleanupPort(): Promise<void> {
    try {
      await execAsync(`lsof -ti:${this.port} | xargs kill -9 2>/dev/null || true`);
    } catch (error) {
      console.warn('⚠️  Port cleanup warning:', this.getErrorMessage(error));
    }
  }

  /**
   * グレースフルシャットダウンハンドラーを設定
   */
  setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 ${signal} received. Stopping all servers...`);
      
      await this.terminateAllProcesses();
      await this.cleanupPort();
      
      console.log('✅ Cleanup completed');
      process.exit(0);
    };

    // シグナルハンドラーを設定
    ['SIGINT', 'SIGTERM', 'SIGHUP'].forEach(signal => {
      process.on(signal, () => gracefulShutdown(signal));
    });

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

  /**
   * エラーメッセージを統一的に取得
   */
  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
} 