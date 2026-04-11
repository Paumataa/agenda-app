// ====================================
// MONTHLY VIEW
// ====================================

let currentMonth = new Date();
currentMonth.setDate(1);
currentMonth.setHours(0, 0, 0, 0);

let currentEditingTaskId = null;
let allTasks = [];

document.addEventListener('DOMContentLoaded', async () => {
    const session = await checkAuth();
    if (!session) return;
    await renderMonth();
});

// ---- Date helpers ----

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

// ---- Month render ----

async function renderMonth() {
    updateMonthTitle();

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    allTasks = await getTasks(formatDate(firstDay), formatDate(lastDay));
    renderGrid(firstDay, lastDay);
}

function updateMonthTitle() {
    const title = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    document.getElementById('monthTitle').textContent = title;
}

function renderGrid(firstDay, lastDay) {
    const grid = document.getElementById('monthGrid');
    grid.innerHTML = '';

    const today = formatDate(new Date());

    // Monday = 1, so offset: Mon=0, Tue=1, ... Sun=6
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6; // Sunday

    // Fill leading empty cells
    for (let i = 0; i < startOffset; i++) {
        const empty = document.createElement('div');
        empty.className = 'month-cell month-cell-empty';
        grid.appendChild(empty);
    }

    // Fill day cells
    const totalDays = lastDay.getDate();
    for (let d = 1; d <= totalDays; d++) {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d);
        const dateStr = formatDate(date);
        const isToday = dateStr === today;
        const dayTasks = allTasks.filter(t => t.date === dateStr)
            .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));

        const cell = document.createElement('div');
        cell.className = `month-cell${isToday ? ' today' : ''}`;

        const maxVisible = 3;
        const extraCount = dayTasks.length - maxVisible;

        cell.innerHTML = `
            <div class="month-cell-header">
                <span class="month-day-number">${d}</span>
                <button class="month-add-btn" onclick="openTaskModal('${dateStr}')">+</button>
            </div>
            <div class="month-cell-tasks">
                ${dayTasks.slice(0, maxVisible).map(task => `
                    <div class="month-task-pill priority-${task.priority}" onclick="openTaskModal(null, '${task.id}')">
                        ${task.time ? `<span class="month-task-time">${task.time.slice(0,5)}</span>` : ''}
                        <span class="month-task-title">${escapeHtml(task.title)}</span>
                    </div>
                `).join('')}
                ${extraCount > 0 ? `<div class="month-more">+${extraCount} more</div>` : ''}
            </div>
        `;

        grid.appendChild(cell);
    }
}

function navigateMonth(direction) {
    currentMonth.setMonth(currentMonth.getMonth() + direction);
    renderMonth();
}

function goToCurrentMonth() {
    currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    renderMonth();
}

// ---- Task Modal ----

function openTaskModal(date = null, taskId = null) {
    currentEditingTaskId = taskId;
    const isEdit = Boolean(taskId);

    document.getElementById('modalTitle').textContent = isEdit ? 'Edit Task' : 'New Task';
    document.getElementById('saveTaskBtn').textContent = isEdit ? 'Save Changes' : 'Save Task';
    document.getElementById('deleteTaskBtn').style.display = isEdit ? 'block' : 'none';

    if (isEdit) {
        const task = allTasks.find(t => t.id === taskId);
        if (task) {
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskDescription').value = task.description || '';
            document.getElementById('taskDate').value = task.date;
            document.getElementById('taskTime').value = task.time ? task.time.slice(0, 5) : '';
            document.getElementById('taskPriority').value = task.priority;
            document.getElementById('taskCategory').value = task.category;
        }
    } else {
        document.getElementById('taskForm').reset();
        document.getElementById('taskDate').value = date || formatDate(new Date());
        document.getElementById('taskPriority').value = 'medium';
        document.getElementById('taskCategory').value = 'Work';
    }

    document.getElementById('taskModal').classList.add('active');
    document.getElementById('modalOverlay').classList.add('active');
    setTimeout(() => document.getElementById('taskTitle').focus(), 100);
}

function closeTaskModal() {
    document.getElementById('taskModal').classList.remove('active');
    document.getElementById('modalOverlay').classList.remove('active');
    currentEditingTaskId = null;
}

document.getElementById('modalOverlay').addEventListener('click', closeTaskModal);

document.getElementById('taskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveTaskBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const taskData = {
        title: document.getElementById('taskTitle').value.trim(),
        description: document.getElementById('taskDescription').value.trim() || null,
        date: document.getElementById('taskDate').value,
        time: document.getElementById('taskTime').value || null,
        priority: document.getElementById('taskPriority').value,
        category: document.getElementById('taskCategory').value,
        completed: false
    };

    let result;
    if (currentEditingTaskId) {
        result = await updateTask(currentEditingTaskId, taskData);
        if (result) showToast('Task updated!', 'success');
    } else {
        result = await createTask(taskData);
        if (result) showToast('Task created!', 'success');
    }

    btn.disabled = false;
    if (result) {
        closeTaskModal();
        await renderMonth();
    } else {
        showToast('Error saving task', 'error');
        btn.textContent = currentEditingTaskId ? 'Save Changes' : 'Save Task';
    }
});

async function deleteCurrentTask() {
    if (!currentEditingTaskId) return;
    if (!confirm('Delete this task?')) return;

    const success = await deleteTask(currentEditingTaskId);
    if (success) {
        closeTaskModal();
        await renderMonth();
        showToast('Task deleted', 'success');
    } else {
        showToast('Error deleting task', 'error');
    }
}

// ---- Helpers ----

function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}

function showToast(message, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
}
