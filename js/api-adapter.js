// API アダプター（静的データ運用対応）

class APIAdapter {
    constructor() {
        this.dataManager = window.staticDataManager;
        this.useLocalStorage = true; // 公開環境では常にローカルストレージを使用
    }

    // 元のfetch APIと互換性のあるメソッド
    async fetch(url, options = {}) {
        console.log('✅ API Adapter - リクエスト:', url, options);
        
        try {
            // URLパースでテーブル名と操作を判定（クエリパラメータを除外）
            const urlWithoutQuery = url.split('?')[0]; // クエリパラメータを除去
            const urlParts = urlWithoutQuery.split('/');
            const tableName = urlParts[1]; // 'tables/teachers' -> 'teachers'
            const recordId = urlParts[2]; // 'tables/teachers/123' -> '123'
            console.log('📋 テーブル名:', tableName, 'レコードID:', recordId);
            
            const method = options.method || 'GET';
            
            switch (method.toUpperCase()) {
                case 'GET':
                    return this.handleGet(tableName, recordId, url);
                    
                case 'POST':
                    return this.handlePost(tableName, options.body);
                    
                case 'PUT':
                    return this.handlePut(tableName, recordId, options.body);
                    
                case 'DELETE':
                    return this.handleDelete(tableName, recordId);
                    
                default:
                    throw new Error(`サポートされていないメソッド: ${method}`);
            }
            
        } catch (error) {
            console.error('API Adapter エラー:', error);
            return this.createErrorResponse(error.message, 500);
        }
    }

    // GET リクエスト処理
    async handleGet(tableName, recordId, originalUrl) {
        await this.delay(100); // 非同期処理を模擬
        
        console.log('🔍 handleGet - tableName:', tableName);
        console.log('🔍 handleGet - this.dataManager:', this.dataManager);
        
        const data = this.dataManager.getData(tableName) || [];
        console.log('🔍 handleGet - 取得データ件数:', data.length);
        
        if (recordId) {
            // 特定レコード取得
            const record = data.find(item => item.id === recordId);
            if (record) {
                return this.createSuccessResponse(record);
            } else {
                return this.createErrorResponse('レコードが見つかりません', 404);
            }
        } else {
            // 全レコード取得（クエリパラメータ対応）
            const url = new URL('http://dummy.com' + originalUrl);
            const limit = parseInt(url.searchParams.get('limit')) || 10000; // デフォルトを10000に増加
            const page = parseInt(url.searchParams.get('page')) || 1;
            const offset = (page - 1) * limit;
            
            const paginatedData = data.slice(offset, offset + limit);
            
            console.log('🔍 handleGet - paginatedData件数:', paginatedData.length);
            console.log('🔍 handleGet - total:', data.length);
            
            const response = this.dataManager.formatApiResponse(paginatedData, data.length);
            console.log('🔍 handleGet - formatApiResponse結果:', response);
            
            return this.createSuccessResponse(response);
        }
    }

    // POST リクエスト処理（新規作成）
    async handlePost(tableName, body) {
        await this.delay(200); // 非同期処理を模擬
        
        try {
            const newRecord = JSON.parse(body);
            const savedRecord = this.dataManager.addRecord(tableName, newRecord);
            
            if (savedRecord) {
                return this.createSuccessResponse(savedRecord, 201);
            } else {
                return this.createErrorResponse('レコードの作成に失敗しました', 500);
            }
        } catch (error) {
            return this.createErrorResponse('不正なJSONデータ', 400);
        }
    }

    // PUT リクエスト処理（更新）
    async handlePut(tableName, recordId, body) {
        await this.delay(150); // 非同期処理を模擬
        
        try {
            const updateData = JSON.parse(body);
            const updatedRecord = this.dataManager.updateRecord(tableName, recordId, updateData);
            
            if (updatedRecord) {
                return this.createSuccessResponse(updatedRecord);
            } else {
                return this.createErrorResponse('レコードが見つからないか更新に失敗しました', 404);
            }
        } catch (error) {
            return this.createErrorResponse('不正なJSONデータ', 400);
        }
    }

    // DELETE リクエスト処理
    async handleDelete(tableName, recordId) {
        await this.delay(100); // 非同期処理を模擬
        
        const success = this.dataManager.deleteRecord(tableName, recordId);
        
        if (success) {
            return this.createSuccessResponse(null, 204);
        } else {
            return this.createErrorResponse('削除に失敗しました', 500);
        }
    }

    // 成功レスポンス作成
    createSuccessResponse(data, status = 200) {
        return {
            ok: true,
            status: status,
            statusText: 'OK',
            url: 'localhost',
            headers: new Map([['content-type', 'application/json']]),
            async json() {
                return data;
            },
            async text() {
                return JSON.stringify(data);
            }
        };
    }

    // エラーレスポンス作成
    createErrorResponse(message, status = 500) {
        return {
            ok: false,
            status: status,
            statusText: message,
            url: 'localhost',
            headers: new Map([['content-type', 'application/json']]),
            async json() {
                return { error: message };
            },
            async text() {
                return JSON.stringify({ error: message });
            }
        };
    }

    // 遅延処理（リアルなAPI感を演出）
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// このファイルはクラス定義のみを提供します
// 初期化はteacher.htmlやstudent.htmlで行います