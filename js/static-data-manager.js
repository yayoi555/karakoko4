// 静的データ管理システム（ウェブサイト運用対応版）

class StaticDataManager {
    constructor() {
        this.storagePrefix = 'cocokaranavi_';
        this.initializeDefaultData();
    }

    // デフォルトデータの初期化
    initializeDefaultData() {
        // 初回アクセス時のサンプルデータ
        if (!this.getData('teachers')) {
            this.setData('teachers', [
                {
                    id: 'teacher_001',
                    name: '田中先生',
                    subject: '1年担任',
                    grade: '1年',
                    class: 'A組',
                    position: '担任',
                    active: true,
                    created_at: Date.now()
                },
                {
                    id: 'teacher_002', 
                    name: '佐藤先生',
                    subject: '2年担任',
                    grade: '2年',
                    class: 'B組',
                    position: '担任',
                    active: true,
                    created_at: Date.now()
                }
            ]);
        }

        if (!this.getData('students')) {
            this.setData('students', [
                {
                    id: 'student_001',
                    name: '山田太郎',
                    grade: 1,
                    class: 'A組',
                    active: true,
                    created_at: Date.now()
                },
                {
                    id: 'student_002',
                    name: '鈴木花子',
                    grade: 1,
                    class: 'A組', 
                    active: true,
                    created_at: Date.now()
                }
            ]);
        }

        if (!this.getData('health_records')) {
            this.setData('health_records', []);
        }

        if (!this.getData('consultations')) {
            this.setData('consultations', []);
        }
    }

    // データ取得
    getData(tableName) {
        try {
            const data = localStorage.getItem(this.storagePrefix + tableName);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('データ取得エラー:', error);
            return null;
        }
    }

    // データ保存
    setData(tableName, data) {
        try {
            localStorage.setItem(this.storagePrefix + tableName, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('データ保存エラー:', error);
            return false;
        }
    }

    // レコード追加
    addRecord(tableName, record) {
        const data = this.getData(tableName) || [];
        
        // IDが自動生成されていない場合は生成
        if (!record.id) {
            record.id = this.generateId(tableName);
        }
        
        // タイムスタンプ追加
        record.created_at = Date.now();
        record.updated_at = Date.now();
        
        data.push(record);
        return this.setData(tableName, data) ? record : null;
    }

    // レコード更新
    updateRecord(tableName, recordId, updates) {
        const data = this.getData(tableName) || [];
        const index = data.findIndex(item => item.id === recordId);
        
        if (index !== -1) {
            data[index] = { ...data[index], ...updates, updated_at: Date.now() };
            return this.setData(tableName, data) ? data[index] : null;
        }
        
        return null;
    }

    // レコード削除
    deleteRecord(tableName, recordId) {
        const data = this.getData(tableName) || [];
        const filteredData = data.filter(item => item.id !== recordId);
        return this.setData(tableName, filteredData);
    }

    // ID生成
    generateId(tableName) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2);
        return `${tableName}_${timestamp}_${random}`;
    }

    // API互換のレスポンス形式
    formatApiResponse(data, total = null) {
        return {
            data: data || [],
            total: total || (data ? data.length : 0),
            success: true
        };
    }

    // 全データ削除（リセット用）
    clearAllData() {
        const keys = Object.keys(localStorage).filter(key => key.startsWith(this.storagePrefix));
        keys.forEach(key => localStorage.removeItem(key));
        this.initializeDefaultData();
    }

    // データエクスポート（JSON形式）
    exportData() {
        const exportData = {
            teachers: this.getData('teachers'),
            students: this.getData('students'),
            health_records: this.getData('health_records'),
            consultations: this.getData('consultations'),
            exported_at: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `cocokaranavi_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        
        return exportData;
    }

    // データインポート（JSON形式）
    importData(jsonData) {
        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            
            if (data.teachers) this.setData('teachers', data.teachers);
            if (data.students) this.setData('students', data.students);
            if (data.health_records) this.setData('health_records', data.health_records);
            if (data.consultations) this.setData('consultations', data.consultations);
            
            return true;
        } catch (error) {
            console.error('データインポートエラー:', error);
            return false;
        }
    }
}

// グローバルインスタンス作成
window.staticDataManager = new StaticDataManager();