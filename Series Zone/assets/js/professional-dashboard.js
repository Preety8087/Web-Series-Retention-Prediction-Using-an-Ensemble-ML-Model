/**
 * Professional ML Dashboard Renderer
 * Renders the enterprise-grade ML Insights dashboard
 */

class ProfessionalMLDashboard {
    constructor() {
        this.updateInterval = null;
    }

    /**
     * Render the professional dashboard
     */
    renderDashboard() {
        console.log('🎨 Rendering dashboard...');
        
        const modal = document.getElementById('mlInsightsModal');
        if (!modal) {
            console.error('❌ Modal not found');
            return;
        }

        const modalBody = modal.querySelector('.ml-modal-body');
        if (!modalBody) {
            console.error('❌ Modal body not found');
            return;
        }

        // Generate HTML immediately
        const dashboardHTML = this.generateDashboardHTML();
        modalBody.innerHTML = dashboardHTML;

        console.log('✅ Dashboard HTML rendered');

        // Populate data after rendering
        setTimeout(() => {
            try {
                this.populateDashboardData();
                console.log('✅ Dashboard data populated');
            } catch (error) {
                console.error('⚠️ Error populating data:', error);
            }
        }, 100);

        // Setup auto-refresh
        if (this.updateInterval) clearInterval(this.updateInterval);
        this.updateInterval = setInterval(() => {
            try {
                this.populateDashboardData();
            } catch (error) {
                console.warn('⚠️ Auto-refresh error:', error);
            }
        }, 5000);
    }

    /**
     * Generate professional dashboard HTML
     */
    generateDashboardHTML() {
        return `
            <div class="ml-dashboard-container">
                <!-- Header Section -->
                <div class="ml-dashboard-header">
                    <h1>
                        <i class="fas fa-brain"></i>
                        ML Intelligence Dashboard
                    </h1>
                    <p>Advanced retention prediction & behavioral analytics platform</p>
                    <div class="dashboard-meta">
                        <div class="meta-item">
                            <strong>Platform:</strong> Series Zone
                        </div>
                        <div class="meta-item">
                            <strong>Status:</strong> <span style="color: #46D369;">● Active</span>
                        </div>
                        <div class="meta-item">
                            <strong>Last Update:</strong> <span id="lastUpdateTime">Just now</span>
                        </div>
                    </div>
                </div>

                <!-- Overview Cards -->
                <div class="ml-overview-grid">
                    <div class="ml-overview-card">
                        <div class="card-icon">📊</div>
                        <div class="card-label">Total Sessions</div>
                        <div class="card-value" id="totalSessionsCard">0</div>
                        <div class="card-subtitle">Watch sessions started</div>
                        <div class="card-progress">
                            <div class="card-progress-bar" style="width: 100%"></div>
                        </div>
                    </div>

                    <div class="ml-overview-card">
                        <div class="card-icon">✅</div>
                        <div class="card-label">Avg Completion</div>
                        <div class="card-value" id="avgCompletionCard">0%</div>
                        <div class="card-subtitle">Average watch percentage</div>
                        <div class="card-progress">
                            <div class="card-progress-bar" id="completionProgress" style="width: 50%"></div>
                        </div>
                    </div>

                    <div class="ml-overview-card">
                        <div class="card-icon">⏱️</div>
                        <div class="card-label">Total Minutes</div>
                        <div class="card-value" id="totalMinutesCard">0</div>
                        <div class="card-subtitle">Cumulative watch time</div>
                        <div class="card-progress">
                            <div class="card-progress-bar" style="width: 75%"></div>
                        </div>
                    </div>

                    <div class="ml-overview-card">
                        <div class="card-icon">🚨</div>
                        <div class="card-label">Churn Risk</div>
                        <div class="card-value" id="churnRiskCard">0%</div>
                        <div class="card-subtitle">User retention threat</div>
                        <div class="card-progress">
                            <div class="card-progress-bar" style="width: 30%; background: linear-gradient(90deg, #ff6b6b, #ffaa00);"></div>
                        </div>
                    </div>
                </div>

                <!-- Main Content Grid -->
                <div class="ml-content-grid">
                    <!-- Left Column: Analytics -->
                    <div class="ml-analytics-card">
                        <div class="analytics-header">
                            <h3>
                                <i class="fas fa-chart-bar analytics-header-icon"></i>
                                Genre Retention Analysis
                            </h3>
                        </div>

                        <!-- Genre Stats -->
                        <div class="genre-stats-container" id="genreStatsContainer">
                            <p style="color: #888; text-align: center; padding: 2rem;">
                                Loading genre analytics...
                            </p>
                        </div>

                        <!-- Session Timeline -->
                        <div class="session-timeline">
                            <h4 style="color: #fff; margin: 2rem 0 1rem 0; padding-bottom: 1rem; border-bottom: 1px solid rgba(139, 92, 246, 0.3);">
                                <i class="fas fa-history" style="margin-right: 0.5rem; color: #8B5CF6;"></i>
                                Recent Sessions
                            </h4>
                            <div class="timeline-container" id="timelineItems">
                                <p style="color: #888;">Loading sessions...</p>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: Predictions & Stats -->
                    <div>
                        <!-- Predictions Cards -->
                        <div style="margin-bottom: 2rem;">
                            <h3 style="color: #fff; margin-bottom: 1rem;">
                                <i class="fas fa-crystal-ball" style="color: #8B5CF6; margin-right: 0.5rem;"></i>
                                Smart Predictions
                            </h3>
                            <div class="predictions-grid">
                                <div class="prediction-card">
                                    <div class="prediction-header">
                                        <div class="prediction-icon">🎯</div>
                                        <div class="prediction-title">Next Genre</div>
                                    </div>
                                    <div class="prediction-content">
                                        <div class="prediction-value" id="nextGenreValue">-</div>
                                        <div class="prediction-description">Recommended to explore</div>
                                    </div>
                                </div>

                                <div class="prediction-card">
                                    <div class="prediction-header">
                                        <div class="prediction-icon">👤</div>
                                        <div class="prediction-title">User Profile</div>
                                    </div>
                                    <div class="prediction-content">
                                        <div class="prediction-value" style="font-size: 1.2rem; color: #00d4ff; word-wrap: break-word;" id="userProfileValue">-</div>
                                        <div class="prediction-description">Based on behavior</div>
                                    </div>
                                </div>

                                <div class="prediction-card">
                                    <div class="prediction-header">
                                        <div class="prediction-icon">🔴</div>
                                        <div class="prediction-title">Risk Level</div>
                                    </div>
                                    <div class="prediction-content">
                                        <div class="prediction-value" id="riskLevelValue">-</div>
                                        <div class="prediction-description">Engagement score</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Sidebar Stats -->
                        <div class="ml-sidebar-card">
                            <h4 style="color: #fff; margin: 0 0 1.5rem 0; padding-bottom: 1rem; border-bottom: 1px solid rgba(139, 92, 246, 0.3);">
                                <i class="fas fa-sliders-h" style="color: #8B5CF6; margin-right: 0.5rem;"></i>
                                Quick Stats
                            </h4>
                            
                            <div class="sidebar-stat">
                                <span class="sidebar-stat-label">Most Active Day</span>
                                <span class="sidebar-stat-value" id="activeDay">-</span>
                            </div>

                            <div class="sidebar-stat">
                                <span class="sidebar-stat-label">Avg Session</span>
                                <span class="sidebar-stat-value" id="avgSession">0m</span>
                            </div>

                            <div class="sidebar-stat">
                                <span class="sidebar-stat-label">Genres Explored</span>
                                <span class="sidebar-stat-value" id="genresExplored">0</span>
                            </div>

                            <div class="sidebar-stat">
                                <span class="sidebar-stat-label">Movies Watched</span>
                                <span class="sidebar-stat-value" id="moviesWatched">0</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Metrics Table -->
                <div class="ml-analytics-card" style="margin-top: 2rem;">
                    <div class="analytics-header">
                        <h3>
                            <i class="fas fa-table analytics-header-icon"></i>
                            Detailed Metrics by Genre
                        </h3>
                    </div>

                    <table class="metrics-table">
                        <thead>
                            <tr>
                                <th>Genre</th>
                                <th>Sessions</th>
                                <th>Avg Watched</th>
                                <th>Completion</th>
                                <th>Total Minutes</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody id="metricsTableBody">
                            <tr>
                                <td colspan="6" style="text-align: center; color: #888;">Loading metrics...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Footer -->
                <div class="ml-dashboard-footer">
                    <div>
                        <div class="footer-timestamp">
                            Last synced: <span id="syncTime">Just now</span>
                        </div>
                    </div>
                    <div class="footer-actions">
                        <button class="footer-btn" onclick="professionalDashboard.populateDashboardData()">
                            <i class="fas fa-sync-alt"></i> Refresh Data
                        </button>
                        <button class="footer-btn" onclick="mlInsightsUI.savePreferences()">
                            <i class="fas fa-save"></i> Save Preferences
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Populate dashboard with real data
     */
    populateDashboardData() {
        console.log('📊 Populating dashboard data...');
        
        try {
            // Load advanced ML insights
            let insights = null;
            if (typeof advancedMLSystem !== 'undefined') {
                insights = advancedMLSystem.generateMLInsights();
            }

            if (!insights) {
                console.warn('⚠️ No insights available, showing default data');
                // Use default/empty data
                insights = {
                    overview: {
                        totalSessionsWatched: 0,
                        totalMinutesWatched: 0,
                        averageCompletionRate: 0,
                        favoriteGenre: 'Unknown'
                    },
                    genreBreakdown: [],
                    watchingBehavior: {
                        mostActiveDay: 'Unknown',
                        averageSessionLength: '0 min',
                        totalGenresExplored: 0,
                        uniqueMoviesWatched: 0
                    },
                    predictions: {
                        nextGenreToTry: 'Action',
                        estimatedUserType: '🆕 New User',
                        churnRisk: { level: 'Low 🟢', score: 20 }
                    }
                };
            }

            // Update overview cards
            this.updateOverviewCards(insights);
            this.updateGenreStats(insights);
            this.updatePredictions(insights);
            this.updateQuickStats(insights);
            this.updateMetricsTable(insights);
            this.updateRecentSessions();

            // Update timestamp
            document.getElementById('lastUpdateTime').textContent = 'Just now';
            document.getElementById('syncTime').textContent = new Date().toLocaleTimeString();
            
            console.log('✅ Dashboard data populated');
        } catch (error) {
            console.error('❌ Error populating dashboard:', error);
        }
    }

    /**
     * Update overview cards
     */
    updateOverviewCards(insights) {
        if (!insights) return;
        
        const overview = insights.overview || {};
        const genreBreakdown = insights.genreBreakdown || [];
        const predictions = insights.predictions || {};

        document.getElementById('totalSessionsCard').textContent = overview.totalSessionsWatched || 0;
        document.getElementById('avgCompletionCard').textContent = (genreBreakdown[0] && genreBreakdown[0].avgWatched) || '0%';
        document.getElementById('totalMinutesCard').textContent = overview.totalMinutesWatched || 0;
        
        const riskScore = (predictions.churnRisk && predictions.churnRisk.score) || 0;
        document.getElementById('churnRiskCard').textContent = riskScore + '%';
        
        // Update progress bars
        const completionPercentage = parseInt((genreBreakdown[0] && genreBreakdown[0].avgWatched) || 0);
        const completionBar = document.getElementById('completionProgress');
        if (completionBar) {
            completionBar.style.width = completionPercentage + '%';
        }
    }

    /**
     * Update genre stats
     */
    updateGenreStats(insights) {
        const container = document.getElementById('genreStatsContainer');
        if (!container) return;

        const genreBreakdown = (insights && insights.genreBreakdown) || [];
        if (genreBreakdown.length === 0) {
            container.innerHTML = '<p style="color: #888; text-align: center; padding: 2rem;">Start watching to see genre analytics!</p>';
            return;
        }

        const genreHTML = genreBreakdown.slice(0, 5).map(genre => `
            <div class="genre-stat-item">
                <div class="genre-label">${genre.genre || 'Unknown'}</div>
                <div class="genre-bar-container">
                    <div class="genre-bar">
                        <div class="genre-bar-fill" style="width: ${parseInt(genre.completionRate) || 0}%"></div>
                    </div>
                    <div class="genre-stats-meta">
                        <span>📺 <strong>${genre.sessions || 0}</strong> sessions</span>
                        <span>⏱️ <strong>${genre.totalMinutes || 0}</strong>m</span>
                        <span>✅ <strong>${parseInt(genre.completionRate) || 0}%</strong> complete</span>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = genreHTML;
    }

    /**
     * Update predictions
     */
    updatePredictions(insights) {
        const predictions = (insights && insights.predictions) || {};

        const nextGenre = predictions.nextGenreToTry || 'Action';
        const userProfile = predictions.estimatedUserType || '🆕 New User';
        const riskLevel = (predictions.churnRisk && predictions.churnRisk.level) || 'Low 🟢';

        document.getElementById('nextGenreValue').textContent = nextGenre;
        document.getElementById('userProfileValue').textContent = userProfile;
        document.getElementById('riskLevelValue').textContent = riskLevel;
    }

    /**
     * Update quick stats
     */
    updateQuickStats(insights) {
        const watching = (insights && insights.watchingBehavior) || {};

        document.getElementById('activeDay').textContent = watching.mostActiveDay || '-';
        document.getElementById('avgSession').textContent = watching.averageSessionLength || '0m';
        document.getElementById('genresExplored').textContent = watching.totalGenresExplored || 0;
        document.getElementById('moviesWatched').textContent = watching.uniqueMoviesWatched || 0;
    }

    /**
     * Update metrics table
     */
    updateMetricsTable(insights) {
        const tbody = document.getElementById('metricsTableBody');
        if (!tbody) return;

        const genres = (insights && insights.genreBreakdown) || [];
        if (genres.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #888;">Start watching to see genre metrics!</td></tr>';
            return;
        }

        const tableHTML = genres.map(genre => `
            <tr>
                <td>${genre.genre || 'Unknown'}</td>
                <td class="metric-badge">${genre.sessions || 0}</td>
                <td>${genre.avgWatched || '0%'}</td>
                <td>${parseInt(genre.completionRate) || 0}%</td>
                <td>${genre.totalMinutes || 0}m</td>
                <td>
                    <span class="metric-badge" style="background: ${
                        parseInt(genre.completionRate) > 70 ? 'rgba(70, 211, 105, 0.3); border-color: rgba(70, 211, 105, 0.5); color: #46D369;' :
                        parseInt(genre.completionRate) > 40 ? 'rgba(255, 165, 0, 0.3); border-color: rgba(255, 165, 0, 0.5); color: #FFA500;' :
                        'rgba(255, 69, 69, 0.3); border-color: rgba(255, 69, 69, 0.5); color: #ff4545;'
                    }">
                        ${genre.status || '❓ Unknown'}
                    </span>
                </td>
            </tr>
        `).join('');

        tbody.innerHTML = tableHTML;
    }

    /**
     * Update recent sessions timeline
     */
    updateRecentSessions() {
        const container = document.getElementById('timelineItems');
        if (!container) return;

        let history = [];
        try {
            if (typeof advancedMLSystem !== 'undefined') {
                history = advancedMLSystem.loadWatchHistory();
            } else if (typeof watchTracker !== 'undefined') {
                history = watchTracker.getAllWatchHistory();
            }
        } catch (error) {
            console.warn('⚠️ Could not load history:', error);
            history = [];
        }

        if (history.length === 0) {
            container.innerHTML = '<p style="color: #888;">No sessions yet. Start watching to see analytics!</p>';
            return;
        }

        const recent = history.slice(-5).reverse();
        const timelineHTML = recent.map(session => `
            <div class="timeline-item">
                <div class="timeline-content">
                    <div class="timeline-title">${session.movieTitle || 'Unknown Title'}</div>
                    <div class="timeline-meta">
                        <span>📺 ${session.genre || 'Unknown'}</span>
                        <span>⏱️ ${session.totalDurationMinutes || 0}m</span>
                        <span>📊 ${(session.percentageWatched || 0).toFixed(1)}%</span>
                        <span class="timeline-status ${session.status === 'completed' ? '' : session.status === 'dropped' ? 'dropped' : 'progress'}">
                            ${(session.status || 'watching').toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = timelineHTML;
    }

    /**
     * Destroy dashboard (cleanup)
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Initialize global instance
const professionalDashboard = new ProfessionalMLDashboard();
window.professionalDashboard = professionalDashboard;
window.ProfessionalMLDashboard = ProfessionalMLDashboard;
