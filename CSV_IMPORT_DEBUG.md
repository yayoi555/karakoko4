# CSV一括登録 トラブルシューティングガイド

## 🔍 よくある問題と解決方法

### 問題1: CSVファイルが選択できない
**症状**: ファイル選択ダイアログが表示されない、または反応しない

**解決方法**:
- ブラウザをリロード（Ctrl + F5）
- 別のブラウザで試す（Chrome推奨）
- ポップアップブロッカーを無効化

---

### 問題2: CSVファイルを選択しても何も起こらない
**症状**: ファイルを選択しても進捗表示が出ない

**原因の可能性**:
1. **Firebaseモードで未認証**: Firebase接続が完了していない
2. **CSVフォーマット不正**: ヘッダー行や列数が不正
3. **ブラウザコンソールエラー**: JavaScriptエラーが発生

**確認手順**:
1. **F12キーを押してデベロッパーツールを開く**
2. **「Console」タブを選択**
3. **エラーメッセージを確認**

**CSVフォーマット確認**:
```csv
学籍番号,氏名,学年,クラス
S001,山田太郎,1,A組
S002,田中花子,1,A組
S003,佐藤次郎,1,B組
```

- ヘッダー行必須: `学籍番号,氏名,学年,クラス`
- 4列必須: 学籍番号、氏名、学年（数字）、クラス
- 文字コード: UTF-8（BOM付き推奨）

---

### 問題3: 「接続エラー」「Network error」が表示される
**症状**: `Failed to fetch` や `Network error` エラー

**原因**: Firebaseモードで接続設定が不完全

**解決方法**:
1. **教員画面ヘッダーのモード表示を確認**
   - 「🔥 Firebase運用モード」→ Firebaseが有効
   - 「💾 静的運用モード」→ localStorageのみ

2. **Firebaseモードの場合**:
   - ヘッダーの「DB設定」ボタンをクリック
   - Step 4で「接続テスト」を実行
   - 成功するまで設定を修正

3. **localStorageモードに戻す**（一時的な対処）:
   - ブラウザのコンソール（F12）を開く
   - 以下を入力してEnter:
     ```javascript
     localStorage.removeItem('use_firebase');
     location.reload();
     ```

---

### 問題4: 「ストレージ容量不足」エラー
**症状**: `⚠️ ストレージ容量不足` メッセージ

**原因**: localStorageの5MB制限

**解決方法**:
1. **Firebaseモードに切り替える**（推奨）
   - ヘッダーの「DB設定」→ Firebase設定
   - 無制限にデータを保存可能

2. **既存データを削除**
   - 不要な健康記録を削除
   - 退学した児童を削除

---

### 問題5: 一部の児童だけ登録される
**症状**: 164名のうち100名だけ登録される

**原因**: APIのlimit制限（修正済み）

**確認**: `js/api-adapter.js` の61行目
```javascript
const limit = parseInt(url.searchParams.get('limit')) || 10000; // 10000になっているか確認
```

**解決**: 最新版では修正済みのはずですが、念のため確認

---

### 問題6: Firebaseで登録できない（Blazeプランエラー）
**症状**: `This API method requires billing to be enabled`

**原因**: Firebaseが無料プラン（Spark）のまま

**解決**: 
1. Firebase Console → プロジェクト設定
2. 使用状況と請求額 → プランを変更
3. **Blazeプランを選択**（無料枠あり）
4. 請求先アカウントを設定

**安心**: 無料枠（読み取り50,000回/日、書き込み20,000回/日）で十分

---

## 🛠️ デバッグ手順

### ステップ1: コンソールを開く
1. **F12キー**を押す
2. **「Console」タブ**を選択
3. CSV一括登録を実行
4. エラーメッセージをコピー

### ステップ2: エラーメッセージを確認

#### 「Firebase not initialized」
→ Firebase設定が未完了。「DB設定」から設定してください。

#### 「Failed to fetch」
→ ネットワークエラー。Firebase接続を確認してください。

#### 「Quota exceeded」
→ localStorage容量不足。Firebaseモードに切り替えてください。

#### 「Invalid CSV format」
→ CSVフォーマットが不正。テンプレートを使用してください。

---

## 📝 CSVテンプレートのダウンロード

`templates/students_template.csv` を使用してください：

```csv
学籍番号,氏名,学年,クラス
S001,山田太郎,1,A組
S002,田中花子,1,A組
S003,佐藤次郎,1,B組
```

---

## 🔧 強制的にlocalStorageモードに戻す方法

Firebaseでエラーが続く場合、一時的にlocalStorageモードに戻せます：

1. **F12キー**でコンソールを開く
2. 以下を入力してEnter:
```javascript
localStorage.removeItem('use_firebase');
localStorage.removeItem('firebase_config');
location.reload();
```

3. ページがリロードされ、「💾 静的運用モード」に戻ります

---

## 📞 サポートが必要な場合

以下の情報をお知らせください：
1. ブラウザのコンソールログ（F12 → Console）
2. ヘッダーのモード表示（Firebase/静的運用）
3. CSVファイルの最初の5行
4. エラーメッセージの全文
