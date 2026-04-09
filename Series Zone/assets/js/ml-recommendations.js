// ML Recommendations System for Series Zone
// Real ML logic for movie recommendations

class MLRecommendationSystem {
    constructor() {
        this.userHistory = [];
        this.genrePreferences = {};
        this.movieDatabase = [];
        this.similarityMatrix = {};
        
        // Load from new watch-tracking system
        this.loadFromWatchTracker();
        
        console.log('🤖 ML Recommendation System initialized');
    }

    // Load watch history from new watch-tracking system
    loadFromWatchTracker() {
        if (typeof watchTracker !== 'undefined') {
            const allHistory = watchTracker.getAllWatchHistory();
            this.userHistory = allHistory.map(session => ({
                movieId: session.movieId,
                title: session.movieTitle,
                genre: session.genre,
                watchTime: session.totalDurationMinutes || 0,
                completed: session.status === 'completed',
                percentageWatched: session.percentageWatched,
                timestamp: session.startTime,
                rating: 75 // Default rating
            }));
            this.updateGenrePreferences();
            console.log('📊 Loaded', this.userHistory.length, 'sessions from watch tracker');
        }
    }

    // Initialize with user data (legacy support)
    initialize(userData) {
        this.userHistory = userData.watchHistory || [];
        this.updateGenrePreferences();
        console.log('📊 ML system initialized with user data');
    }

    // Update genre preferences based on watch history
    updateGenrePreferences() {
        this.genrePreferences = {};
        
        this.userHistory.forEach(item => {
            if (!this.genrePreferences[item.genre]) {
                this.genrePreferences[item.genre] = {
                    count: 0,
                    totalTime: 0,
                    completedCount: 0,
                    averageRating: 0
                };
            }
            
            this.genrePreferences[item.genre].count++;
            this.genrePreferences[item.genre].totalTime += item.watchTime;
            
            if (item.completed) {
                this.genrePreferences[item.genre].completedCount++;
            }
        });

        // Calculate completion rate for each genre
        Object.keys(this.genrePreferences).forEach(genre => {
            const pref = this.genrePreferences[genre];
            pref.completionRate = pref.count > 0 ? (pref.completedCount / pref.count) * 100 : 0;
            pref.averageWatchTime = pref.count > 0 ? pref.totalTime / pref.count : 0;
        });

        console.log('📈 Genre preferences updated:', this.genrePreferences);
    }

    // Get user's favorite genres
    getFavoriteGenres() {
        return Object.entries(this.genrePreferences)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 3)
            .map(([genre, data]) => ({
                genre,
                count: data.count,
                completionRate: data.completionRate,
                preference: data.count * (data.completionRate / 100)
            }));
    }

    // Calculate cosine similarity between two movies
    calculateCosineSimilarity(movie1, movie2) {
        // Create feature vectors
        const features1 = this.createFeatureVector(movie1);
        const features2 = this.createFeatureVector(movie2);
        
        // Calculate dot product
        let dotProduct = 0;
        let magnitude1 = 0;
        let magnitude2 = 0;
        
        for (let i = 0; i < features1.length; i++) {
            dotProduct += features1[i] * features2[i];
            magnitude1 += features1[i] * features1[i];
            magnitude2 += features2[i] * features2[i];
        }
        
        magnitude1 = Math.sqrt(magnitude1);
        magnitude2 = Math.sqrt(magnitude2);
        
        if (magnitude1 === 0 || magnitude2 === 0) return 0;
        
        return dotProduct / (magnitude1 * magnitude2);
    }

    // Create feature vector for similarity calculation
    createFeatureVector(movie) {
        const vector = [];
        
        // Genre features (one-hot encoding)
        const allGenres = ['Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Sci-Fi', 'Thriller', 'Animation', 'Crime', 'Adventure'];
        const movieGenres = movie.genres || [];
        
        allGenres.forEach(genre => {
            vector.push(movieGenres.includes(genre) ? 1 : 0);
        });
        
        // Rating feature (normalized 0-1)
        vector.push((movie.rating || 0) / 100);
        
        // Year feature (normalized)
        const currentYear = new Date().getFullYear();
        const movieYear = movie.year || currentYear;
        vector.push((movieYear - 1900) / (currentYear - 1900));
        
        // Popularity feature (normalized)
        vector.push((movie.popularity || 0) / 1000);
        
        return vector;
    }

    // Get recommendations based on user preferences
    getRecommendations(allMovies, limit = 10) {
        if (this.userHistory.length === 0) {
            // Return popular movies for new users
            return allMovies
                .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
                .slice(0, limit)
                .map(movie => ({
                    ...movie,
                    matchPercentage: 85,
                    reason: 'Popular in your region'
                }));
        }

        const favoriteGenres = this.getFavoriteGenres();
        const recommendations = [];
        
        allMovies.forEach(movie => {
            // Skip if user has already watched
            if (this.userHistory.some(item => item.movieId === movie.id)) {
                return;
            }
            
            let matchScore = 0;
            let reason = '';
            
            // Genre-based scoring
            favoriteGenres.forEach(fav => {
                if (movie.genres && movie.genres.includes(fav.genre)) {
                    matchScore += fav.preference * 20;
                    reason = `Because you like ${fav.genre}`;
                }
            });
            
            // Similarity-based scoring
            if (this.userHistory.length > 0) {
                let maxSimilarity = 0;
                this.userHistory.forEach(watched => {
                    const similarity = this.calculateCosineSimilarity(movie, watched);
                    maxSimilarity = Math.max(maxSimilarity, similarity);
                });
                
                matchScore += maxSimilarity * 30;
                if (maxSimilarity > 0.7 && !reason) {
                    reason = 'Similar to movies you\'ve watched';
                }
            }
            
            // Rating-based scoring
            if (movie.rating && movie.rating > 70) {
                matchScore += (movie.rating - 70) * 0.5;
                if (!reason) {
                    reason = 'Highly rated';
                }
            }
            
            // Popularity-based scoring
            if (movie.popularity && movie.popularity > 100) {
                matchScore += Math.min(movie.popularity / 100, 10);
            }
            
            // Cap the score at 100
            matchScore = Math.min(matchScore, 100);
            
            if (matchScore > 30) { // Only include movies with decent match
                recommendations.push({
                    ...movie,
                    matchPercentage: Math.round(matchScore),
                    reason: reason || 'Recommended for you'
                });
            }
        });
        
        // Sort by match percentage and limit results
        return recommendations
            .sort((a, b) => b.matchPercentage - a.matchPercentage)
            .slice(0, limit);
    }

    // Get "Because you watched..." recommendations
    getBecauseYouWatched(watchedMovie, allMovies) {
        const recommendations = [];
        
        allMovies.forEach(movie => {
            // Skip if it's the same movie or already watched
            if (movie.id === watchedMovie.id || 
                this.userHistory.some(item => item.movieId === movie.id)) {
                return;
            }
            
            const similarity = this.calculateCosineSimilarity(movie, watchedMovie);
            
            if (similarity > 0.3) { // Threshold for similarity
                recommendations.push({
                    ...movie,
                    matchPercentage: Math.round(similarity * 100),
                    reason: `Because you watched "${watchedMovie.title}"`
                });
            }
        });
        
        return recommendations
            .sort((a, b) => b.matchPercentage - a.matchPercentage)
            .slice(0, 6);
    }

    // Predict drop risk for a movie
    predictDropRisk(movie, userSessionData = {}) {
        let riskScore = 50; // Base risk
        
        // Genre-based risk
        const genreRisk = this.getGenreDropRisk(movie.genres);
        riskScore += genreRisk;
        
        // Rating-based risk
        if (movie.rating && movie.rating < 60) {
            riskScore += 20;
        } else if (movie.rating && movie.rating > 80) {
            riskScore -= 15;
        }
        
        // Session-based risk
        if (userSessionData.sessionDuration) {
            if (userSessionData.sessionDuration < 30) {
                riskScore += 25; // Short session = higher risk
            } else if (userSessionData.sessionDuration > 120) {
                riskScore -= 10; // Long session = lower risk
            }
        }
        
        // Time of day risk
        const hour = new Date().getHours();
        if (hour >= 22 || hour <= 6) {
            riskScore += 10; // Late night = higher risk
        }
        
        // Cap the score
        riskScore = Math.max(0, Math.min(100, riskScore));
        
        return {
            riskScore: Math.round(riskScore),
            riskLevel: this.getRiskLevel(riskScore),
            factors: this.getRiskFactors(movie, userSessionData)
        };
    }

    // Get genre-based drop risk
    getGenreDropRisk(genres) {
        const genreRiskFactors = {
            'Comedy': -10,
            'Action': -5,
            'Drama': 0,
            'Horror': 15,
            'Romance': 5,
            'Sci-Fi': 0,
            'Thriller': 10,
            'Animation': -5,
            'Documentary': 20
        };
        
        let risk = 0;
        genres.forEach(genre => {
            risk += genreRiskFactors[genre] || 0;
        });
        
        return risk / genres.length;
    }

    // Get risk level based on score
    getRiskLevel(score) {
        if (score < 40) return 'Low';
        if (score < 70) return 'Medium';
        return 'High';
    }

    // Get risk factors for display
    getRiskFactors(movie, sessionData) {
        const factors = [];
        
        if (movie.rating && movie.rating < 60) {
            factors.push('Low rating may increase drop risk');
        }
        
        if (sessionData.sessionDuration && sessionData.sessionDuration < 30) {
            factors.push('Short viewing session detected');
        }
        
        const hour = new Date().getHours();
        if (hour >= 22 || hour <= 6) {
            factors.push('Late night viewing time');
        }
        
        return factors;
    }

    // Get personalized recommendations for continue watching
    getContinueWatchingRecommendations() {
        const incompleteMovies = this.userHistory.filter(item => !item.completed);
        
        return incompleteMovies
            .sort((a, b) => {
                // Prioritize recently watched and partially completed movies
                const aScore = (a.watchTime / a.totalTime) * 50 + 
                              (Date.now() - new Date(a.timestamp).getTime()) / -1000000;
                const bScore = (b.watchTime / b.totalTime) * 50 + 
                              (Date.now() - new Date(b.timestamp).getTime()) / -1000000;
                return bScore - aScore;
            })
            .slice(0, 5);
    }

    // Analyze user behavior patterns
    analyzeUserBehavior() {
        if (this.userHistory.length === 0) {
            return {
                totalWatchTime: 0,
                averageSessionLength: 0,
                favoriteGenres: [],
                viewingPatterns: {
                    peakHours: [],
                    preferredDays: [],
                    averageCompletionRate: 0
                }
            };
        }

        const analysis = {
            totalWatchTime: this.userHistory.reduce((sum, item) => sum + item.watchTime, 0),
            averageSessionLength: this.userHistory.reduce((sum, item) => sum + item.watchTime, 0) / this.userHistory.length,
            favoriteGenres: this.getFavoriteGenres(),
            viewingPatterns: this.analyzeViewingPatterns()
        };

        return analysis;
    }

    // Analyze viewing patterns
    analyzeViewingPatterns() {
        const patterns = {
            peakHours: [],
            preferredDays: [],
            averageCompletionRate: 0
        };

        const hourCounts = {};
        const dayCounts = {};
        let completedCount = 0;

        this.userHistory.forEach(item => {
            const date = new Date(item.timestamp);
            const hour = date.getHours();
            const day = date.getDay();

            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            dayCounts[day] = (dayCounts[day] || 0) + 1;

            if (item.completed) {
                completedCount++;
            }
        });

        // Find peak hours
        patterns.peakHours = Object.entries(hourCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([hour]) => parseInt(hour));

        // Find preferred days
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        patterns.preferredDays = Object.entries(dayCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([day]) => dayNames[parseInt(day)]);

        // Calculate completion rate
        patterns.averageCompletionRate = this.userHistory.length > 0 ? 
            (completedCount / this.userHistory.length) * 100 : 0;

        return patterns;
    }

    // Export user data for ML model training
    exportUserData() {
        return {
            watchHistory: this.userHistory,
            genrePreferences: this.genrePreferences,
            behaviorAnalysis: this.analyzeUserBehavior(),
            exportDate: new Date().toISOString()
        };
    }

    // Update user data (called when new movie is watched)
    updateUserWatchData(movieData) {
        this.userHistory.push(movieData);
        this.updateGenrePreferences();
        console.log('📊 User watch data updated');
    }
}

// Initialize ML system
window.mlRecommendations = new MLRecommendationSystem();

// Export for use in other files
window.MLRecommendationSystem = MLRecommendationSystem;
