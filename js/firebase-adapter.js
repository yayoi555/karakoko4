/**
 * Firebase Firestore Adapter
 * RESTful API形式のfetch()呼び出しをFirestore操作に変換するアダプター
 * 
 * 使い方:
 * 1. Firebase Consoleでプロジェクト作成
 * 2. Firestore Database作成（本番モード/テストモード）
 * 3. firebaseConfig設定を取得
 * 4. このアダプターを初期化
 * 
 * @version 1.0.0
 */

class FirebaseAdapter {
    constructor() {
        this.db = null;
        this.firebase = null;
        this.initialized = false;
        console.log('[FirebaseAdapter] インスタンス作成');
    }

    /**
     * Firebaseを初期化
     * @param {Object} config - Firebase設定オブジェクト
     * @param {string} config.apiKey - Firebase API Key
     * @param {string} config.authDomain - Auth Domain
     * @param {string} config.projectId - Project ID
     * @param {string} config.storageBucket - Storage Bucket
     * @param {string} config.messagingSenderId - Messaging Sender ID
     * @param {string} config.appId - App ID
     */
    async initialize(config) {
        try {
            console.log('[FirebaseAdapter] 初期化開始', config);

            // Firebase SDKの読み込み確認
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDKが読み込まれていません。<script>タグでFirebase SDKを読み込んでください。');
            }

            // Firebase初期化
            if (!firebase.apps.length) {
                this.firebase = firebase.initializeApp(config);
                console.log('[FirebaseAdapter] Firebase初期化完了');
            } else {
                this.firebase = firebase.app();
                console.log('[FirebaseAdapter] 既存のFirebaseアプリを使用');
            }

            // Firestore参照取得
            this.db = firebase.firestore();
            
            // オフライン永続化を有効化（オプション）
            try {
                await this.db.enablePersistence({ synchronizeTabs: true });
                console.log('[FirebaseAdapter] オフライン永続化を有効化');
            } catch (err) {
                if (err.code === 'failed-precondition') {
                    console.warn('[FirebaseAdapter] 複数タブで開かれているため永続化無効');
                } else if (err.code === 'unimplemented') {
                    console.warn('[FirebaseAdapter] ブラウザが永続化をサポートしていません');
                }
            }

            this.initialized = true;
            console.log('[FirebaseAdapter] 初期化成功');
            return true;

        } catch (error) {
            console.error('[FirebaseAdapter] 初期化エラー:', error);
            throw error;
        }
    }

    /**
     * fetch()呼び出しをインターセプト
     */
    async fetch(url, options = {}) {
        if (!this.initialized) {
            console.error('[FirebaseAdapter] 初期化されていません - localStorageにフォールバック');
            throw new Error('FirebaseAdapterが初期化されていません。DB設定を確認してください。');
        }

        console.log('[FirebaseAdapter] fetch呼び出し:', url, options);

        // URLをパース
        const urlObj = new URL(url, window.location.href);
        const pathParts = urlObj.pathname.split('/').filter(p => p);

        // tables/{tableName} 形式のパス
        if (pathParts[0] !== 'tables') {
            throw new Error(`無効なパス: ${url}`);
        }

        const tableName = pathParts[1];
        const recordId = pathParts[2] || null;
        const method = (options.method || 'GET').toUpperCase();

        console.log(`[FirebaseAdapter] ${method} tables/${tableName}${recordId ? '/' + recordId : ''}`);

        try {
            switch (method) {
                case 'GET':
                    return await this.handleGet(tableName, recordId, urlObj.searchParams);
                case 'POST':
                    return await this.handlePost(tableName, options.body);
                case 'PUT':
                    return await this.handlePut(tableName, recordId, options.body);
                case 'PATCH':
                    return await this.handlePatch(tableName, recordId, options.body);
                case 'DELETE':
                    return await this.handleDelete(tableName, recordId);
                default:
                    throw new Error(`サポートされていないメソッド: ${method}`);
            }
        } catch (error) {
            console.error('[FirebaseAdapter] エラー:', error);
            return this.createErrorResponse(error);
        }
    }

    /**
     * GET: レコード取得
     */
    async handleGet(tableName, recordId, searchParams) {
        const collection = this.db.collection(tableName);

        // 単一レコード取得
        if (recordId) {
            const doc = await collection.doc(recordId).get();
            
            if (!doc.exists) {
                return this.createResponse({
                    error: 'Record not found',
                    message: `ID: ${recordId} のレコードが見つかりません`
                }, 404);
            }

            const data = { id: doc.id, ...doc.data() };
            console.log('[FirebaseAdapter] レコード取得:', data);
            return this.createResponse(data);
        }

        // リスト取得（ページネーション対応）
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 100;
        const search = searchParams.get('search') || '';
        const sortField = searchParams.get('sort') || 'created_at';

        let query = collection.orderBy(sortField, 'asc');

        // クエリ実行
        const snapshot = await query.get();
        let allData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log(`[FirebaseAdapter] 全レコード取得: ${allData.length}件`);

        // クライアントサイドでの検索フィルタリング（Firestoreの制約対策）
        if (search) {
            const searchLower = search.toLowerCase();
            allData = allData.filter(item => {
                return Object.values(item).some(value => {
                    if (typeof value === 'string') {
                        return value.toLowerCase().includes(searchLower);
                    }
                    return false;
                });
            });
            console.log(`[FirebaseAdapter] 検索後: ${allData.length}件`);
        }

        // ページネーション
        const total = allData.length;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedData = allData.slice(startIndex, endIndex);

        console.log(`[FirebaseAdapter] ページ${page}: ${paginatedData.length}件 (全${total}件)`);

        return this.createResponse({
            data: paginatedData,
            total: total,
            page: page,
            limit: limit,
            table: tableName
        });
    }

    /**
     * POST: レコード作成
     */
    async handlePost(tableName, bodyString) {
        try {
            const data = JSON.parse(bodyString);
            const collection = this.db.collection(tableName);

            // システムフィールド追加
            const now = Date.now();
            const recordData = {
                ...data,
                created_at: now,
                updated_at: now,
                gs_table_name: tableName
            };

            // IDが指定されている場合はそれを使用、なければ自動生成
            let docRef;
            if (data.id) {
                docRef = collection.doc(data.id);
                await docRef.set(recordData);
            } else {
                docRef = await collection.add(recordData);
                recordData.id = docRef.id;
                await docRef.update({ id: docRef.id });
            }

            console.log('[FirebaseAdapter] レコード作成成功:', recordData.id);

            return this.createResponse(recordData, 201);
        } catch (error) {
            console.error('[FirebaseAdapter] POST エラー:', error);
            throw error; // エラーを上位に伝播
        }
    }

    /**
     * バッチ書き込み: 複数レコードを一括作成（高速化）
     * @param {string} tableName - テーブル名
     * @param {Array} records - レコード配列
     * @param {number} batchSize - バッチサイズ（デフォルト500、Firestore上限）
     * @returns {Promise<Object>} 実行結果 {success: 件数, failed: 件数, errors: []}
     */
    async batchCreate(tableName, records, batchSize = 500) {
        console.log(`[FirebaseAdapter] バッチ書き込み開始: ${records.length}件`);
        
        const collection = this.db.collection(tableName);
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        try {
            // バッチサイズごとに分割処理
            for (let i = 0; i < records.length; i += batchSize) {
                const chunk = records.slice(i, i + batchSize);
                const batch = this.db.batch();
                const now = Date.now();

                console.log(`[FirebaseAdapter] バッチ ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)}: ${chunk.length}件処理中...`);

                for (const record of chunk) {
                    try {
                        // システムフィールド追加
                        const recordData = {
                            ...record,
                            created_at: now,
                            updated_at: now,
                            gs_table_name: tableName
                        };

                        // IDが指定されている場合はそれを使用、なければ自動生成
                        let docRef;
                        if (record.id) {
                            docRef = collection.doc(record.id);
                        } else {
                            docRef = collection.doc(); // 自動生成ID
                            recordData.id = docRef.id;
                        }

                        batch.set(docRef, recordData);
                    } catch (error) {
                        console.error(`[FirebaseAdapter] レコード準備エラー:`, error);
                        results.failed++;
                        results.errors.push({
                            record: record,
                            error: error.message
                        });
                    }
                }

                // バッチコミット
                try {
                    await batch.commit();
                    results.success += chunk.length;
                    console.log(`[FirebaseAdapter] バッチコミット成功: ${chunk.length}件`);
                } catch (error) {
                    console.error('[FirebaseAdapter] バッチコミットエラー:', error);
                    results.failed += chunk.length;
                    results.errors.push({
                        batch: `${i}-${i + chunk.length}`,
                        error: error.message
                    });
                }
            }

            console.log(`[FirebaseAdapter] バッチ書き込み完了: 成功${results.success}件, 失敗${results.failed}件`);
            return results;

        } catch (error) {
            console.error('[FirebaseAdapter] バッチ書き込みエラー:', error);
            throw error;
        }
    }

    /**
     * PUT: レコード全体更新
     */
    async handlePut(tableName, recordId, bodyString) {
        if (!recordId) {
            throw new Error('レコードIDが必要です');
        }

        const data = JSON.parse(bodyString);
        const collection = this.db.collection(tableName);
        const docRef = collection.doc(recordId);

        // ドキュメント存在確認
        const doc = await docRef.get();
        if (!doc.exists) {
            return this.createResponse({
                error: 'Record not found',
                message: `ID: ${recordId} のレコードが見つかりません`
            }, 404);
        }

        // 更新データ準備
        const updateData = {
            ...data,
            id: recordId,
            updated_at: Date.now()
        };

        await docRef.set(updateData, { merge: false });

        console.log('[FirebaseAdapter] レコード更新(PUT):', updateData);

        return this.createResponse(updateData);
    }

    /**
     * PATCH: レコード部分更新
     */
    async handlePatch(tableName, recordId, bodyString) {
        if (!recordId) {
            throw new Error('レコードIDが必要です');
        }

        const data = JSON.parse(bodyString);
        const collection = this.db.collection(tableName);
        const docRef = collection.doc(recordId);

        // ドキュメント存在確認
        const doc = await docRef.get();
        if (!doc.exists) {
            return this.createResponse({
                error: 'Record not found',
                message: `ID: ${recordId} のレコードが見つかりません`
            }, 404);
        }

        // 部分更新
        const updateData = {
            ...data,
            updated_at: Date.now()
        };

        await docRef.update(updateData);

        // 更新後のデータ取得
        const updatedDoc = await docRef.get();
        const resultData = { id: updatedDoc.id, ...updatedDoc.data() };

        console.log('[FirebaseAdapter] レコード更新(PATCH):', resultData);

        return this.createResponse(resultData);
    }

    /**
     * DELETE: レコード削除
     */
    async handleDelete(tableName, recordId) {
        if (!recordId) {
            throw new Error('レコードIDが必要です');
        }

        const collection = this.db.collection(tableName);
        const docRef = collection.doc(recordId);

        // ドキュメント存在確認
        const doc = await docRef.get();
        if (!doc.exists) {
            return this.createResponse({
                error: 'Record not found',
                message: `ID: ${recordId} のレコードが見つかりません`
            }, 404);
        }

        // 論理削除（deleted=trueフラグ）
        await docRef.update({
            deleted: true,
            updated_at: Date.now()
        });

        console.log('[FirebaseAdapter] レコード削除:', recordId);

        return this.createResponse(null, 204);
    }

    /**
     * Response作成ヘルパー
     */
    createResponse(data, status = 200) {
        return Promise.resolve({
            ok: status >= 200 && status < 300,
            status: status,
            statusText: this.getStatusText(status),
            headers: {
                get: (name) => {
                    if (name.toLowerCase() === 'content-type') {
                        return 'application/json';
                    }
                    return null;
                }
            },
            json: async () => data,
            text: async () => JSON.stringify(data)
        });
    }

    /**
     * エラーResponse作成
     */
    createErrorResponse(error) {
        return this.createResponse({
            error: error.name || 'Error',
            message: error.message || '不明なエラーが発生しました',
            stack: error.stack
        }, 500);
    }

    /**
     * HTTPステータステキスト取得
     */
    getStatusText(status) {
        const statusTexts = {
            200: 'OK',
            201: 'Created',
            204: 'No Content',
            400: 'Bad Request',
            404: 'Not Found',
            500: 'Internal Server Error'
        };
        return statusTexts[status] || 'Unknown';
    }

    /**
     * 接続テスト
     */
    async testConnection() {
        try {
            console.log('[FirebaseAdapter] 接続テスト開始');
            
            // テストコレクションに書き込み
            const testRef = this.db.collection('_connection_test').doc('test');
            await testRef.set({
                timestamp: Date.now(),
                message: '接続テスト成功'
            });

            // 読み取りテスト
            const testDoc = await testRef.get();
            
            if (testDoc.exists) {
                console.log('[FirebaseAdapter] 接続テスト成功');
                
                // テストデータ削除
                await testRef.delete();
                
                return {
                    success: true,
                    message: 'Firestore接続成功！データの読み書きが正常に動作しています。'
                };
            } else {
                throw new Error('テストデータの読み取りに失敗しました');
            }

        } catch (error) {
            console.error('[FirebaseAdapter] 接続テストエラー:', error);
            return {
                success: false,
                message: `接続エラー: ${error.message}`
            };
        }
    }

    /**
     * データ移行: localStorageからFirestoreへ
     */
    async migrateFromLocalStorage() {
        try {
            console.log('[FirebaseAdapter] データ移行開始');

            const tables = ['students', 'teachers', 'health_records', 'consultations'];
            let totalMigrated = 0;
            const results = {};

            for (const tableName of tables) {
                try {
                    // localStorageからデータ取得
                    const localData = localStorage.getItem(`table_${tableName}`);
                    if (!localData) {
                        console.log(`[FirebaseAdapter] ${tableName}: localStorageにデータなし`);
                        results[tableName] = 0;
                        continue;
                    }

                    const records = JSON.parse(localData);
                    console.log(`[FirebaseAdapter] ${tableName}: ${records.length}件を移行開始`);

                    const collection = this.db.collection(tableName);
                    let count = 0;

                    // バッチ処理（500件ずつ）
                    const batchSize = 500;
                    for (let i = 0; i < records.length; i += batchSize) {
                        const batch = this.db.batch();
                        const batchRecords = records.slice(i, i + batchSize);

                        for (const record of batchRecords) {
                            const docRef = collection.doc(record.id || this.db.collection('_temp').doc().id);
                            batch.set(docRef, {
                                ...record,
                                id: record.id || docRef.id,
                                migrated_at: Date.now()
                            });
                            count++;
                        }

                        await batch.commit();
                        console.log(`[FirebaseAdapter] ${tableName}: ${count}/${records.length}件 移行中...`);
                    }

                    results[tableName] = count;
                    totalMigrated += count;
                    console.log(`[FirebaseAdapter] ${tableName}: ${count}件 移行完了`);

                } catch (error) {
                    console.error(`[FirebaseAdapter] ${tableName} 移行エラー:`, error);
                    results[tableName] = -1;
                }
            }

            console.log('[FirebaseAdapter] データ移行完了:', results);

            return {
                success: true,
                message: `合計${totalMigrated}件のデータを移行しました`,
                details: results
            };

        } catch (error) {
            console.error('[FirebaseAdapter] データ移行エラー:', error);
            return {
                success: false,
                message: `移行エラー: ${error.message}`
            };
        }
    }
}

// グローバルインスタンス作成
window.firebaseAdapter = new FirebaseAdapter();

console.log('[FirebaseAdapter] スクリプト読み込み完了');
