import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';

export class FrontendManager {
  private readonly projectRoot: string;
  private readonly frontendPath: string;
  private readonly distPath: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.frontendPath = join(projectRoot, 'human-ui');
    this.distPath = join(this.frontendPath, 'dist');
  }

  /**
   * フロントエンドのビルドファイルが存在するかチェック
   */
  isBuilt(): boolean {
    return existsSync(this.distPath);
  }

  /**
   * フロントエンドの依存関係をインストール
   */
  async installDependencies(): Promise<void> {
    console.log('📦 フロントエンドの依存関係をインストール中...');
    
    return new Promise((resolve, reject) => {
      const installProcess: ChildProcess = spawn('npm', ['install'], {
        cwd: this.frontendPath,
        stdio: 'inherit'
      });
      
      installProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ 依存関係のインストール完了');
          resolve();
        } else {
          reject(new Error(`依存関係のインストールに失敗しました (exit code: ${code})`));
        }
      });

      installProcess.on('error', (error) => {
        reject(new Error(`インストールプロセスエラー: ${error.message}`));
      });
    });
  }

  /**
   * フロントエンドをビルド
   */
  async build(): Promise<void> {
    console.log('🔨 フロントエンドをビルド中...');
    
    return new Promise((resolve, reject) => {
      const buildProcess: ChildProcess = spawn('npm', ['run', 'build'], {
        cwd: this.frontendPath,
        stdio: 'inherit'
      });
      
      buildProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ フロントエンドのビルド完了');
          resolve();
        } else {
          reject(new Error(`フロントエンドのビルドに失敗しました (exit code: ${code})`));
        }
      });

      buildProcess.on('error', (error) => {
        reject(new Error(`ビルドプロセスエラー: ${error.message}`));
      });
    });
  }

  /**
   * フロントエンドの初期化（インストール + ビルド）
   */
  async initialize(): Promise<string> {
    if (this.isBuilt()) {
      console.log('✅ フロントエンドは既にビルド済みです');
      return this.distPath;
    }

    console.log('❌ フロントエンドのビルドファイルが見つかりません。');
    console.log('パッケージの初期化を実行します...');
    
    try {
      await this.installDependencies();
      await this.build();
      
      if (!this.isBuilt()) {
        throw new Error('ビルド後にdistディレクトリが見つかりません');
      }
      
      return this.distPath;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`フロントエンドの初期化に失敗: ${errorMessage}`);
    }
  }

  /**
   * ディストリビューションパスを取得
   */
  getDistPath(): string {
    return this.distPath;
  }
} 