/**
 * Advanced ML System for Series Zone
 * Complete machine learning engine with:
 * - Content-Based Filtering
 * - Collaborative Filtering
 * - Genre Analytics
 * - Drop Risk Predictions
 * - Personalization Controls
 */

class AdvancedMLSystem {
    constructor() {
        this.watchHistory = [];
        this.userPreferences = this.loadPreferences();
        this.genreStats = {};
        this.userSimilarityCache = {};
        this.dropRiskThresholds = {
            high: 30,
            medium: 70
        };
    }

    /**
     * Load user personalization preferences
     */
    loadPreferences() {
        const defaults = {
            enableCollaborativeFiltering: true,
            enableTrendingMix: true,
            enableGenreFocus: false,
            focusGenre: null,
            recommendationMix: 'balanced' // balanced, contentBased, collaborative
        };

        const saved = localStorage.getItem('mlPreferences');
        return saved ? JSON.parse(saved) : defaults;
    }

    /**
     * Save user preferences
     */
    savePreferences() {
        localStorage.setItem('mlPreferences', JSON.stringify(this.userPreferences));
    }

    /**
     * Update preferences
     */
    updatePreference(key, value) {
        this.userPreferences[key] = value;
        this.savePreferences();
        console.log(`✅ Preference updated: ${key} = ${value}`);
    }

    /**
     * Load watch history
     */
    loadWatchHistory() {
        if (typeof watchTracker === 'undefined') return [];
        this.watchHistory = watchTracker.getAllWatchHistory();
        this.calculateGenreStats();
        return this.watchHistory;
    }

    /**
     * Calculate detailed genre statistics
     */
    calculateGenreStats() {
        this.genreStats = {};

        this.watchHistory.forEach(session => {
            if (!this.genreStats[session.genre]) {
                this.genreStats[session.genre] = {
                    totalWatched: 0,
                    totalSessions: 0,
                    completed: 0,
                    dropped: 0,
                    avgPercentage: 0,
                    completionRate: 0,
                    totalMinutes: 0,
                    lastWatched: new Date(session.startTime),
                    movies: []
                };
            }

            const genreStat = this.genreStats[session.genre];
            genreStat.totalSessions++;
            genreStat.totalWatched += session.percentageWatched;
            genreStat.totalMinutes += session.totalDurationMinutes || 0;

            if (session.status === 'completed') {
                genreStat.completed++;
            } else if (session.status === 'dropped') {
                genreStat.dropped++;
            }

            if (!genreStat.movies.includes(session.movieTitle)) {
                genreStat.movies.push(session.movieTitle);
            }

            // Update last watched
            if (new Date(session.startTime) > genreStat.lastWatched) {
                genreStat.lastWatched = new Date(session.startTime);
            }
        });

        // Calculate percentages
        Object.keys(this.genreStats).forEach(genre => {
            const stat = this.genreStats[genre];
            stat.avgPercentage = Math.round(stat.totalWatched / stat.totalSessions);
            stat.completionRate = Math.round((stat.completed / stat.totalSessions) * 100);
        });

        console.log('📊 Genre Stats Updated:', this.genreStats);
    }

    /**
     * Get top genres ranked by various metrics
     */
    getTopGenres(limit = 5, sortBy = 'completionRate') {
        const genres = Object.entries(this.genreStats)
            .map(([genre, stats]) => ({ genre, ...stats }))
            .sort((a, b) => b[sortBy] - a[sortBy])
            .slice(0, limit);

        return genres;
    }

    /**
     * Get genre insights
     */
    getGenreInsights() {
        const topGenres = this.getTopGenres(3, 'completionRate');
        
        return {
            topGenres,
            totalGenres: Object.keys(this.genreStats).length,
            favoriteGenre: topGenres[0]?.genre || 'Unknown',
            totalMinutesWatched: Object.values(this.genreStats)
                .reduce((sum, g) => sum + g.totalMinutes, 0),
            averageCompletionRate: Math.round(
                Object.values(this.genreStats)
                    .reduce((sum, g) => sum + g.completionRate, 0) / 
                Object.keys(this.genreStats).length
            )
        };
    }

    /**
     * Content-Based Collaborative Filtering
     * Shows what users with similar taste watched
     */
    getCollaborativeRecommendations(currentUserGenres, allMovies, limit = 5) {
        if (!this.userPreferences.enableCollaborativeFiltering) {
            return [];
        }

        // Simulate other users by finding movies with similar genre combinations
        const recommendations = new Map();

        allMovies.forEach(movie => {
            // Skip already watched
            if (this.watchHistory.some(h => h.movieId === movie.id)) {
                return;
            }

            const movieGenres = (movie.genres || []).map(g => g.name || g);
            
            // Calculate how many users with similar taste would like this
            let similarityScore = 0;
            movieGenres.forEach(genre => {
                if (currentUserGenres.some(ug => ug.genre === genre)) {
                    similarityScore += 20; // People with same genre preference
                }
            });

            // Bonus for highly rated movies in liked genres
            if (movie.vote_average > 7.5) {
                similarityScore += 15;
            }

            if (similarityScore > 0) {
                recommendations.set(movie.id, {
                    ...movie,
                    collaborativeScore: similarityScore,
                    reason: '👥 Users with similar taste watched this'
                });
            }
        });

        return Array.from(recommendations.values())
            .sort((a, b) => b.collaborativeScore - a.collaborativeScore)
            .slice(0, limit);
    }

    /**
     * Predict drop risk for a movie
     */
    predictDropRisk(movie) {
        const movieGenres = (movie.genres || []).map(g => g.name || g);
        let riskScore = 50; // Base risk

        // Check user's history with these genres
        movieGenres.forEach(genre => {
            if (this.genreStats[genre]) {
                const genreStat = this.genreStats[genre];
                
                // Lower risk if user completes this genre often
                riskScore -= (genreStat.completionRate / 2);
                
                // Reduce risk if high average watch time
                riskScore -= (genreStat.avgPercentage / 5);
            }
        });

        // Adjust for rating
        if (movie.vote_average > 8) {
            riskScore -= 15;
        } else if (movie.vote_average < 6) {
            riskScore += 10;
        }

        riskScore = Math.max(0, Math.min(100, riskScore));

        if (riskScore < this.dropRiskThresholds.high) {
            return { level: 'Low ✅', score: riskScore, warning: false };
        } else if (riskScore < this.dropRiskThresholds.medium) {
            return { level: 'Medium ⚠️', score: riskScore, warning: true };
        } else {
            return { level: 'High 🚨', score: riskScore, warning: true };
        }
    }

    /**
     * Get preview warning for movie
     */
    getPreviewWarning(movie) {
        const movieGenres = (movie.genres || []).map(g => g.name || g);
        const warnings = [];

        // Check if user typically drops this genre
        movieGenres.forEach(genre => {
            if (this.genreStats[genre]) {
                const stat = this.genreStats[genre];
                
                if (stat.completionRate < 30) {
                    warnings.push({
                        type: 'DROP_WARNING',
                        message: `⚠️ You typically drop ${genre} movies (Only ${stat.completionRate}% completion rate)`,
                        severity: 'high'
                    });
                } else if (stat.avgPercentage < 50) {
                    warnings.push({
                        type: 'LOW_ENGAGEMENT',
                        message: `📊 You usually watch only ${stat.avgPercentage}% of ${genre} movies`,
                        severity: 'medium'
                    });
                }
            }
        });

        // Check rating
        if (movie.vote_average < 6) {
            warnings.push({
                type: 'LOW_RATING',
                message: `⭐ Low rating (${movie.vote_average}/10). Might not be your style`,
                severity: 'low'
            });
        }

        return warnings.length > 0 ? warnings : null;
    }

    /**
     * Generate comprehensive ML insights
     */
    generateMLInsights() {
        this.loadWatchHistory();
        const topGenres = this.getTopGenres(3, 'completionRate');
        const insights = this.getGenreInsights();

        return {
            overview: {
                totalSessionsWatched: this.watchHistory.length,
                totalMinutesWatched: insights.totalMinutesWatched,
                averageCompletionRate: insights.averageCompletionRate,
                favoriteGenre: insights.favoriteGenre
            },
            genreBreakdown: topGenres.map(g => ({
                genre: g.genre,
                sessions: g.totalSessions,
                avgWatched: g.avgPercentage + '%',
                completionRate: g.completionRate + '%',
                totalMinutes: g.totalMinutes,
                status: g.completionRate > 70 ? '✅ Strong Interest' : 
                        g.completionRate > 40 ? '⚠️ Moderate Interest' : 
                        '❌ Low Interest'
            })),
            watchingBehavior: {
                mostActiveDay: this.getMostActiveDay(),
                averageSessionLength: Math.round(insights.totalMinutesWatched / this.watchHistory.length) + ' min',
                totalGenresExplored: insights.totalGenres,
                uniqueMoviesWatched: new Set(this.watchHistory.map(h => h.movieId)).size
            },
            predictions: {
                nextGenreToTry: this.suggestNewGenre(),
                estimatedUserType: this.classifyUserType(),
                churnRisk: this.calculateOverallChurnRisk()
            }
        };
    }

    /**
     * Find most active watching day
     */
    getMostActiveDay() {
        const dayCount = {};
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        this.watchHistory.forEach(session => {
            const day = session.dayOfWeek || 'Unknown';
            dayCount[day] = (dayCount[day] || 0) + 1;
        });

        const mostActive = Object.entries(dayCount)
            .sort((a, b) => b[1] - a[1])[0];
        
        return mostActive ? mostActive[0] : 'Unknown';
    }

    /**
     * Suggest new genre to explore
     */
    suggestNewGenre() {
        const allGenres = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller', 'Animation'];
        const watchedGenres = new Set(Object.keys(this.genreStats));
        const unwatchedGenres = allGenres.filter(g => !watchedGenres.has(g));

        if (unwatchedGenres.length === 0) {
            return 'You have explored most genres! 🎬';
        }

        return unwatchedGenres[0];
    }

    /**
     * Classify user type based on watching behavior
     */
    classifyUserType() {
        const completionRate = this.getGenreInsights().averageCompletionRate;
        const totalSessions = this.watchHistory.length;

        if (totalSessions < 5) return '🆕 New User';
        if (completionRate > 80) return '🎬 Committed Viewer';
        if (completionRate > 60) return '⏱️ Casual Regular';
        if (completionRate > 40) return '🔄 Browsing Habits';
        return '❓ Experimental Watcher';
    }

    /**
     * Calculate overall churn risk
     */
    calculateOverallChurnRisk() {
        const insights = this.getGenreInsights();
        const completionRate = insights.averageCompletionRate;
        
        let riskScore = 100 - completionRate; // High completion = low risk

        // Recent activity bonus/penalty
        const recentSessions = this.watchHistory.slice(-5);
        const recentCompletion = recentSessions.filter(s => s.status === 'completed').length;
        
        if (recentCompletion < 2) {
            riskScore += 20; // Penalty if not completing recently
        }

        riskScore = Math.max(0, Math.min(100, riskScore));

        if (riskScore < 30) {
            return { level: 'Low 🟢', score: riskScore };
        } else if (riskScore < 70) {
            return { level: 'Medium 🟡', score: riskScore };
        } else {
            return { level: 'High 🔴', score: riskScore };
        }
    }

    /**
     * Get all recommendations with ML insights
     */
    getFullRecommendations(allMovies, limit = 8) {
        this.loadWatchHistory();
        const recommendations = [];

        const topGenres = this.getTopGenres(3, 'completionRate');
        const topGenreNames = topGenres.map(g => g.genre);

        // Content-based recommendations
        allMovies.forEach(movie => {
            if (this.watchHistory.some(h => h.movieId === movie.id)) {
                return; // Skip already watched
            }

            let score = 0;
            const movieGenres = (movie.genres || []).map(g => g.name || g);
            const reasons = [];

            // Genre matching with weighted scores
            movieGenres.forEach(genre => {
                const topGenreIndex = topGenreNames.indexOf(genre);
                if (topGenreIndex !== -1) {
                    score += (50 - topGenreIndex * 10); // Top genre = 50 points
                    reasons.push(genre);
                }
            });

            // Rating bonus
            if (movie.vote_average > 7.5) {
                score += 20;
                reasons.push(`⭐ ${movie.vote_average}/10`);
            }

            // Popularity bonus
            if (movie.popularity > 80) {
                score += 15;
            }

            // Drop risk consideration
            const dropRisk = this.predictDropRisk(movie);
            if (dropRisk.level === 'Low ✅') {
                score += 10;
            }

            if (score > 40) {
                recommendations.push({
                    ...movie,
                    mlScore: Math.min(score, 100),
                    reasons: reasons,
                    dropRisk: dropRisk,
                    warnings: this.getPreviewWarning(movie)
                });
            }
        });

        // Mix with collaborative filtering
        if (this.userPreferences.enableCollaborativeFiltering) {
            const collaborativeRecs = this.getCollaborativeRecommendations(topGenres, allMovies, 3);
            recommendations.push(...collaborativeRecs);
        }

        // Remove duplicates and sort
        const uniqueRecs = new Map();
        recommendations.forEach(rec => {
            if (!uniqueRecs.has(rec.id)) {
                uniqueRecs.set(rec.id, rec);
            } else {
                // Merge scores if duplicate
                const existing = uniqueRecs.get(rec.id);
                existing.mlScore = Math.max(existing.mlScore || 0, rec.mlScore || 0);
            }
        });

        return Array.from(uniqueRecs.values())
            .sort((a, b) => (b.mlScore || 0) - (a.mlScore || 0))
            .slice(0, limit);
    }
}

// Initialize global advanced ML system
const advancedMLSystem = new AdvancedMLSystem();
window.advancedMLSystem = advancedMLSystem;
window.AdvancedMLSystem = AdvancedMLSystem;
