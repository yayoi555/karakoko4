// Supabaseアダプター
class SupabaseAdapter {
    constructor(supabaseUrl, supabaseKey) {
        this.supabaseUrl = supabaseUrl;
        this.supabaseKey = supabaseKey;
        this.headers = {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
        
        console.log('✅ Supabaseアダプター初期化完了');
    }

    // 元のfetch APIと互換性のあるメソッド
    async fetch(url, options = {}) {
        console.log('✅ Supabase Adapter - リクエスト:', url, options);
        
        try {
            // URLパースでテーブル名と操作を判定
            const urlWithoutQuery = url.split('?')[0];
            const urlParts = urlWithoutQuery.split('/');
            const tableName = urlParts[1];
            const recordId = urlParts[2];
            
            console.log('📋 テーブル名:', tableName, 'レコードID:', recordId);
            
            const method = options.method || 'GET';
            
            switch (method.toUpperCase()) {
                case 'GET':
                    return this.handleGet(tableName, recordId, url);
                case 'POST':
                    return this.handlePost(tableName, options.body);
                case 'PUT':
                case 'PATCH':
                    return this.handleUpdate(tableName, recordId, options.body);
                case 'DELETE':
                    return this.handleDelete(tableName, recordId);
                default:
                    throw new Error(`サポートされていないメソッド: ${method}`);
            }
        } catch (error) {
            console.error('❌ Supabase Adapter エラー:', error);
            return this.createErrorResponse(error.message, 500);
        }
    }

    // GET リクエスト処理
    async handleGet(tableName, recordId, originalUrl) {
        try {
            let supabaseUrl = `${this.supabaseUrl}/rest/v1/${tableName}`;
            
            if (recordId) {
                // 特定レコード取得
                supabaseUrl += `?id=eq.${recordId}`;
                
                const response = await window.originalFetch(supabaseUrl, {
                    method: 'GET',
                    headers: this.headers
                });
                
                const data = await response.json();
                
                if (data && data.length > 0) {
                    return this.createSuccessResponse(data[0]);
                } else {
                    return this.createErrorResponse('レコードが見つかりません', 404);
                }
            } else {
                // 全レコード取得（クエリパラメータ対応）
                const urlObj = new URL('http://dummy.com' + originalUrl);
                const limit = parseInt(urlObj.searchParams.get('limit')) || 1000;
                const page = parseInt(urlObj.searchParams.get('page')) || 1;
                const search = urlObj.searchParams.get('search') || '';
                const offset = (page - 1) * limit;
                
                // Supabaseクエリ構築
                supabaseUrl += `?select=*&limit=${limit}&offset=${offset}`;
                
                // 検索条件
                if (search) {
                    supabaseUrl += `&or=(name.ilike.%${search}%,student_id.ilike.%${search}%)`;
                }
                
                const response = await window.originalFetch(supabaseUrl, {
                    method: 'GET',
                    headers: this.headers
                });
                
                const data = await response.json();
                
                // 総件数を取得（別リクエスト）
                const countUrl = `${this.supabaseUrl}/rest/v1/${tableName}?select=count`;
                const countResponse = await window.originalFetch(countUrl, {
                    method: 'GET',
                    headers: { ...this.headers, 'Prefer': 'count=exact' }
                });
                
                const totalCount = parseInt(countResponse.headers.get('content-range')?.split('/')[1] || data.length);
                
                console.log('📊 取得データ:', data.length, '件 / 合計:', totalCount, '件');
                
                return this.createSuccessResponse({
                    data: data || [],
                    total: totalCount,
                    page: page,
                    limit: limit,
                    success: true
                });
            }
        } catch (error) {
            console.error('❌ GET エラー:', error);
            return this.createErrorResponse(error.message, 500);
        }
    }

    // POST リクエスト処理（新規作成）
    async handlePost(tableName, body) {
        try {
            const newRecord = JSON.parse(body);
            
            // IDがない場合は生成
            if (!newRecord.id) {
                newRecord.id = this.generateId();
            }
            
            const supabaseUrl = `${this.supabaseUrl}/rest/v1/${tableName}`;
            
            const response = await window.originalFetch(supabaseUrl, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(newRecord)
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ POST 成功:', data);
                return this.createSuccessResponse(data[0] || data, 201);
            } else {
                const error = await response.text();
                console.error('❌ POST エラー:', error);
                return this.createErrorResponse('レコードの作成に失敗しました', response.status);
            }
        } catch (error) {
            console.error('❌ POST エラー:', error);
            return this.createErrorResponse(error.message, 400);
        }
    }

    // UPDATE リクエスト処理
    async handleUpdate(tableName, recordId, body) {
        try {
            const updateData = JSON.parse(body);
            updateData.updated_at = new Date().toISOString();
            
            const supabaseUrl = `${this.supabaseUrl}/rest/v1/${tableName}?id=eq.${recordId}`;
            
            const response = await window.originalFetch(supabaseUrl, {
                method: 'PATCH',
                headers: this.headers,
                body: JSON.stringify(updateData)
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ UPDATE 成功:', data);
                return this.createSuccessResponse(data[0] || data);
            } else {
                const error = await response.text();
                console.error('❌ UPDATE エラー:', error);
                return this.createErrorResponse('更新に失敗しました', response.status);
            }
        } catch (error) {
            console.error('❌ UPDATE エラー:', error);
            return this.createErrorResponse(error.message, 400);
        }
    }

    // DELETE リクエスト処理
    async handleDelete(tableName, recordId) {
        try {
            const supabaseUrl = `${this.supabaseUrl}/rest/v1/${tableName}?id=eq.${recordId}`;
            
            const response = await window.originalFetch(supabaseUrl, {
                method: 'DELETE',
                headers: this.headers
            });
            
            if (response.ok) {
                console.log('✅ DELETE 成功');
                return this.createSuccessResponse(null, 204);
            } else {
                const error = await response.text();
                console.error('❌ DELETE エラー:', error);
                return this.createErrorResponse('削除に失敗しました', response.status);
            }
        } catch (error) {
            console.error('❌ DELETE エラー:', error);
            return this.createErrorResponse(error.message, 500);
        }
    }

    // バッチ作成（一括登録）
    async batchCreate(tableName, records) {
        console.log(`🚀 バッチ作成開始: ${records.length}件`);
        
        try {
            // IDがないレコードにIDを生成
            const recordsWithId = records.map(record => ({
                ...record,
                id: record.id || this.generateId()
            }));
            
            const supabaseUrl = `${this.supabaseUrl}/rest/v1/${tableName}`;
            
            const response = await window.originalFetch(supabaseUrl, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(recordsWithId)
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log(`✅ バッチ作成完了: ${data.length}件`);
                return {
                    success: data.length,
                    failed: 0,
                    errors: []
                };
            } else {
                const error = await response.text();
                console.error('❌ バッチ作成エラー:', error);
                return {
                    success: 0,
                    failed: records.length,
                    errors: [error]
                };
            }
        } catch (error) {
            console.error('❌ バッチ作成エラー:', error);
            return {
                success: 0,
                failed: records.length,
                errors: [error.message]
            };
        }
    }

    // 成功レスポンス作成
    createSuccessResponse(data, status = 200) {
        return {
            ok: true,
            status: status,
            statusText: 'OK',
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
            headers: new Map([['content-type', 'application/json']]),
            async json() {
                return { error: message };
            },
            async text() {
                return JSON.stringify({ error: message });
            }
        };
    }

    // ID生成
    generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}
