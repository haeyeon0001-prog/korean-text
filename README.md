# 教科書コーチ v4.2（第5課）

単一URLで **シャドーウィング / 語彙 / 文型 / 発音 / 学習履歴** を提供。  
GitHub Pages にそのまま置いて動きます（Service Worker 不使用）。

## 使い方

```
/
├─ index.html
├─ style.css
├─ app.js
├─ data/
│   ├─ vocab_cues.json        ←（任意）語彙まとめ音声の区間
│   └─ audio_map.json         ←（任意）単語→個別mp3の対応表
└─ audio/
    ├─ lesson5_text.mp3       ← 第5課 本文mp3
    └─ lesson_vocab_master.mp3← 語彙まとめmp3
```

- まとめ音声しかない場合は、アプリ内の **「語彙オート分割」** タブで解析 → 区間を微調整 →  
  **「vocab_cues.json をダウンロード」** → `data/` に置いてコミットしてください。
- 単語ごとの mp3 がある場合は、`data/audio_map.json` を用意すれば、こちらが優先再生されます。

## GitHub Pages 公開手順

1. このフォルダを新規リポジトリにプッシュ。
2. Settings → Pages → Branch: `main`（または `master`） / フォルダ: `/root` を選択。
3. 表示された URL にアクセス。`index.html` がトップとして表示されます。

## 開発のヒント

- ブラウザキャッシュを避けたいときは、ハードリロード（Ctrl/Cmd+Shift+R）。
- 解析しきい値（感度）と「最小間隔(ms)」を動かして、区切りの精度を調整できます。
