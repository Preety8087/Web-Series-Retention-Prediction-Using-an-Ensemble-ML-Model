/**
 * Professional Admin Login & Session Management
 * VELORA-style enterprise authentication
 */

class AdminLoginManager {
    constructor() {
        this.adminUser = null;
        this.isLoggedIn = false;
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.timeoutTimer = null;
    }

    /**
     * Initialize login system
     */
    init() {
        this.checkExistingSession();
        this.attachEventListeners();
    }

    /**
     * Check if admin session exists
     */
    checkExistingSession() {
        const savedSession = localStorage.getItem('adminSession');
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                if (session.expiresAt > Date.now()) {
                    this.adminUser = session;
                    this.isLoggedIn = true;
                    this.showAdminDashboard();
                    return;
                }
            } catch (e) {
                localStorage.removeItem('adminSession');
            }
        }
        this.showLoginPage();
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const loginForm = document.getElementById('adminLoginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        const logoutBtn = document.getElementById('adminLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }

    /**
     * Handle login form submission
     */
    handleLogin(event) {
        event.preventDefault();

        const email = document.getElementById('adminEmail').value.trim();
        const password = document.getElementById('adminPassword').value.trim();
        const rememberMe = document.getElementById('adminRemember').checked;

        // Validation
        if (!email || !password) {
            this.showMessage('Please enter email and password', 'error');
            return;
        }

        // Demo credentials (in production, verify against backend)
        if (this.verifyCredentials(email, password)) {
            this.createSession(email, rememberMe);
            this.showLoginSuccess();
        } else {
            this.showMessage('Invalid credentials', 'error');
        }
    }

    /**
     * Verify login credentials
     */
    verifyCredentials(email, password) {
        const allowedAdmins = [
            { email: 'admin@velocon.ai', password: 'velora2026' }
        ];

        return allowedAdmins.some(
            account => account.email === email && account.password === password
        );
    }

    /**
     * Create admin session
     */
    createSession(email, rememberMe) {
        const expiresAt = rememberMe 
            ? Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
            : Date.now() + this.sessionTimeout; // 30 minutes

        this.adminUser = {
            email: email,
            name: email.split('@')[0].toUpperCase(),
            role: 'Administrator',
            loginTime: new Date().toLocaleString(),
            expiresAt: expiresAt,
            avatar: this.getInitials(email)
        };

        localStorage.setItem('adminSession', JSON.stringify(this.adminUser));
        this.isLoggedIn = true;
        this.startSessionTimer();
    }

    /**
     * Get initials from email
     */
    getInitials(email) {
        const name = email.split('@')[0];
        const parts = name.split('.');
        return parts.length > 1 
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : name.substring(0, 2).toUpperCase();
    }

    /**
     * Start session timeout timer
     */
    startSessionTimer() {
        if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
        
        const timeToExpiry = this.adminUser.expiresAt - Date.now();
        if (timeToExpiry > 0) {
            this.timeoutTimer = setTimeout(() => {
                this.handleSessionExpiry();
            }, timeToExpiry);
        }
    }

    /**
     * Handle session expiry
     */
    handleSessionExpiry() {
        this.isLoggedIn = false;
        localStorage.removeItem('adminSession');
        this.showMessage('Your session has expired. Please login again.', 'warning');
        this.showLoginPage();
    }

    /**
     * Handle logout
     */
    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            this.isLoggedIn = false;
            this.adminUser = null;
            localStorage.removeItem('adminSession');
            if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
            this.showLoginPage();
            this.showMessage('Logged out successfully', 'success');
        }
    }

    /**
     * Show login page
     */
    showLoginPage() {
        const authSection = document.getElementById('adminAuthSection');
        const dashboardSection = document.getElementById('adminDashboardSection');

        if (authSection) authSection.style.display = 'flex';
        if (dashboardSection) dashboardSection.style.display = 'none';

        // Clear form
        const loginForm = document.getElementById('adminLoginForm');
        if (loginForm) loginForm.reset();
    }

    /**
     * Show login success
     */
    showLoginSuccess() {
        const loginBtn = document.querySelector('.admin-login-btn');
        const originalText = loginBtn.textContent;

        loginBtn.textContent = '✓ Logging in...';
        loginBtn.disabled = true;

        setTimeout(() => {
            this.showAdminDashboard();
            loginBtn.textContent = originalText;
            loginBtn.disabled = false;
            this.showMessage('Logged in successfully', 'success');
        }, 1000);
    }

    /**
     * Show admin dashboard
     */
    showAdminDashboard() {
        const authSection = document.getElementById('adminAuthSection');
        const dashboardSection = document.getElementById('adminDashboardSection');

        if (authSection) authSection.style.display = 'none';
        if (dashboardSection) dashboardSection.style.display = 'block';

        // Update navbar with user info
        this.updateNavbar();
    }

    /**
     * Update navbar with current user info
     */
    updateNavbar() {
        if (!this.adminUser) return;

        document.getElementById('adminUserName').textContent = this.adminUser.name;
        document.getElementById('adminUserRole').textContent = this.adminUser.role;
        document.getElementById('adminUserAvatar').textContent = this.adminUser.avatar;
    }

    /**
     * Show notification message
     */
    showMessage(message, type = 'info') {
        // Create notification
        const notification = document.createElement('div');
        notification.className = `admin-notification admin-notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }

    /**
     * Check if user is logged in
     */
    isAdminLoggedIn() {
        return this.isLoggedIn && this.adminUser !== null;
    }

    /**
     * Get current admin user
     */
    getCurrentUser() {
        return this.adminUser;
    }

    /**
     * Extend session
     */
    extendSession() {
        if (this.isLoggedIn && this.adminUser) {
            this.adminUser.expiresAt = Date.now() + this.sessionTimeout;
            localStorage.setItem('adminSession', JSON.stringify(this.adminUser));
            this.startSessionTimer();
        }
    }
}

// Global instance
const adminLoginManager = new AdminLoginManager();

// Initialize when document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        adminLoginManager.init();
    });
} else {
    adminLoginManager.init();
}
