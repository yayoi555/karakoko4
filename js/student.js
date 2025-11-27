// 児童向け健康チェックシステム

class StudentHealthCheck {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 5;
        this.formData = {
            student_id: null,
            symptoms: [],
            stress_level: null,
            mood: null,
            has_consultation: false,
            consultation_topics: [],
            consultation_content: null,
            consultation_teacher: null
        };
        this.students = [];
        this.teachers = [];
        
        this.init();
    }

    async init() {
        await this.loadStudents();
        await this.loadTeachers();
        this.setupEventListeners();
        this.showLoginSection();
    }

    async loadStudents() {
        try {
            const response = await fetch('tables/students');
            if (response.ok) {
                const data = await response.json();
                this.students = data.data.filter(student => student.active);
                console.log('児童データを読み込みました:', this.students.length, '名');
            }
        } catch (error) {
            console.error('児童データの読み込みに失敗:', error);
            this.showMessage('データの よみこみに しっぱいしました', 'error');
        }
    }

    async loadTeachers() {
        try {
            const response = await fetch('tables/teachers');
            if (response.ok) {
                const data = await response.json();
                this.teachers = data.data || [];
                console.log('教員データを読み込みました:', this.teachers.length, '名');
                console.log('教員リスト:', this.teachers.map(t => ({id: t.id, name: t.name})));
            }
        } catch (error) {
            console.error('教員データの読み込みに失敗:', error);
            this.showMessage('せんせいの データの よみこみに しっぱいしました', 'error');
        }
    }

    setupEventListeners() {
        // ログイン関連
        document.getElementById('gradeSelect').addEventListener('change', () => this.updateClassSelect());
        document.getElementById('classSelect').addEventListener('change', () => this.updateStudentSelect());
        document.getElementById('studentSelect').addEventListener('change', () => this.updateLoginButton());
        document.getElementById('loginBtn').addEventListener('click', () => this.handleLogin());

        // 健康チェック関連
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
        document.getElementById('prevBtn').addEventListener('click', () => this.previousStep());
        document.getElementById('nextBtn').addEventListener('click', () => this.nextStep());
        document.getElementById('studentHealthForm').addEventListener('submit', (e) => this.handleSubmit(e));

        // ステップ1: 気分選択
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectMood(btn));
        });

        // ステップ2: ストレス選択
        document.querySelectorAll('.stress-star').forEach(star => {
            star.addEventListener('click', () => this.selectStress(star));
        });

        // ステップ3: 症状選択
        document.querySelectorAll('input[name="symptoms"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateSymptoms());
        });

        // ステップ4: 相談選択
        document.querySelectorAll('.consultation-choice').forEach(btn => {
            btn.addEventListener('click', () => this.selectConsultationChoice(btn));
        });

        // ステップ4: 先生へのメッセージ
        document.getElementById('messageToTeacher').addEventListener('input', () => {
            this.updateMessage();
        });

        // 完了画面
        // document.getElementById('checkAgainBtn').addEventListener('click', () => this.resetForm());
        // document.getElementById('goToTeacherBtn').addEventListener('click', () => {
        //     if (confirm('教員用システムにアクセスするには認証が必要です。ログイン画面に移動しますか？')) {
        //         window.location.href = 'teacher-login.html';
        //     }
        // });
    }

    // ログイン機能
    updateClassSelect() {
        const grade = parseInt(document.getElementById('gradeSelect').value);
        const classSelect = document.getElementById('classSelect');
        const studentSelect = document.getElementById('studentSelect');
        
        // クラス選択をリセット
        classSelect.innerHTML = '<option value="">えらんでね</option>';
        classSelect.disabled = !grade;
        
        // 名前選択もリセット
        studentSelect.innerHTML = '<option value="">さきに がくねんと くみを えらんでね</option>';
        studentSelect.disabled = true;

        if (grade) {
            // 選択された学年の児童を取得
            const gradeStudents = this.students.filter(student => student.grade === grade);
            
            // クラスのリストを取得（重複を除く）
            const classes = [...new Set(gradeStudents.map(student => student.class))].sort((a, b) => {
                return a.localeCompare(b, 'ja', { numeric: true });
            });
            
            // クラスの選択肢を追加
            classes.forEach(className => {
                const option = document.createElement('option');
                option.value = className;
                option.textContent = `${className}`;
                classSelect.appendChild(option);
            });
        }

        this.updateLoginButton();
    }

    updateStudentSelect() {
        const grade = parseInt(document.getElementById('gradeSelect').value);
        const selectedClass = document.getElementById('classSelect').value;
        const studentSelect = document.getElementById('studentSelect');
        
        studentSelect.innerHTML = '<option value="">なまえを えらんでね</option>';
        studentSelect.disabled = !grade || !selectedClass;

        if (grade && selectedClass) {
            // 学年とクラスでフィルター
            const filteredStudents = this.students.filter(student => 
                student.grade === grade && student.class === selectedClass
            );
            
            // 学籍番号順にソート
            filteredStudents
                .sort((a, b) => {
                    const idA = String(a.id || '');
                    const idB = String(b.id || '');
                    return idA.localeCompare(idB, 'ja', { numeric: true });
                })
                .forEach(student => {
                    const option = document.createElement('option');
                    option.value = student.id;
                    option.textContent = student.name; // クラス表示を削除
                    studentSelect.appendChild(option);
                });
        }

        this.updateLoginButton();
    }

    updateLoginButton() {
        const studentId = document.getElementById('studentSelect').value;
        const loginBtn = document.getElementById('loginBtn');
        
        loginBtn.disabled = !studentId;
        
        if (studentId) {
            loginBtn.classList.remove('disabled:bg-gray-300');
            loginBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
        } else {
            loginBtn.classList.add('disabled:bg-gray-300');
            loginBtn.classList.remove('bg-blue-500', 'hover:bg-blue-600');
        }
    }

    handleLogin() {
        const studentId = document.getElementById('studentSelect').value;
        if (!studentId) return;

        const student = this.students.find(s => s.id === studentId);
        if (student) {
            this.formData.student_id = studentId;
            document.getElementById('studentName').textContent = student.name;
            this.showHealthCheckSection();
            this.playSuccessSound();
        }
    }

    handleLogout() {
        this.showLoginSection();
        this.resetForm();
    }

    // セクション表示制御
    showLoginSection() {
        this.hideAllSections();
        document.getElementById('loginSection').classList.remove('hidden');
    }

    showHealthCheckSection() {
        this.hideAllSections();
        document.getElementById('healthCheckSection').classList.remove('hidden');
        this.showStep(1);
    }

    showCompleteSection() {
        this.hideAllSections();
        document.getElementById('completeSection').classList.remove('hidden');
        this.playCompletionSound();
    }

    hideAllSections() {
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('healthCheckSection').classList.add('hidden');
        document.getElementById('completeSection').classList.add('hidden');
    }

    // ステップ管理
    showStep(step) {
        // 全ステップを非表示
        for (let i = 1; i <= this.totalSteps; i++) {
            document.getElementById(`step${i}`).classList.add('hidden');
        }

        // 指定されたステップを表示
        document.getElementById(`step${step}`).classList.remove('hidden');
        this.currentStep = step;

        // プログレスバー更新
        const progress = (step / this.totalSteps) * 100;
        document.getElementById('progressBar').style.width = `${progress}%`;
        document.getElementById('currentStep').textContent = step;

        // ボタンの表示/非表示制御
        this.updateNavigationButtons();

        // ステップ4の場合は相談エリアの初期化
        if (step === 4) {
            this.setupConsultationStep();
        }
        
        // ステップ5の場合は確認画面を更新
        if (step === 5) {
            this.updateConfirmation();
        }
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const submitBtn = document.getElementById('submitBtn');

        // 前へボタン
        prevBtn.disabled = this.currentStep === 1;

        // 次へボタンと送信ボタン
        if (this.currentStep === this.totalSteps) {
            nextBtn.classList.add('hidden');
            submitBtn.classList.remove('hidden');
        } else {
            nextBtn.classList.remove('hidden');
            submitBtn.classList.add('hidden');
            nextBtn.disabled = !this.canProceedToNextStep();
        }
    }

    canProceedToNextStep() {
        switch (this.currentStep) {
            case 1: return true; // 症状は任意
            case 2: return this.formData.stress_level !== null;
            case 3: return this.formData.mood !== null;
            case 4: 
                if (!this.formData.has_consultation) return true; // 相談しない場合
                // 相談する場合は先生の選択が必須、トピックまたは内容のどちらかが必要
                return this.formData.consultation_teacher && 
                       (this.formData.consultation_topics.length > 0 || this.formData.consultation_content);
            case 5: return true;
            default: return false;
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.showStep(this.currentStep - 1);
        }
    }

    nextStep() {
        if (this.currentStep < this.totalSteps && this.canProceedToNextStep()) {
            this.showStep(this.currentStep + 1);
            this.playClickSound();
        }
    }

    populateTeacherSelect() {
        const select = document.getElementById('teacherSelect');
        console.log('教員選択肢を生成中:', {
            selectElement: !!select,
            teachersCount: this.teachers.length,
            teachers: this.teachers.map(t => t.name)
        });
        
        if (select) {
            select.innerHTML = '<option value="">せんせいを えらんでね</option>';
            
            this.teachers
                .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
                .forEach(teacher => {
                    const option = document.createElement('option');
                    option.value = teacher.id;
                    option.textContent = `${teacher.name}せんせい${teacher.class_in_charge ? `（${teacher.class_in_charge}）` : ''}`;
                    select.appendChild(option);
                    console.log('教員オプションを追加:', teacher.name);
                });
        } else {
            console.error('教員選択セレクトボックスが見つかりません');
        }
    }

    setupConsultationStep() {
        // 相談内容とのリアルタイム同期（少し遅延させて要素の存在を確認）
        setTimeout(() => {
            const consultationContent = document.getElementById('consultationContent');
            const teacherSelect = document.getElementById('teacherSelect');
            const topicCheckboxes = document.querySelectorAll('input[name="consultation_topics"]');
            
            // チェックボックスのイベントリスナーを設定
            topicCheckboxes.forEach(checkbox => {
                // 既存のリスナーを削除するため、一度クローンして置き換える
                const newCheckbox = checkbox.cloneNode(true);
                checkbox.parentNode.replaceChild(newCheckbox, checkbox);
                
                newCheckbox.addEventListener('change', () => {
                    this.updateConsultationTopics();
                    this.updateNavigationButtons();
                });
                
                // ラベルクリックでチェックボックスの表示を更新
                const label = newCheckbox.closest('label');
                if (label) {
                    label.addEventListener('click', (e) => {
                        // チェックボックスの状態変更後にスタイルを更新
                        setTimeout(() => {
                            const div = label.querySelector('div');
                            if (newCheckbox.checked) {
                                div.classList.add('border-4', 'ring-4', 'ring-offset-2');
                                div.classList.remove('border-2');
                            } else {
                                div.classList.remove('border-4', 'ring-4', 'ring-offset-2');
                                div.classList.add('border-2');
                            }
                        }, 10);
                    });
                }
            });
            
            if (consultationContent) {
                consultationContent.addEventListener('input', () => {
                    this.formData.consultation_content = consultationContent.value.trim() || null;
                    this.updateNavigationButtons();
                });
            }
            
            if (teacherSelect) {
                teacherSelect.addEventListener('change', () => {
                    this.formData.consultation_teacher = teacherSelect.value || null;
                    this.updateNavigationButtons();
                });
            }
        }, 100);
    }

    updateConsultationTopics() {
        const checkedTopics = Array.from(document.querySelectorAll('input[name="consultation_topics"]:checked'))
            .map(cb => cb.value);
        this.formData.consultation_topics = checkedTopics;
    }

    selectConsultationChoice(button) {
        // 他のボタンの選択を解除
        document.querySelectorAll('.consultation-choice').forEach(btn => {
            btn.classList.remove('active');
        });

        // 選択されたボタンをアクティブに
        button.classList.add('active');
        const choice = button.dataset.choice;
        
        this.formData.has_consultation = (choice === 'have');
        
        // 相談エリアの表示/非表示
        const consultationArea = document.getElementById('consultationArea');
        if (choice === 'have') {
            consultationArea.classList.remove('hidden');
            this.populateTeacherSelect();
        } else {
            consultationArea.classList.add('hidden');
            this.formData.consultation_content = null;
            this.formData.consultation_teacher = null;
        }
        
        this.updateNavigationButtons();
        this.playClickSound();

        // 相談しない場合は自動で次のステップへ
        if (choice === 'none') {
            setTimeout(() => {
                if (this.canProceedToNextStep()) {
                    this.nextStep();
                }
            }, 800);
        }
    }

    // 入力処理
    selectMood(button) {
        // 他のボタンの選択を解除
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // 選択されたボタンをアクティブに
        button.classList.add('active');
        this.formData.mood = button.dataset.mood;
        
        this.updateNavigationButtons();
        this.playClickSound();
        
        // 自動進行を削除し、「つぎへ」ボタンで手動進行
    }

    selectStress(star) {
        const level = parseInt(star.dataset.level);
        this.formData.stress_level = level;

        // 星の表示を更新
        document.querySelectorAll('.stress-star').forEach((s, index) => {
            if (index < level) {
                s.classList.add('active');
            } else {
                s.classList.remove('active');
            }
        });

        // メッセージを更新
        const messages = [
            '★を えらんでね',
            'とても げんき！',
            'げんき',
            'ふつう',
            'すこし つかれた',
            'とても つかれた'
        ];
        document.getElementById('stressMessage').textContent = messages[level];

        this.updateNavigationButtons();
        this.playClickSound();
        
        // 自動進行を削除し、「つぎへ」ボタンで手動進行
    }

    updateSymptoms() {
        const checkedSymptoms = Array.from(document.querySelectorAll('input[name="symptoms"]:checked'))
            .map(cb => cb.value);
        this.formData.symptoms = checkedSymptoms;

        // 「げんき」が選択された場合、他の症状を無効にする
        const healthyOption = document.querySelector('input[value="げんき"]');
        const otherOptions = document.querySelectorAll('input[name="symptoms"]:not([value="げんき"])');

        if (healthyOption.checked) {
            otherOptions.forEach(option => {
                option.checked = false;
                option.parentElement.classList.add('opacity-50');
            });
            this.formData.symptoms = ['げんき'];
        } else {
            otherOptions.forEach(option => {
                option.parentElement.classList.remove('opacity-50');
            });
        }

        this.updateNavigationButtons();
        this.playClickSound();
    }

    updateConfirmation() {
        // 気分
        document.getElementById('confirmMood').textContent = this.formData.mood || '-';

        // ストレス
        const stressLabels = ['', 'とても げんき', 'げんき', 'ふつう', 'すこし つかれた', 'とても つかれた'];
        document.getElementById('confirmStress').textContent = 
            this.formData.stress_level ? stressLabels[this.formData.stress_level] : '-';

        // 症状
        const symptomsText = this.formData.symptoms.length > 0 
            ? this.formData.symptoms.join(', ')
            : 'とくに なし';
        document.getElementById('confirmSymptoms').textContent = symptomsText;

        // 相談内容
        let consultationText = 'そうだんは ありません';
        if (this.formData.has_consultation) {
            const teacher = this.teachers.find(t => t.id === this.formData.consultation_teacher);
            const teacherName = teacher ? `${teacher.name}せんせい` : '（せんせい みせんたく）';
            
            // トピックと自由記述を組み合わせる
            let contentParts = [];
            if (this.formData.consultation_topics.length > 0) {
                contentParts.push(this.formData.consultation_topics.join('、'));
            }
            if (this.formData.consultation_content) {
                contentParts.push(this.formData.consultation_content);
            }
            const content = contentParts.length > 0 ? contentParts.join(' - ') : '（ないよう みにゅうりょく）';
            
            consultationText = `${teacherName}に そうだん: ${content}`;
        }
        document.getElementById('confirmConsultation').textContent = consultationText;
    }

    // フォーム送信
    async handleSubmit(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.innerHTML;
        
        // ローディング状態にする
        const startTime = Date.now();
        submitBtn.innerHTML = '<div class="loading-spinner mr-2"></div>おくっています...';
        submitBtn.disabled = true;
        
        // 動作モードをログ出力
        const useFirebase = localStorage.getItem('use_firebase') === 'true';
        console.log(`📤 送信開始: ${useFirebase ? 'Firebaseモード' : 'localStorageモード'}`);
        
        // 経過時間リアルタイム表示
        let elapsedSeconds = 0;
        const timerInterval = setInterval(() => {
            elapsedSeconds++;
            if (elapsedSeconds <= 3) {
                submitBtn.innerHTML = `<div class="loading-spinner mr-2"></div>おくっています... (${elapsedSeconds}びょう)`;
            } else if (elapsedSeconds <= 10) {
                submitBtn.innerHTML = `<div class="loading-spinner mr-2"></div>もうすこし まってね... (${elapsedSeconds}びょう)`;
            } else if (elapsedSeconds <= 20) {
                submitBtn.innerHTML = `<div class="loading-spinner mr-2"></div>もうちょっと まってね... (${elapsedSeconds}びょう)`;
            } else {
                submitBtn.innerHTML = `<div class="loading-spinner mr-2"></div>もうすぐだよ... (${elapsedSeconds}びょう)`;
            }
            console.log(`⏱️ ${elapsedSeconds}秒経過...`);
        }, 1000);

        try {
            const submissionData = {
                student_id: this.formData.student_id,
                mood: this.formData.mood,
                stress_level: this.formData.stress_level,
                symptoms: this.formData.symptoms.filter(s => s !== 'げんき'), // 「げんき」は症状から除外
                temperature: null, // 児童入力では体温は測定しない
                notes: `児童自身による入力 - 気分: ${this.formData.mood}, ストレス: ${this.formData.stress_level}`,
                recorded_by: '児童本人',
               date: new Date().toISOString(),
                created_at: Date.now(),
                updated_at: Date.now()
            };
            // 並列処理用のPromise配列
            const promises = [];

            // 健康記録を保存
            promises.push(
                fetch('tables/health_records', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(submissionData)
                })
            );

            // 相談がある場合は相談記録も保存（並列処理）
            if (this.formData.has_consultation && 
                (this.formData.consultation_topics.length > 0 || this.formData.consultation_content) && 
                this.formData.consultation_teacher) {
                
                // トピックと自由記述を組み合わせる
                let contentParts = [];
                if (this.formData.consultation_topics.length > 0) {
                    contentParts.push(`【${this.formData.consultation_topics.join('、')}】`);
                }
                if (this.formData.consultation_content) {
                    contentParts.push(this.formData.consultation_content);
                }
                const combinedContent = contentParts.join(' ');
                
                const consultationData = {
                    student_id: this.formData.student_id,
                    teacher_id: this.formData.consultation_teacher,
                    consultation_content: combinedContent,
                    status: '新規',
                    date: new Date().toISOString(),
                    teacher_response: null
                };

                promises.push(
                    fetch('tables/consultations', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(consultationData)
                    })
                );
            }

            // すべてのリクエストを並列実行（高速化）
            // ※ タイムアウトは削除（二重送信バグの原因だったため）
            console.log(`📡 ${promises.length}件のデータを送信中...`);
            const responses = await Promise.all(promises);
            
            // レスポンスチェック
            if (!responses[0].ok) {
                throw new Error('健康記録の保存に失敗しました');
            }
            
            if (responses.length > 1 && !responses[1].ok) {
                console.warn('相談記録の保存に失敗しましたが、健康記録は保存されました');
            }

            // タイマーをクリア
            clearInterval(timerInterval);
            
            // 処理時間をログ出力
            const elapsedTime = Date.now() - startTime;
            const seconds = (elapsedTime / 1000).toFixed(1);
            console.log(`✅ 送信完了: ${elapsedTime}ms (${seconds}秒)`);
            
            // 10秒以上かかった場合は警告
            if (elapsedTime > 10000) {
                console.warn(`⚠️ 送信に${seconds}秒かかりました。localStorageモードへの切り替えを推奨します。`);
            }

            this.showCompleteSection();
            this.showMessage('けんこうチェックが おわりました！', 'success');

        } catch (error) {
            // タイマーをクリア
            clearInterval(timerInterval);
            
            const elapsedTime = Date.now() - startTime;
            console.error('❌ 送信エラー:', error);
            console.error(`失敗までの時間: ${elapsedTime}ms`);
            
            this.showMessage('おくることが できませんでした。せんせいに おしえてね', 'error');
            
            // ボタンを元に戻す
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    resetForm() {
        this.formData = {
            student_id: null,
            symptoms: [],
            stress_level: null,
            mood: null,
            has_consultation: false,
            consultation_topics: [],
            consultation_content: null,
            consultation_teacher: null
        };
        this.currentStep = 1;

        // フォーム要素をリセット
        document.getElementById('gradeSelect').value = '';
        document.getElementById('classSelect').innerHTML = '<option value="">さきに がくねんを えらんでね</option>';
        document.getElementById('classSelect').disabled = true;
        document.getElementById('studentSelect').innerHTML = '<option value="">さきに がくねんと くみを えらんでね</option>';
        document.getElementById('studentSelect').disabled = true;
        
        document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.stress-star').forEach(star => star.classList.remove('active'));
        document.querySelectorAll('input[name="symptoms"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('input[name="consultation_topics"]').forEach(cb => {
            cb.checked = false;
            const label = cb.closest('label');
            if (label) {
                const div = label.querySelector('div');
                if (div) {
                    div.classList.remove('border-4', 'ring-4', 'ring-offset-2');
                    div.classList.add('border-2');
                }
            }
        });
        document.querySelectorAll('.consultation-choice').forEach(btn => btn.classList.remove('active'));
        document.getElementById('stressMessage').textContent = '★を えらんでね';
        
        // 相談エリアを非表示にする
        const consultationArea = document.getElementById('consultationArea');
        if (consultationArea) {
            consultationArea.classList.add('hidden');
        }
        
        // 相談フィールドをクリア
        const consultationContent = document.getElementById('consultationContent');
        const teacherSelect = document.getElementById('teacherSelect');
        if (consultationContent) consultationContent.value = '';
        if (teacherSelect) teacherSelect.value = '';
        
        // 相談トピックのチェックボックスをクリア
        document.querySelectorAll('input[name="consultation_topics"]').forEach(cb => {
            cb.checked = false;
            const label = cb.closest('label');
            if (label) {
                const div = label.querySelector('div');
                if (div) {
                    div.classList.remove('border-4', 'ring-4', 'ring-offset-2');
                    div.classList.add('border-2');
                }
            }
        });

        this.showLoginSection();
    }

    // ユーティリティ機能
    showMessage(message, type = 'info') {
        // 既存のメッセージを削除
        const existingMessage = document.querySelector('.alert-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `alert-message fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-4 rounded-2xl text-white font-bold shadow-lg ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        }`;
        messageDiv.textContent = message;

        document.body.appendChild(messageDiv);

        // アニメーション
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateX(-50%) translateY(-20px)';
        
        setTimeout(() => {
            messageDiv.style.transition = 'all 0.3s ease';
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateX(-50%) translateY(0)';
        }, 10);

        // 3秒後に削除
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translateX(-50%) translateY(-20px)';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 300);
        }, 3000);
    }

    // 音効果（実際の音は実装しないが、将来の拡張用）
    playClickSound() {
        // console.log('クリック音再生');
        // 実際のプロジェクトでは Web Audio API を使用
    }

    playSuccessSound() {
        // console.log('成功音再生');
    }

    playCompletionSound() {
        // console.log('完了音再生');
    }
}

// アプリケーション初期化
let studentApp;
document.addEventListener('DOMContentLoaded', () => {
    studentApp = new StudentHealthCheck();
});

// エラーハンドリング
window.addEventListener('error', (e) => {
    console.error('エラーが発生しました:', e.error);
    if (studentApp) {
        studentApp.showMessage('もんだいが はっせいしました。せんせいに つたえてね', 'error');
    }
});

// オフライン対応
window.addEventListener('online', () => {
    if (studentApp) {
        studentApp.showMessage('インターネットに つながりました', 'success');
    }
});

window.addEventListener('offline', () => {
    if (studentApp) {
        studentApp.showMessage('インターネットが きれています', 'error');
    }
});
