// ====================================
// AUTH
// ====================================

// On app pages: redirect to login if not authenticated
const isAuthPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';

if (!isAuthPage) {
    (async () => {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = 'index.html';
        } else {
            updateUserUI(session.user);
        }
    })();
}

async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return null;
    }
    updateUserUI(session.user);
    return session;
}

function updateUserUI(user) {
    const name = user.user_metadata?.full_name || user.email.split('@')[0];
    const nameEl = document.getElementById('userName');
    const avatarEl = document.getElementById('userAvatar');
    if (nameEl) nameEl.textContent = name;
    if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
}

async function signOut() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ====================================
// AUTH PAGE LOGIC (index.html only)
// ====================================

function showTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    if (!loginForm) return;

    loginForm.classList.toggle('hidden', tab !== 'login');
    registerForm.classList.toggle('hidden', tab !== 'register');
    loginTab.classList.toggle('active', tab === 'login');
    registerTab.classList.toggle('active', tab === 'register');
}

// Redirect if already logged in
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session) window.location.href = 'app.html';
    });

    // Login submit
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const errorEl = document.getElementById('loginError');
        const btn = loginForm.querySelector('button[type="submit"]');

        btn.disabled = true;
        btn.textContent = 'Signing in...';
        errorEl.textContent = '';
        errorEl.className = 'auth-message';

        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

        if (error) {
            errorEl.textContent = error.message;
            btn.disabled = false;
            btn.textContent = 'Sign In';
        } else {
            window.location.href = 'app.html';
        }
    });

    // Register submit
    const registerForm = document.getElementById('registerForm');
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const errorEl = document.getElementById('registerError');
        const btn = registerForm.querySelector('button[type="submit"]');

        btn.disabled = true;
        btn.textContent = 'Creating account...';
        errorEl.textContent = '';
        errorEl.className = 'auth-message';

        const { error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: { data: { full_name: name } }
        });

        if (error) {
            errorEl.textContent = error.message;
            btn.disabled = false;
            btn.textContent = 'Create Account';
        } else {
            errorEl.className = 'auth-message success';
            errorEl.textContent = 'Account created! Check your email to confirm, then sign in.';
            btn.disabled = false;
            btn.textContent = 'Create Account';
        }
    });
}
