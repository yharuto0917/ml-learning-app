# ML Learning Site — Phase 1+2 実装計画

> `docs/ml-learning-site-plan.md`(仕様書)に基づく初期実装ロードマップ。Phase 1(基盤構築)と Phase 2(コンテンツパイプライン)までを対象に、サンプル MDX 1 本がビルド → R2 → ブラウザ表示まで通る状態をゴールにする。

## Context

`docs/ml-learning-site-plan.md` に書かれた機械学習学習サイトの仕様書を、`create-cloudflare CLI` で初期化されたばかりの本リポジトリ(現状 Next.js 16.2.6 + React 19.1.7 + OpenNext.js Cloudflare adapter 1.19.9 のスケルトン)に落とし込む第一弾。仕様書全 5 フェーズのうち、まず **Phase 1(基盤構築)** と **Phase 2(コンテンツパイプライン)** を仕上げ、「サンプル MDX 1 本がビルド → R2 → ブラウザ表示まで end-to-end で通る」状態をゴールにする。Phase 3 以降の共通コンポーネント本実装・全レッスン執筆・全文検索・SEO は本計画のスコープ外で、Phase 1+2 が完了した時点で着手フックを残す。

採用方針(ユーザー合意済み):

1. プロジェクトは仕様書通り `apps/web/` モノレポ化(現ルートを全部 `apps/web/` 下に押し下げ、`content/`/`scripts/`/`notebooks/`/`.github/` をルートに新設)。
2. R2 アクセスは **Worker binding 経由**(`env.CONTENT_BUCKET.get(key)`)。`compatibility_flags` に既に `global_fetch_strictly_public` が入っており、URL 直 fetch は不可。
3. **方式 C**(ビルド時 MDX → HTML 事前変換、Shiki/KaTeX も事前適用、Worker は静的配信 + ISR)を採用。Worker bundle に MDX/Shiki/KaTeX runtime は載せない。
4. 検証用サンプル MDX として `content/numpy/1.1-ndarray.mdx` を 1 本作成。

パッケージマネージャは **pnpm 継続採用**(`pnpm-lock.yaml` が既に存在、サイズ 241KB)。

---

## Phase 1: 基盤構築

### 1-A. モノレポ移行(ファイル物理移動)

ルート直下のアプリ実装ファイルを `apps/web/` 配下に押し下げる。

| 移動元 | 移動先 |
|---|---|
| `src/` | `apps/web/src/` |
| `public/` | `apps/web/public/` |
| `wrangler.jsonc` | `apps/web/wrangler.jsonc` |
| `open-next.config.ts` | `apps/web/open-next.config.ts` |
| `next.config.ts` | `apps/web/next.config.ts` |
| `postcss.config.mjs` | `apps/web/postcss.config.mjs` |
| `eslint.config.mjs` | `apps/web/eslint.config.mjs` |
| `tsconfig.json` | `apps/web/tsconfig.json` |
| `package.json` | `apps/web/package.json` |
| `cloudflare-env.d.ts` | `apps/web/cloudflare-env.d.ts`(後で再生成) |
| `.dev.vars` | `apps/web/.dev.vars` |

維持(ルートに残す): `docs/`, `.git/`, `.gitignore`(中身更新), `.vscode/`, `README.md`, `pnpm-lock.yaml`, `node_modules/`(`pnpm install` で再構築)。Tailwind v4 は config-less が標準なので `tailwind.config.*` は存在せず移動対象外。

### 1-B. ルートに新規作成

- **`/pnpm-workspace.yaml`**: `packages: ["apps/*"]` を宣言。
- **`/package.json`** (ルート): `private: true`、`packageManager: "pnpm@..."`、ビルド時のみ必要な devDependencies(`tsx`, `@mdx-js/mdx`, `gray-matter`, `unified`, `remark-parse`, `remark-mdx`, `remark-math`, `remark-rehype`, `rehype-katex`, `rehype-stringify`, `@shikijs/rehype`, `shiki`, `fast-glob`, `execa`)を集約。scripts に `dev` / `build` / `deploy` / `cf-typegen`(いずれも `pnpm --filter @ml/web ...` への薄いラッパ)を置く。Phase 2 で `content:*` 系を追加。
- **`/.gitignore`** 更新: `apps/web/.next/`, `apps/web/.open-next/`, `apps/web/.wrangler/`, `apps/web/cloudflare-env.d.ts`, `/dist/` をパス調整して再列挙。

### 1-C. `apps/web/package.json` 編集

- `name` を `@ml/web` に変更。
- 既存 scripts (`dev`/`build`/`start`/`lint`/`deploy`/`upload`/`preview`/`cf-typegen`) はそのまま維持。`opennextjs-cloudflare` の cwd 前提が `apps/web/` になるため、ルートからは必ず `pnpm --filter @ml/web <script>` で叩く運用。

### 1-D. `apps/web/wrangler.jsonc` 編集

現状の ASSETS / IMAGES / WORKER_SELF_REFERENCE に加え、以下を追記。

```jsonc
"r2_buckets": [
  {
    "binding": "CONTENT_BUCKET",
    "bucket_name": "ml-learning-content",
    "preview_bucket_name": "ml-learning-content-dev"
  }
],
"kv_namespaces": [
  { "binding": "CONTENT_KV", "id": "<wrangler kv namespace create で取得>" }
]
```

実 bucket / namespace ID はファイル冒頭コメントで「`wrangler r2 bucket create ml-learning-content` と `wrangler kv namespace create CONTENT_KV` を実行後に貼り付ける」と明記。`compatibility_flags` に既に入っている `global_fetch_strictly_public` が R2 を URL fetch 不可にしているため、必ず binding 経由で扱う方針をコメントとして残す。

### 1-E. `apps/web/src/lib/` を新設

- **`r2.ts`**: `getCloudflareContext({ async: true })` から `env.CONTENT_BUCKET` を取得、`getR2Object(key)` / `getR2Text(key)` / `getR2Json<T>(key)` を export。`async: true` 必須(Node ランタイムでの undefined を回避)。
- **`content.ts`**: `fetchLesson(category, slug)` を export。R2 から `content/{category}/{slug}.html` と `.meta.json` を取得し、Next の `fetch` キャッシュ(`{ next: { revalidate: 3600, tags: ['lesson:${cat}:${slug}'] } }`)で ISR を効かせる。404 時は `notFound()`。

### 1-F. App Router ベース整備

- **`apps/web/src/app/layout.tsx`**: テンプレ撤去、`<header>`(ロゴ + Home / Learn / About のナビ)・`<main>{children}</main>`・`<footer>`(GitHub・著作)の骨格に置換。Metadata の `title` / `description` を学習サイト向けに更新。`globals.css` の import は維持。
- **`apps/web/src/app/page.tsx`**: 学習サイトのトップに置換。仕様書 7 章の 11 章タイトルを静的列挙したカード一覧(各カードは `/learn/<category>` への `<Link>`)、ヒーロー、進捗トラッキング・プレースホルダの 3 ブロック。
- **`apps/web/src/app/globals.css`**: Tailwind v4 の `@import "tailwindcss";` を維持しつつ、`@layer base` に `prose` 風タイポグラフィの足場を残す(Phase 2 で `pre.shiki` / `.katex` を補強)。
- **`apps/web/src/app/learn/page.tsx`**(新規): 章一覧プレースホルダ(中身は Phase 3)。
- **`apps/web/src/app/learn/[category]/[slug]/page.tsx`**(新規・スケルトン): R2 から HTML を取得して `<article dangerouslySetInnerHTML={{ __html }} />` で挿入する形のひな型。Phase 1 ではダミー文字列で OK、Phase 2 で本実装。

### 1-G. 共通コンポーネント・プレースホルダ

`apps/web/src/components/` に以下を骨子だけ用意(中身は Phase 3 で実装)。

- `LessonHeader.tsx` (frontmatter を props で受ける Server Component シグネチャのみ)
- `LessonFooter.tsx` (`next` レッスンへのリンク予定)
- `ColabCTA.tsx` (Colab ボタン)
- `Callout.tsx` (intuition / warning 等)

### 1-H. bindings 型の再生成

bindings を追加したら `pnpm --filter @ml/web cf-typegen` を必ず実行し、`apps/web/cloudflare-env.d.ts` に `CONTENT_BUCKET` / `CONTENT_KV` の型を反映。これを怠ると `env.CONTENT_BUCKET` が TypeScript で `any` になる。

---

## Phase 2: コンテンツパイプライン

### 2-A. ビルドスクリプト

- **`scripts/build-content.ts`**:
  1. `fast-glob` で `content/**/*.mdx` を走査
  2. `gray-matter` で frontmatter 抽出
  3. unified パイプライン: `remark-parse` → `remark-mdx` → `remark-math` → `remark-rehype` → `rehype-katex` → `@shikijs/rehype`(`langs: ['python','bash','json','tsx']`, dual themes `github-dark` / `github-light`)→ `rehype-stringify`
  4. MDX 内の `<Callout>` `<ColabCTA>` 等のカスタムタグは rehype 段で `<div data-island="ColabCTA" data-props='{...}'></div>` のマーカーに変換(Phase 3 でクライアント側ハイドレート、Phase 2 ではマーカーが残るだけで OK)
  5. 出力: `dist/content/{category}/{slug}.html` と `dist/content/{category}/{slug}.meta.json`(frontmatter + chapter/lesson 番号 + 推定所要時間)
- **`scripts/lib/mdx-pipeline.ts`**: unified パイプラインだけを切り出して再利用可能に。
- **`scripts/upload-to-r2.ts`**: `dist/content/` 配下を再帰走査し、`execa` で `wrangler r2 object put ml-learning-content/<key> --file=<path> --content-type=...` を叩く。`--local` フラグで `apps/web/.wrangler/state/v3/r2/...` のローカルシミュレータに put、無指定で `--remote`(本番)。
- **`tsconfig.scripts.json`**: scripts 用に `module: nodenext`, `moduleResolution: nodenext`, `types: ["node"]` の別 tsconfig を用意。

### 2-B. ルート `package.json` の scripts 追記

```jsonc
"content:build": "tsx scripts/build-content.ts",
"content:upload": "tsx scripts/upload-to-r2.ts",
"content:upload:local": "tsx scripts/upload-to-r2.ts --local",
"content:deploy": "pnpm content:build && pnpm content:upload"
```

### 2-C. サンプル MDX

**`content/numpy/1.1-ndarray.mdx`** を新規作成。仕様書 7 章のカリキュラム 1.1 を素材に最小本文。

```yaml
---
title: "ndarray入門"
chapter: 1
lesson: 1
prerequisites: []
notebooks:
  lesson: "01_numpy/01_ndarray/lesson.ipynb"
estimatedMinutes: 45
tags: [numpy, basics]
---
```

本文:
- `## 学習目標`(3 項目)
- `## 1. 直感`(短い説明)
- `## 2. 数式`(`$y = Wx + b$` を KaTeX で 1 つ)
- `## 3. 実装の要点`(Python コードブロック 1 つで Shiki ハイライト確認)
- `## まとめ`

### 2-D. `[category]/[slug]/page.tsx` 本実装

- `fetchLesson(category, slug)` で HTML と meta を取得
- `generateMetadata` で meta.title を `<title>` に反映
- `<LessonHeader meta={meta} />` → `<article className="prose" dangerouslySetInnerHTML={{ __html: html }} />` → `<LessonFooter next={...} />` の構成
- **ISR 戦略**: `generateStaticParams` は使わず動的(`dynamicParams: true`)。`fetch` 側に `next: { revalidate: 3600, tags: [...] }` を付与。理由は、レッスン数が増えても Worker bundle に静的パスを抱え込まず、新規レッスン追加が R2 アップロード + 自動ISR 再生だけで完結するため。

### 2-E. `apps/web/open-next.config.ts` 更新

Phase 2 終盤で `incrementalCache: r2IncrementalCache` を有効化(コメントアウト解除)。これで `revalidateTag` がオンデマンドに使えるようになる(Next 16 + OpenNext 1.19 の挙動次第なので動かなければ時間ベース ISR のみで Phase 2 終了とし、`revalidateTag` 配線は Phase 3 に送る)。

### 2-F. KaTeX フォント

`apps/web/public/fonts/katex/` に `KaTeX_*.woff2` を配置、`apps/web/src/app/globals.css` で `@font-face` を相対 URL で宣言。CSS 本体(`katex/dist/katex.min.css`)は `globals.css` で `@import`。R2 経由にしない理由は preconnect が要らず、Workers Assets で配信できるため。

---

## 設計上の判断ポイント

1. **MDX コンパイル方式**: `compile` でも `evaluate` でもなく、unified で **完全 HTML 化**して R2 に置く。React island は HTML 中の `<div data-island=...>` マーカーで残し、Phase 3 でクライアントマウント。Worker bundle に MDX/Shiki/KaTeX を一切載せないことを最優先。
2. **R2 キー設計**: `content/{category}/{slug}.html` と `content/{category}/{slug}.meta.json`。content-hash サフィックスは付けない(URL から R2 キーが一意決定するほうが単純、更新は `revalidateTag` で行う)。画像アセットは `content/_assets/{category}/{filename}` に集約。
3. **ISR**: 時間ベース(`revalidate: 3600`)を主軸、`revalidateTag` をオンデマンドで併用(Phase 2 終盤に CI から内部 API ルートを叩く配線まで)。
4. **Shiki**: bundle 対策として CI(`scripts/build-content.ts`)でのみ import。`langs: ['python','bash','json','tsx']` に絞る。HTML には Shiki がインラインスタイルを焼き込むためランタイム JS 不要。
5. **KaTeX**: ビルド時に `rehype-katex` で展開、CSS のみで描画、JS 不要。フォントは自己ホスティング。
6. **画像**: 学習画像は R2 → `content/_assets/...`、Notebook 用は絶対 URL 必須(仕様書 12-9)。Cloudflare Images binding は Phase 3 以降に使用。

---

## リスク・落とし穴

1. **OpenNext 1.19 の `revalidateTag` 対応**: Next 16 と組み合わせた挙動が未検証。`r2IncrementalCache` 有効化しても動かない場合は時間ベース ISR のみで Phase 2 を締める。
2. **Server Component からの binding アクセス**: `getCloudflareContext({ async: true })` で取得しないと Static Generation 時に undefined。ページに `export const dynamic = 'force-dynamic'` か `revalidate` を必ず指定。
3. **モノレポ移行後の `opennextjs-cloudflare` cwd**: ルートからではなく `pnpm --filter @ml/web` 経由で叩く運用に統一。
4. **`global_fetch_strictly_public` フラグ**: 設定済み。R2 を `fetch(URL)` で読むのは禁じ手、必ず `env.CONTENT_BUCKET.get` を経由。`lib/r2.ts` の単一窓口で誤用を防ぐ。
5. **`cloudflare-env.d.ts` 再生成**: bindings 追加直後と移動後の両方で `cf-typegen` を回す。
6. **wrangler 4 系の CLI 文法**: `wrangler r2 object put <bucket>/<key>` の新文法を `upload-to-r2.ts` で使う。
7. **bundle size 計測**: Phase 2 完了時に `pnpm --filter @ml/web exec wrangler deploy --dry-run --outdir=dist-worker` を回し、`.open-next/worker.js` のサイズ(目安 < 2.5MB gzip)を確認。CI 化は Phase 3 で。
8. **`.dev.vars` のパス**: `apps/web/.dev.vars` に移動後、wrangler dev 実行 cwd と整合させる。

---

## 検証手順(end-to-end)

1. **モノレポ移行 & 依存導入**
   ```bash
   pnpm install
   pnpm --filter @ml/web cf-typegen
   ```
2. **R2 bucket と KV namespace 作成**
   ```bash
   cd apps/web
   pnpm exec wrangler r2 bucket create ml-learning-content
   pnpm exec wrangler r2 bucket create ml-learning-content-dev
   pnpm exec wrangler kv namespace create CONTENT_KV
   ```
   出力 ID を `wrangler.jsonc` に貼り、再度 `cf-typegen`。
3. **サンプル MDX をビルド**
   ```bash
   pnpm content:build
   ```
   → `dist/content/numpy/1.1-ndarray.html` に `<span class="katex">` と `<pre class="shiki">` が含まれることを目視確認。
4. **ローカル R2 シミュレータへアップロード**
   ```bash
   pnpm content:upload:local
   ```
5. **dev サーバ起動**
   ```bash
   pnpm dev
   ```
6. **ブラウザ確認**: `http://localhost:3000/learn/numpy/1.1-ndarray` を開き、KaTeX 数式と Shiki ハイライトが描画されること、DevTools Network で SSR レスポンスに R2 由来 HTML が乗っていることを確認。
7. **本番 R2 反映テスト(任意)**: `pnpm content:upload` → `pnpm --filter @ml/web preview` で同ページ確認。
8. **bundle size 計測**: `pnpm --filter @ml/web exec wrangler deploy --dry-run --outdir=dist-worker` で `.open-next/worker.js` のサイズが想定内であることを確認。

---

## Critical Files

- `apps/web/wrangler.jsonc` — R2/KV bindings の正本
- `apps/web/src/lib/r2.ts` — binding アクセスの単一窓口
- `apps/web/src/lib/content.ts` — R2 fetch + ISR キャッシュ層
- `apps/web/src/app/learn/[category]/[slug]/page.tsx` — 動的レッスンページ、ISR 戦略の中核
- `apps/web/open-next.config.ts` — incrementalCache を R2 に切り替える起点
- `scripts/build-content.ts` — MDX → HTML 変換、bundle size を決定づける
- `scripts/upload-to-r2.ts` — wrangler 経由 R2 アップロード
- `content/numpy/1.1-ndarray.mdx` — パイプライン検証用サンプル
- `/package.json` (ルート)・`/pnpm-workspace.yaml` — workspaces とコンテンツパイプライン entry

---

## Phase 3 以降への着手フック

Phase 1+2 完了時点で未着手で残る項目:

| 項目 | 着手の一行 |
|---|---|
| 共通コンポーネント本実装 | まず `LessonHeader`(frontmatter から所要時間 + Colab ボタン 2 種)から |
| React island ハイドレーション | `apps/web/src/components/IslandRoot.tsx` で `useEffect` + `createRoot` の汎用ローダ |
| 章一覧ページ | `content/_index.json` を build-content が同時生成、`/learn` で fetch |
| 章間グラフ(仕様書 8 章) | Mermaid を CI で SVG 化、トップに静的埋め込み |
| Pagefind 全文検索 | `scripts/build-search-index.ts` を `content:deploy` に連結 |
| 進捗トラッキング | KV ベースの匿名(UUID Cookie)案で MVP |
| 章間前提関係 UI | `prerequisites: [4.5, 5.2]` を LessonHeader でチェック |
| SEO / OGP | `apps/web/src/app/learn/[category]/[slug]/opengraph-image.tsx` |
| `revalidateTag` 配線完了 | `apps/web/src/app/api/revalidate/route.ts` + `upload-to-r2.ts` から POST |
| Notebook ホスティング | `/notebooks/01_numpy/01_ndarray/lesson.ipynb` を 1 本作って ColabCTA 連携確認 |
| Cloudflare Images 活用 | `apps/web/src/lib/image.ts` で `env.IMAGES.input(...)` ラッパ |
| CI/CD | `.github/workflows/content-deploy.yml` 本実装(雛形は Phase 2 でコミット可) |

Phase 3 着手の指針: 「まず `LessonHeader` を本実装し、サンプル MDX に確実に Colab ボタン 2 個が出る状態を作る → 次に `/learn` 章一覧 → 残りコンポーネント群」。
