# localStorage → Firebase移行ガイド 📦➡️☁️

## 概要

**ローカルストレージ（静的運用モード）で環境を整えてから、Firebase運用モードに切り替える方法**を説明します。

この方法は**推奨されています**。理由：
- ✅ オフラインで自由にテスト・設定できる
- ✅ 164名のCSV一括登録も速い（ローカルなので）
- ✅ 環境が整ってから一括でFirebaseに移行
- ✅ データ移行は自動（ワンクリック）

---

## 🎯 推奨ワークフロー

### ステップ1: ローカルストレージモードで環境構築（オフライン）

1. **教員用システムを開く**（teacher.html）
   - この時点ではlocalStorageモードで動作

2. **教員情報を登録**
   - 教員管理タブで全教員を登録
   - CSVエクスポート可能

3. **児童情報を登録**
   - 児童管理タブで「CSV一括登録」
   - 164名を一括登録（ローカルなので速い！）
   - または手動で1名ずつ登録

4. **テストデータを入力**（オプション）
   - 健康チェックの動作確認
   - 相談機能のテスト
   - ダッシュボードの表示確認

5. **環境構築完了！**
   - すべての児童・教員データがlocalStorageに保存済み
   - 動作確認も完了

---

### ステップ2: Firebase設定とデータ移行（約10分）

6. **ヘッダーの「DB設定」ボタンをクリック**
   - firebase-setup.htmlが開く

7. **5ステップのセットアップを実施**
   
   **Step 1: Googleアカウント**
   - 既存のGoogleアカウントでOK
   
   **Step 2: Firebaseプロジェクト作成**
   - Firebase Console（https://console.firebase.google.com/）
   - 「プロジェクトを追加」
   - プロジェクト名: 例「karakoko-school」
   - Google Analyticsは不要（オフ）
   
   **Step 3: Firestore Database有効化**
   - Firebase Console > ビルド > Firestore Database
   - 「データベースを作成」
   - **テストモードを選択**（30日間制限なし）
   - ロケーション: asia-northeast1（東京）
   
   **Step 4: Firebase接続情報を取得**
   - プロジェクト設定 > アプリを追加 > Webアプリ
   - アプリ名: 「karakoko-web」
   - firebaseConfigをコピー
   - セットアップ画面に貼り付け
   - 「接続テスト」ボタンをクリック
   
   **Step 5: データ移行**
   - 「localStorageからデータを移行」ボタンをクリック
   - 自動的に以下のデータが移行されます：
     - ✅ students（児童データ）
     - ✅ teachers（教員データ）
     - ✅ health_records（健康記録）
     - ✅ consultations（相談記録）
   - 移行完了！

8. **Firebaseモードで起動**
   - ページがリロードされ、Firebaseモードに切り替わる
   - ヘッダーに「🔥 Firebase運用モード」と表示される

---

### ステップ3: 全端末へのFirebase設定配布

#### 方法A: 自動設定（推奨）⭐

**teacher.htmlとstudent.htmlに設定を埋め込む**

1. **teacher.htmlを編集**（行937-944）

```javascript
const DEFAULT_FIREBASE_CONFIG = {
    apiKey: "YOUR_API_KEY",  // ← 実際の値に変更
    authDomain: "YOUR_PROJECT.firebaseapp.com",  // ← 実際の値に変更
    projectId: "YOUR_PROJECT_ID",  // ← 実際の値に変更
    storageBucket: "YOUR_PROJECT.appspot.com",  // ← 実際の値に変更
    messagingSenderId: "YOUR_SENDER_ID",  // ← 実際の値に変更
    appId: "YOUR_APP_ID"  // ← 実際の値に変更
};
```

2. **student.htmlも同様に編集**（行397-404）

3. **HTMLファイルを全端末に配布**
   - すべての端末で自動的にFirebaseモードで起動
   - 設定不要！

#### 方法B: 初回設定（手動）

各端末で初回のみ：
1. firebase-setup.htmlを開く
2. Step 4で接続情報を入力
3. 「設定を保存」

---

## 📊 データ移行の詳細

### 移行されるテーブル

| テーブル名 | 内容 | 例 |
|-----------|------|-----|
| **students** | 児童情報 | 164名分 |
| **teachers** | 教員情報 | 20名分 |
| **health_records** | 健康記録 | 500件 |
| **consultations** | 相談記録 | 50件 |

### 移行処理の仕様

```javascript
// 500件ずつバッチ処理で高速移行
await window.firebaseAdapter.migrateFromLocalStorage();
```

- **速度**: 164件なら5秒程度
- **エラー処理**: テーブル単位でエラーハンドリング
- **元データ保持**: localStorageのデータは削除されない（バックアップとして残る）

---

## 🔍 移行確認方法

### コンソールログで確認（F12キー）

```
[FirebaseAdapter] データ移行開始
[FirebaseAdapter] students: 164件を移行開始
[FirebaseAdapter] students: 164/164件 移行中...
[FirebaseAdapter] students: 164件 移行完了
[FirebaseAdapter] teachers: 20件を移行開始
[FirebaseAdapter] teachers: 20件 移行完了
[FirebaseAdapter] データ移行完了: {students: 164, teachers: 20, ...}
```

### Firebase Consoleで確認

1. Firebase Console > Firestore Database
2. データタブで各コレクションを確認
3. students、teachersなどが表示される

---

## ⚠️ 注意事項

### 1. テストモードのセキュリティ制限

テストモードは**30日間で期限切れ**になります。

**本番運用前に以下のルールに変更してください**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // すべてのコレクションで読み書きを許可（学内ネットワーク限定推奨）
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ **学内ネットワーク内でのみ使用することを推奨**します。

### 2. データの重複

- 移行は**追加**処理です（上書きではない）
- 同じIDのデータは上書きされます
- 移行前にFirestoreが空であることを確認

### 3. localStorageのバックアップ

移行後もlocalStorageのデータは保持されます：
- バックアップとして保管
- 必要に応じて手動で削除可能

---

## 🚀 移行後のメリット

### 複数端末での同時利用
- 150-200台のPCから同時アクセス可能
- 保健室、各教室、職員室で同時利用

### リアルタイムデータ同期
- 児童が入力した健康チェックが即座に教員画面に反映
- 教員が追加した児童情報が全端末で同期

### データの永続化
- ブラウザキャッシュクリアでもデータ消失なし
- クラウドバックアップで安心

### 高速化（バッチ書き込み）
- CSV一括登録が5〜10秒で完了（Firebaseモード）
- 通信回数を99%削減

---

## 🔄 ロールバック（Firebaseモード→localStorageモード）

何か問題が発生した場合、すぐに戻せます：

1. **ヘッダーの「モード切替」ボタンをクリック**
2. 「localStorageモードに戻す」を選択
3. ページがリロード
4. localStorageモードで起動（元のデータが残っている）

---

## 📞 サポート

問題が発生した場合：

1. **コンソールログを確認**（F12キー）
2. エラーメッセージをコピー
3. firebase-setup.htmlの診断機能を使用
4. Firebase Consoleで接続状態を確認

---

## ✅ チェックリスト

### 移行前
- [ ] localStorageモードで児童164名を登録済み
- [ ] localStorageモードで教員情報を登録済み
- [ ] 動作テスト完了

### Firebase設定
- [ ] Googleアカウント取得
- [ ] Firebaseプロジェクト作成
- [ ] Firestore Database有効化（テストモード）
- [ ] Firebase接続情報取得
- [ ] 接続テスト成功

### 移行実行
- [ ] データ移行実行（ワンクリック）
- [ ] 移行成功メッセージ確認
- [ ] Firebaseモードで起動確認
- [ ] ヘッダーに「🔥 Firebase運用モード」表示

### 全端末設定
- [ ] HTMLファイルにFirebase設定を埋め込み
- [ ] 全端末に配布
- [ ] 各端末で動作確認

---

## 🎉 まとめ

1. **ローカルで環境構築**（速くて簡単）
2. **Firebase設定**（10分）
3. **ワンクリックで移行**（5秒）
4. **全端末で共有**（自動設定）

この方法なら、**オフラインで自由にテスト・設定してから、準備ができたタイミングでFirebaseに移行**できます！

---

**推奨**: まずローカルモードで164名の児童登録を完了させてから、Firebaseに移行してください。
