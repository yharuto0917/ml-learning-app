# 機械学習学習サイト 構築計画書

> OpenNext.js × Cloudflare Workers × React × MDX × Google Colab 構成

---

## 目次

1. [アーキテクチャ全体像](#1-アーキテクチャ全体像)
2. [Cloudflare Workersの制約と対策](#2-cloudflare-workersの制約と対策)
3. [コンテンツ戦略](#3-コンテンツ戦略)
4. [プロジェクト構成](#4-プロジェクト構成)
5. [Python実行(Google Colab連携)](#5-python実行google-colab連携)
6. [Notebookの分割設計(解説/練習)](#6-notebookの分割設計解説練習)
7. [詳細カリキュラム](#7-詳細カリキュラム)
8. [章間の前提関係](#8-章間の前提関係)
9. [各レッスンのMDX標準テンプレート](#9-各レッスンのmdx標準テンプレート)
10. [開発フェーズ](#10-開発フェーズ)
11. [ボリュームと優先順位](#11-ボリュームと優先順位)
12. [気をつけるポイント](#12-気をつけるポイント)

---

## 1. アーキテクチャ全体像

```
┌──────────────────────────────────────────────────┐
│  ユーザー(ブラウザ)                              │
└────────────────┬─────────────────────────────────┘
                 │
        ┌────────▼─────────┐
        │ OpenNext.js      │  ← メインアプリ
        │ on CF Workers    │     (ルーティング/SSR/ISR)
        └─┬──────────────┬─┘
          │              │
   ┌──────▼──┐     ┌─────▼────┐
   │  R2     │     │ KV       │ ← メタデータ/キャッシュ
   │ (MDX,   │     │ (ISR tag,│
   │ 画像,   │     │  目次)   │
   │ コンパイル│     └──────────┘
   │ 済みHTML)│
   └─────────┘
          │
          │  「Open in Colab」リンク
          ▼
   ┌──────────────────┐
   │ GitHub Repo      │ ← .ipynb をホスト
   │ (ipynb)          │     Colabが直接読込
   └──────────────────┘
```

**設計方針**: 重いものは Worker の外に出す。MDX本文・画像はR2、Python実行はColab。Workerは「ルーティング + 軽量レンダリング + キャッシュ制御」に徹する。

---

## 2. Cloudflare Workersの制約と対策

| 制約 | 値 | 対策 |
|---|---|---|
| Worker bundle size | 圧縮3MB(無料)/10MB(Paid) | MDX/コンテンツはWorkerにバンドルせずR2へ |
| CPU time | 10ms(無料)/30s(Paid) | MDXの実行時コンパイルは避け、事前コンパイル |
| Memory | 128MB | 大きなライブラリ(Shikiのフル言語等)を避ける |
| Sub-request | 50(無料)/1000(Paid) | R2フェッチをキャッシュで削減 |
| FS API | なし | `nodejs_compat` フラグ + R2/KV で代替 |

特に注意すべきは以下:

**Shiki(シンタックスハイライト)が地雷**。全言語をbundleすると数MB吹き飛ぶ。`shiki` を使うなら、必要言語(`python`, `bash`, `json`)だけ動的import、または**ビルド時にハイライト済みHTMLを生成**してMDXに埋め込む方式が無難。後者を推奨。

**`next-mdx-remote`** は実行時コンパイルなのでCPU時間を食う。Paid前提でも頻繁にコールドスタートするページでは要注意。

---

## 3. コンテンツ戦略

3つの選択肢を比較し、**方式C(ビルド時にMDX→HTML/RSC事前変換 + R2配置 + ISR)** を採用する。

| 方式 | バンドルサイズ | 速度 | 更新性 |
|---|---|---|---|
| A. MDXを全部Workerに同梱 | ❌ すぐ10MB超 | ◎ | △ 再デプロイ要 |
| B. R2に生MDX、Workerで実行時コンパイル | ◎ | △ CPU消費 | ◎ |
| **C. ビルド時にMDXコンパイル → R2配置 → Workerは静的配信+ISR** | ◎ | ◎ | ○ |

### 方式Cの具体的なフロー

1. `content/` ディレクトリにMDXを書く(リポジトリ管理)
2. CI(GitHub Actions)で:
   - MDXを事前にコンパイル(`@mdx-js/mdx` の compile)
   - シンタックスハイライトも事前適用(`shiki` をCIで実行、結果をHTMLに焼き込み)
   - 出力(`.html` + メタJSON)をR2にアップロード
3. OpenNext.jsアプリは:
   - `/learn/[category]/[slug]` のルートでR2から該当HTMLをfetch
   - `cache: 'force-cache'` + `revalidate` でISR
   - インタラクティブ要素(Colabボタン, クイズ等)はReactアイランドとしてアプリ側に同梱

これでWorkerには「アプリのフレームワーク部分 + 共通React Components」だけが入り、コンテンツ量に依存せずサイズが一定になる。

---

## 4. プロジェクト構成

```
ml-learning-site/
├── apps/
│   └── web/                       # OpenNext.js
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx           # トップ
│       │   ├── learn/
│       │   │   └── [category]/
│       │   │       └── [slug]/
│       │   │           └── page.tsx   # R2からHTML取得
│       │   └── api/
│       │       └── content/
│       │           └── [...path]/route.ts  # R2プロキシ(必要時)
│       ├── components/
│       │   ├── ColabButton.tsx
│       │   ├── MathBlock.tsx     # KaTeX
│       │   ├── Quiz.tsx
│       │   └── CodeBlock.tsx
│       ├── lib/
│       │   ├── r2.ts             # R2クライアント
│       │   └── content.ts        # コンテンツfetch + キャッシュ
│       ├── wrangler.toml
│       └── open-next.config.ts
├── content/                       # ソースMDX(リポジトリ管理)
│   ├── numpy/
│   ├── pandas/
│   ├── scikit-learn/
│   ├── deep-learning-basics/
│   ├── cnn/
│   ├── rnn/
│   ├── vae/
│   ├── gan/
│   ├── reinforcement-learning/
│   └── transfer-learning/
├── notebooks/                     # .ipynb (GitHubでホスト)
│   └── (各章対応・lesson/practice/solution)
├── scripts/
│   ├── build-content.ts          # MDX→HTML変換
│   └── upload-to-r2.ts           # R2へのアップロード
└── .github/workflows/
    └── content-deploy.yml         # コンテンツ更新時の自動デプロイ
```

---

## 5. Python実行(Google Colab連携)

Colabは「GitHub上の.ipynbを直接開ける」機能を使うのが最も楽:

```
https://colab.research.google.com/github/{user}/{repo}/blob/main/notebooks/cnn/01_intro.ipynb
```

### ColabButtonコンポーネントの例

```tsx
<ColabButton
  notebook="cnn/01_intro.ipynb"
  github="haruto/ml-learning-notebooks"
/>
```

各章のMDXに対応する.ipynbを用意し、MDX frontmatterでnotebookパスを指定 → ボタン自動生成、という運用が綺麗。

### 注意事項

ColabのGPU/TPUは無料枠だとセッション切れがあるので、長時間学習が必要なRL・GANは「短いデモコード + 事前学習済みモデルダウンロード」の構成にしておくと学習者の体験が良くなる。

---

## 6. Notebookの分割設計(解説/練習)

各章につき2本(必要に応じて3本目の解答編)を用意する。

```
notebooks/
└── 03_scikit-learn/
    └── 02_classification/
        ├── lesson.ipynb        # 解説フェーズ
        ├── practice.ipynb      # 練習フェーズ
        └── solution.ipynb      # 解答(練習のフォーク、Colabリンクは隠す)
```

### 解説フェーズ(`lesson.ipynb`)の構成

すべてのセルが「実行すれば動く」状態。学習者は順に Shift+Enter で読み進めるだけで完結する。

| セルタイプ | 役割 |
|---|---|
| Markdown(導入) | 章の目的・学習目標・前提 |
| Markdown(理論) | 数式と直感、図(画像はR2配信、相対URL不可なので絶対URL) |
| Code(セットアップ) | `!pip install`、import、シード固定、データロード |
| Code(段階的実装) | 1セル1概念で小刻みに |
| Markdown(中間解説) | 出力を見ながら「なぜこうなるか」を補足 |
| Code(まとめ実装) | パイプライン化・関数化した完成版 |
| Markdown(まとめ) | 要点・次章への接続・参考文献 |

### 練習フェーズ(`practice.ipynb`)の構成

`lesson.ipynb` と同じデータ・環境前提で、学習者が手を動かす。難易度を3層に分ける。

| 難易度 | 形式 | 例 |
|---|---|---|
| ★ 基礎 | 穴埋め(`___` や `# TODO`) | `scaler = ___()` の `___` を埋める |
| ★★ 応用 | バグ修正/出力比較 | 与えられたコードを修正し、`assert` を全て通す |
| ★★★ 発展 | 自由実装 | 別データセットで同じパイプラインを構築・考察 |

各問題セルの直後に「ヒント(折り畳み風にMarkdownで)」と「自己採点用assertセル」を置く。assertが通ったら正解、という方式にすれば解答を見なくても判定できる。

```python
# 例: practice.ipynb の1問
# ★ 問題1: StandardScalerでX_trainを標準化してください
scaler = ___  # TODO
X_train_scaled = ___  # TODO

# --- 自己採点 ---
import numpy as np
assert X_train_scaled.shape == X_train.shape
assert np.allclose(X_train_scaled.mean(axis=0), 0, atol=1e-7)
assert np.allclose(X_train_scaled.std(axis=0), 1, atol=1e-1)
print("✓ 正解")
```

### MDX側のリンク表示

frontmatterで両方指定:

```yaml
---
title: "分類問題の基礎"
notebooks:
  lesson: "03_scikit-learn/02_classification/lesson.ipynb"
  practice: "03_scikit-learn/02_classification/practice.ipynb"
---
```

MDXページ上部とページ末尾に「📘 解説をColabで開く」「✏️ 練習をColabで開く」ボタンを並べて表示。

---

## 7. 詳細カリキュラム

全11章、合計約45レッスン。各レッスンに `lesson.ipynb` と `practice.ipynb` がペアで存在する想定。

### 第1章 numpy(4レッスン)

**目的**: 機械学習の計算基盤である多次元配列操作を、ループに頼らずベクトル化で書けるようにする。

| # | レッスン名 | 解説で扱う内容 | 練習問題例 |
|---|---|---|---|
| 1.1 | ndarray入門 | `np.array`, dtype, shape, ndim, reshape, axis概念 | 1次元配列を画像形状(28,28)に整形、dtype変換 |
| 1.2 | インデックス&スライス | 基本/fancy/boolean indexing、view vs copy | 行列の市松模様抽出、条件付き値置換 |
| 1.3 | ブロードキャスト&演算 | 形状ルール、ユニバーサル関数、軸指定の集約 | for文で書いたコードをベクトル化、画像の平均減算 |
| 1.4 | 線形代数&乱数 | `@`, `linalg.inv/solve/eig`, SVD、`np.random` Generator | 最小二乗解を `linalg.lstsq` と手計算で一致させる |

### 第2章 pandas(4レッスン)

**目的**: 実データ(欠損・型混在・時系列)を扱える前処理力を獲得する。

| # | レッスン名 | 解説で扱う内容 | 練習問題例 |
|---|---|---|---|
| 2.1 | Series/DataFrame基礎 | 生成、`loc`/`iloc`、dtype、`describe`/`info` | Titanicデータの基本統計を出す |
| 2.2 | 入出力&選択 | CSV/Parquet/JSON、複数条件フィルタ、`query`、`isin` | 売上CSVから特定期間×特定店舗を抽出 |
| 2.3 | 集約&結合 | `groupby`+agg、`merge`(4種join)、`pivot_table`、`concat` | 売上テーブルと顧客マスタを結合してRFM集計 |
| 2.4 | 時系列&欠損 | DatetimeIndex、`resample`、`rolling`、`fillna`/`interpolate` | 株価データで7日移動平均と欠損補完 |

### 第3章 scikit-learn(6レッスン)

**目的**: 古典的MLの全工程(前処理→学習→評価→チューニング)をPipelineで組めるようになる。

| # | レッスン名 | 解説で扱う内容 | 練習問題例 |
|---|---|---|---|
| 3.1 | MLワークフロー概観 | train/test分割、学習器のfit/predict API、評価指標の選び方 | irisで分類器のfit→predict→accuracy |
| 3.2 | 前処理&Pipeline | スケーリング、エンコーディング、`Pipeline`、`ColumnTransformer` | 数値+カテゴリ混在データのパイプライン構築 |
| 3.3 | 回帰 | 線形回帰、Ridge、Lasso、ElasticNet、評価(RMSE/R²) | カリフォルニア住宅価格でRidgeのαを探索 |
| 3.4 | 分類 | ロジスティック、SVM、決定木、RandomForest、GBDT | 不均衡データでF1最大化、混同行列の解釈 |
| 3.5 | 教師なし | KMeans、DBSCAN、PCA、t-SNE、シルエットスコア | 顧客セグメンテーションと2次元可視化 |
| 3.6 | 評価&チューニング | k-fold CV、`GridSearchCV`/`RandomizedSearchCV`、リーク回避 | 不正なCVを修正してリークを除去する |

### 第4章 ディープラーニングの基礎(5レッスン)

**目的**: PyTorchを使い、順伝播から訓練ループまでを自分で書けるようになる(フレームワークはPyTorch推奨、TFは選択肢に)。

| # | レッスン名 | 解説で扱う内容 | 練習問題例 |
|---|---|---|---|
| 4.1 | 単純パーセプトロン&MLP | 線形変換、活性化関数(ReLU/Sigmoid/Tanh)、表現力 | XOR問題を1層→2層で解き分ける |
| 4.2 | 損失関数&勾配 | MSE/CE、autograd、`backward()`、勾配の手計算検証 | numpyで2層NNの逆伝播を手実装し、PyTorch結果と一致確認 |
| 4.3 | 訓練ループ | `Dataset`/`DataLoader`、`optimizer.step()`、デバイス転送 | MNISTで90%以上の精度を出す訓練ループを書く |
| 4.4 | 最適化手法 | SGD、Momentum、RMSProp、Adam、学習率の影響 | 同じモデルでoptimizerを変え学習曲線を比較 |
| 4.5 | nn.Moduleの設計 | `nn.Sequential`/サブクラス化、パラメータ管理、保存/復元 | Fashion-MNISTでカスタムnn.Module設計 |

### 第5章 基本的な学習手法(4レッスン)

**目的**: 「動くモデル」から「ちゃんと汎化するモデル」へ。実務で必須のテクニックを揃える。

| # | レッスン名 | 解説で扱う内容 | 練習問題例 |
|---|---|---|---|
| 5.1 | 過学習と正則化 | 学習/検証曲線の読み方、L1/L2、Dropout、Weight Decay | 過学習しているモデルを正則化で改善 |
| 5.2 | 正規化&初期化 | BatchNorm/LayerNorm、Xavier/He初期化、勾配消失/爆発 | 深いMLPで初期化を変え収束を比較 |
| 5.3 | スケジューリング&早期終了 | StepLR/Cosine/Warmup、Early Stopping、勾配クリッピング | スケジューラを実装し性能を底上げ |
| 5.4 | データ拡張&不均衡対策 | 画像/テキスト拡張、`WeightedRandomSampler`、Focal Loss、SMOTE(sklearn) | 不均衡画像分類でminorクラスのrecallを上げる |

### 第6章 CNN(4レッスン)

**目的**: 画像分類タスクを通じて、畳み込みの直感と代表的アーキテクチャを理解する。

| # | レッスン名 | 解説で扱う内容 | 練習問題例 |
|---|---|---|---|
| 6.1 | 畳み込みとプーリング | カーネル、ストライド、パディング、受容野、パラメータ共有 | 手書きで畳み込みを計算→`nn.Conv2d`と一致確認 |
| 6.2 | 基本アーキテクチャ | LeNet→AlexNet→VGGの設計思想、特徴マップの可視化 | CIFAR-10で自作CNNを設計し精度向上を競う |
| 6.3 | ResNet&近代化 | スキップ接続、Bottleneck、BatchNormの位置、GAP | ResNet18を最小実装し既存実装と挙動一致 |
| 6.4 | 軽量化&実用 | MobileNet系の分離畳み込み、Mixup/CutMix、Grad-CAM | Grad-CAMで誤分類画像を可視化し原因を考察 |

### 第7章 RNN(4レッスン)

**目的**: 系列データの基本構造から、現代的な配列処理の入り口(Attention)までを繋ぐ。

| # | レッスン名 | 解説で扱う内容 | 練習問題例 |
|---|---|---|---|
| 7.1 | RNN基礎 | 時間方向の重み共有、BPTT、勾配消失 | sin波の次ステップ予測を自作RNNで実装 |
| 7.2 | LSTM/GRU | ゲート機構の役割、`nn.LSTM`の入出力形状、双方向 | IMDB感情分類でLSTM vs GRU比較 |
| 7.3 | 系列ラベリング&生成 | 多対多/多対一/一対多、teacher forcing、文字レベル生成 | 名前データから新しい名前を文字単位生成 |
| 7.4 | Attention入門 | seq2seq+Attention、Self-Attentionの直感(Transformerは別枠での予告) | Attention重みを可視化して翻訳の対応を確認 |

### 第8章 VAE(3レッスン)

**目的**: 確率的生成モデルの基礎概念であるELBOと再パラメータ化を理解し、自分で実装できる。

| # | レッスン名 | 解説で扱う内容 | 練習問題例 |
|---|---|---|---|
| 8.1 | 潜在変数モデル&変分推論 | 生成モデルとは、KLダイバージェンス、ELBO導出 | ELBOの各項を分解し、コードと数式の対応を埋める |
| 8.2 | VAE実装 | エンコーダ/デコーダ、再パラメータ化、再構成損失+KL項 | MNISTでVAEを訓練し潜在空間を2次元可視化 |
| 8.3 | 条件付け&改良 | CVAE、β-VAE、disentanglementの考え方 | CVAEで指定した数字を生成 |

### 第9章 GAN(3レッスン)

**目的**: 敵対的学習の不安定性を理解した上で、安定化テクニックを使い分けられる。

| # | レッスン名 | 解説で扱う内容 | 練習問題例 |
|---|---|---|---|
| 9.1 | GAN基礎 | 生成器/識別器、min-maxゲーム、訓練ダイナミクス | シンプルなGANで2次元ガウス分布を学習 |
| 9.2 | DCGAN | 畳み込みベース、転置畳み込み、設計のベストプラクティス | Fashion-MNIST/CIFARで画像生成 |
| 9.3 | 安定化&応用 | モード崩壊、WGAN-GP、条件付きGAN、評価(FID概念) | DCGAN→WGAN-GPに改造し収束を比較 |

### 第10章 強化学習(5レッスン)

**目的**: MDPの定式化から DQN・Policy Gradient までを、Gymnasium環境で実装しながら理解する。

| # | レッスン名 | 解説で扱う内容 | 練習問題例 |
|---|---|---|---|
| 10.1 | MDP&Bellman方程式 | 状態/行動/報酬/方策、価値関数、割引率、Bellman | FrozenLakeで価値反復を手実装 |
| 10.2 | Q学習&SARSA | TD学習、ε-greedy、表形式RL、on/off-policy | Taxi-v3でQテーブルを学習させクリア |
| 10.3 | DQN | 関数近似、経験再生、ターゲットネットワーク | CartPoleをDQNで200ステップ以上維持 |
| 10.4 | 方策勾配&REINFORCE | 方策の直接最適化、ベースライン、分散削減 | LunarLander等でREINFORCE実装 |
| 10.5 | Actor-Critic | A2Cの構造、Advantageの推定、実装の落とし穴 | A2CとREINFORCEの学習曲線を比較 |

> Colab無料枠ではDQNでも時間がかかるので、各レッスンに「事前学習済み重みをR2から読み込んで挙動確認するだけ」のショートカット経路も用意しておく。

### 第11章 転移学習(3レッスン)

**目的**: ゼロから訓練しない選択肢を持ち、少データでも実用精度を出せる。

| # | レッスン名 | 解説で扱う内容 | 練習問題例 |
|---|---|---|---|
| 11.1 | 転移学習の考え方 | 特徴抽出 vs Fine-tuning、層の凍結、学習率の使い分け | torchvisionのResNetを特徴抽出器として使用 |
| 11.2 | 画像Fine-tuning | 段階的解凍、Discriminative LR、Augmentation強化 | 少数データ(数百枚)で90%以上を狙う |
| 11.3 | NLPでの転移学習 | 事前学習済み言語モデルの利用、HuggingFace `transformers` 入門 | BERT系で日本語感情分類をfine-tune |

---

## 8. 章間の前提関係

```
[1.numpy] ──┬─→ [2.pandas] ──→ [3.scikit-learn] ──┐
            │                                       ├─→ [5.学習手法] ──┬─→ [6.CNN] ──→ [11.転移学習]
            └─→ [4.DL基礎] ─────────────────────────┘                  ├─→ [7.RNN]
                                                                       ├─→ [8.VAE]
                                                                       ├─→ [9.GAN]
                                                                       └─→ [10.強化学習]
```

このグラフをサイトのトップに可視化(Mermaid or SVG)するとUXが良い。各ノードクリックで章へ遷移、進捗バッジ付き、というUIにしたい。

---

## 9. 各レッスンのMDX標準テンプレート

統一感のため、すべてのレッスンページを同じ骨格で書く。

````mdx
---
title: "畳み込みとプーリング"
chapter: 6
lesson: 1
prerequisites: [4.5, 5.2]
notebooks:
  lesson: "06_cnn/01_conv_pool/lesson.ipynb"
  practice: "06_cnn/01_conv_pool/practice.ipynb"
estimatedMinutes: 60
tags: [cnn, image]
---

<LessonHeader />              {/* 章/タイトル/所要時間/Colabボタン2つ */}

## 学習目標
- ...
- ...

## 1. 直感
<Callout type="intuition">...</Callout>

## 2. 数式
<MathBlock>...</MathBlock>

## 3. 実装の要点
<CodeBlock language="python">...</CodeBlock>

<ColabCTA notebook="lesson" label="このセクションをColabで動かす" />

## 4. つまずきポイント
<Callout type="warning">...</Callout>

## まとめ&次へ
- ✅ ...
- ✅ ...
<LessonFooter next="6.2" />   {/* 練習Colab + 次レッスンリンク */}
````

### コンポーネントの役割分担

| 種類 | 実装場所 | 例 |
|---|---|---|
| インタラクティブReact | Workerにバンドル | `LessonHeader`, `ColabCTA`, `LessonFooter`, `Quiz` |
| 表示のみ(事前HTML化) | ビルド時 → R2 | `MathBlock`(KaTeX), `CodeBlock`(Shiki) |

---

## 10. 開発フェーズ

### Phase 1: 基盤構築(1〜2週間)
- OpenNext.js + Cloudflare Workers セットアップ(`@opennextjs/cloudflare`)
- R2バケット・KVネームスペース作成
- `wrangler.toml` 設定、デプロイ確認
- ベースレイアウト・ナビゲーション

### Phase 2: コンテンツパイプライン(1週間)
- MDXビルドスクリプト(`@mdx-js/mdx` + Shiki + KaTeX)
- R2アップロードスクリプト
- ページからR2をfetchして表示するロジック + ISR設定
- 「Hello MDX」が表示されるところまで

### Phase 3: 共通コンポーネント(1週間)
- ColabButton, CodeBlock, MathBlock, Quiz, Callout
- 章一覧・進捗ナビ・パンくず
- ダーク/ライト切替

### Phase 4: コンテンツ作成(各章2〜4日 × 10章)
- numpy → pandas → scikit-learn → DL基礎 → CNN → RNN → VAE → GAN → RL → Transfer
- 各章に対応する.ipynb(lesson + practice)も同時に作成

### Phase 5: 仕上げ
- 全文検索(Pagefindをビルド時実行、R2配置)
- OGP・SEO
- 学習進捗トラッキング(任意・KVまたはD1 + 認証)
- パフォーマンス計測・最適化

---

## 11. ボリュームと優先順位

合計約**45レッスン × 2(解説+練習) = 約90ノートブック + 45 MDXページ**。
1人で書くとMVPでも数ヶ月かかる規模なので、書く順序を決めておくと中だるみしない。

| Wave | 章 | 内容 | 公開時の価値 |
|---|---|---|---|
| Wave 1(基礎パック・最優先) | 第1〜4章 | numpy / pandas / scikit-learn / DL基礎 | これだけで「ML入門サイト」として価値が出る |
| Wave 2(中核パック) | 第5・6・11章 | 学習手法 / CNN / 転移学習 | 画像系で完結した学習体験 |
| Wave 3(系列パック) | 第7章 | RNN / Attention | 系列処理の章が完成 |
| Wave 4(生成パック) | 第8・9章 | VAE / GAN | 生成モデル章が完成 |
| Wave 5(RL) | 第10章 | 強化学習 | 重いので最後 |

各Waveが完成した時点で公開できる構成にしておけば、書き終わるまで非公開、という事態を避けられる。

---

## 12. 気をつけるポイント

1. **`wrangler.toml`** で `compatibility_flags = ["nodejs_compat"]` を必ず有効に。OpenNext.jsの一部依存が要求する。
2. **OpenNext.js Cloudflareアダプタ** は活発に変更されるので、開発開始時に `@opennextjs/cloudflare` の公式ドキュメントを確認すること。ISR対応は数ヶ月単位で改善されている。
3. **画像最適化**: Next.js Image はCloudflare上で動くが、`@opennextjs/cloudflare` がImage Optimizationを完全サポートしているか確認。代替としてCloudflare Imagesかビルド時に複数解像度を事前生成。
4. **数式描画**: KaTeXはMathJaxより圧倒的に軽い。ビルド時に `rehype-katex` でHTML化しておけばランタイムでJS不要、CSSのみでOK。
5. **コードハイライト**: ビルド時実行が必須。Shiki の `getHighlighter` はサーバー側でだけ呼ぶ。
6. **R2のCORS設定**: 直接ブラウザから読まない構成にすればCORS不要だが、もし直接読むAPI設計にするなら設定忘れずに。
7. **Worker bundle確認**: `wrangler deploy --dry-run --outdir=dist` でサイズ確認。CIに組み込んで閾値超えたらfailさせると安心。
8. **Notebook互換性**: ColabのPythonバージョン・プリインストールされているパッケージのバージョンに合わせる。`!pip install` で固定バージョン指定推奨。
9. **画像の絶対URL**: Colab上では相対URLが効かないので、Notebook内の画像参照は必ずR2の絶対URLを使う。
10. **assertベース自己採点**: 解答を見なくても判定可能な設計にしておくと、学習者のモチベ維持に効く。

---

*本書は機械学習学習サイト構築の方針書であり、実装開始後に発見した制約や改善点を都度反映していくこと。*
