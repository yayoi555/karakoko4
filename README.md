# カラココナビ（試験版）

小学校向け健康管理システム - 約200名の児童と複数端末での同時利用対応版

---

## 🎯 プロジェクト概要

**カラココナビ**は、小学校（児童約200名）の健康管理を支援するWebアプリケーションです。
児童用端末と教員用端末の約200台のPCから、同一のデータベースにアクセスしてリアルタイムで情報を共有できます。

---

## ✨ 主な機能

### 児童用画面（student.html）
- ✅ 自分の名前を選択してログイン
- ✅ 今日の体調を記録（元気・まあまあ・しんどい）
- ✅ 心配なことを相談
- ✅ 保健室への訪問記録

### 教員用画面（teacher.html）
- ✅ 児童管理（166名の児童データ）
- ✅ 教員管理
- ✅ 健康記録の閲覧・管理
- ✅ 相談記録の閲覧・対応
- ✅ CSVインポート/エクスポート機能

---

## 🗄️ データベース構成

### 使用技術
- **Supabase（PostgreSQL）** - クラウドデータベース
- **リアルタイム同期** - 複数端末での同時利用対応

### テーブル構成

#### students（児童）
- 登録数: **166名**
- フィールド: id, student_id, name, grade, class, active, created_at, updated_at

#### teachers（教員）
- 登録数: **23名**
- フィールド: id, name, subject, grade, class, position, active, created_at

#### health_records（健康記録）
- 児童の日々の体調記録

#### consultations（相談記録）
- 児童からの相談内容と対応状況

---

## 🚀 セットアップ手順

### 必要な環境
- ✅ インターネット接続（Supabaseへのアクセス）
- ✅ モダンなWebブラウザ（Chrome, Edge, Firefox, Safari）
- ✅ 200台のPC（児童用 + 教員用）

### インストール手順

1. **ファイルを配布**
   ```
   カラココナビ/
   ├── teacher.html      （教員用画面）
   ├── student.html      （生徒用画面）
   ├── js/               （JavaScriptファイル）
   │   ├── main.js
   │   ├── student.js
   │   ├── supabase-adapter.js
   │   ├── firebase-adapter.js
   │   ├── api-adapter.js
   │   └── static-data-manager.js
   └── css/              （スタイルシート）
   ```

2. **各PCで使用開始**
   - HTMLファイルを開くだけで自動的にSupabaseに接続
   - 特別な設定は不要

---

## 🌐 運用モード

### Supabaseモード（現在使用中）
- ☁️ クラウドデータベースで運用
- ✅ 200台のPCでリアルタイム同期
- ✅ データは自動的にバックアップ
- ✅ インターネット経由でアクセス

#### Supabase設定情報
```javascript
Project URL: https://gcvaczijcdgzaoaxwhpz.supabase.co
Table: students (166名), teachers (23名)
```

### localStorageモード（オフライン用）
- 💾 ブラウザ内にデータ保存
- ✅ インターネット不要
- ❌ 各PCで独立（同期なし）

---

## 📊 現在のデータ状況

### 児童データ
- **総数**: 166名
- **学年**: 1年生〜6年生
- **クラス**: 各学年1〜3組

### 教員データ
- **総数**: 23名
- **役職**: 担任、教科担当など

---

## 🔧 トラブルシューティング

### データが表示されない場合

1. **インターネット接続を確認**
   - Supabaseへの接続が必要

2. **コンソールで確認**
   ```javascript
   fetch('tables/students?page=1&limit=5')
     .then(res => res.json())
     .then(data => console.log('データ:', data.total, '名'));
   ```

3. **モードを確認**
   ```javascript
   console.log('モード:', localStorage.getItem('use_supabase'));
   ```

### localStorageモードに戻す場合

```javascript
localStorage.removeItem('use_supabase');
location.reload();
```

---

## 🔒 セキュリティ

### 現在の設定
- ⚠️ **テストモード**: Row Level Security（RLS）オフ
- ⚠️ 誰でもデータにアクセス可能

### 本番運用時の推奨設定
- ✅ Row Level Securityを有効化
- ✅ 学校のIPアドレスからのみアクセス許可
- ✅ 認証機能の追加

---

## 📝 今後の開発予定

### 短期
- [ ] 健康記録の統計機能
- [ ] データエクスポート機能の強化
- [ ] 相談記録の検索機能

### 中期
- [ ] セキュリティ強化（認証・認可）
- [ ] 保護者向け画面
- [ ] 通知機能

### 長期
- [ ] スマートフォンアプリ化
- [ ] 多言語対応
- [ ] 他校への展開

---

## 🎊 完成済み機能

✅ Supabaseクラウドデータベース接続
✅ 166名の児童データ登録
✅ 23名の教員データ登録
✅ 複数端末での同時アクセス対応
✅ リアルタイムデータ同期
✅ CSV一括インポート/エクスポート
✅ 児童用・教員用の画面分離

---

## 📞 サポート

問題が発生した場合は、開発者に連絡してください。

---

## 📄 ライセンス

このプロジェクトは教育目的で開発されています。

---

**最終更新**: 2025年1月25日
**バージョン**: 1.0.0（Supabase対応版）
**対応人数**: 約200名（児童166名 + 教員23名）
