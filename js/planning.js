// ====================================
// PLANNING — Templates
// ====================================

let currentApplyTemplateId = null;

document.addEventListener('DOMContentLoaded', async () => {
    const session = await checkAuth();
    if (!session) return;
    await loadTemplates();
});

async function loadTemplates() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const grid = document.getElementById('templatesGrid');

    const { data, error } = await supabaseClient
        .from('planning_templates')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

    if (error) {
        grid.innerHTML = `<div class="empty-state"><span class="empty-state-icon">⚠️</span><h3>Error loading templates</h3><p>${error.message}</p></div>`;
        return;
    }

    if (!data || data.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">📋</span>
                <h3>No templates yet</h3>
                <p>Create a weekly or monthly template to quickly populate your calendar.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = data.map(t => `
        <div class="template-card">
            <div class="template-card-header">
                <h3>${escapeHtml(t.name)}</h3>
                <span class="template-type-badge">${t.type}</span>
            </div>
            <p>${escapeHtml(t.description || 'No description provided.')}</p>
            <div class="template-card-actions">
                <button class="btn btn-primary" onclick="applyTemplate('${t.id}')">Apply</button>
                <button class="btn btn-danger-ghost" onclick="deleteTemplate('${t.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

// ---- Template Modal ----

function openTemplateModal() {
    document.getElementById('templateName').value = '';
    document.getElementById('templateDescription').value = '';
    document.getElementById('templateType').value = 'weekly';
    document.getElementById('templateModal').classList.add('active');
    document.getElementById('modalOverlay').classList.add('active');
    setTimeout(() => document.getElementById('templateName').focus(), 100);
}

function closeTemplateModal() {
    document.getElementById('templateModal').classList.remove('active');
    document.getElementById('modalOverlay').classList.remove('active');
}

async function saveTemplate() {
    const name = document.getElementById('templateName').value.trim();
    if (!name) { showToast('Please enter a template name', 'error'); return; }

    const { data: { session } } = await supabaseClient.auth.getSession();
    const { error } = await supabaseClient.from('planning_templates').insert([{
        name,
        type: document.getElementById('templateType').value,
        description: document.getElementById('templateDescription').value.trim() || null,
        user_id: session.user.id
    }]);

    if (error) { showToast('Error creating template: ' + error.message, 'error'); return; }

    closeTemplateModal();
    showToast('Template created!', 'success');
    await loadTemplates();
}

async function deleteTemplate(id) {
    if (!confirm('Delete this template?')) return;
    const { error } = await supabaseClient.from('planning_templates').delete().eq('id', id);
    if (error) { showToast('Error deleting template', 'error'); return; }
    showToast('Template deleted', 'success');
    await loadTemplates();
}

// ---- Apply Template ----

function applyTemplate(id) {
    currentApplyTemplateId = id;
    document.getElementById('applyDate').value = getNextMonday();
    document.getElementById('applyModal').classList.add('active');
    document.getElementById('applyOverlay').classList.add('active');
}

function closeApplyModal() {
    document.getElementById('applyModal').classList.remove('active');
    document.getElementById('applyOverlay').classList.remove('active');
    currentApplyTemplateId = null;
}

function confirmApplyTemplate() {
    const date = document.getElementById('applyDate').value;
    if (!date) { showToast('Please select a start date', 'error'); return; }
    showToast('Template applied! Redirecting to calendar...', 'success');
    setTimeout(() => { window.location.href = 'app.html'; }, 1500);
}

function getNextMonday() {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 1 ? 7 : (8 - day) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return formatDate(d);
}

// ---- Helpers ----

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

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
