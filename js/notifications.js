// ====================================
// NOTIFICATIONS — Browser + Email
// ====================================

const NOTIF_KEY = 'agenda_notif_settings';

function getNotifSettings() {
    return JSON.parse(localStorage.getItem(NOTIF_KEY) || '{}');
}

function saveNotifSettings(settings) {
    localStorage.setItem(NOTIF_KEY, JSON.stringify({ ...getNotifSettings(), ...settings }));
}

// ---- Browser Notifications ----

async function requestBrowserPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
}

function showBrowserNotification(title, body) {
    if (Notification.permission !== 'granted') return;
    const n = new Notification(title, { body, icon: '' });
    n.onclick = () => { window.focus(); n.close(); };
}

// ---- Email via EmailJS ----

async function sendDailyEmail(tasks) {
    const s = getNotifSettings();
    if (!s.emailEnabled || !s.emailjsServiceId || !s.emailjsTemplateId || !s.emailjsPublicKey || !s.emailAddress) return;

    const today = formatDateLocal(new Date());
    if (s.lastEmailDate === today) return; // already sent today

    if (!window.emailjs) return;

    emailjs.init(s.emailjsPublicKey);

    const taskList = tasks.length === 0
        ? 'No tasks scheduled for today.'
        : tasks.map(t => `• [${t.priority.toUpperCase()}] ${t.time ? t.time.slice(0,5) + ' — ' : ''}${t.title}${t.category ? ' (' + t.category + ')' : ''}`).join('\n');

    const high = tasks.filter(t => t.priority === 'high').length;

    try {
        await emailjs.send(s.emailjsServiceId, s.emailjsTemplateId, {
            to_email: s.emailAddress,
            to_name: s.userName || 'there',
            date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
            task_count: tasks.length,
            high_priority_count: high,
            task_list: taskList
        });
        saveNotifSettings({ lastEmailDate: today });
        console.log('Daily email sent!');
    } catch (err) {
        console.error('EmailJS error:', err);
    }
}

// ---- Schedule 15-min reminders ----

function scheduleReminders(tasks) {
    const s = getNotifSettings();
    if (s.browserEnabled === false) return;

    const now = new Date();
    tasks.forEach(task => {
        if (!task.time) return;
        const [h, m] = task.time.split(':').map(Number);
        const taskTime = new Date();
        taskTime.setHours(h, m, 0, 0);

        // 15 minutes before
        const msBefore = taskTime - now - 15 * 60 * 1000;
        if (msBefore > 0) {
            setTimeout(() => {
                showBrowserNotification(
                    `⏰ Starting in 15 minutes`,
                    `${task.title} at ${task.time.slice(0,5)}`
                );
            }, msBefore);
        }

        // At task time
        const msAt = taskTime - now;
        if (msAt > 0) {
            setTimeout(() => {
                showBrowserNotification(
                    `🔔 Task now: ${task.title}`,
                    task.description || task.category || ''
                );
            }, msAt);
        }
    });
}

// ---- Main: run on page load ----

async function initNotifications(user) {
    const s = getNotifSettings();
    const today = formatDateLocal(new Date());

    // Save username for email greeting
    if (user) {
        saveNotifSettings({ userName: user.user_metadata?.full_name || user.email.split('@')[0] });
    }

    // Ask for browser permission once
    if (!s.browserPermissionAsked) {
        const granted = await requestBrowserPermission();
        saveNotifSettings({ browserPermissionAsked: true, browserEnabled: granted });
    }

    // Get today's tasks
    const tasks = await getTasks(today, today);

    // Browser daily summary (once per day)
    if (Notification.permission === 'granted' && s.browserEnabled !== false) {
        if (s.lastBrowserDate !== today && tasks.length > 0) {
            const high = tasks.filter(t => t.priority === 'high').length;
            showBrowserNotification(
                `📅 Today you have ${tasks.length} task${tasks.length !== 1 ? 's' : ''}`,
                high > 0 ? `${high} high priority task${high !== 1 ? 's' : ''} — check your agenda!` : 'Have a productive day!'
            );
            saveNotifSettings({ lastBrowserDate: today });
        }
    }

    // Schedule reminders for upcoming tasks
    scheduleReminders(tasks);

    // Send daily email
    await sendDailyEmail(tasks);
}

// ---- Settings Modal ----

function openNotifSettings() {
    const s = getNotifSettings();
    document.getElementById('notifEmail').value = s.emailAddress || '';
    document.getElementById('notifEmailjsService').value = s.emailjsServiceId || '';
    document.getElementById('notifEmailjsTemplate').value = s.emailjsTemplateId || '';
    document.getElementById('notifEmailjsKey').value = s.emailjsPublicKey || '';
    document.getElementById('notifEmailEnabled').checked = s.emailEnabled || false;
    document.getElementById('notifBrowserEnabled').checked = s.browserEnabled !== false;

    const perm = Notification.permission;
    const permEl = document.getElementById('notifPermStatus');
    if (permEl) {
        permEl.textContent = perm === 'granted' ? '✅ Allowed' : perm === 'denied' ? '❌ Blocked (enable in browser settings)' : '⚠️ Not yet allowed';
        permEl.className = `notif-perm-status ${perm}`;
    }

    document.getElementById('notifModal').classList.add('active');
    document.getElementById('notifOverlay').classList.add('active');
}

function closeNotifSettings() {
    document.getElementById('notifModal').classList.remove('active');
    document.getElementById('notifOverlay').classList.remove('active');
}

async function saveNotifSettingsForm() {
    const browserEnabled = document.getElementById('notifBrowserEnabled').checked;
    const emailEnabled = document.getElementById('notifEmailEnabled').checked;

    if (browserEnabled) await requestBrowserPermission();

    saveNotifSettings({
        browserEnabled,
        emailEnabled,
        emailAddress: document.getElementById('notifEmail').value.trim(),
        emailjsServiceId: document.getElementById('notifEmailjsService').value.trim(),
        emailjsTemplateId: document.getElementById('notifEmailjsTemplate').value.trim(),
        emailjsPublicKey: document.getElementById('notifEmailjsKey').value.trim()
    });

    closeNotifSettings();
    showToast('Notification settings saved!', 'success');
}

// ---- Helper ----

function formatDateLocal(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
