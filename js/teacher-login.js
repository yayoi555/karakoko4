// 教員認証システム

class TeacherAuth {
    constructor() {
        // デモ用の認証データ（実際の運用では暗号化して保存）
        this.validCredentials = {
            'teacher01': 'password123',
            'teacher02': 'password123', 
            'admin': 'password123'
        };
        
        this.sessionTimeout = 8 * 60 * 60 * 1000; // 8時間
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingSession();
        this.focusFirstField();
    }

    setupEventListeners() {
        // フォーム送信
        const teacherLoginForm = document.getElementById('teacherLoginForm');
        if (teacherLoginForm) {
            teacherLoginForm.addEventListener('submit', (e) => {
                this.handleLogin(e);
            });
        }

        // パスワード表示切替
        const togglePassword = document.getElementById('togglePassword');
        if (togglePassword) {
            togglePassword.addEventListener('click', () => {
                this.togglePasswordVisibility();
            });
        }

        // Enterキーでフォーム送信
        if (teacherLoginForm) {
            document.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    teacherLoginForm.dispatchEvent(new Event('submit'));
                }
            });
        }

        // 入力フィールドのリアルタイム検証
        const teacherId = document.getElementById('teacherId');
        const password = document.getElementById('password');
        
        if (teacherId) {
            teacherId.addEventListener('input', () => {
                this.clearMessages();
            });
        }

        if (password) {
            password.addEventListener('input', () => {
                this.clearMessages();
            });
        }
    }

    checkExistingSession() {
        // 既存のセッションをチェック
        const session = this.getSession();
        if (session && this.isSessionValid(session)) {
            this.showSuccessMessage('既にログインしています。管理画面に移動します...');
            setTimeout(() => {
                window.location.href = 'teacher.html';
            }, 1500);
        }
    }

    focusFirstField() {
        // 最初のフィールドにフォーカス
        setTimeout(() => {
            document.getElementById('teacherId').focus();
        }, 100);
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const teacherId = document.getElementById('teacherId').value.trim();
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('loginBtn');
        
        // 入力検証
        if (!this.validateInput(teacherId, password)) {
            return;
        }

        // ボタンをローディング状態にする
        const originalBtnText = loginBtn.innerHTML;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>認証中...';
        loginBtn.disabled = true;

        try {
            // 認証処理（実際のシステムではサーバーサイドで実行）
            await this.authenticateUser(teacherId, password);
            
            // 成功時の処理
            this.createSession(teacherId);
            this.showSuccessMessage('ログインが完了しました。管理画面に移動します...');
            
            // 1.5秒後にリダイレクト
            setTimeout(() => {
                window.location.href = 'teacher.html';
            }, 1500);

        } catch (error) {
            // エラー時の処理
            this.showErrorMessage(error.message);
            
            // ボタンを元に戻す
            loginBtn.innerHTML = originalBtnText;
            loginBtn.disabled = false;
            
            // パスワードフィールドをクリア
            document.getElementById('password').value = '';
            document.getElementById('password').focus();
        }
    }

    validateInput(teacherId, password) {
        if (!teacherId) {
            this.showErrorMessage('教員IDを入力してください');
            document.getElementById('teacherId').focus();
            return false;
        }

        if (!password) {
            this.showErrorMessage('パスワードを入力してください');
            document.getElementById('password').focus();
            return false;
        }

        if (teacherId.length < 3) {
            this.showErrorMessage('教員IDは3文字以上で入力してください');
            document.getElementById('teacherId').focus();
            return false;
        }

        return true;
    }

    async authenticateUser(teacherId, password) {
        // 実際の認証処理をシミュレート（500ms-1500msの遅延）
        const delay = Math.random() * 1000 + 500;
        await new Promise(resolve => setTimeout(resolve, delay));

        // 認証チェック
        if (!this.validCredentials[teacherId]) {
            throw new Error('存在しない教員IDです');
        }

        if (this.validCredentials[teacherId] !== password) {
            throw new Error('パスワードが間違っています');
        }

        return true;
    }

    createSession(teacherId) {
        const session = {
            teacherId: teacherId,
            loginTime: new Date().toISOString(),
            expiresAt: new Date(Date.now() + this.sessionTimeout).toISOString()
        };

        // セッション情報をローカルストレージに保存
        localStorage.setItem('teacher_session', JSON.stringify(session));
        
        // セッションIDも生成（より安全な実装の場合）
        const sessionId = this.generateSessionId();
        localStorage.setItem('teacher_session_id', sessionId);
    }

    getSession() {
        const sessionStr = localStorage.getItem('teacher_session');
        if (!sessionStr) return null;
        
        try {
            return JSON.parse(sessionStr);
        } catch (error) {
            console.error('セッション情報の解析に失敗:', error);
            return null;
        }
    }

    isSessionValid(session) {
        if (!session || !session.expiresAt) return false;
        
        const now = new Date();
        const expiresAt = new Date(session.expiresAt);
        
        return now < expiresAt;
    }

    generateSessionId() {
        // 簡易的なセッションID生成
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    togglePasswordVisibility() {
        const passwordField = document.getElementById('password');
        const eyeIcon = document.getElementById('eyeIcon');
        
        if (passwordField.type === 'password') {
            passwordField.type = 'text';
            eyeIcon.className = 'fas fa-eye-slash';
        } else {
            passwordField.type = 'password';
            eyeIcon.className = 'fas fa-eye';
        }
    }

    showErrorMessage(message) {
        const errorDiv = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        const successDiv = document.getElementById('successMessage');
        
        // 成功メッセージを非表示
        successDiv.classList.add('hidden');
        
        // エラーメッセージを表示
        errorText.textContent = message;
        errorDiv.classList.remove('hidden');
        
        // アニメーション効果
        errorDiv.style.opacity = '0';
        setTimeout(() => {
            errorDiv.style.transition = 'opacity 0.3s ease';
            errorDiv.style.opacity = '1';
        }, 10);
    }

    showSuccessMessage(message) {
        const successDiv = document.getElementById('successMessage');
        const successText = document.getElementById('successText');
        const errorDiv = document.getElementById('errorMessage');
        
        // エラーメッセージを非表示
        errorDiv.classList.add('hidden');
        
        // 成功メッセージを表示
        successText.textContent = message;
        successDiv.classList.remove('hidden');
        
        // アニメーション効果
        successDiv.style.opacity = '0';
        setTimeout(() => {
            successDiv.style.transition = 'opacity 0.3s ease';
            successDiv.style.opacity = '1';
        }, 10);
    }

    clearMessages() {
        document.getElementById('errorMessage').classList.add('hidden');
        document.getElementById('successMessage').classList.add('hidden');
    }

    // 静的メソッド：他のページから呼び出し用
    static checkAuthStatus() {
        const sessionStr = localStorage.getItem('teacher_session');
        if (!sessionStr) return false;
        
        try {
            const session = JSON.parse(sessionStr);
            const now = new Date();
            const expiresAt = new Date(session.expiresAt);
            
            return now < expiresAt;
        } catch (error) {
            return false;
        }
    }

    static logout() {
        localStorage.removeItem('teacher_session');
        localStorage.removeItem('teacher_session_id');
        window.location.href = 'teacher-login.html';
    }

    static getCurrentTeacher() {
        const sessionStr = localStorage.getItem('teacher_session');
        if (!sessionStr) return null;
        
        try {
            const session = JSON.parse(sessionStr);
            return session.teacherId;
        } catch (error) {
            return null;
        }
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    new TeacherAuth();
});

// グローバル関数として公開
window.TeacherAuth = TeacherAuth;