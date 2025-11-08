# GeoTrack Mockup

このリポジトリは、ブラウザで動作する位置情報取得のモックアップ（3ページ構成）です。OpenStreetMap + Leaflet を用いて、位置情報の許可拒否時の挙動を確認できます。

ページ構成
- `index.html` - 初期設定: 位置情報の許可確認と登録（localStorage）
- `page2.html` - 他ユーザー表示: ダミー5ユーザーを表示。登録地点をデフォルト中心に表示し、現在位置取得ボタンあり
- `page3.html` - 登録地点を変更: 登録地点を地図上に表示し、ボタンで現在地に更新

保存方法
- ブラウザの localStorage を使用（キー: `geotrack_location_v1`）。DBは使用していません。

注意点 (HTTPS)
- ブラウザの Geolocation API は、通常 HTTPS（または localhost）でのみ動作します。
- GitHub Pages は HTTPS を提供するため、リポジトリを GitHub Pages に公開すれば問題なく位置情報を取得できます。

使い方（ローカル確認）
1. ファイルをローカルで開く（ただし file:// では geolocation が使えないブラウザがあるため、簡易サーバ推奨）

   macOS（zsh）で簡易サーバを立てる例:

```bash
# リポジトリルートで
python3 -m http.server 8000
# ブラウザで http://localhost:8000 を開きます
```

2. 表示後、`index.html` で「現在地を取得して登録する」を押すと許可ダイアログが表示されます。

公開（GitHub Pages）
1. リモートに push します。
2. GitHub リポジトリの Settings → Pages で公開ブランチを選択します（通常 `main` の `/ (root)`）。
3. 公開された `.github.io` ドメインは HTTPS 対応されるため、Geolocation API が動作します。

ライセンス: MIT
