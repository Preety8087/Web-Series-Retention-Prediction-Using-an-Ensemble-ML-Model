/**
 * ML Insights UI Module
 * Provides the UI layer for ML Intelligence Dashboard
 * Integrates professional dashboard with modal functionality
 */

class MLInsightsUI {
    constructor() {
        this.modal = null;
        this.overlay = null;
        this.isVisible = false;
        this.dashboard = null;
        this.init();
    }

    init() {
        console.log('🎨 Initializing ML Insights UI...');
        this.createModal();
        this.setupEventListeners();
        this.dashboard = typeof professionalDashboard !== 'undefined' ? professionalDashboard : null;
        console.log('✅ ML Insights UI ready');
    }

    createModal() {
        // Check if modal already exists
        let existingModal = document.getElementById('mlInsightsModal');
        if (existingModal) {
            this.modal = existingModal;
            this.overlay = document.getElementById('mlInsightsOverlay');
            return;
        }

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'mlInsightsOverlay';
        overlay.className = 'ml-modal-overlay';
        document.body.appendChild(overlay);

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'mlInsightsModal';
        modal.className = 'ml-modal';
        modal.innerHTML = `
            <div class="ml-modal-header">
                <h3>🧠 ML Intelligence Dashboard</h3>
                <button class="ml-modal-close" onclick="mlInsightsUI.closeMLInsights()">✕</button>
            </div>
            <div class="ml-modal-body" id="mlModalBody">
                <div class="ml-modal-loading">Loading ML Insights...</div>
            </div>
        `;
        overlay.appendChild(modal);

        this.modal = modal;
        this.overlay = overlay;

        // Click outside to close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeMLInsights();
            }
        });
    }

    setupEventListeners() {
        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.closeMLInsights();
            }
        });
    }

    openMLInsights() {
        console.log('📊 Opening ML Insights Dashboard...');
        
        if (!this.overlay || !this.modal) {
            this.createModal();
        }

        this.overlay.style.display = 'flex';
        this.isVisible = true;
        
        console.log('✅ Modal visible, checking dashboard...');

        // If there's no watch history yet, generate demo sessions so insights can render.
        if (typeof watchTracker !== 'undefined') {
            const watchHistory = watchTracker.getAllWatchHistory();
            if (watchHistory.length === 0) {
                watchTracker.generateSampleWatchHistory();
                this.showToast('✅ Sample watch history loaded for ML demo');
            }
        }

        if (typeof professionalDashboard === 'undefined') {
            console.error('❌ professionalDashboard not defined');
            this.showError('Dashboard module not loaded. Please refresh the page.');
            return;
        }

        console.log('✅ professionalDashboard found, rendering...');
        
        try {
            professionalDashboard.renderDashboard();
            console.log('✅ Dashboard rendered');
        } catch (error) {
            console.error('❌ Render error:', error);
            this.showError(`Error: ${error.message}`);
        }
    }

    closeMLInsights() {
        if (this.overlay) {
            this.overlay.style.display = 'none';
            this.isVisible = false;
            console.log('Closed ML Insights Dashboard');
        }
    }

    showError(message) {
        const body = document.getElementById('mlModalBody');
        if (body) {
            body.innerHTML = `
                <div style="color: #ff6b6b; text-align: center; padding: 2rem;">
                    <p style="font-size: 1rem; margin: 0;">❌ Error</p>
                    <p style="font-size: 0.9rem; color: #d2d2d2;">${message}</p>
                </div>
            `;
        }
    }

    showLoading(message = 'Loading ML Insights...') {
        const body = document.getElementById('mlModalBody');
        if (body) {
            body.innerHTML = `<div class="ml-modal-loading">${message}</div>`;
        }
    }

    refreshInsights() {
        console.log('🔄 Refreshing ML Insights...');
        this.showLoading('Refreshing insights...');

        // Reload advanced ML system data
        if (typeof advancedMLSystem !== 'undefined') {
            advancedMLSystem.loadWatchHistory();
            advancedMLSystem.generateMLInsights();
        }

        // Re-render dashboard
        setTimeout(() => {
            if (this.dashboard && this.dashboard.renderDashboard) {
                this.dashboard.renderDashboard();
            }
        }, 300);

        this.showToast('✅ Insights refreshed!');
    }

    savePreferences() {
        console.log('💾 Saving preferences...');

        // Collect preferences from advanced ML system
        if (typeof advancedMLSystem !== 'undefined') {
            advancedMLSystem.savePreferences();
            this.showToast('✅ Preferences saved!');
        } else {
            this.showToast('⚠️ Could not find ML system');
        }
    }

    showToast(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'ml-modal-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'ml-toast-out 0.25s ease forwards';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 250);
        }, duration);
    }

    exportInsights() {
        console.log('📤 Exporting insights...');

        if (typeof advancedMLSystem !== 'undefined') {
            const insights = advancedMLSystem.generateMLInsights();
            const json = JSON.stringify(insights, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `ml-insights-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.showToast('✅ Insights exported!');
        } else {
            this.showToast('⚠️ Could not export insights');
        }
    }

    getInsightsSummary() {
        if (typeof advancedMLSystem === 'undefined') {
            return null;
        }

        return advancedMLSystem.generateMLInsights();
    }

    toggleCollaborativeFiltering(enabled) {
        if (typeof advancedMLSystem !== 'undefined') {
            advancedMLSystem.updatePreference('enableCollaborativeFiltering', enabled);
            this.showToast(`Collaborative Filtering ${enabled ? 'enabled' : 'disabled'}`);
        }
    }

    toggleTrendingMix(enabled) {
        if (typeof advancedMLSystem !== 'undefined') {
            advancedMLSystem.updatePreference('enableTrendingMix', enabled);
            this.showToast(`Trending Mix ${enabled ? 'enabled' : 'disabled'}`);
        }
    }

    setRecommendationMix(mix) {
        if (typeof advancedMLSystem !== 'undefined') {
            advancedMLSystem.updatePreference('recommendationMix', mix);
            this.showToast(`Recommendation mix set to: ${mix}`);
        }
    }

    focus(genreToFocus = null) {
        if (typeof advancedMLSystem !== 'undefined') {
            advancedMLSystem.updatePreference('enableGenreFocus', genreToFocus !== null);
            advancedMLSystem.updatePreference('focusGenre', genreToFocus);
            this.showToast(`Genre focus: ${genreToFocus || 'disabled'}`);
        }
    }

    getMetricsSnapshot() {
        const metrics = {
            timestamp: new Date().toISOString(),
            retention: watchTracker.calculateRetentionMetrics(),
            genreStats: watchTracker.getGenreStats(),
            topMovies: watchTracker.getTopMovies(5),
            churnRisk: watchTracker.predictChurnRisk()
        };

        return metrics;
    }

    printReport() {
        const metrics = this.getMetricsSnapshot();
        console.log('=== ML INSIGHTS REPORT ===');
        console.log('Timestamp:', metrics.timestamp);
        console.log('Retention Metrics:', metrics.retention);
        console.log('Genre Stats:', metrics.genreStats);
        console.log('Top Movies:', metrics.topMovies);
        console.log('Churn Risk:', metrics.churnRisk);
        console.log('========================');
    }
}

// Initialize global ML Insights UI
const mlInsightsUI = new MLInsightsUI();

// Make it globally accessible
window.mlInsightsUI = mlInsightsUI;

console.log('✅ ML Insights UI loaded');