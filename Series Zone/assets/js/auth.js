// Authentication System for Series Zone
// User management with localStorage

class AuthSystem {
    constructor() {
        this.storageKey = 'series-zone-users';
        this.sessionKey = 'currentUser';
        this.currentUser = null;
        this.users = this.loadUsers();
        this.adminAccounts = [
            { email: 'admin@velocon.ai', password: 'velora2026', name: 'Platform Admin' }
        ];
        this.init();
    }

    isValidAdminSession(user) {
        if (!user || user.role !== 'admin') {
            return true;
        }

        return this.adminAccounts.some((account) => account.email === user.email);
    }

    // Initialize authentication
    init() {
        this.seedDemoViewer();
        this.setupEventListeners();
        this.checkAuthStatus();
        console.log('🔐 Authentication system initialized');
    }

    // Load users from localStorage
    loadUsers() {
        const saved = localStorage.getItem(this.storageKey);
        return saved ? JSON.parse(saved) : [];
    }

    // Save users to localStorage
    saveUsers() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.users));
    }

    seedDemoViewer() {
        if (this.users.length) {
            return;
        }

        this.users.push({
            id: `viewer-${Date.now()}`,
            name: 'Demo Viewer',
            email: 'viewer@serieszone.ai',
            password: 'viewer123',
            role: 'viewer',
            createdAt: new Date().toISOString(),
            watchHistory: [],
            myList: [],
            preferences: {
                favoriteGenres: ['Animation', 'Sci-Fi'],
                language: 'en'
            }
        });
        this.saveUsers();
    }

    // Check if user is authenticated
    checkAuthStatus() {
        const savedUser = localStorage.getItem(this.sessionKey);
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            if (!this.isValidAdminSession(this.currentUser)) {
                localStorage.removeItem(this.sessionKey);
                localStorage.removeItem('adminSession');
                this.currentUser = null;
                this.showAuthSection();
                this.showToast('Unauthorized admin session removed.', 'error');
                return;
            }
            this.showMainApp();
        } else {
            this.showAuthSection();
        }
    }

    // Setup event listeners
    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignup();
            });
        }

        const adminForm = document.getElementById('adminAccessForm');
        if (adminForm) {
            adminForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAdminLogin();
            });
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    // Handle login
    handleLogin() {
        const email = document.getElementById('loginEmail').value.trim().toLowerCase();
        const password = document.getElementById('loginPassword').value.trim();

        // Find user
        const user = this.users.find(u => u.email === email && u.password === password);

        if (user) {
            this.currentUser = { ...user, role: 'viewer' };
            localStorage.setItem(this.sessionKey, JSON.stringify(this.currentUser));
            localStorage.setItem('series-zone-active-page', 'home-page');
            
            // Update UI
            this.showMainApp();
            this.updateUserProfile();
            
            // Show success message
            this.showToast(`Welcome back, ${user.name}!`, 'success');
            
            console.log('✅ User logged in:', user.name);
        } else {
            this.showToast('Invalid email or password', 'error');
            console.log('❌ Login failed');
        }
    }

    // Handle signup
    handleSignup() {
        const name = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim().toLowerCase();
        const password = document.getElementById('signupPassword').value.trim();

        if (!name || !email || !password) {
            this.showToast('Please complete all signup fields.', 'error');
            return;
        }

        if (password.length < 6) {
            this.showToast('Password should be at least 6 characters.', 'error');
            return;
        }

        // Check if user already exists
        const existingUser = this.users.find(u => u.email === email);
        if (existingUser) {
            this.showToast('Email already registered', 'error');
            return;
        }

        // Create new user
        const newUser = {
            id: Date.now().toString(),
            name: name,
            email: email,
            password: password,
            role: 'viewer',
            createdAt: new Date().toISOString(),
            watchHistory: [],
            myList: [],
            preferences: {
                favoriteGenres: [],
                language: 'en'
            }
        };

        // Add user to database
        this.users.push(newUser);
        this.saveUsers();

        // Auto login after signup
        this.currentUser = newUser;
        localStorage.setItem(this.sessionKey, JSON.stringify(newUser));
        localStorage.setItem('series-zone-active-page', 'home-page');

        // Update UI
        this.showMainApp();
        this.updateUserProfile();

        // Show success message
        this.showToast(`Account created successfully! Welcome, ${name}!`, 'success');
        
        console.log('✅ User registered and logged in:', newUser.name);
    }

    handleAdminLogin() {
        const email = document.getElementById('adminAccessEmail').value.trim().toLowerCase();
        const password = document.getElementById('adminAccessPassword').value.trim();
        const admin = this.adminAccounts.find(account => account.email === email && account.password === password);

        if (!admin) {
            this.showToast('Admin credentials are incorrect.', 'error');
            return;
        }

        this.currentUser = {
            id: `admin-${Date.now()}`,
            name: admin.name,
            email: admin.email,
            password: admin.password,
            role: 'admin',
            createdAt: new Date().toISOString()
        };

        localStorage.setItem(this.sessionKey, JSON.stringify(this.currentUser));
        localStorage.setItem('adminSession', JSON.stringify({
            email: admin.email,
            role: 'admin',
            loggedInAt: Date.now()
        }));
        localStorage.setItem('series-zone-active-page', 'admin-page');

        this.showMainApp();
        this.showToast('Admin control room unlocked.', 'success');
    }

    // Logout user
    logout() {
        this.currentUser = null;
        localStorage.removeItem(this.sessionKey);
        localStorage.removeItem('adminSession');
        localStorage.setItem('series-zone-active-page', 'home-page');
        this.showAuthSection();
        this.showToast('Signed out successfully.', 'info');
        /*
            
            // Update UI
            this.showAuthSection();
            
            // Show message
            this.showToast('Logged out successfully', 'info');
            
            console.log('👋 User logged out');
        }
        */
    }

    // Show authentication section
    showAuthSection() {
        const authContainer = document.getElementById('auth-container');
        const appRoot = document.getElementById('app');
        if (authContainer) authContainer.style.display = 'flex';
        if (appRoot) {
            appRoot.style.display = 'none';
            appRoot.classList.remove('active');
        }
        document.body.dataset.userRole = 'guest';
    }

    // Show main application
    showMainApp() {
        const authContainer = document.getElementById('auth-container');
        const appRoot = document.getElementById('app');
        const targetPage = this.currentUser?.role === 'admin'
            ? 'admin-page'
            : 'home-page';

        if (authContainer) {
            authContainer.style.display = 'none';
        }

        if (appRoot) {
            appRoot.style.display = 'block';
            appRoot.classList.add('active');
            appRoot.style.flexDirection = 'column';
        }

        this.updateUserProfile();
        document.body.dataset.userRole = this.currentUser?.role || 'viewer';
        localStorage.setItem('series-zone-active-page', targetPage);

        const startSeriesZoneApp = async () => {
            if (typeof window.ensureSeriesZoneBoot === 'function') {
                await window.ensureSeriesZoneBoot(targetPage);
                return;
            }

            if (typeof SeriesZoneApp === 'undefined') {
                return;
            }

            window.app = window.app || new SeriesZoneApp();
            await window.app.init?.();
            window.app.refreshCurrentUser?.();
            window.app.ensureHomeContent?.();
            window.app.renderRetentionSurfaces?.();
            window.app.switchPage?.(targetPage);
        };

        // Initialize or refresh the TMDB-driven app after login/session restore.
        if (!window.__seriesZoneBootPromise) {
            window.__seriesZoneBootPromise = startSeriesZoneApp()
                .catch((error) => {
                    console.error('Series Zone bootstrap failed during auth restore:', error);
                })
                .finally(() => {
                    window.__seriesZoneBootPromise = null;
                });
        }

        if (!window.app && typeof SeriesZoneApp === 'undefined') {
            window.addEventListener('load', startSeriesZoneApp, { once: true });
        }
    }

    // Update user profile in navbar
    updateUserProfile() {
        if (!this.currentUser) return;

        const userEmailElement = document.getElementById('userEmailDisplay');
        if (userEmailElement) {
            userEmailElement.textContent = this.currentUser.email;
        }
        
        const userNameElement = document.getElementById('userNameDisplay');
        if (userNameElement) {
            userNameElement.textContent = this.currentUser.name;
        }

        const userRoleElement = document.getElementById('userRoleDisplay');
        if (userRoleElement) {
            userRoleElement.textContent = this.currentUser.role === 'admin' ? 'Admin Workspace' : 'Viewer Workspace';
        }

        window.app?.toggleRoleNavbars?.();
        window.app?.renderNavbarWorkspaceState?.();
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Update user watch history
    updateWatchHistory(movieData) {
        if (!this.currentUser) return;

        const watchEntry = {
            movieId: movieData.id,
            title: movieData.title,
            poster: movieData.poster_path,
            genre: movieData.genre || 'Unknown',
            watchTime: movieData.watchTime || 0,
            totalTime: movieData.totalTime || 120,
            completed: movieData.completed || false,
            timestamp: new Date().toISOString()
        };

        // Add to user's watch history
        this.currentUser.watchHistory.push(watchEntry);
        
        // Update in localStorage
        const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex !== -1) {
            this.users[userIndex] = this.currentUser;
            this.saveUsers();
        }

        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        console.log('📊 Watch history updated for:', this.currentUser.name);
    }

    // Add movie to user's list
    addToList(movieData) {
        if (!this.currentUser) return;

        const listItem = {
            movieId: movieData.id,
            title: movieData.title,
            poster: movieData.poster_path,
            genre: movieData.genre || 'Unknown',
            addedAt: new Date().toISOString()
        };

        // Check if already in list
        const exists = this.currentUser.myList.find(item => item.movieId === movieData.id);
        if (!exists) {
            this.currentUser.myList.push(listItem);
            
            // Update in localStorage
            const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
            if (userIndex !== -1) {
                this.users[userIndex] = this.currentUser;
                this.saveUsers();
            }

            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            this.showToast(`"${movieData.title}" added to My List`, 'success');
            console.log('📝 Movie added to list:', movieData.title);
        } else {
            this.showToast('Movie already in your list', 'info');
        }
    }

    // Remove from user's list
    removeFromList(movieId) {
        if (!this.currentUser) return;

        this.currentUser.myList = this.currentUser.myList.filter(item => item.movieId !== movieId);
        
        // Update in localStorage
        const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex !== -1) {
            this.users[userIndex] = this.currentUser;
            this.saveUsers();
        }

        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        this.showToast('Movie removed from My List', 'info');
        console.log('🗑️ Movie removed from list:', movieId);
    }

    // Get user's watch statistics
    getUserStats() {
        if (!this.currentUser) return null;

        const stats = {
            totalMoviesWatched: this.currentUser.watchHistory.length,
            totalWatchTime: this.currentUser.watchHistory.reduce((sum, item) => sum + item.watchTime, 0),
            averageWatchTime: 0,
            completionRate: 0,
            favoriteGenres: {},
            myListCount: this.currentUser.myList.length
        };

        // Calculate average watch time
        if (stats.totalMoviesWatched > 0) {
            stats.averageWatchTime = stats.totalWatchTime / stats.totalMoviesWatched;
        }

        // Calculate completion rate
        const completedMovies = this.currentUser.watchHistory.filter(item => item.completed).length;
        if (stats.totalMoviesWatched > 0) {
            stats.completionRate = (completedMovies / stats.totalMoviesWatched) * 100;
        }

        // Analyze favorite genres
        this.currentUser.watchHistory.forEach(item => {
            if (!stats.favoriteGenres[item.genre]) {
                stats.favoriteGenres[item.genre] = 0;
            }
            stats.favoriteGenres[item.genre]++;
        });

        return stats;
    }

    // Update user preferences
    updatePreferences(preferences) {
        if (!this.currentUser) return;

        this.currentUser.preferences = { ...this.currentUser.preferences, ...preferences };
        
        // Update in localStorage
        const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex !== -1) {
            this.users[userIndex] = this.currentUser;
            this.saveUsers();
        }

        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        console.log('⚙️ User preferences updated:', preferences);
    }

    // Show toast notification
    showToast(message, type = 'info') {
        const existingToast = document.querySelector('.series-zone-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `series-zone-toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('visible'));
        window.setTimeout(() => {
            toast.classList.remove('visible');
            window.setTimeout(() => toast.remove(), 220);
        }, 2600);
    }

    // Get all users (for admin purposes)
    getAllUsers() {
        return this.users;
    }

    // Delete user account
    deleteAccount() {
        if (!this.currentUser) return;

        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            // Remove user from database
            this.users = this.users.filter(u => u.id !== this.currentUser.id);
            this.saveUsers();
            
            // Clear current session
            localStorage.removeItem('currentUser');
            
            // Show message and redirect
            this.showToast('Account deleted successfully', 'info');
            this.showAuthSection();
            
            console.log('🗑️ User account deleted:', this.currentUser.name);
            this.currentUser = null;
        }
    }
}

function activateAuthPanel(panelId) {
    document.querySelectorAll('.auth-form').forEach((panel) => {
        panel.classList.toggle('active', panel.id === panelId);
    });
}

function showLogin() {
    activateAuthPanel('login-form');
}

function showSignup() {
    activateAuthPanel('signup-form');
}

function switchToLogin(event) {
    event?.preventDefault?.();
    showLogin();
}

function switchToSignup(event) {
    event?.preventDefault?.();
    showSignup();
}

function switchToAdminLogin(event) {
    event?.preventDefault?.();
    activateAuthPanel('admin-login-form');
}

function logout() {
    if (window.authSystem) {
        window.authSystem.logout();
    }
}

window.authSystem = new AuthSystem();
window.AuthSystem = AuthSystem;
