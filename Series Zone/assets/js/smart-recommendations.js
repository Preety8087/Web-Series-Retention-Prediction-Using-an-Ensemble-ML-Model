/**
 * Smart Recommendation Engine
 * Generates recommendations based on actual watch history
 */

class SmartRecommendationEngine {
    constructor() {
        this.watchHistory = [];
        this.genreMap = {};
        this.recommendations = [];
    }

    /**
     * Load watch history from tracker
     */
    loadWatchHistory() {
        if (typeof watchTracker === 'undefined') {
            console.warn('⚠️ Watch tracker not available');
            return [];
        }

        this.watchHistory = watchTracker.getAllWatchHistory();
        console.log('📊 Loaded', this.watchHistory.length, 'watch sessions');
        return this.watchHistory;
    }

    /**
     * Get favorite genres from watch history
     */
    getFavoriteGenres() {
        const genreStats = {};
        
        this.watchHistory.forEach(session => {
            if (!genreStats[session.genre]) {
                genreStats[session.genre] = {
                    count: 0,
                    totalWatched: 0,
                    completions: 0,
                    avgPercentage: 0
                };
            }
            
            genreStats[session.genre].count += 1;
            genreStats[session.genre].totalWatched += session.percentageWatched;
            if (session.status === 'completed') {
                genreStats[session.genre].completions += 1;
            }
        });

        // Calculate percentages and sort
        Object.keys(genreStats).forEach(genre => {
            const stats = genreStats[genre];
            stats.avgPercentage = (stats.totalWatched / stats.count).toFixed(1);
            stats.completionRate = ((stats.completions / stats.count) * 100).toFixed(1);
        });

        return Object.entries(genreStats)
            .sort((a, b) => b[1].count - a[1].count)
            .map(([genre, stats]) => ({ genre, ...stats }));
    }

    /**
     * Calculate similarity score between two movies/genres
     */
    calculateSimilarity(movieGenre, favoriteGenres) {
        // Find matching genres
        const match = favoriteGenres.find(g => g.genre.toLowerCase() === movieGenre.toLowerCase());
        
        if (!match) {
            return 0; // No match = 0% similarity
        }

        // Score based on watch count and completion rate
        const watchScore = Math.min(match.count * 15, 50); // Max 50 from watch count
        const completionScore = (match.completionRate / 100) * 50; // Max 50 from completion
        
        return Math.round(watchScore + completionScore);
    }

    /**
     * Generate recommendations based on watch history
     */
    generateRecommendations(allMovies, limit = 8) {
        // Load current watch history
        this.loadWatchHistory();

        if (this.watchHistory.length === 0) {
            console.log('📌 No watch history - showing popular movies');
            return allMovies
                .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
                .slice(0, limit)
                .map(movie => ({
                    ...movie,
                    matchScore: 85,
                    reason: '🌟 Popular Right Now',
                    matchPercentage: 85
                }));
        }

        const favoriteGenres = this.getFavoriteGenres();
        console.log('🎯 Favorite genres:', favoriteGenres.map(g => g.genre).join(', '));

        const watched = new Set(this.watchHistory.map(s => s.movieId));
        const recommendations = [];

        allMovies.forEach(movie => {
            // Skip if already watched
            if (watched.has(movie.id)) {
                return;
            }

            let score = 0;
            let reasons = [];

            // Genre matching (most important)
            const movieGenres = movie.genres || [];
            movieGenres.forEach(genre => {
                const genreScore = this.calculateSimilarity(genre.name, favoriteGenres);
                if (genreScore > 0) {
                    score += genreScore;
                    reasons.push(genre.name);
                }
            });

            // Rating boost (if rating > 75)
            if (movie.vote_average && movie.vote_average > 7.5) {
                score += 15;
            }

            // Popularity boost
            if (movie.popularity && movie.popularity > 80) {
                score += 10;
            }

            // Only include if score > 30
            if (score > 30) {
                recommendations.push({
                    ...movie,
                    matchScore: Math.min(score, 100),
                    matchPercentage: Math.min(score, 100),
                    reason: reasons.length > 0 
                        ? `📌 Matches "${reasons[0]}" (your favorite)`
                        : '🎬 Recommended for you'
                });
            }
        });

        // Sort by score and return
        return recommendations
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, limit);
    }

    /**
     * Get watch statistics for display
     */
    getWatchStats() {
        const favoriteGenres = this.getFavoriteGenres();
        
        let stats = {
            totalWatched: this.watchHistory.length,
            totalMinutes: 0,
            avgCompletion: 0,
            topGenre: favoriteGenres[0]?.genre || 'Unknown',
            favoriteGenres: favoriteGenres
        };

        // Calculate totals
        stats.totalMinutes = this.watchHistory.reduce((sum, s) => sum + (s.totalDurationMinutes || 0), 0);
        stats.avgCompletion = (this.watchHistory.reduce((sum, s) => sum + s.percentageWatched, 0) / this.watchHistory.length).toFixed(1);

        return stats;
    }

    /**
     * Get movies related to a specific movie
     */
    getRelatedMovies(movie, allMovies, limit = 4) {
        if (!movie.genres || movie.genres.length === 0) {
            return [];
        }

        const movieGenreSet = new Set(movie.genres.map(g => g.name || g));
        const movieId = movie.id;

        return allMovies.filter(m => {
            // Skip the movie itself
            if (m.id === movieId) return false;

            // Skip already watched
            const watched = new Set(this.watchHistory.map(s => s.movieId));
            if (watched.has(m.id)) return false;

            // Check genre overlap
            const otherGenres = new Set((m.genres || []).map(g => g.name || g));
            let overlap = 0;
            for (let genre of movieGenreSet) {
                if (otherGenres.has(genre)) overlap++;
            }

            return overlap > 0;
        })
        .sort((a, b) => {
            // Sort by rating first, then popularity
            const ratingDiff = (b.vote_average || 0) - (a.vote_average || 0);
            if (ratingDiff !== 0) return ratingDiff;
            return (b.popularity || 0) - (a.popularity || 0);
        })
        .slice(0, limit)
        .map(m => ({
            id: m.id,
            title: m.title || m.name,
            poster_path: m.poster_path,
            vote_average: m.vote_average || 0,
            genres: m.genres || []
        }));
    }

    /**
     * Generate recommendations WITH related movies
     */
    generateRecommendationsWithRelated(allMovies, limit = 8) {
        const recommendations = this.generateRecommendations(allMovies, limit);

        // Add related movies for each recommendation
        return recommendations.map(rec => ({
            ...rec,
            relatedMovies: this.getRelatedMovies(rec, allMovies, 3)
        }));
    }

    /**
     * Format recommendation for display
     */
    formatRecommendation(movie) {
        return {
            id: movie.id,
            title: movie.title || movie.name,
            poster_path: movie.poster_path,
            matchPercentage: movie.matchPercentage || 85,
            reason: movie.reason || 'Recommended for you',
            genres: movie.genres || [],
            vote_average: movie.vote_average || 0,
            relatedMovies: movie.relatedMovies || []
        };
    }
}

// Initialize global recommendation engine
const recommendationEngine = new SmartRecommendationEngine();
window.recommendationEngine = recommendationEngine;
window.SmartRecommendationEngine = SmartRecommendationEngine;
