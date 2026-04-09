/**
 * Watch Tracking Module
 * Tracks user viewing habits and session data for ML retention analytics
 */

class WatchTracker {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.storageKey = 'seriesZoneWatchSessions';
        this.sessionKey = `tracking_${this.sessionId}`;
        this.demoDataUrl = 'assets/data/demo-watch-history.csv';
        this.seedPromise = null;
        this.trackingData = [];
        this.sessionStart = new Date();
        this.currentSeries = null;
        this.genreStats = {};
        this.init();
    }

    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    }

    init() {
        console.log(`📊 Watch Tracker initialized with Session ID: ${this.sessionId}`);
        this.loadStoredData();
        this.migrateStoredUserIdentifiers();
        this.pruneDemoSessions();
        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('play-event', (e) => {
            this.trackPlay(e.detail);
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.trackSessionPause();
            } else {
                this.trackSessionResume();
            }
        });

        window.addEventListener('beforeunload', () => {
            this.saveSessionData();
        });
    }

    trackPlay(seriesData) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const userId = currentUser.id || currentUser.email || currentUser.name || 'guest_user';
        const duration = seriesData.runtime || seriesData.duration || seriesData.totalDurationMinutes || 45;
        const movieTitle = seriesData.title || seriesData.name || seriesData.movieTitle || 'Unknown Title';
        const movieId = seriesData.id || seriesData.movieId || `movie_${Math.random().toString(36).substring(2, 8)}`;
        const genre = seriesData.genre || (seriesData.genres && seriesData.genres[0]) || 'Unknown';

        const trackEntry = {
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            userId,
            userName: currentUser.name || currentUser.email || 'Viewer',
            movieId,
            movieTitle,
            genre,
            totalDurationMinutes: duration,
            percentageWatched: 0,
            status: 'watching',
            device: this.getDeviceType(),
            dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' })
        };

        this.trackingData.push(trackEntry);
        this.currentSeries = trackEntry;
        this.saveTracking();
        this.emitAnalysisUpdate();

        console.log(`▶️ Tracking started for: ${movieTitle}`);
    }

    trackSessionPause() {
        if (this.currentSeries) {
            this.currentSeries.status = 'paused';
            this.currentSeries.percentageWatched = Math.min(100, (this.currentSeries.percentageWatched || 0) + 10);
            this.saveTracking();
            this.emitAnalysisUpdate();
            console.log('⏸️ Session paused for:', this.currentSeries.movieTitle);
        }
    }

    trackSessionResume() {
        if (this.currentSeries && this.currentSeries.status === 'paused') {
            this.currentSeries.status = 'watching';
            this.saveTracking();
            this.emitAnalysisUpdate();
            console.log('▶️ Session resumed for:', this.currentSeries.movieTitle);
        }
    }

    getDeviceType() {
        const ua = navigator.userAgent;
        if (/mobile/i.test(ua)) return 'Mobile';
        if (/tablet/i.test(ua)) return 'Tablet';
        return 'Desktop';
    }

    saveSessionData() {
        if (this.trackingData.length === 0) {
            return;
        }

        const sessionData = {
            sessionId: this.sessionId,
            startTime: this.sessionStart.toISOString(),
            endTime: new Date().toISOString(),
            totalTracks: this.trackingData.length,
            data: this.trackingData
        };

        const sessions = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        sessions.push(sessionData);
        localStorage.setItem(this.storageKey, JSON.stringify(sessions));
        this.emitAnalysisUpdate();

        this.clearCurrentSession();
        console.log(`💾 Session data saved: ${sessions.length} sessions`);
    }

    clearCurrentSession() {
        localStorage.removeItem(this.sessionKey);
        this.trackingData = [];
        this.currentSeries = null;
        this.sessionId = this.generateSessionId();
        this.sessionKey = `tracking_${this.sessionId}`;
    }

    saveTracking() {
        localStorage.setItem(this.sessionKey, JSON.stringify(this.trackingData));
    }

    loadStoredData() {
        const stored = localStorage.getItem(this.sessionKey);
        if (stored) {
            this.trackingData = JSON.parse(stored);
            this.currentSeries = this.trackingData[this.trackingData.length - 1] || null;
        }
    }

    getAllTrackingKeys() {
        return Object.keys(localStorage).filter((key) => key.startsWith('tracking_'));
    }

    sanitizeStoredUserValue(rawValue) {
        if (!rawValue) {
            return { userId: 'unknown-user', userName: 'Viewer' };
        }
        if (typeof rawValue === 'object') {
            return {
                userId: rawValue.id || rawValue.email || rawValue.name || 'unknown-user',
                userName: rawValue.name || rawValue.email || 'Viewer'
            };
        }

        const text = String(rawValue).trim();
        if (!text) {
            return { userId: 'unknown-user', userName: 'Viewer' };
        }

        if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
            try {
                const parsed = JSON.parse(text);
                return {
                    userId: parsed.id || parsed.email || parsed.name || 'unknown-user',
                    userName: parsed.name || parsed.email || 'Viewer'
                };
            } catch (error) {
                return { userId: 'unknown-user', userName: 'Viewer' };
            }
        }

        return { userId: text, userName: text };
    }

    migrateStoredUserIdentifiers() {
        let touched = false;

        const sessions = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        const migratedSessions = sessions.map((session) => {
            if (!Array.isArray(session?.data)) {
                return session;
            }

            const data = session.data.map((item) => {
                const normalized = this.sanitizeStoredUserValue(item.userId);
                if (normalized.userId !== item.userId || (!item.userName && normalized.userName)) {
                    touched = true;
                }
                return {
                    ...item,
                    userId: normalized.userId,
                    userName: item.userName || normalized.userName
                };
            });

            return { ...session, data };
        });

        if (touched) {
            localStorage.setItem(this.storageKey, JSON.stringify(migratedSessions));
        }

        this.getAllTrackingKeys().forEach((key) => {
            const raw = localStorage.getItem(key);
            if (!raw) {
                return;
            }

            try {
                const items = JSON.parse(raw);
                if (!Array.isArray(items)) {
                    return;
                }

                let localTouched = false;
                const migratedItems = items.map((item) => {
                    const normalized = this.sanitizeStoredUserValue(item.userId);
                    if (normalized.userId !== item.userId || (!item.userName && normalized.userName)) {
                        localTouched = true;
                    }
                    return {
                        ...item,
                        userId: normalized.userId,
                        userName: item.userName || normalized.userName
                    };
                });

                if (localTouched) {
                    localStorage.setItem(key, JSON.stringify(migratedItems));
                    touched = true;
                }
            } catch (error) {
                console.warn('Could not migrate tracking session:', key, error);
            }
        });

        if (touched) {
            this.loadStoredData();
            this.emitAnalysisUpdate();
            console.log('Migrated stored watch sessions to safe user identifiers.');
        }
    }

    getUnsavedTrackingHistory() {
        const entries = [];

        this.getAllTrackingKeys().forEach((key) => {
            const raw = localStorage.getItem(key);
            if (!raw) {
                return;
            }

            try {
                const items = JSON.parse(raw);
                if (!Array.isArray(items)) {
                    return;
                }

                items.forEach((item) => {
                    entries.push({
                        ...item,
                        startTime: item.timestamp || new Date().toISOString(),
                        endTime: item.endTime || new Date().toISOString(),
                        sessionId: item.sessionId || key.replace('tracking_', ''),
                        dayOfWeek: item.dayOfWeek || new Date(item.timestamp || Date.now()).toLocaleDateString('en-US', { weekday: 'long' })
                    });
                });
            } catch (error) {
                console.warn('Could not parse tracking session:', key, error);
            }
        });

        const deduped = new Map();
        entries.forEach((item) => {
            const dedupeKey = [
                item.sessionId || '',
                item.movieId || '',
                item.timestamp || item.startTime || '',
                item.status || ''
            ].join('|');
            deduped.set(dedupeKey, item);
        });

        return Array.from(deduped.values());
    }

    getAllSessions() {
        return JSON.parse(localStorage.getItem(this.storageKey) || '[]')
            .filter((session) => !this.isDemoSession(session));
    }

    emitAnalysisUpdate() {
        window.dispatchEvent(new CustomEvent('retention-analysis-updated'));
    }

    async ensureDemoDataset() {
        return Promise.resolve();
    }

    isDemoSession(session) {
        const sessionId = String(session?.sessionId || '');
        const firstItem = Array.isArray(session?.data) ? session.data[0] : null;
        const userId = String(firstItem?.userId || firstItem?.user_id || '');
        const movieId = String(firstItem?.movieId || firstItem?.movie_id || '');

        return sessionId.startsWith('sample_')
            || sessionId.startsWith('csv_seed_')
            || userId.startsWith('sample_user_')
            || userId === 'viewer_seed'
            || movieId.startsWith('movie_seed_')
            || movieId.startsWith('series_');
    }

    pruneDemoSessions() {
        const sessions = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        if (!sessions.length) {
            return;
        }

        const realSessions = sessions.filter((session) => !this.isDemoSession(session));
        if (realSessions.length !== sessions.length) {
            localStorage.setItem(this.storageKey, JSON.stringify(realSessions));
            this.emitAnalysisUpdate();
            console.log(`Removed ${sessions.length - realSessions.length} demo watch sessions; using real viewer data only.`);
        }
    }

    async loadDemoDatasetFromCSV() {
        const response = await fetch(this.demoDataUrl, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`CSV seed request failed with ${response.status}`);
        }

        const csvText = await response.text();
        const rows = this.parseCSV(csvText);
        if (!rows.length) {
            throw new Error('CSV seed file did not contain any rows');
        }

        const sessions = rows.map((row, index) => ({
            sessionId: row.session_id || `csv_seed_${index + 1}`,
            startTime: row.start_time || new Date().toISOString(),
            endTime: row.end_time || row.start_time || new Date().toISOString(),
            totalTracks: 1,
            data: [
                {
                    timestamp: row.start_time || new Date().toISOString(),
                    sessionId: row.session_id || `csv_seed_${index + 1}`,
                    userId: row.user_id || 'viewer_seed',
                    movieId: row.movie_id || `movie_seed_${index + 1}`,
                    movieTitle: row.movie_title || 'Untitled Demo Session',
                    genre: row.genre || 'Unknown',
                    totalDurationMinutes: Number(row.total_duration_minutes || 0),
                    percentageWatched: Number(row.percentage_watched || 0),
                    status: row.status || 'dropped',
                    device: row.device || 'Desktop',
                    dayOfWeek: row.day_of_week || new Date(row.start_time || Date.now()).toLocaleDateString('en-US', { weekday: 'long' }),
                    endTime: row.end_time || row.start_time || new Date().toISOString(),
                }
            ]
        }));

        localStorage.setItem(this.storageKey, JSON.stringify(sessions));
        this.emitAnalysisUpdate();
        console.log(`✅ Demo CSV watch history loaded: ${sessions.length} sessions`);
    }

    parseCSV(csvText) {
        const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) {
            return [];
        }

        const headers = lines[0].split(',').map((header) => header.trim());
        return lines.slice(1).map((line) => {
            const values = line.split(',').map((value) => value.trim());
            return headers.reduce((entry, header, index) => {
                entry[header] = values[index] || '';
                return entry;
            }, {});
        });
    }

    getAllWatchHistory() {
        const sessions = this.getAllSessions();
        const history = [];

        sessions.forEach((session) => {
            const sessionStart = session.startTime || new Date().toISOString();
            (session.data || []).forEach((item) => {
                history.push({
                    ...item,
                    movieId: item.movieId || item.movie_id || item.seriesId || item.series_id || null,
                    movieTitle: item.movieTitle || item.movie_title || item.seriesTitle || item.series_title || 'Untitled Session',
                    genre: item.genre || 'Unknown',
                    percentageWatched: Number(item.percentageWatched ?? item.percentage_watched ?? 0),
                    totalDurationMinutes: Number(item.totalDurationMinutes ?? item.total_duration_minutes ?? 0),
                    status: item.status || 'watching',
                    device: item.device || 'Desktop',
                    startTime: item.timestamp || sessionStart,
                    endTime: item.endTime || session.endTime || new Date().toISOString(),
                    sessionId: session.sessionId,
                    dayOfWeek: item.dayOfWeek || new Date(item.timestamp || sessionStart).toLocaleDateString('en-US', { weekday: 'long' })
                });
            });
        });

        this.getUnsavedTrackingHistory().forEach((item) => {
            history.push({
                ...item,
                movieId: item.movieId || item.movie_id || item.seriesId || item.series_id || null,
                movieTitle: item.movieTitle || item.movie_title || item.seriesTitle || item.series_title || 'Untitled Session',
                genre: item.genre || 'Unknown',
                percentageWatched: Number(item.percentageWatched ?? item.percentage_watched ?? 0),
                totalDurationMinutes: Number(item.totalDurationMinutes ?? item.total_duration_minutes ?? 0),
                status: item.status || 'watching',
                device: item.device || 'Desktop',
            });
        });

        const deduped = new Map();
        history.forEach((item) => {
            const dedupeKey = [
                item.sessionId || '',
                item.movieId || '',
                item.timestamp || item.startTime || '',
                item.status || ''
            ].join('|');
            deduped.set(dedupeKey, item);
        });

        return Array.from(deduped.values());
    }

    generateSampleWatchHistory() {
        if (this.getAllSessions().length) {
            return;
        }

        const sampleMovies = [
            { id: 'series_101', title: 'Dhuranshar', genre: 'Action', runtime: 110 },
            { id: 'series_102', title: 'Mystery Night', genre: 'Thriller', runtime: 95 },
            { id: 'series_103', title: 'Romance Breeze', genre: 'Romance', runtime: 105 },
            { id: 'series_104', title: 'Comedy Flick', genre: 'Comedy', runtime: 88 },
            { id: 'series_105', title: 'Sci-Fi Saga', genre: 'Sci-Fi', runtime: 125 }
        ];

        const sessions = this.getAllSessions();
        const baseDate = new Date();

        sampleMovies.forEach((movie, idx) => {
            const percentageWatched = [92, 65, 80, 38, 74][idx];
            const status = percentageWatched >= 80 ? 'completed' : percentageWatched >= 50 ? 'dropped' : 'paused';
            const sampleSession = {
                sessionId: `sample_${idx}_${Date.now()}`,
                startTime: new Date(baseDate.getTime() - idx * 24 * 60 * 60 * 1000).toISOString(),
                endTime: new Date(baseDate.getTime() - idx * 24 * 60 * 60 * 1000 + (percentageWatched / 100) * movie.runtime * 60 * 1000).toISOString(),
                totalTracks: 1,
                data: [
                    {
                        timestamp: new Date(baseDate.getTime() - idx * 24 * 60 * 60 * 1000).toISOString(),
                        movieId: movie.id,
                        movieTitle: movie.title,
                        userId: `sample_user_${idx + 1}`,
                        genre: movie.genre,
                        totalDurationMinutes: movie.runtime,
                        percentageWatched,
                        status,
                        device: idx % 2 === 0 ? 'Desktop' : 'Mobile',
                        dayOfWeek: new Date(baseDate.getTime() - idx * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'long' })
                    }
                ]
            };
            sessions.push(sampleSession);
        });

        localStorage.setItem(this.storageKey, JSON.stringify(sessions));
        this.emitAnalysisUpdate();
        console.log('✅ Sample watch history generated for demo');
    }

    calculateRetentionMetrics() {
        const history = this.getAllWatchHistory();
        const total = history.length;
        const completed = history.filter((item) => item.status === 'completed').length;
        const totalMinutes = history.reduce((sum, item) => sum + ((item.totalDurationMinutes || 0) * ((item.percentageWatched || 0) / 100)), 0);
        const activeNow = this.trackingData.filter((item) => item.status === 'watching').length;

        return {
            activeNow,
            avgWatchTime: total > 0 ? Math.round(totalMinutes / total) : 0,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
            totalSessions: total
        };
    }

    getGenreStats() {
        const history = this.getAllWatchHistory();
        const stats = {};

        history.forEach((item) => {
            const genre = item.genre || 'Unknown';
            if (!stats[genre]) {
                stats[genre] = {
                    totalViews: 0,
                    completionCount: 0,
                    totalWatchPercentage: 0,
                    totalMinutes: 0
                };
            }

            stats[genre].totalViews += 1;
            stats[genre].totalWatchPercentage += item.percentageWatched || 0;
            stats[genre].totalMinutes += item.totalDurationMinutes || 0;
            if (item.status === 'completed') {
                stats[genre].completionCount += 1;
            }
        });

        Object.values(stats).forEach((genreStat) => {
            genreStat.avgWatchPercentage = genreStat.totalViews > 0 ? genreStat.totalWatchPercentage / genreStat.totalViews : 0;
        });

        return stats;
    }

    getDayWiseStats() {
        const history = this.getAllWatchHistory();
        const stats = {};

        history.forEach((item) => {
            const day = item.dayOfWeek || new Date(item.startTime).toLocaleDateString('en-US', { weekday: 'long' });
            stats[day] = (stats[day] || 0) + 1;
        });

        return stats;
    }

    getCompletionStats() {
        const history = this.getAllWatchHistory();
        const stats = { completed: 0, dropped: 0, paused: 0, total: history.length };

        history.forEach((item) => {
            const status = item.status || 'dropped';
            if (status === 'completed') stats.completed += 1;
            else if (status === 'paused') stats.paused += 1;
            else stats.dropped += 1;
        });

        return stats;
    }

    getTopMovies(limit = 5) {
        const history = this.getAllWatchHistory();
        const movieMap = new Map();

        history.forEach((item) => {
            if (!movieMap.has(item.movieId)) {
                movieMap.set(item.movieId, {
                    movieId: item.movieId,
                    title: item.movieTitle,
                    views: 0,
                    totalWatch: 0,
                    completions: 0
                });
            }

            const entry = movieMap.get(item.movieId);
            entry.views += 1;
            entry.totalWatch += item.percentageWatched || 0;
            if (item.status === 'completed') {
                entry.completions += 1;
            }
        });

        const movies = Array.from(movieMap.values()).map((movie) => ({
            ...movie,
            avgWatch: movie.views > 0 ? Math.round(movie.totalWatch / movie.views) : 0
        }));

        return movies.sort((a, b) => b.views - a.views).slice(0, limit);
    }

    predictChurnRisk() {
        const history = this.getAllWatchHistory();
        const completionRate = history.length > 0 ? history.filter((item) => item.status === 'completed').length / history.length : 0;
        const dropRate = history.length > 0 ? history.filter((item) => item.status === 'dropped').length / history.length : 0;
        const recencyBonus = this.trackingData.filter((item) => item.status === 'watching').length > 0 ? -5 : 0;
        let riskScore = Math.round((1 - completionRate) * 100 + dropRate * 20 + recencyBonus);
        riskScore = Math.max(0, Math.min(100, riskScore));

        let riskLevel = 'Low';
        if (riskScore >= 70) riskLevel = 'High';
        else if (riskScore >= 40) riskLevel = 'Medium';

        const recommendation = completionRate > 0.75 ? 'Retention is strong. Keep highlighting high-interest genres.' : 'Push shorter episodes and stronger opening scenes for better retention.';
        const dropTrend = dropRate > 0.4 ? 'High drop-off rate detected' : 'Drop-off rate is acceptable';

        return {
            riskScore,
            riskLevel,
            dropTrend,
            recommendation
        };
    }

    getDropoffAnalysis() {
        const history = this.getAllWatchHistory();
        const buckets = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };

        history.forEach((item) => {
            const pct = item.percentageWatched || 0;
            if (pct <= 20) buckets['0-20'] += 1;
            else if (pct <= 40) buckets['21-40'] += 1;
            else if (pct <= 60) buckets['41-60'] += 1;
            else if (pct <= 80) buckets['61-80'] += 1;
            else buckets['81-100'] += 1;
        });

        return buckets;
    }

    exportToCSV() {
        const history = this.getAllWatchHistory();
        if (history.length === 0) {
            console.warn('No watch history available for export.');
            return;
        }

        const headers = ['Session ID', 'User ID', 'Movie ID', 'Movie Title', 'Genre', 'Watch %', 'Status', 'Device', 'Start Time', 'End Time'];
        const rows = history.map((item) => [
            item.sessionId,
            item.userId,
            item.movieId,
            item.movieTitle,
            item.genre,
            item.percentageWatched,
            item.status,
            item.device,
            item.startTime,
            item.endTime
        ]);

        const csvContent = [headers.join(','), ...rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'series_zone_watch_history.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    clearAllData() {
        localStorage.removeItem(this.storageKey);
        this.getAllTrackingKeys().forEach((key) => localStorage.removeItem(key));
        this.clearCurrentSession();
        this.emitAnalysisUpdate();
        console.log('🗑️ All watch tracking data cleared');
    }

    updateGenreStats(genre) {
        this.genreStats[genre] = this.genreStats[genre] || { count: 0, lastUpdated: null };
        this.genreStats[genre].count += 1;
        this.genreStats[genre].lastUpdated = new Date().toISOString();
    }
}

const watchTracker = new WatchTracker();

window.trackPlay = (seriesData) => {
    const event = new CustomEvent('play-event', { detail: seriesData });
    window.dispatchEvent(event);
};

console.log('✅ Watch Tracking Module loaded');
