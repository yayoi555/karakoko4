// 児童健康管理システム - メインJavaScript

class HealthManagementSystem {
    constructor() {
        this.currentView = 'dashboard';
        this.students = [];
        this.healthRecords = [];
        this.consultations = [];
        this.teachers = [];
        this.charts = {};
        
        this.init();
    }

    async init() {
        // 認証チェック
        if (!this.checkAuthentication()) {
            return;
        }
        
        // 静的データモード確認
        if (window.staticDataManager) {
            console.log('✅ 静的データマネージャー: 利用可能');
            this.showAlert('静的運用モードで動作中 - データはブラウザに保存されます', 'info');
        } else {
            console.log('⚠️ 静的データマネージャー: 利用不可 - API接続をテスト');
            await this.testAPIConnection();
        }
        
        this.setupEventListeners();
        this.updateCurrentDate();
        this.setupTeacherInfo();
        await this.loadData();
        this.showView('dashboard');
        this.updateDashboard();
    }

    async testAPIConnection() {
        try {
            console.log('API接続テスト開始...');
            const response = await fetch('tables/teachers?limit=1');
            console.log('API接続テスト応答:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                url: response.url,
                headers: Array.from(response.headers.entries())
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('API接続テスト成功:', data);
            } else {
                const errorText = await response.text();
                console.error('API接続テストエラー:', errorText);
            }
        } catch (error) {
            console.error('API接続テスト失敗:', error);
        }
    }

    setupEventListeners() {
        // ナビゲーション
        document.getElementById('navDashboard').addEventListener('click', () => this.showView('dashboard'));
        document.getElementById('navHealthCheck').addEventListener('click', () => this.showView('healthCheck'));
        document.getElementById('navStudents').addEventListener('click', () => this.showView('students'));
        document.getElementById('navRecords').addEventListener('click', () => this.showView('records'));
        document.getElementById('navConsultations').addEventListener('click', () => this.showView('consultations'));
        document.getElementById('navTeachers').addEventListener('click', () => this.showView('teachers'));
        
        // ログアウト
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // 健康チェックフォーム
        document.getElementById('healthForm').addEventListener('submit', (e) => this.handleHealthSubmit(e));
        document.getElementById('clearForm').addEventListener('click', () => this.clearHealthForm());
        
        // ストレスレベルスライダー
        document.getElementById('stressLevel').addEventListener('input', (e) => {
            document.getElementById('stressValue').textContent = e.target.value;
        });

        // 児童管理
        document.getElementById('addStudentBtn').addEventListener('click', () => this.showStudentModal());
        document.getElementById('exportStudentsCSVBtn').addEventListener('click', () => this.exportStudentsCSV());
        document.getElementById('importStudentsCSVBtn').addEventListener('click', () => this.importStudentsCSV());
        document.getElementById('deleteAllStudentsBtn').addEventListener('click', () => this.deleteAllStudents());
        document.getElementById('studentForm').addEventListener('submit', (e) => this.handleStudentSubmit(e));
        document.getElementById('cancelStudent').addEventListener('click', () => this.hideStudentModal());
        
        // 児童検索・フィルター
        document.getElementById('searchStudentInput').addEventListener('input', () => this.filterStudentsTable());
        document.getElementById('filterStudentGrade').addEventListener('change', () => this.filterStudentsTable());
        document.getElementById('filterStudentClass').addEventListener('input', () => this.filterStudentsTable());
        document.getElementById('filterStudentStatus').addEventListener('change', () => this.filterStudentsTable());
        document.getElementById('clearStudentFilter').addEventListener('click', () => this.clearStudentFilter());

        // 記録フィルター
        document.getElementById('filterRecords').addEventListener('click', () => this.filterRecords());
        document.getElementById('filterGrade').addEventListener('change', () => {
            const selectedGrade = document.getElementById('filterGrade').value;
            this.populateFilterSelect(selectedGrade);
        });

        // 相談管理
        document.getElementById('filterConsultations').addEventListener('click', () => this.filterConsultations());
        document.getElementById('refreshConsultationsBtn').addEventListener('click', () => this.loadConsultationsData());
        document.getElementById('exportToSheetsBtn').addEventListener('click', () => this.exportToGoogleSheets());
        document.getElementById('cancelConsultation').addEventListener('click', () => this.hideConsultationModal());
        document.getElementById('saveConsultation').addEventListener('click', () => this.saveConsultationResponse());

        // 静的データ管理
        document.getElementById('exportDataBtn').addEventListener('click', () => this.exportStaticData());
        document.getElementById('importDataBtn').addEventListener('click', () => this.importStaticData());

        // 教員管理
        document.getElementById('addTeacherBtn').addEventListener('click', () => this.showAddTeacherModal());
        document.getElementById('importTeachersCSVBtn').addEventListener('click', () => this.importTeachersCSV());
        document.getElementById('exportTeachersBtn').addEventListener('click', () => this.exportTeachersToCSV());
        document.getElementById('refreshTeachersBtn').addEventListener('click', () => this.loadTeachersData());
        document.getElementById('searchTeachers').addEventListener('click', () => this.searchTeachers());
        document.getElementById('teacherNameSearch').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchTeachers();
        });
        document.getElementById('cancelTeacher').addEventListener('click', () => this.hideTeacherModal());
        document.getElementById('teacherForm').addEventListener('submit', (e) => this.handleTeacherSubmit(e));
        document.getElementById('cancelDeleteTeacher').addEventListener('click', () => this.hideDeleteTeacherModal());
        document.getElementById('confirmDeleteTeacher').addEventListener('click', () => this.confirmDeleteTeacher());

        // モーダル背景クリック
        document.getElementById('studentModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideStudentModal();
            }
        });
        
        document.getElementById('teacherModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideTeacherModal();
            }
        });
        
        document.getElementById('deleteTeacherModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideDeleteTeacherModal();
            }
        });
    }

    updateCurrentDate() {
        const now = new Date();
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            weekday: 'long' 
        };
        document.getElementById('currentDate').textContent = now.toLocaleDateString('ja-JP', options);
    }

    showView(viewName) {
        // 全てのセクションを非表示
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.add('hidden');
        });

        // ナビゲーションボタンのアクティブ状態をリセット
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.classList.remove('active');
        });

        // 選択されたセクションを表示
        const targetSection = document.getElementById(viewName);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }

        // アクティブなナビゲーションボタンを設定
        const activeNav = document.getElementById(`nav${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`);
        if (activeNav) {
            activeNav.classList.add('active');
        }

        this.currentView = viewName;

        // ビュー固有の初期化
        if (viewName === 'dashboard') {
            this.updateDashboard();
        } else if (viewName === 'healthCheck') {
            this.populateStudentSelect();
        } else if (viewName === 'students') {
            this.loadStudentsTable();
        } else if (viewName === 'records') {
            this.loadRecordsTable();
            this.populateFilterSelect();
        } else if (viewName === 'consultations') {
            this.loadConsultationsTable();
            this.populateConsultationFilters();
            this.updateConsultationStats();
        } else if (viewName === 'teachers') {
            this.loadTeachersTable();
            this.updateTeacherStats();
        }
    }

    async loadData() {
        try {
            // 児童データを読み込み（limitを明示的に指定）
            const studentsResponse = await fetch('tables/students?limit=10000');
            if (studentsResponse.ok) {
                const studentsData = await studentsResponse.json();
                this.students = studentsData.data || [];
                console.log(`📚 児童データ読み込み: ${this.students.length}名`);
            }

            // 健康記録データを読み込み（limitを明示的に指定）
            const recordsResponse = await fetch('tables/health_records?limit=10000');
            if (recordsResponse.ok) {
                const recordsData = await recordsResponse.json();
                this.healthRecords = recordsData.data || [];
                console.log(`📚 健康記録読み込み: ${this.healthRecords.length}件`);
            }

            // 相談データを読み込み
            await this.loadConsultationsData();

            // 教員データを読み込み（limitを明示的に指定）
            const teachersResponse = await fetch('tables/teachers?limit=10000');
            if (teachersResponse.ok) {
                const teachersData = await teachersResponse.json();
                this.teachers = teachersData.data || [];
                console.log(`📚 教員データ読み込み: ${this.teachers.length}名`);
            }
        } catch (error) {
            console.error('データの読み込みに失敗しました:', error);
            this.showAlert('データの読み込みに失敗しました', 'error');
        }
    }

    // ダッシュボード更新
    updateDashboard() {
        this.updateStatistics();
        this.updateCharts();
    }

    updateStatistics() {
        const totalStudents = this.students.filter(s => s.active).length;
        document.getElementById('totalStudents').textContent = totalStudents;

        // 今日の記録を取得
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = this.healthRecords.filter(record => {
            const recordDate = new Date(record.date).toISOString().split('T')[0];
            return recordDate === today;
        });

        let healthyCount = 0;
        let cautionCount = 0;
        let feverCount = 0;

        todayRecords.forEach(record => {
            const temp = parseFloat(record.temperature);
            const symptoms = record.symptoms || [];
            
            if (temp >= 37.5 || symptoms.includes('発熱')) {
                feverCount++;
            } else if (temp >= 37.0 || symptoms.length > 0 || record.stress_level >= 4) {
                cautionCount++;
            } else {
                healthyCount++;
            }
        });

        document.getElementById('healthyCount').textContent = healthyCount;
        document.getElementById('cautionCount').textContent = cautionCount;
        document.getElementById('feverCount').textContent = feverCount;
    }

    updateCharts() {
        this.updateSymptomsChart();
        this.updateMoodChart();
    }

    updateSymptomsChart() {
        const ctx = document.getElementById('symptomsChart').getContext('2d');
        
        // 症状の集計
        const symptomCount = {};
        this.healthRecords.forEach(record => {
            if (record.symptoms && Array.isArray(record.symptoms)) {
                record.symptoms.forEach(symptom => {
                    symptomCount[symptom] = (symptomCount[symptom] || 0) + 1;
                });
            }
        });

        const labels = Object.keys(symptomCount);
        const data = Object.values(symptomCount);

        if (this.charts.symptoms) {
            this.charts.symptoms.destroy();
        }

        this.charts.symptoms = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '症状別件数',
                    data: data,
                    backgroundColor: [
                        '#ef4444', '#f97316', '#eab308', '#22c55e', 
                        '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
                        '#f59e0b', '#84cc16'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    updateMoodChart() {
        const ctx = document.getElementById('moodChart').getContext('2d');
        
        // 気分の集計
        const moodCount = {};
        this.healthRecords.forEach(record => {
            if (record.mood) {
                moodCount[record.mood] = (moodCount[record.mood] || 0) + 1;
            }
        });

        const labels = Object.keys(moodCount);
        const data = Object.values(moodCount);

        if (this.charts.mood) {
            this.charts.mood.destroy();
        }

        this.charts.mood = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#22c55e', '#3b82f6', '#eab308', 
                        '#ef4444', '#8b5cf6', '#f97316'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // 健康チェック機能
    populateStudentSelect() {
        const select = document.getElementById('studentSelect');
        select.innerHTML = '<option value="">児童を選択してください</option>';
        
        this.students
            .filter(student => student.active)
            .sort((a, b) => {
                if (a.grade !== b.grade) return a.grade - b.grade;
                return a.name.localeCompare(b.name, 'ja');
            })
            .forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = `${student.grade}年${student.class} ${student.name}`;
                select.appendChild(option);
            });
    }

    async handleHealthSubmit(e) {
        e.preventDefault();
        
        const formData = {
            student_id: document.getElementById('studentSelect').value,
            temperature: parseFloat(document.getElementById('temperature').value) || null,
            mood: document.getElementById('mood').value || null,
            stress_level: parseInt(document.getElementById('stressLevel').value),
            symptoms: Array.from(document.querySelectorAll('input[name=\"symptoms\"]:checked')).map(cb => cb.value),
            notes: document.getElementById('notes').value || null,
            recorded_by: document.getElementById('recordedBy').value || null,
            date: new Date().toISOString()
        };

        if (!formData.student_id) {
            this.showAlert('児童を選択してください', 'error');
            return;
        }

        try {
            const response = await fetch('tables/health_records', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const result = await response.json();
                this.healthRecords.push(result);
                this.showAlert('健康記録を保存しました', 'success');
                this.clearHealthForm();
                this.updateDashboard();
            } else {
                throw new Error('保存に失敗しました');
            }
        } catch (error) {
            console.error('健康記録保存エラー:', error);
            this.showAlert('健康記録の保存に失敗しました', 'error');
        }
    }

    clearHealthForm() {
        document.getElementById('healthForm').reset();
        document.getElementById('stressLevel').value = 1;
        document.getElementById('stressValue').textContent = '1';
        document.querySelectorAll('input[name=\"symptoms\"]:checked').forEach(cb => cb.checked = false);
    }

    // 児童管理機能
    showStudentModal() {
        document.getElementById('studentModal').classList.remove('hidden');
        document.querySelector('#studentModal .bg-white').classList.add('modal-enter');
    }

    hideStudentModal() {
        document.getElementById('studentModal').classList.add('hidden');
        document.getElementById('studentForm').reset();
    }

    async handleStudentSubmit(e) {
        e.preventDefault();
        
        // ボタンをローディング状態に
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>登録中...';
        submitBtn.disabled = true;
        
        const formData = {
            id: document.getElementById('studentId').value,
            name: document.getElementById('studentName').value,
            grade: parseInt(document.getElementById('studentGrade').value),
            class: document.getElementById('studentClass').value,
            active: true
        };

        console.log('学生データ送信:', formData);

        try {
            console.log('新規学生追加リクエスト:', 'tables/students');
            console.log('💾 児童データ保存開始...');
            
            // タイムアウトは削除（二重送信の原因となるため）
            const response = await fetch('tables/students', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            console.log('学生追加サーバー応答:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                url: response.url
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ 児童追加成功:', result);
                
                // メモリ内のデータを更新（DBから再取得せず高速化）
                this.students.push(result);
                
                // UI即座更新（再読み込み不要）
                this.showAlert('児童を追加しました', 'success');
                this.hideStudentModal();
                this.loadStudentsTable();
                this.updateDashboard();
            } else {
                const errorText = await response.text();
                console.error('児童追加サーバーエラー詳細:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
        } catch (error) {
            console.error('児童追加エラー:', error);
            this.showAlert(`児童の追加に失敗しました: ${error.message}`, 'error');
        } finally {
            // ボタンを元に戻す
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    }

    loadStudentsTable(filteredStudents = null) {
        const tbody = document.getElementById('studentsTableBody');
        tbody.innerHTML = '';

        // フィルター済みの配列が渡されていない場合は全児童を使用
        const studentsToDisplay = filteredStudents || this.students;

        // 学籍番号順にソート
        const sortedStudents = [...studentsToDisplay].sort((a, b) => {
            // 学籍番号で比較（文字列として）
            const idA = String(a.id || '');
            const idB = String(b.id || '');
            return idA.localeCompare(idB, 'ja', { numeric: true });
        });

        sortedStudents.forEach(student => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${student.id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${student.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${student.grade}年生</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${student.class}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="status-badge ${student.active ? 'status-active' : 'status-inactive'}">
                        ${student.active ? '在籍' : '退学'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="app.toggleStudentStatus('${student.id}')" 
                            class="text-indigo-600 hover:text-indigo-900 mr-3">
                        ${student.active ? '退学' : '復学'}
                    </button>
                    <button onclick="app.viewStudentHealth('${student.id}')" 
                            class="text-green-600 hover:text-green-900 mr-3">
                        健康履歴
                    </button>
                    <button onclick="app.deleteStudent('${student.id}')" 
                            class="text-red-600 hover:text-red-900">
                        削除
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // 統計情報を更新（フィルター適用時も正しい表示件数を反映）
        this.updateStudentStats(studentsToDisplay.length);
    }

    filterStudentsTable() {
        const searchText = document.getElementById('searchStudentInput').value.toLowerCase().trim();
        const filterGrade = document.getElementById('filterStudentGrade').value;
        const filterClass = document.getElementById('filterStudentClass').value.toLowerCase().trim();
        const filterStatus = document.getElementById('filterStudentStatus').value;

        let filteredStudents = this.students.filter(student => {
            // 検索テキストフィルター（学籍番号または氏名）
            const matchesSearch = !searchText || 
                (student.id && student.id.toLowerCase().includes(searchText)) ||
                (student.name && student.name.toLowerCase().includes(searchText));

            // 学年フィルター
            const matchesGrade = !filterGrade || 
                student.grade === parseInt(filterGrade);

            // クラスフィルター
            const matchesClass = !filterClass || 
                (student.class && student.class.toLowerCase().includes(filterClass));

            // 状態フィルター
            let matchesStatus = true;
            if (filterStatus === 'active') {
                matchesStatus = student.active === true;
            } else if (filterStatus === 'inactive') {
                matchesStatus = student.active === false;
            }

            return matchesSearch && matchesGrade && matchesClass && matchesStatus;
        });

        this.loadStudentsTable(filteredStudents);
    }

    clearStudentFilter() {
        document.getElementById('searchStudentInput').value = '';
        document.getElementById('filterStudentGrade').value = '';
        document.getElementById('filterStudentClass').value = '';
        document.getElementById('filterStudentStatus').value = '';
        this.loadStudentsTable();
    }

    updateStudentStats(displayedCount = null) {
        const totalCount = this.students.length;
        const activeCount = this.students.filter(s => s.active).length;
        const inactiveCount = totalCount - activeCount;
        
        // 表示件数が指定されていない場合は全件数
        const displayed = displayedCount !== null ? displayedCount : totalCount;

        // 統計情報を更新
        const totalElement = document.getElementById('totalStudentsCount');
        const activeElement = document.getElementById('activeStudentsCount');
        const inactiveElement = document.getElementById('inactiveStudentsCount');
        const displayedElement = document.getElementById('displayedStudentsCount');

        if (totalElement) totalElement.textContent = totalCount;
        if (activeElement) activeElement.textContent = activeCount;
        if (inactiveElement) inactiveElement.textContent = inactiveCount;
        if (displayedElement) displayedElement.textContent = displayed;

        // localStorage使用量を計算
        this.updateStorageInfo();
    }

    updateStorageInfo() {
        try {
            // localStorageの使用量を計算（概算）
            let totalSize = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length + key.length;
                }
            }
            
            // 通常localStorageは5-10MBの制限
            const maxSize = 5 * 1024 * 1024; // 5MB（保守的な見積もり）
            const usedMB = (totalSize / 1024 / 1024).toFixed(2);
            const maxMB = (maxSize / 1024 / 1024).toFixed(0);
            const percentage = ((totalSize / maxSize) * 100).toFixed(1);

            const remainingElement = document.getElementById('remainingCapacity');
            if (remainingElement) {
                if (percentage < 50) {
                    remainingElement.innerHTML = `<span class="text-green-600">十分</span>`;
                } else if (percentage < 80) {
                    remainingElement.innerHTML = `<span class="text-yellow-600">注意</span>`;
                } else {
                    remainingElement.innerHTML = `<span class="text-red-600">残少</span>`;
                }
                remainingElement.nextElementSibling.textContent = `${usedMB}MB / ${maxMB}MB 使用中 (${percentage}%)`;
            }
        } catch (error) {
            console.error('ストレージ情報の更新エラー:', error);
        }
    }

    async toggleStudentStatus(studentId) {
        try {
            const student = this.students.find(s => s.id === studentId);
            if (!student) return;

            const updatedData = { ...student, active: !student.active };
            
            const response = await fetch(`tables/students/${student.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedData)
            });

            if (response.ok) {
                student.active = !student.active;
                this.loadStudentsTable();
                this.showAlert(`${student.name}の状態を更新しました`, 'success');
                this.updateDashboard();
            }
        } catch (error) {
            console.error('状態更新エラー:', error);
            this.showAlert('状態の更新に失敗しました', 'error');
        }
    }

    async deleteStudent(studentId) {
        const student = this.students.find(s => s.id === studentId);
        if (!student) return;

        // 確認ダイアログ
        if (!confirm(`本当に「${student.name}（${student.grade}年${student.class}）」を削除しますか？\n\nこの操作は取り消せません。削除すると以下のデータも失われます：\n- 健康記録\n- 相談記録`)) {
            return;
        }

        // 二重確認
        if (!confirm(`最終確認：「${student.name}」のすべてのデータを完全に削除します。本当によろしいですか？`)) {
            return;
        }

        try {
            // 児童データを削除
            const response = await fetch(`tables/students/${studentId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('削除に失敗しました');
            }

            // 関連する健康記録を削除
            const healthRecordsToDelete = this.healthRecords.filter(r => r.student_id === studentId);
            for (const record of healthRecordsToDelete) {
                try {
                    await fetch(`tables/health_records/${record.id}`, {
                        method: 'DELETE'
                    });
                } catch (error) {
                    console.warn('健康記録の削除に失敗:', error);
                }
            }

            // 関連する相談記録を削除
            const consultationsToDelete = this.consultations.filter(c => c.student_id === studentId);
            for (const consultation of consultationsToDelete) {
                try {
                    await fetch(`tables/consultations/${consultation.id}`, {
                        method: 'DELETE'
                    });
                } catch (error) {
                    console.warn('相談記録の削除に失敗:', error);
                }
            }

            // データを再読み込み
            await this.loadData();
            this.loadStudentsTable();
            this.showAlert(`${student.name}を削除しました`, 'success');
            this.updateDashboard();

        } catch (error) {
            console.error('児童削除エラー:', error);
            this.showAlert('削除に失敗しました', 'error');
        }
    }

    async deleteAllStudents() {
        const totalCount = this.students.length;
        
        if (totalCount === 0) {
            this.showAlert('削除する児童がいません', 'warning');
            return;
        }

        // 第1段階：警告メッセージ
        const warning = `⚠️ 全児童削除の警告 ⚠️\n\n` +
            `現在登録されている ${totalCount}名の児童とその関連データをすべて削除します。\n\n` +
            `削除される内容：\n` +
            `- 児童データ: ${totalCount}名\n` +
            `- 健康記録: ${this.healthRecords.length}件\n` +
            `- 相談記録: ${this.consultations.length}件\n\n` +
            `⚠️ この操作は取り消せません ⚠️\n\n` +
            `本当に全削除を実行しますか？`;

        if (!confirm(warning)) {
            return;
        }

        // 第2段階：確認用テキスト入力
        const confirmText = prompt(
            '全削除を実行するには「全削除」と入力してください：'
        );

        if (confirmText !== '全削除') {
            this.showAlert('削除がキャンセルされました', 'info');
            return;
        }

        // 第3段階：最終確認
        if (!confirm(`最終確認：本当に ${totalCount}名の児童とすべての関連データを削除しますか？\n\nこの操作は絶対に取り消せません。`)) {
            return;
        }

        try {
            let deletedCount = 0;
            let errorCount = 0;

            // 削除処理の進捗表示
            this.showAlert(`削除処理を開始します...（${totalCount}名）`, 'info');

            // すべての児童を削除
            for (const student of this.students) {
                try {
                    const response = await fetch(`tables/students/${student.id}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        deletedCount++;
                    } else {
                        errorCount++;
                    }
                } catch (error) {
                    errorCount++;
                }
            }

            // すべての健康記録を削除
            for (const record of this.healthRecords) {
                try {
                    await fetch(`tables/health_records/${record.id}`, {
                        method: 'DELETE'
                    });
                } catch (error) {
                    console.warn('健康記録の削除エラー:', error);
                }
            }

            // すべての相談記録を削除
            for (const consultation of this.consultations) {
                try {
                    await fetch(`tables/consultations/${consultation.id}`, {
                        method: 'DELETE'
                    });
                } catch (error) {
                    console.warn('相談記録の削除エラー:', error);
                }
            }

            // データを再読み込み
            await this.loadData();
            this.loadStudentsTable();
            this.updateDashboard();

            if (errorCount === 0) {
                this.showAlert(`全児童を削除しました（${deletedCount}名）`, 'success');
            } else {
                this.showAlert(`削除完了（成功: ${deletedCount}名、失敗: ${errorCount}名）`, 'warning');
            }

        } catch (error) {
            console.error('一括削除エラー:', error);
            this.showAlert('一括削除に失敗しました', 'error');
        }
    }

    viewStudentHealth(studentId) {
        const student = this.students.find(s => s.id === studentId);
        if (student) {
            this.showView('records');
            document.getElementById('filterStudent').value = studentId;
            this.filterRecords();
        }
    }

    // 記録一覧機能
    populateFilterSelect(selectedGrade = null) {
        const select = document.getElementById('filterStudent');
        select.innerHTML = '<option value="">全員</option>';
        
        let studentsToShow = this.students.filter(student => student.active);
        
        // 学年が選択されている場合はその学年のみ表示
        if (selectedGrade) {
            studentsToShow = studentsToShow.filter(student => student.grade === parseInt(selectedGrade));
        }
        
        studentsToShow
            .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
            .forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = `${student.grade}年${student.class} ${student.name}`;
                select.appendChild(option);
            });
    }

    filterRecords() {
        const dateFrom = document.getElementById('dateFrom').value;
        const dateTo = document.getElementById('dateTo').value;
        const studentId = document.getElementById('filterStudent').value;
        const grade = document.getElementById('filterGrade').value;

        let filteredRecords = [...this.healthRecords];

        // 学年フィルター
        if (grade) {
            filteredRecords = filteredRecords.filter(record => {
                const student = this.students.find(s => s.id === record.student_id);
                return student && student.grade === parseInt(grade);
            });
        }

        // 日付フィルター
        if (dateFrom) {
            filteredRecords = filteredRecords.filter(record => {
                const recordDate = new Date(record.date).toISOString().split('T')[0];
                return recordDate >= dateFrom;
            });
        }

        if (dateTo) {
            filteredRecords = filteredRecords.filter(record => {
                const recordDate = new Date(record.date).toISOString().split('T')[0];
                return recordDate <= dateTo;
            });
        }

        // 児童フィルター
        if (studentId) {
            filteredRecords = filteredRecords.filter(record => record.student_id === studentId);
        }

        this.displayRecords(filteredRecords);
    }

    loadRecordsTable() {
        this.displayRecords(this.healthRecords);
    }

    displayRecords(records) {
        const tbody = document.getElementById('recordsTableBody');
        tbody.innerHTML = '';

        records
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .forEach(record => {
                const student = this.students.find(s => s.id === record.student_id);
                const studentName = student ? student.name : '不明';
                const date = new Date(record.date);
                const temperature = record.temperature ? `${record.temperature}°C` : '-';
                const symptoms = Array.isArray(record.symptoms) ? record.symptoms.join(', ') : record.symptoms || '-';
                
                // 体温による色分け
                let tempClass = 'temp-normal';
                if (record.temperature >= 37.5) tempClass = 'temp-high';
                else if (record.temperature >= 37.0) tempClass = 'temp-slight';

                const studentGrade = student ? `${student.grade}年生` : '-';
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${date.toLocaleDateString('ja-JP')} ${date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            ${studentGrade}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${studentName}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm ${tempClass}">${temperature}</td>
                    <td class="px-6 py-4 text-sm text-gray-900">
                        ${symptoms.split(', ').map(symptom => 
                            symptom !== '-' ? `<span class="symptom-mild">${symptom}</span>` : '-'
                        ).join('')}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${record.mood || '-'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${record.stress_level || '-'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${record.recorded_by || '-'}</td>
                `;
                tbody.appendChild(row);
            });

        if (records.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="7" class="px-6 py-4 text-center text-sm text-gray-500">
                    記録が見つかりませんでした
                </td>
            `;
            tbody.appendChild(row);
        }
    }

    // 認証関連
    checkAuthentication() {
        // TeacherAuthクラスが利用可能かチェック
        if (typeof TeacherAuth === 'undefined') {
            // 認証システムが読み込まれていない場合、teacher-login.jsを動的に読み込み
            this.loadAuthScript();
            return false;
        }
        
        // 認証状態をチェック
        if (!TeacherAuth.checkAuthStatus()) {
            this.redirectToLogin();
            return false;
        }
        
        return true;
    }
    
    loadAuthScript() {
        const script = document.createElement('script');
        script.src = 'js/teacher-login.js';
        script.onload = () => {
            // スクリプト読み込み後に再度認証チェック
            if (!TeacherAuth.checkAuthStatus()) {
                this.redirectToLogin();
            }
        };
        document.head.appendChild(script);
    }
    
    redirectToLogin() {
        // 認証が必要なメッセージを表示してからリダイレクト
        alert('教員認証が必要です。ログイン画面に移動します。');
        window.location.href = 'teacher-login.html';
    }
    
    setupTeacherInfo() {
        // 現在ログイン中の教員情報を表示
        const currentTeacher = TeacherAuth.getCurrentTeacher();
        if (currentTeacher) {
            const teacherInfo = document.querySelector('.text-sm.text-gray-600:last-child');
            if (teacherInfo) {
                teacherInfo.textContent = `教員: ${currentTeacher}`;
            }
        }
    }
    
    logout() {
        if (confirm('ログアウトしますか？')) {
            TeacherAuth.logout();
        }
    }

    // 相談管理機能
    async loadConsultationsData() {
        try {
            const response = await fetch('tables/consultations?limit=10000');
            if (response.ok) {
                const data = await response.json();
                this.consultations = data.data || [];
                console.log(`📚 相談データ読み込み: ${this.consultations.length}件`);
            }
        } catch (error) {
            console.error('相談データの読み込みに失敗:', error);
        }
    }

    populateConsultationFilters() {
        const teacherFilter = document.getElementById('teacherFilter');
        if (teacherFilter) {
            teacherFilter.innerHTML = '<option value="">全員</option>';
            this.teachers
                .filter(teacher => teacher.active)
                .forEach(teacher => {
                    const option = document.createElement('option');
                    option.value = teacher.id;
                    option.textContent = `${teacher.name}（${teacher.subject}）`;
                    teacherFilter.appendChild(option);
                });
        }
    }

    updateConsultationStats() {
        const newCount = this.consultations.filter(c => c.status === '新規').length;
        const inProgressCount = this.consultations.filter(c => c.status === '対応中').length;
        const resolvedCount = this.consultations.filter(c => c.status === '解決済み').length;
        const totalCount = this.consultations.length;

        const newEl = document.getElementById('newConsultationsCount');
        const inProgressEl = document.getElementById('inProgressCount');
        const resolvedEl = document.getElementById('resolvedCount');
        const totalEl = document.getElementById('totalConsultationsCount');

        if (newEl) newEl.textContent = newCount;
        if (inProgressEl) inProgressEl.textContent = inProgressCount;
        if (resolvedEl) resolvedEl.textContent = resolvedCount;
        if (totalEl) totalEl.textContent = totalCount;
    }

    loadConsultationsTable() {
        this.displayConsultations(this.consultations);
    }

    displayConsultations(consultations) {
        const tbody = document.getElementById('consultationsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        consultations
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .forEach(consultation => {
                const student = this.students.find(s => s.id === consultation.student_id);
                const teacher = this.teachers.find(t => t.id === consultation.teacher_id);
                const studentName = student ? student.name : '不明';
                const teacherName = teacher ? teacher.name : '不明';
                const date = new Date(consultation.date);
                
                // ステータスによる色分け
                let statusClass = 'bg-gray-100 text-gray-800';
                if (consultation.status === '新規') statusClass = 'bg-red-100 text-red-800';
                else if (consultation.status === '確認済み') statusClass = 'bg-blue-100 text-blue-800';
                else if (consultation.status === '対応中') statusClass = 'bg-yellow-100 text-yellow-800';
                else if (consultation.status === '解決済み') statusClass = 'bg-green-100 text-green-800';

                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50';
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${date.toLocaleDateString('ja-JP')} ${date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${studentName}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${teacherName}</td>
                    <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">${consultation.consultation_content}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 py-1 text-xs font-medium rounded-full ${statusClass}">
                            ${consultation.status}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onclick="app.showConsultationDetail('${consultation.id}')" 
                                class="text-indigo-600 hover:text-indigo-900 mr-3">
                            詳細・返答
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });

        if (consultations.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="6" class="px-6 py-4 text-center text-sm text-gray-500">
                    相談記録が見つかりませんでした
                </td>
            `;
            tbody.appendChild(row);
        }
    }

    filterConsultations() {
        const statusFilter = document.getElementById('statusFilter');
        const teacherFilter = document.getElementById('teacherFilter');
        const dateFrom = document.getElementById('consultationDateFrom');

        if (!statusFilter || !teacherFilter || !dateFrom) return;

        let filteredConsultations = [...this.consultations];

        if (statusFilter.value) {
            filteredConsultations = filteredConsultations.filter(c => c.status === statusFilter.value);
        }

        if (teacherFilter.value) {
            filteredConsultations = filteredConsultations.filter(c => c.teacher_id === teacherFilter.value);
        }

        if (dateFrom.value) {
            filteredConsultations = filteredConsultations.filter(consultation => {
                const consultationDate = new Date(consultation.date).toISOString().split('T')[0];
                return consultationDate >= dateFrom.value;
            });
        }

        this.displayConsultations(filteredConsultations);
    }

    showConsultationDetail(consultationId) {
        const consultation = this.consultations.find(c => c.id === consultationId);
        if (!consultation) return;

        const student = this.students.find(s => s.id === consultation.student_id);
        const teacher = this.teachers.find(t => t.id === consultation.teacher_id);

        // モーダルに情報を設定
        const modalDate = document.getElementById('modalDate');
        const modalStudentName = document.getElementById('modalStudentName');
        const modalTeacherName = document.getElementById('modalTeacherName');
        const modalConsultationContent = document.getElementById('modalConsultationContent');
        const modalStatus = document.getElementById('modalStatus');
        const modalTeacherResponse = document.getElementById('modalTeacherResponse');
        
        if (modalDate) modalDate.textContent = new Date(consultation.date).toLocaleString('ja-JP');
        if (modalStudentName) modalStudentName.textContent = student ? student.name : '不明';
        if (modalTeacherName) modalTeacherName.textContent = teacher ? teacher.name : '不明';
        if (modalConsultationContent) modalConsultationContent.textContent = consultation.consultation_content;
        if (modalStatus) modalStatus.value = consultation.status;
        if (modalTeacherResponse) modalTeacherResponse.value = consultation.teacher_response || '';
        
        // ステータス表示の色分け
        const statusSpan = document.getElementById('modalCurrentStatus');
        if (statusSpan) {
            statusSpan.textContent = consultation.status;
            statusSpan.className = `px-2 py-1 rounded-full text-xs font-medium ${this.getStatusClass(consultation.status)}`;
        }

        // モーダルにconsultationIdを保存
        const modal = document.getElementById('consultationModal');
        if (modal) {
            modal.dataset.consultationId = consultationId;
            this.showConsultationModal();
        }
    }

    getStatusClass(status) {
        switch (status) {
            case '新規': return 'bg-red-100 text-red-800';
            case '確認済み': return 'bg-blue-100 text-blue-800';
            case '対応中': return 'bg-yellow-100 text-yellow-800';
            case '解決済み': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    showConsultationModal() {
        const modal = document.getElementById('consultationModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    hideConsultationModal() {
        const modal = document.getElementById('consultationModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    async saveConsultationResponse() {
        const modal = document.getElementById('consultationModal');
        if (!modal) return;

        const consultationId = modal.dataset.consultationId;
        const consultation = this.consultations.find(c => c.id === consultationId);
        
        if (!consultation) return;

        const modalStatus = document.getElementById('modalStatus');
        const modalTeacherResponse = document.getElementById('modalTeacherResponse');

        if (!modalStatus || !modalTeacherResponse) return;

        const newStatus = modalStatus.value;
        const teacherResponse = modalTeacherResponse.value;

        try {
            const updatedData = {
                ...consultation,
                status: newStatus,
                teacher_response: teacherResponse
            };

            const response = await fetch(`tables/consultations/${consultationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedData)
            });

            if (response.ok) {
                // ローカルデータを更新
                const index = this.consultations.findIndex(c => c.id === consultationId);
                if (index !== -1) {
                    this.consultations[index] = { ...this.consultations[index], status: newStatus, teacher_response: teacherResponse };
                }

                this.hideConsultationModal();
                this.loadConsultationsTable();
                this.updateConsultationStats();
                this.showAlert('相談への対応を保存しました', 'success');
            } else {
                throw new Error('保存に失敗しました');
            }
        } catch (error) {
            console.error('相談対応保存エラー:', error);
            this.showAlert('保存に失敗しました', 'error');
        }
    }

    // Googleスプレッドシート連携
    async exportToGoogleSheets() {
        try {
            const exportData = this.prepareExportData();
            
            // CSV形式でダウンロード（Googleスプレッドシートに手動でインポート可能）
            this.downloadCSV(exportData, 'health_consultations_report.csv');
            
            this.showAlert('データをCSVファイルとしてダウンロードしました。GoogleスプレッドシートでCSVファイルを開いてご利用ください。', 'success');
            
            // Google Sheets APIの使用方法を表示
            this.showGoogleSheetsInstructions();
            
        } catch (error) {
            console.error('エクスポートエラー:', error);
            this.showAlert('エクスポートに失敗しました', 'error');
        }
    }

    prepareExportData() {
        const data = [];
        
        // ヘッダー行
        data.push([
            '日時',
            '児童名',
            '学年',
            'クラス',
            '相談先教員',
            '相談内容',
            'ステータス',
            '教員からの返答',
            '気分',
            'ストレスレベル',
            '症状'
        ]);

        // 相談データと健康データを統合
        this.consultations.forEach(consultation => {
            const student = this.students.find(s => s.id === consultation.student_id);
            const teacher = this.teachers.find(t => t.id === consultation.teacher_id);
            
            // 同日の健康記録を取得
            const consultationDate = new Date(consultation.date).toISOString().split('T')[0];
            const healthRecord = this.healthRecords.find(hr => 
                hr.student_id === consultation.student_id && 
                new Date(hr.date).toISOString().split('T')[0] === consultationDate
            );

            data.push([
                new Date(consultation.date).toLocaleString('ja-JP'),
                student ? student.name : '不明',
                student ? `${student.grade}年生` : '',
                student ? student.class : '',
                teacher ? teacher.name : '不明',
                consultation.consultation_content,
                consultation.status,
                consultation.teacher_response || '',
                healthRecord ? healthRecord.mood : '',
                healthRecord ? healthRecord.stress_level : '',
                healthRecord && healthRecord.symptoms ? healthRecord.symptoms.join(', ') : ''
            ]);
        });

        return data;
    }

    downloadCSV(data, filename) {
        const csvContent = data.map(row => 
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    showGoogleSheetsInstructions() {
        const instructions = `📊 Googleスプレッドシートへの取り込み手順:

1. Google Driveにアクセス
2. 「新規」→「Googleスプレッドシート」
3. 「ファイル」→「インポート」
4. ダウンロードしたCSVファイルを選択
5. 「データのインポート」をクリック

📈 便利な活用方法:
• グラフやピボットテーブルでの分析
• 他の教員との共有
• 定期レポートの作成`;
        
        alert(instructions);
    }

    // ユーティリティ機能
    showAlert(message, type = 'info') {
        // 既存のアラートを削除
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;

        // タイプ別のスタイル設定
        if (type === 'info') {
            alert.style.cssText = `
                position: fixed; top: 20px; right: 20px; z-index: 1000;
                background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd;
                padding: 12px 16px; border-radius: 8px; max-width: 300px;
                font-size: 14px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            `;
        } else if (type === 'success') {
            alert.style.cssText = `
                position: fixed; top: 20px; right: 20px; z-index: 1000;
                background: #dcfce7; color: #166534; border: 1px solid #86efac;
                padding: 12px 16px; border-radius: 8px; max-width: 300px;
                font-size: 14px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            `;
        } else if (type === 'error') {
            alert.style.cssText = `
                position: fixed; top: 20px; right: 20px; z-index: 1000;
                background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5;
                padding: 12px 16px; border-radius: 8px; max-width: 300px;
                font-size: 14px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            `;
        }

        // メインコンテンツの最初に挿入
        const main = document.querySelector('main');
        main.insertBefore(alert, main.firstChild);

        // 3秒後に自動削除
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 3000);
    }

    // ======================
    // 教員管理機能
    // ======================

    async loadTeachersData() {
        try {
            console.log('教員データを読み込み中...');
            const response = await fetch('tables/teachers');
            console.log('教員API応答:', response.status, response.statusText);
            
            if (response.ok) {
                const data = await response.json();
                this.teachers = data.data || [];
                console.log('教員データ読み込み成功:', this.teachers.length, '名');
                console.log('教員データ詳細:', this.teachers);
            } else {
                const errorText = await response.text();
                console.error('教員データ読み込みエラー詳細:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
        } catch (error) {
            console.error('教員データの読み込みに失敗しました:', error);
            this.showAlert('教員データの読み込みに失敗しました: ' + error.message, 'error');
        }
    }

    loadTeachersTable() {
        const tbody = document.getElementById('teachersTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.teachers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-4 text-center text-gray-500">
                        教員データがありません。「教員を追加」ボタンから新しい教員を登録してください。
                    </td>
                </tr>
            `;
            return;
        }

        this.teachers.forEach(teacher => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${teacher.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${teacher.grade || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${teacher.subject}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${teacher.position || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${teacher.email || '-'}<br>
                    ${teacher.phone || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${new Date(teacher.created_at).toLocaleDateString('ja-JP')}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="window.app.editTeacher('${teacher.id}')" 
                            class="text-indigo-600 hover:text-indigo-900 mr-3">
                        <i class="fas fa-edit"></i> 編集
                    </button>
                    <button onclick="window.app.deleteTeacher('${teacher.id}')" 
                            class="text-red-600 hover:text-red-900">
                        <i class="fas fa-trash"></i> 削除
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // 統計情報を更新
        this.updateTeacherStats();
    }

    updateTeacherStats() {
        const total = this.teachers.length;
        const classTeachers = this.teachers.filter(t => t.position === '担任').length;
        const subjectTeachers = this.teachers.filter(t => t.position === '専科教員').length;
        const adminTeachers = this.teachers.filter(t => ['校長', '教頭', '主任'].includes(t.position)).length;

        document.getElementById('totalTeachers').textContent = total;
        document.getElementById('classTeachers').textContent = classTeachers;
        document.getElementById('subjectTeachers').textContent = subjectTeachers;
        document.getElementById('adminTeachers').textContent = adminTeachers;

        // 情報テキストを更新
        document.getElementById('teachersInfo').textContent = `${total}人の教員が登録されています`;
    }

    showAddTeacherModal() {
        console.log('教員追加モーダル表示');
        this.currentTeacherId = null;
        document.getElementById('teacherModalTitle').textContent = '教員を追加';
        document.getElementById('saveTeacher').textContent = '追加';
        document.getElementById('teacherForm').reset();
        document.getElementById('teacherModal').classList.remove('hidden');
    }

    hideTeacherModal() {
        document.getElementById('teacherModal').classList.add('hidden');
        this.currentTeacherId = null;
    }

    async handleTeacherSubmit(e) {
        e.preventDefault();

        // ボタンをローディング状態に
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        const formData = new FormData(e.target);
        const teacherName = document.getElementById('teacherName').value.trim();

        // バリデーション
        if (!teacherName) {
            this.showAlert('教員名を入力してください', 'error');
            return;
        }
        
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>保存中...';
        submitBtn.disabled = true;

        // シンプルな教員データ（名前のみ必須、他はデフォルト値）
        const teacherData = {
            name: teacherName,
            subject: '担当教科未設定',  // デフォルト値
            active: true  // 新規教員は有効
        };

        console.log('教員データ送信:', teacherData);

        try {
            // タイムアウトは削除（二重送信の原因となるため）
            console.log('💾 教員データ保存開始...');
            
            let response;
            if (this.currentTeacherId) {
                // 更新時は既存データを保持し、名前のみ更新
                const existingTeacher = this.teachers.find(t => t.id === this.currentTeacherId);
                const updateData = {
                    ...existingTeacher,  // 既存データを保持
                    name: teacherName    // 名前のみ更新
                };
                response = await fetch(`tables/teachers/${this.currentTeacherId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                });
            } else {
                // 新規追加
                console.log('新規教員追加リクエスト:', 'tables/teachers');
                response = await fetch('tables/teachers', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(teacherData)
                });
            }

            console.log('サーバー応答:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                url: response.url
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ 教員保存成功:', result);
                
                // メモリ内のデータを更新（DBから再取得せず高速化）
                if (this.currentTeacherId) {
                    // 更新の場合
                    const index = this.teachers.findIndex(t => t.id === this.currentTeacherId);
                    if (index !== -1) {
                        this.teachers[index] = result;
                    }
                } else {
                    // 新規追加の場合
                    this.teachers.push(result);
                }
                
                // UI即座更新（再読み込み不要）
                this.hideTeacherModal();
                this.loadTeachersTable();
                this.showAlert(
                    this.currentTeacherId ? '教員情報を更新しました' : '教員を追加しました', 
                    'success'
                );
            } else {
                const errorText = await response.text();
                console.error('サーバーエラー詳細:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
        } catch (error) {
            console.error('教員保存エラー:', error);
            this.showAlert(`保存に失敗しました: ${error.message}`, 'error');
        } finally {
            // ボタンを元に戻す
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    }

    editTeacher(teacherId) {
        const teacher = this.teachers.find(t => t.id === teacherId);
        if (!teacher) return;

        this.currentTeacherId = teacherId;
        document.getElementById('teacherModalTitle').textContent = '教員情報を編集';
        document.getElementById('saveTeacher').textContent = '保存';

        // フォームに既存データを設定
        document.getElementById('teacherName').value = teacher.name || '';

        document.getElementById('teacherModal').classList.remove('hidden');
    }

    deleteTeacher(teacherId) {
        const teacher = this.teachers.find(t => t.id === teacherId);
        if (!teacher) return;

        this.currentDeleteTeacherId = teacherId;
        document.getElementById('deleteTeacherInfo').textContent = 
            `${teacher.name} ${teacher.subject ? '(' + teacher.subject + ')' : ''}`;
        document.getElementById('deleteTeacherModal').classList.remove('hidden');
    }

    hideDeleteTeacherModal() {
        document.getElementById('deleteTeacherModal').classList.add('hidden');
        this.currentDeleteTeacherId = null;
    }

    async confirmDeleteTeacher() {
        if (!this.currentDeleteTeacherId) return;

        try {
            const response = await fetch(`tables/teachers/${this.currentDeleteTeacherId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                console.log('✅ 教員削除成功:', this.currentDeleteTeacherId);
                
                // メモリ内のデータから削除（DBから再取得せず高速化）
                this.teachers = this.teachers.filter(t => t.id !== this.currentDeleteTeacherId);
                
                this.hideDeleteTeacherModal();
                this.loadTeachersTable();
                this.showAlert('教員を削除しました', 'success');
            } else {
                throw new Error('削除に失敗しました');
            }
        } catch (error) {
            console.error('教員削除エラー:', error);
            this.showAlert('削除に失敗しました', 'error');
        }
    }

    searchTeachers() {
        const nameSearch = document.getElementById('teacherNameSearch').value.toLowerCase();
        const gradeFilter = document.getElementById('gradeFilter').value;

        let filteredTeachers = this.teachers;

        if (nameSearch) {
            filteredTeachers = filteredTeachers.filter(teacher => 
                teacher.name.toLowerCase().includes(nameSearch)
            );
        }

        if (gradeFilter) {
            filteredTeachers = filteredTeachers.filter(teacher => 
                teacher.grade === gradeFilter
            );
        }

        // フィルター結果でテーブルを更新
        const tbody = document.getElementById('teachersTableBody');
        tbody.innerHTML = '';

        if (filteredTeachers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-4 text-center text-gray-500">
                        検索条件に一致する教員が見つかりません。
                    </td>
                </tr>
            `;
            return;
        }

        filteredTeachers.forEach(teacher => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${teacher.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${teacher.grade || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${teacher.subject}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${teacher.position || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${teacher.email || '-'}<br>
                    ${teacher.phone || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${new Date(teacher.created_at).toLocaleDateString('ja-JP')}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="window.app.editTeacher('${teacher.id}')" 
                            class="text-indigo-600 hover:text-indigo-900 mr-3">
                        <i class="fas fa-edit"></i> 編集
                    </button>
                    <button onclick="window.app.deleteTeacher('${teacher.id}')" 
                            class="text-red-600 hover:text-red-900">
                        <i class="fas fa-trash"></i> 削除
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // 検索結果の統計を表示
        document.getElementById('teachersInfo').textContent = 
            `${filteredTeachers.length}人の教員が見つかりました（全${this.teachers.length}人中）`;
    }

    exportTeachersToCSV() {
        if (this.teachers.length === 0) {
            this.showAlert('エクスポートする教員データがありません', 'error');
            return;
        }

        // CSVヘッダー
        const headers = [
            '教員名', '担当学年', '担当クラス', '担当教科', '役職', 
            'メールアドレス', '電話番号', '備考', '登録日'
        ];

        // CSVデータを生成
        const csvData = [headers];
        this.teachers.forEach(teacher => {
            csvData.push([
                teacher.name || '',
                teacher.grade || '',
                teacher.class || '',
                teacher.subject || '',
                teacher.position || '',
                teacher.email || '',
                teacher.phone || '',
                teacher.notes || '',
                new Date(teacher.created_at).toLocaleDateString('ja-JP')
            ]);
        });

        // CSVファイル生成
        const csvContent = csvData.map(row => 
            row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        // BOMを追加（Excelでの文字化け防止）
        const bom = '\uFEFF';
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });

        // ダウンロード
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        link.setAttribute('download', `教員名簿_${dateStr}.csv`);
        
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showAlert('教員データをCSVファイルでエクスポートしました', 'success');
    }

    // ======================
    // CSV一括登録機能
    // ======================

    exportStudentsCSV() {
        try {
            // 在籍中の児童のみをエクスポート
            const activeStudents = this.students.filter(s => s.active);
            
            if (activeStudents.length === 0) {
                this.showAlert('エクスポートする児童がいません', 'warning');
                return;
            }

            // CSVヘッダー
            const headers = ['学籍番号', '氏名', '学年', 'クラス'];
            const csvRows = [headers.join(',')];

            // データ行を追加（学年・クラス順にソート）
            const sortedStudents = activeStudents.sort((a, b) => {
                if (a.grade !== b.grade) {
                    return a.grade - b.grade;
                }
                return a.class.localeCompare(b.class, 'ja');
            });

            sortedStudents.forEach(student => {
                const row = [
                    student.id || '',
                    student.name || '',
                    student.grade || '',
                    student.class || ''
                ];
                // カンマやダブルクォートを含むフィールドをエスケープ
                const escapedRow = row.map(field => {
                    const fieldStr = String(field);
                    if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n')) {
                        return `"${fieldStr.replace(/"/g, '""')}"`;
                    }
                    return fieldStr;
                });
                csvRows.push(escapedRow.join(','));
            });

            // CSV文字列を生成
            const csvContent = csvRows.join('\n');
            
            // BOM付きUTF-8でBlobを作成（Excelで文字化けしないように）
            const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
            const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
            
            // ダウンロード
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            const now = new Date();
            const timestamp = now.toISOString().split('T')[0].replace(/-/g, '');
            const filename = `児童名簿_${timestamp}.csv`;
            
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            
            // クリーンアップ
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);
            
            this.showAlert(`児童名簿をエクスポートしました（${activeStudents.length}名）`, 'success');
            
        } catch (error) {
            console.error('CSVエクスポートエラー:', error);
            this.showAlert('CSVエクスポートに失敗しました', 'error');
        }
    }

    importStudentsCSV() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.style.display = 'none';
        
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                console.log('📄 CSVファイル読み込み完了:', text.length, '文字');
                console.log('📄 CSVファイルの行数:', text.split('\n').length, '行');
                
                const students = this.parseStudentsCSV(text);
                console.log('✅ CSV解析完了:', students.length, '名の児童データ');
                
                // 最初の3件と最後の3件を表示
                if (students.length > 0) {
                    console.log('📊 最初の3件:', students.slice(0, 3));
                    console.log('📊 最後の3件:', students.slice(-3));
                }
                
                if (students.length === 0) {
                    this.showAlert('有効なデータが見つかりませんでした', 'error');
                    return;
                }

                // 動作モード確認
                const useFirebase = localStorage.getItem('use_firebase') === 'true';
                const modeText = useFirebase ? 'Firebase（クラウドDB）' : 'localStorage（ブラウザ内保存）';
                
                // 確認ダイアログ
                if (!confirm(`${students.length}名の児童を一括登録します。\n\n【動作モード】${modeText}\n\n処理には時間がかかる場合があります。\nよろしいですか？`)) {
                    document.body.removeChild(input);
                    return;
                }
                
                console.log('CSV一括登録開始:', students.length, '名', `(モード: ${modeText})`);
                
                // localStorage容量チェック
                const storageCheck = this.checkStorageCapacity(students);
                if (!storageCheck.canStore) {
                    this.showAlert(
                        `⚠️ ストレージ容量不足\n\n` +
                        `必要容量: 約${storageCheck.estimatedSize}MB\n` +
                        `空き容量: 約${storageCheck.availableSize}MB\n\n` +
                        `一部データを削除してから再度お試しください。`,
                        'error'
                    );
                    document.body.removeChild(input);
                    return;
                }

                // 進捗表示用の要素を作成
                const progressDiv = this.createProgressIndicator();
                document.body.appendChild(progressDiv);

                // データ登録（Firebaseバッチ書き込みで高速化）
                let successCount = 0;
                let errorCount = 0;

                // Firebase Adapterが利用可能かチェック
                if (useFirebase && window.firebaseAdapter && typeof window.firebaseAdapter.batchCreate === 'function') {
                    console.log('🚀 Firebaseバッチ書き込みモードで一括登録開始...');
                    
                    try {
                        // 進捗更新（処理中）
                        this.updateProgressIndicator(progressDiv, 1, 1, 0, students.length);
                        
                        // Firebaseバッチ書き込み実行
                        const result = await window.firebaseAdapter.batchCreate('students', students, 500);
                        
                        successCount = result.success;
                        errorCount = result.failed;
                        
                        if (result.errors.length > 0) {
                            console.error('❌ バッチ書き込みエラー詳細:', result.errors);
                        }
                        
                        console.log(`✅ Firebaseバッチ書き込み完了: 成功=${successCount}名, 失敗=${errorCount}名`);
                        
                    } catch (error) {
                        console.error('❌ Firebaseバッチ書き込みエラー:', error);
                        errorCount = students.length;
                    }
                    
                } else {
                    // localStorageモードまたはバッチ機能がない場合は従来の方法
                    console.log('📝 通常モードで一括登録開始...');
                    
                    const batchSize = 10; // 同時に処理する件数
                    const totalBatches = Math.ceil(students.length / batchSize);

                    for (let i = 0; i < students.length; i += batchSize) {
                        const batch = students.slice(i, i + batchSize);
                        const currentBatch = Math.floor(i / batchSize) + 1;
                        
                        console.log(`バッチ ${currentBatch}/${totalBatches} 処理開始 (${i+1}～${Math.min(i+batchSize, students.length)}名)`);
                        
                        // 進捗更新
                        this.updateProgressIndicator(
                            progressDiv, 
                            currentBatch, 
                            totalBatches, 
                            successCount + errorCount, 
                            students.length
                        );

                        // バッチを並列処理（タイムアウト削除で二重送信防止）
                        const promises = batch.map((student, index) => {
                            return fetch('tables/students', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify(student)
                            })
                            .then(response => {
                                if (response.ok) {
                                    successCount++;
                                    console.log(`✓ 登録成功: ${student.id} ${student.name}`);
                                    return true;
                                } else {
                                    errorCount++;
                                    console.error(`✗ 登録失敗: ${student.id} ${student.name}`, response.status);
                                    return false;
                                }
                            })
                            .catch(error => {
                                console.error(`✗ 登録エラー: ${student.id} ${student.name}`, error.message);
                                errorCount++;
                                return false;
                            });
                        });

                        try {
                            await Promise.all(promises);
                            console.log(`バッチ ${currentBatch} 完了: 成功=${successCount}, 失敗=${errorCount}`);
                        } catch (batchError) {
                            console.error(`バッチ ${currentBatch} でエラー発生:`, batchError);
                            // エラーがあっても次のバッチに進む
                        }
                    }
                    
                    console.log(`CSV一括登録完了: 成功=${successCount}名, 失敗=${errorCount}名`);
                }

                // 進捗表示を削除
                if (progressDiv && progressDiv.parentNode) {
                    document.body.removeChild(progressDiv);
                }

                // メモリ内のデータに追加（再読み込み不要で高速化）
                console.log('📝 メモリ内データを更新中...');
                students.forEach(student => {
                    // 既存データに同じIDがない場合のみ追加
                    if (!this.students.find(s => s.id === student.id)) {
                        this.students.push(student);
                    }
                });
                console.log(`✅ メモリ更新完了: 現在${this.students.length}名`);
                
                // UI更新（再読み込み不要）
                this.loadStudentsTable();
                this.updateDashboard();
                
                // 結果表示
                if (errorCount === 0) {
                    this.showAlert(`✅ 児童を一括登録しました（${successCount}名）`, 'success');
                } else {
                    this.showAlert(`⚠️ 一括登録完了（成功: ${successCount}名、失敗: ${errorCount}名）`, 'warning');
                }

            } catch (error) {
                console.error('CSV読み込みエラー:', error);
                this.showAlert('CSVファイルの読み込みに失敗しました', 'error');
            }
            
            document.body.removeChild(input);
        });
        
        document.body.appendChild(input);
        input.click();
    }

    createProgressIndicator() {
        const div = document.createElement('div');
        div.id = 'csvProgressIndicator';
        div.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        div.innerHTML = `
            <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                <h3 class="text-xl font-bold text-gray-900 mb-4">
                    <i class="fas fa-spinner fa-spin mr-2"></i>
                    CSV一括登録中...
                </h3>
                <div class="mb-4">
                    <div class="flex justify-between text-sm text-gray-600 mb-2">
                        <span id="progressText">準備中...</span>
                        <span id="progressPercent">0%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-4">
                        <div id="progressBar" class="bg-blue-600 h-4 rounded-full transition-all duration-300" style="width: 0%"></div>
                    </div>
                </div>
                <p class="text-sm text-gray-500 text-center">
                    このウィンドウは処理完了後に自動的に閉じます
                </p>
            </div>
        `;
        return div;
    }

    updateProgressIndicator(progressDiv, currentBatch, totalBatches, processed, total) {
        const progressBar = progressDiv.querySelector('#progressBar');
        const progressText = progressDiv.querySelector('#progressText');
        const progressPercent = progressDiv.querySelector('#progressPercent');
        
        const percentage = Math.floor((processed / total) * 100);
        
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `${processed} / ${total}名 処理中（バッチ ${currentBatch} / ${totalBatches}）`;
        progressPercent.textContent = `${percentage}%`;
    }

    parseStudentsCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        const students = [];
        
        console.log(`CSV総行数: ${lines.length}行（ヘッダー含む）`);
        
        // ヘッダー行をスキップ
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) {
                console.log(`${i+1}行目: 空行をスキップ`);
                continue;
            }
            
            // より正確なCSVパース（カンマ区切り、ダブルクォート対応）
            const columns = this.parseCSVLine(line);
            
            if (columns.length >= 4) {
                const student = {
                    id: columns[0],
                    name: columns[1],
                    grade: parseInt(columns[2]),
                    class: columns[3],
                    active: true
                };
                students.push(student);
                
                if (i <= 3 || i >= lines.length - 2) {
                    // 最初の3件と最後の2件のみログ出力
                    console.log(`${i}行目: ${student.id} ${student.name} ${student.grade}年 ${student.class}`);
                } else if (i === 4) {
                    console.log('... (中略) ...');
                }
            } else {
                console.warn(`${i+1}行目: データ不足（${columns.length}列）`, columns);
            }
        }
        
        console.log(`CSV解析結果: ${students.length}名の児童データを取得`);
        return students;
    }

    parseCSVLine(line) {
        // CSV行を正確にパース（カンマ区切り、ダブルクォート対応）
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result.map(col => col.replace(/^"|"$/g, ''));
    }

    checkStorageCapacity(students) {
        // 現在のlocalStorage使用量を計算
        let currentSize = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                currentSize += localStorage[key].length + key.length;
            }
        }
        
        // 新規データのサイズを推定（1人あたり約1KB）
        const estimatedNewDataSize = students.length * 1024;
        
        // localStorageの制限（ブラウザにより異なるが、5MBと仮定）
        const maxSize = 5 * 1024 * 1024;
        const availableSize = maxSize - currentSize;
        
        console.log('ストレージ容量チェック:', {
            現在の使用量: `${(currentSize / 1024 / 1024).toFixed(2)}MB`,
            新規データ推定: `${(estimatedNewDataSize / 1024 / 1024).toFixed(2)}MB`,
            空き容量: `${(availableSize / 1024 / 1024).toFixed(2)}MB`,
            登録可能: estimatedNewDataSize < availableSize
        });
        
        return {
            canStore: estimatedNewDataSize < availableSize,
            estimatedSize: (estimatedNewDataSize / 1024 / 1024).toFixed(2),
            availableSize: (availableSize / 1024 / 1024).toFixed(2)
        };
    }

    importTeachersCSV() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.style.display = 'none';
        
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const teachers = this.parseTeachersCSV(text);
                
                if (teachers.length === 0) {
                    this.showAlert('有効なデータが見つかりませんでした', 'error');
                    return;
                }

                // データ登録
                let successCount = 0;
                let errorCount = 0;

                for (const teacher of teachers) {
                    try {
                        const response = await fetch('tables/teachers', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify(teacher)
                        });

                        if (response.ok) {
                            successCount++;
                        } else {
                            errorCount++;
                        }
                    } catch (error) {
                        errorCount++;
                    }
                }

                await this.loadTeachersData();
                this.loadTeachersTable();
                this.showAlert(`教員を一括登録しました（成功: ${successCount}件、失敗: ${errorCount}件）`, 'success');

            } catch (error) {
                console.error('CSV読み込みエラー:', error);
                this.showAlert('CSVファイルの読み込みに失敗しました', 'error');
            }
            
            document.body.removeChild(input);
        });
        
        document.body.appendChild(input);
        input.click();
    }

    parseTeachersCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        const teachers = [];
        
        // ヘッダー行をスキップ
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const columns = line.split(',').map(col => col.trim().replace(/^"|"$/g, ''));
            
            if (columns.length >= 1) {
                teachers.push({
                    name: columns[0],
                    grade: columns[1] || '',
                    class: columns[2] || '',
                    subject: columns[3] || '担当教科未設定',
                    position: columns[4] || '',
                    email: columns[5] || '',
                    phone: columns[6] || '',
                    notes: columns[7] || '',
                    active: true
                });
            }
        }
        
        return teachers;
    }

    // ======================
    // 静的データ管理機能
    // ======================
    
    exportStaticData() {
        if (window.staticDataManager) {
            window.staticDataManager.exportData();
            this.showAlert('全データをバックアップファイルとしてダウンロードしました', 'success');
        } else {
            this.showAlert('静的データマネージャーが利用できません', 'error');
        }
    }

    importStaticData() {
        // ファイル選択ダイアログを作成
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';
        
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);
                
                if (window.staticDataManager && window.staticDataManager.importData(data)) {
                    // データ再読み込み
                    await this.loadData();
                    this.updateDashboard();
                    this.loadStudentsTable();
                    this.loadTeachersTable();
                    this.loadRecordsTable();
                    this.loadConsultationsTable();
                    
                    this.showAlert('バックアップデータを復元しました', 'success');
                } else {
                    throw new Error('データの復元に失敗しました');
                }
            } catch (error) {
                console.error('データインポートエラー:', error);
                this.showAlert('ファイル形式が正しくないか、復元に失敗しました', 'error');
            }
            
            // ファイル入力要素を削除
            document.body.removeChild(input);
        });
        
        document.body.appendChild(input);
        input.click();
    }
}

// アプリケーション初期化
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new HealthManagementSystem();
});



// グローバル関数（HTMLから呼び出し用）
window.app = {
    toggleStudentStatus: (studentId) => app.toggleStudentStatus(studentId),
    viewStudentHealth: (studentId) => app.viewStudentHealth(studentId),
    showConsultationDetail: (consultationId) => app.showConsultationDetail(consultationId),
    editTeacher: (teacherId) => app.editTeacher(teacherId),
    deleteTeacher: (teacherId) => app.deleteTeacher(teacherId)
};