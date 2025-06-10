# MCP Collaborative TaskMap

MCP（Model Context Protocol）サーバーとReactフロントエンドを組み合わせた、協調的なタスクマッピングと並列開発オーケストレーションツールです。

## 🚀 クイックスタート

### NPXで即座に起動

```bash
npx mcp-collaborative-taskmap
```

このコマンドで以下が同時に起動します：
- MCPサーバー + Reactフロントエンド（ポート: 3737）
- ブラウザが自動で開きます

### サーバーの停止方法

```bash
# 端末で Ctrl+C を押す
^C

# または別の端末から強制終了
pkill -f mcp-collaborative-taskmap
```

### 開発環境

```bash
# 依存関係のインストール
npm install
cd human-ui && npm install

# 両方のサーバーを同時起動（開発モード）
npm run dev:both

# 個別起動
npm run dev              # MCPサーバーのみ
npm run dev:frontend     # フロントエンドのみ
```

### ビルド

```bash
# 全体をビルド
npm run build

# 個別ビルド
npm run build:frontend   # フロントエンドのみ
```

## 🏗️ プロジェクト構成

```
mcp-worktree/
├── src/                 # MCPサーバーのソースコード
├── human-ui/           # Reactフロントエンド
│   ├── src/
│   ├── package.json
│   └── ...
├── bin/
│   └── start.js        # NPX起動スクリプト
├── dist/               # ビルド済みMCPサーバー
└── package.json
```

## 🛠️ 技術スタック

### MCPサーバー
- TypeScript
- Model Context Protocol SDK
- Node.js

### フロントエンド
- React 18 (最新版)
- TypeScript
- Vite (ビルドツール)
- Jotai (状態管理)
- Tailwind CSS (スタイリング)
- Radix UI (UIコンポーネント)

## 📝 開発

### 環境変数

```bash
# ポート設定（オプション）
MCP_PORT=3737           # MCPサーバーのポート（デフォルト）
```

### スクリプト

- `npm run dev` - MCPサーバー開発モード
- `npm run dev:frontend` - フロントエンド開発モード  
- `npm run dev:both` - 両方同時起動
- `npm run build` - 全体ビルド
- `npm run start` - 本番モードでMCPサーバー起動
- `npm run test` - テスト実行

## 📦 NPM配信

このパッケージは `mcp-collaborative-taskmap` として配信され、以下のコマンドで利用できます：

```bash
npx mcp-collaborative-taskmap
```

## 🤝 貢献

プルリクエストやイシューの報告を歓迎します。

## �� ライセンス

MIT License 