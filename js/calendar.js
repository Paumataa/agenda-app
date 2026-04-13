// ====================================
// CALENDAR — Weekly view
// ====================================

let currentWeekStart = getMonday(new Date());
let currentEditingTaskId = null;
let allTasks = [];

document.addEventListener('DOMContentLoaded', async () => {
    const session = await checkAuth();
    if (!session) return;
    await renderCalendar();
    await initNotifications(session.user);
});

// ---- Date helpers ----

function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatDate(date) {
    // Returns YYYY-MM-DD in local time (not UTC)
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

// ---- Calendar render ----

async function renderCalendar() {
    updateWeekTitle();
    const startDate = formatDate(currentWeekStart);
    const endDate = formatDate(addDays(currentWeekStart, 6));
    allTasks = await getTasks(startDate, endDate);
    renderGrid();
}

function updateWeekTitle() {
    const end = addDays(currentWeekStart, 6);
    const opts = { month: 'short', day: 'numeric' };
    const startStr = currentWeekStart.toLocaleDateString('en-US', opts);
    const endStr = end.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
    document.getElementById('weekTitle').textContent = `${startStr} – ${endStr}`;
}

function renderGrid() {
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    const today = formatDate(new Date());
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
        const date = addDays(currentWeekStart, i);
        const dateStr = formatDate(date);
        const isToday = dateStr === today;
        const dayTasks = allTasks
            .filter(t => t.date === dateStr)
            .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));

        const col = document.createElement('div');
        col.className = `day-column${isToday ? ' today' : ''}`;
        col.innerHTML = `
            <div class="day-header">
                <div class="day-name">${dayNames[i]}</div>
                <div class="day-number">${date.getDate()}</div>
            </div>
            <div class="day-tasks">
                ${dayTasks.map(task => renderTaskCard(task)).join('')}
                <button class="add-task-btn" onclick="openTaskModal('${dateStr}')">+ Add task</button>
            </div>
        `;
        grid.appendChild(col);
    }
}

function renderTaskCard(task) {
    const timeStr = task.time ? task.time.slice(0, 5) : '';
    const safeTitle = escapeHtml(task.title);
    const safeCategory = escapeHtml(task.category);
    return `
        <div class="task-card priority-${task.priority}${task.completed ? ' completed' : ''}"
             onclick="openTaskModal(null, '${task.id}')">
            ${timeStr ? `<div class="task-time">${timeStr}</div>` : ''}
            <div class="task-title">${safeTitle}</div>
            <div class="task-meta">
                <span class="task-category">${safeCategory}</span>
                <span class="task-priority-badge">${task.priority}</span>
            </div>
        </div>
    `;
}

function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}

function navigateWeek(direction) {
    currentWeekStart = addDays(currentWeekStart, direction * 7);
    renderCalendar();
}

function goToToday() {
    currentWeekStart = getMonday(new Date());
    renderCalendar();
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

// Close modal on overlay click (only when clicking overlay, not modal)
document.getElementById('modalOverlay').addEventListener('click', closeTaskModal);

// Form submit
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
        await renderCalendar();
    } else {
        showToast('Error saving task. Check your Supabase config.', 'error');
        btn.textContent = currentEditingTaskId ? 'Save Changes' : 'Save Task';
    }
});

async function deleteCurrentTask() {
    if (!currentEditingTaskId) return;
    if (!confirm('Delete this task?')) return;

    const success = await deleteTask(currentEditingTaskId);
    if (success) {
        closeTaskModal();
        await renderCalendar();
        showToast('Task deleted', 'success');
    } else {
        showToast('Error deleting task', 'error');
    }
}

// ---- Toast ----

function showToast(message, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
}
