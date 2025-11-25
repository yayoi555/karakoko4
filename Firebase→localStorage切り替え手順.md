# Firebase運用モード → 静的運用モード（localStorage）切り替え手順

## 🔄 3つの切り替え方法

---

## 方法1: ワンクリック切り替え（最も簡単）⭐

### 速度改善ガイドを使用

1. **ブラウザで以下のファイルを開く**:
   ```
   速度改善ガイド.html
   ```

2. **「ワンクリックで切り替え」ボタンをクリック**
   - 緑色のボタン「localStorageモードに切り替え（最速）」

3. **確認ダイアログで「OK」をクリック**

4. **ページが自動的にリロード**

5. **完了！** localStorageモードに切り替わりました

---

## 方法2: ブラウザのコンソールで切り替え

### 開発者ツールを使用

1. **F12キーを押す**（開発者ツールを開く）

2. **「Console」タブを選択**

3. **以下のコードを貼り付けて Enter**:
   ```javascript
   // Firebase→localStorageに切り替え
   localStorage.removeItem('use_firebase');
   localStorage.removeItem('firebase_config');
   alert('localStorageモードに切り替えました。ページをリロードします。');
   location.reload();
   ```

4. **ページがリロードされる**

5. **完了！**

---

## 方法3: 手動でlocalStorageを編集

### ブラウザの設定から削除

#### Google Chrome / Microsoft Edge

1. **F12キーを押す**

2. **「Application」タブを選択**

3. **左側メニューの「Local Storage」を展開**

4. **現在のサイトのURLを選択**

5. **以下の項目を削除**:
   - `use_firebase`
   - `firebase_config`

6. **右クリック > Delete**

7. **ページをリロード（F5キー）**

8. **完了！**

#### Firefox

1. **F12キーを押す**

2. **「Storage」タブを選択**

3. **左側メニューの「Local Storage」を展開**

4. **以下の項目を削除**:
   - `use_firebase`
   - `firebase_config`

5. **ページをリロード（F5キー）**

---

## 📊 切り替え確認方法

### ヘッダーの表示を確認

切り替え後、ヘッダーの表示が変わります：

**切り替え前（Firebaseモード）**:
```
🔥 Firebase運用モード
```

**切り替え後（localStorageモード）**:
```
💾 静的運用モード（ブラウザ内保存）
```
または
```
💾 ローカルストレージモード
```

### コンソールで確認

```javascript
console.log('現在のモード:', localStorage.getItem('use_firebase') === 'true' ? 'Firebase' : 'localStorage');
```

**期待される結果**:
```
現在のモード: localStorage
```

---

## ⚠️ 注意事項

### データの扱いについて

#### 1. Firebaseのデータは削除されない

- localStorageモードに切り替えても、**Firebaseのデータは残ります**
- 必要に応じてFirebase Consoleから手動で削除

#### 2. localStorageのデータ

**切り替え前にlocalStorageにデータがある場合**:
- ✅ 既存のlocalStorageデータがそのまま使用される
- ✅ Firebaseからのデータ移行は不要

**切り替え前にlocalStorageが空の場合**:
- ❌ データなしの状態からスタート
- ❌ Firebaseのデータは自動では移行されない

#### 3. Firebaseからデータを取り出す場合

**Firebase Console経由でエクスポート**:
1. Firebase Console > Firestore Database
2. 各コレクション（students, teachersなど）を開く
3. エクスポート機能でJSONダウンロード
4. localStorageに手動インポート（複雑）

**推奨**: Firebaseモードのまま一度CSVエクスポートしておく

---

## 🔄 再度Firebaseモードに戻す方法

localStorageモードに切り替えた後、また戻すことも可能です：

### 方法A: 速度改善ガイド.htmlを使用

1. 速度改善ガイド.htmlを開く
2. 「Firebaseモードに切り替え」ボタンをクリック
3. Firebase設定を入力

### 方法B: firebase-setup.htmlを使用

1. firebase-setup.htmlを開く
2. 5ステップのセットアップを再実行

### 方法C: コンソールで設定

```javascript
// Firebase設定を再設定
localStorage.setItem('use_firebase', 'true');
localStorage.setItem('firebase_config', JSON.stringify({
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
}));
location.reload();
```

---

## 💡 切り替え後のメリット・デメリット

### localStorageモードのメリット

| 項目 | 速度 | 特徴 |
|------|------|------|
| **児童登録** | ⚡ 0.1〜0.5秒 | 超高速 |
| **CSV一括登録** | ⚡ 1〜3秒（164件） | 即座に完了 |
| **健康チェック** | ⚡ 0.1秒 | ストレスフリー |
| **データ閲覧** | ⚡ 瞬時 | ローカル処理 |
| **ネットワーク** | ✅ 不要 | オフライン動作 |

### localStorageモードのデメリット

| 項目 | 制限 |
|------|------|
| **複数端末共有** | ❌ 不可（各ブラウザ独立） |
| **データ同期** | ❌ なし |
| **データ容量** | ⚠️ 5-10MB程度 |
| **ブラウザ依存** | ⚠️ Chrome/Edge/Firefoxで独立 |

---

## 🎯 推奨される使い方

### ケース1: 環境構築中（データ登録中）

→ **localStorageモードを推奨** ⭐
- 164名のCSV一括登録が1〜3秒
- 教員情報も瞬時に登録
- 動作テストも快適

### ケース2: 本番運用（複数端末で共有）

→ **Firebaseモードを推奨**
- 保健室、各教室、職員室から同時アクセス
- データがリアルタイム同期
- 登録は5〜10秒（許容範囲）

### ベストプラクティス

1. **Phase 1**: localStorageモードで環境構築（高速）
2. **Phase 2**: Firebase設定とデータ移行（10分）
3. **Phase 3**: Firebaseモードで本番運用（複数端末）

---

## 🚀 切り替え後にやること

### 1. データの確認

localStorageモードに切り替えた後：

```javascript
// データ件数を確認
const students = JSON.parse(localStorage.getItem('table_students') || '[]');
const teachers = JSON.parse(localStorage.getItem('table_teachers') || '[]');
console.log('児童:', students.length, '名');
console.log('教員:', teachers.length, '名');
```

### 2. CSV一括登録を実行

1. 教員用システム > 児童管理
2. CSV一括登録ボタンをクリック
3. 164名のCSVファイルを選択
4. **1〜3秒で完了！** ⚡

### 3. 動作テスト

- 健康チェック入力（瞬時に保存される）
- ダッシュボード表示（即座に反映）
- 記録一覧（高速検索）

---

## 📞 トラブルシューティング

### 問題1: 切り替えても速度が変わらない

**原因**: ブラウザキャッシュ

**解決**:
1. Ctrl + F5（強制リロード）
2. ブラウザを完全に閉じて再起動
3. シークレットモードで開いて確認

### 問題2: データが消えた

**原因**: localStorageが空だった

**解決**:
1. 再度CSV一括登録を実行
2. またはFirebaseモードに戻してデータを確認

### 問題3: ヘッダー表示が変わらない

**原因**: ページがリロードされていない

**解決**:
1. F5キーでページをリロード
2. ブラウザを再起動

---

## ✅ 切り替えチェックリスト

切り替え前の確認：
- [ ] Firebaseのデータをバックアップ（CSVエクスポート推奨）
- [ ] localStorageに既存データがあるか確認
- [ ] 切り替え方法を選択（速度改善ガイド.html推奨）

切り替え実行：
- [ ] 切り替え処理を実行
- [ ] ページをリロード
- [ ] ヘッダー表示を確認（「静的運用モード」になっているか）

切り替え後の確認：
- [ ] データ件数を確認
- [ ] CSV一括登録を実行（速度確認）
- [ ] 動作テストを実施

---

## 🎉 まとめ

**最も簡単な方法**:
1. **速度改善ガイド.htmlを開く**
2. **「ワンクリックで切り替え」ボタンをクリック**
3. **完了！**

**切り替え後の速度**:
- CSV一括登録: 50〜80秒 → **1〜3秒** ⚡
- 児童登録: 10秒 → **0.1〜0.5秒** ⚡
- 健康チェック: 10秒 → **0.1秒** ⚡

**推奨ワークフロー**:
1. localStorageモードで環境構築（高速）
2. 164名登録完了
3. Firebase設定とデータ移行（10分）
4. Firebaseモードで本番運用（複数端末）

---

すぐに切り替えたい場合は、**速度改善ガイド.html**を開いてワンクリック切り替えしてください！
