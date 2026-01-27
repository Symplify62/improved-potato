document.addEventListener('DOMContentLoaded', () => {
    // --- 状态与自选器 ---
    let records = JSON.parse(localStorage.getItem('accounting_records')) || [];
    let currentType = 'expense';

    const els = {
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
        saveBtn: document.getElementById('save-btn')
    };

    // --- 核心功能 ---

    // 格式化金额
    const fmt = (num) => `¥ ${parseFloat(num).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // 更新视图
    function updateUI() {
        // 计算统计
        const income = records.reduce((acc, r) => r.type === 'income' ? acc + r.amount : acc, 0);
        const expense = records.reduce((acc, r) => r.type === 'expense' ? acc + r.amount : acc, 0);
        const balance = income - expense;

        els.totalBalance.textContent = fmt(balance);
        els.monthlyIncome.textContent = income.toFixed(2);
        els.monthlyExpense.textContent = expense.toFixed(2);

        // 渲染列表
        if (records.length === 0) {
            els.emptyState.style.display = 'block';
            els.recordsList.innerHTML = '';
        } else {
            els.emptyState.style.display = 'none';
            els.recordsList.innerHTML = records
                .sort((a, b) => b.id - a.id)
                .map(r => `
                    <div class="record-item">
                        <div class="record-info">
                            <span class="note">${r.note || (r.type === 'income' ? '日常收入' : '日常支出')}</span>
                            <span class="date">${new Date(r.id).toLocaleDateString()}</span>
                        </div>
                        <div class="record-amount ${r.type}">
                            ${r.type === 'income' ? '+' : '-'}${r.amount.toFixed(2)}
                            <button class="delete-btn" onclick="deleteRecord(${r.id})">&times;</button>
                        </div>
                    </div>
                `).join('');
        }

        localStorage.setItem('accounting_records', JSON.stringify(records));
    }

    // 删除记录 (暴露给全局以便 onclick 调用)
    window.deleteRecord = function (id) {
        if (confirm('确定删除这笔账目？')) {
            records = records.filter(r => r.id !== id);
            updateUI();
        }
    };

    // --- 事件监听 ---

    // 打开/关闭模态框
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
    els.saveBtn.addEventListener('click', () => {
        const val = parseFloat(els.amountInput.value);
        if (!val || val <= 0) {
            alert('输入有效的金额');
            return;
        }

        const newRecord = {
            id: Date.now(),
            type: currentType,
            amount: val,
            note: els.noteInput.value.trim()
        };

        records.push(newRecord);
        updateUI();

        // 重置并关闭
        els.amountInput.value = '';
        els.noteInput.value = '';
        els.modal.classList.remove('active');
    });

    // 点击蒙层关闭
    els.modal.addEventListener('click', (e) => {
        if (e.target === els.modal) els.modal.classList.remove('active');
    });

    // 初始化
    updateUI();
});
