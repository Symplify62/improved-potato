document.addEventListener('DOMContentLoaded', () => {
    // --- Supabase 客户端 ---
    // 动态获取 supabase 客户端，因为可能在脚本加载时还没初始化
    function getSupabase() {
        return window.supabaseClient;
    }

    // --- 状态 ---
    let records = [];
    let currentType = 'expense';
    let currentUser = null;
    let isLoginMode = true; // true = 登录, false = 注册

    // --- DOM 元素 ---
    const els = {
        // 记账相关
        totalBalance: document.getElementById('total-balance'),
        monthlyExpense: document.getElementById('monthly-expense'),
        monthlyIncome: document.getElementById('monthly-income'),
        recordsList: document.getElementById('records-list'),
        emptyState: document.getElementById('empty-state'),
        addTrigger: document.getElementById('add-trigger'),
        modal: document.getElementById('modal-overlay'),
        closeModal: document.getElementById('close-modal'),
        typeBtns: document.querySelectorAll('.type-btn'),
        amountInput: document.getElementById('amount-input'),
        noteInput: document.getElementById('note-input'),
        saveBtn: document.getElementById('save-btn'),
        // 用户认证相关
        userBar: document.getElementById('user-bar'),
        userInfo: document.getElementById('user-info'),
        authBtn: document.getElementById('auth-btn'),
        authModal: document.getElementById('auth-modal'),
        closeAuth: document.getElementById('close-auth'),
        authTitle: document.getElementById('auth-title'),
        emailInput: document.getElementById('email-input'),
        passwordInput: document.getElementById('password-input'),
        authSubmit: document.getElementById('auth-submit'),
        switchText: document.getElementById('switch-text'),
        switchAuth: document.getElementById('switch-auth'),
        authError: document.getElementById('auth-error')
    };

    // --- 工具函数 ---
    const fmt = (num) => `¥ ${parseFloat(num).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    function showError(msg) {
        els.authError.textContent = msg;
        els.authError.style.display = 'block';
        setTimeout(() => {
            els.authError.style.display = 'none';
        }, 3000);
    }

    // --- 用户认证 ---

    // 初始化认证状态监听
    async function initAuth() {
        const supabase = getSupabase();
        if (!supabase) {
            console.error('Supabase 客户端未初始化');
            loadRecordsFromLocal();
            return;
        }

        // 检查当前会话
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            currentUser = session.user;
            updateUserUI();
            await loadRecordsFromSupabase();
        } else {
            loadRecordsFromLocal();
        }

        // 监听认证状态变化
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                currentUser = session.user;
                updateUserUI();
                // 登录后同步本地数据到云端，然后加载云端数据
                await syncLocalToCloud();
                await loadRecordsFromSupabase();
            } else if (event === 'SIGNED_OUT') {
                currentUser = null;
                updateUserUI();
                loadRecordsFromLocal();
            }
        });
    }

    function updateUserUI() {
        if (currentUser) {
            els.userInfo.textContent = currentUser.email;
            els.authBtn.textContent = '退出';
        } else {
            els.userInfo.textContent = '未登录（数据仅保存在本地）';
            els.authBtn.textContent = '登录';
        }
    }

    // 登录
    async function signIn(email, password) {
        const supabase = getSupabase();
        if (!supabase) {
            showError('连接失败，请刷新页面重试');
            return false;
        }
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) {
            showError(error.message);
            return false;
        }
        return true;
    }

    // 注册
    async function signUp(email, password) {
        const supabase = getSupabase();
        if (!supabase) {
            showError('连接失败，请刷新页面重试');
            return false;
        }
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });
        if (error) {
            showError(error.message);
            return false;
        }
        // 提示用户检查邮箱确认
        showError('注册成功！请查看邮箱完成验证。');
        return true;
    }

    // 登出
    async function signOut() {
        const supabase = getSupabase();
        if (supabase) {
            await supabase.auth.signOut();
        }
    }

    // --- 数据操作 ---

    // 从本地加载（未登录时使用）
    function loadRecordsFromLocal() {
        records = JSON.parse(localStorage.getItem('accounting_records')) || [];
        updateUI();
    }

    // 从 Supabase 加载（已登录时使用）
    async function loadRecordsFromSupabase() {
        const supabase = getSupabase();
        if (!supabase) return;

        const { data, error } = await supabase
            .from('records')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('加载数据失败:', error);
            return;
        }

        records = data.map(r => ({
            id: r.id,
            type: r.type,
            amount: parseFloat(r.amount),
            note: r.note,
            created_at: r.created_at
        }));
        updateUI();
    }

    // 将本地数据同步到云端（首次登录时）
    async function syncLocalToCloud() {
        const supabase = getSupabase();
        if (!supabase) return;

        const localRecords = JSON.parse(localStorage.getItem('accounting_records')) || [];
        if (localRecords.length === 0) return;

        for (const r of localRecords) {
            await supabase.from('records').insert({
                user_id: currentUser.id,
                type: r.type,
                amount: r.amount,
                note: r.note
            });
        }
        // 同步完成后清除本地数据
        localStorage.removeItem('accounting_records');
    }

    // 保存记录
    async function saveRecord(type, amount, note) {
        if (currentUser) {
            // 已登录：保存到 Supabase
            const supabase = getSupabase();
            if (!supabase) {
                alert('连接失败，请刷新页面重试');
                return false;
            }
            const { data, error } = await supabase.from('records').insert({
                user_id: currentUser.id,
                type,
                amount,
                note
            }).select();

            if (error) {
                console.error('保存失败:', error);
                alert('保存失败，请重试');
                return false;
            }

            const newRecord = {
                id: data[0].id,
                type: data[0].type,
                amount: parseFloat(data[0].amount),
                note: data[0].note,
                created_at: data[0].created_at
            };
            records.unshift(newRecord);
        } else {
            // 未登录：保存到 localStorage
            const newRecord = {
                id: Date.now(),
                type,
                amount,
                note
            };
            records.unshift(newRecord);
            localStorage.setItem('accounting_records', JSON.stringify(records));
        }
        updateUI();
        return true;
    }

    // 删除记录
    async function deleteRecord(id) {
        if (!confirm('确定删除这笔账目？')) return;

        if (currentUser) {
            const supabase = getSupabase();
            if (!supabase) {
                alert('连接失败，请刷新页面重试');
                return;
            }
            const { error } = await supabase.from('records').delete().eq('id', id);
            if (error) {
                console.error('删除失败:', error);
                alert('删除失败，请重试');
                return;
            }
        }

        records = records.filter(r => r.id !== id);

        if (!currentUser) {
            localStorage.setItem('accounting_records', JSON.stringify(records));
        }
        updateUI();
    }

    // 暴露给全局
    window.deleteRecord = deleteRecord;

    // --- 更新视图 ---
    function updateUI() {
        const income = records.reduce((acc, r) => r.type === 'income' ? acc + r.amount : acc, 0);
        const expense = records.reduce((acc, r) => r.type === 'expense' ? acc + r.amount : acc, 0);
        const balance = income - expense;

        els.totalBalance.textContent = fmt(balance);
        els.monthlyIncome.textContent = income.toFixed(2);
        els.monthlyExpense.textContent = expense.toFixed(2);

        if (records.length === 0) {
            els.emptyState.style.display = 'block';
            els.recordsList.innerHTML = '';
        } else {
            els.emptyState.style.display = 'none';
            els.recordsList.innerHTML = records.map(r => `
                <div class="record-item">
                    <div class="record-info">
                        <span class="note">${r.note || (r.type === 'income' ? '日常收入' : '日常支出')}</span>
                        <span class="date">${new Date(r.created_at || r.id).toLocaleDateString()}</span>
                    </div>
                    <div class="record-amount ${r.type}">
                        ${r.type === 'income' ? '+' : '-'}${r.amount.toFixed(2)}
                        <button class="delete-btn" onclick="deleteRecord(${r.id})">&times;</button>
                    </div>
                </div>
            `).join('');
        }
    }

    // --- 事件监听 ---

    // 打开/关闭记账模态框
    els.addTrigger.addEventListener('click', () => {
        els.modal.classList.add('active');
        els.amountInput.focus();
    });

    els.closeModal.addEventListener('click', () => {
        els.modal.classList.remove('active');
    });

    // 类型切换
    els.typeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            els.typeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentType = btn.dataset.type;
        });
    });

    // 保存记录
    els.saveBtn.addEventListener('click', async () => {
        const val = parseFloat(els.amountInput.value);
        if (!val || val <= 0) {
            alert('请输入有效的金额');
            return;
        }

        const success = await saveRecord(currentType, val, els.noteInput.value.trim());
        if (success) {
            els.amountInput.value = '';
            els.noteInput.value = '';
            els.modal.classList.remove('active');
        }
    });

    // 点击蒙层关闭记账模态框
    els.modal.addEventListener('click', (e) => {
        if (e.target === els.modal) els.modal.classList.remove('active');
    });

    // --- 认证相关事件 ---

    // 打开认证模态框
    els.authBtn.addEventListener('click', async () => {
        if (currentUser) {
            // 已登录，执行退出
            await signOut();
        } else {
            // 未登录，打开登录弹窗
            isLoginMode = true;
            updateAuthUI();
            els.authModal.classList.add('active');
            els.emailInput.focus();
        }
    });

    // 关闭认证模态框
    els.closeAuth.addEventListener('click', () => {
        els.authModal.classList.remove('active');
        els.emailInput.value = '';
        els.passwordInput.value = '';
        els.authError.style.display = 'none';
    });

    // 点击蒙层关闭认证模态框
    els.authModal.addEventListener('click', (e) => {
        if (e.target === els.authModal) {
            els.authModal.classList.remove('active');
        }
    });

    // 切换登录/注册
    els.switchAuth.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        updateAuthUI();
    });

    function updateAuthUI() {
        if (isLoginMode) {
            els.authTitle.textContent = '登录';
            els.authSubmit.textContent = '登录';
            els.switchText.textContent = '没有账号？';
            els.switchAuth.textContent = '注册';
        } else {
            els.authTitle.textContent = '注册';
            els.authSubmit.textContent = '注册';
            els.switchText.textContent = '已有账号？';
            els.switchAuth.textContent = '登录';
        }
    }

    // 提交登录/注册
    els.authSubmit.addEventListener('click', async () => {
        const email = els.emailInput.value.trim();
        const password = els.passwordInput.value;

        if (!email || !password) {
            showError('请填写邮箱和密码');
            return;
        }

        if (password.length < 6) {
            showError('密码至少需要6位');
            return;
        }

        let success;
        if (isLoginMode) {
            success = await signIn(email, password);
        } else {
            success = await signUp(email, password);
        }

        if (success && isLoginMode) {
            els.authModal.classList.remove('active');
            els.emailInput.value = '';
            els.passwordInput.value = '';
        }
    });

    // 回车提交
    els.passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            els.authSubmit.click();
        }
    });

    // --- 初始化 ---
    initAuth();
});
