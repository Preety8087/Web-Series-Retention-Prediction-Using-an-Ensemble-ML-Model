/**
 * TMDB API Integration Module
 * Handles API calls to The Movie Database
 */

class TMDBApiClient {
    constructor() {
        this.apiKey = window.SERIES_ZONE_TMDB_API_KEY
            || localStorage.getItem('series-zone-tmdb-key')
            || '7a0abbf4cd791d438bf30b02c6eefc74';
        this.baseUrl = 'https://api.themoviedb.org/3';
        this.imageBaseUrl = 'https://image.tmdb.org/t/p';
        this.proxyBaseUrl = '/api/tmdb';
        this.cache = {};
    }

    /**
     * Search for TV series
     */
    async searchSeries(query, page = 1) {
        try {
            const cacheKey = `search_${query}_${page}`;
            if (this.cache[cacheKey]) return this.cache[cacheKey];

            const response = await fetch(
                `${this.proxyBaseUrl}?path=/search/tv&query=${encodeURIComponent(query)}&page=${page}`
            );
            if (!response.ok) {
                throw new Error(`TMDB search failed with ${response.status}`);
            }
            const data = await response.json();
            this.cache[cacheKey] = data;
            return data;
        } catch (error) {
            console.error('Search error:', error);
            return this.getMockSearchResults(query);
        }
    }

    /**
     * Get trending TV series
     */
    async getTrendingSeries(timeWindow = 'week') {
        try {
            const cacheKey = `trending_${timeWindow}`;
            if (this.cache[cacheKey]) return this.cache[cacheKey];

            const response = await fetch(
                `${this.proxyBaseUrl}?path=/trending/tv/${timeWindow}`
            );
            if (!response.ok) {
                throw new Error(`TMDB trending failed with ${response.status}`);
            }
            const data = await response.json();
            this.cache[cacheKey] = data;
            return data;
        } catch (error) {
            console.error('Trending error:', error);
            return this.getMockTrendingResults();
        }
    }

    /**
     * Get series details
     */
    async getSeriesDetails(seriesId) {
        try {
            const cacheKey = `details_${seriesId}`;
            if (this.cache[cacheKey]) return this.cache[cacheKey];

            const response = await fetch(
                `${this.proxyBaseUrl}?path=/tv/${seriesId}&append_to_response=credits,reviews`
            );
            if (!response.ok) {
                throw new Error(`TMDB details failed with ${response.status}`);
            }
            const data = await response.json();
            this.cache[cacheKey] = data;
            return data;
        } catch (error) {
            console.error('Details error:', error);
            return null;
        }
    }

    /**
     * Get series by genre
     */
    async getSeriesByGenre(genreId, page = 1) {
        try {
            const cacheKey = `genre_${genreId}_${page}`;
            if (this.cache[cacheKey]) return this.cache[cacheKey];

            const response = await fetch(
                `${this.proxyBaseUrl}?path=/discover/tv&with_genres=${genreId}&page=${page}&sort_by=popularity.desc`
            );
            if (!response.ok) {
                throw new Error(`TMDB genre failed with ${response.status}`);
            }
            const data = await response.json();
            this.cache[cacheKey] = data;
            return data;
        } catch (error) {
            console.error('Genre error:', error);
            return this.getMockGenreResults();
        }
    }

    /**
     * Get recommendations for a series
     */
    async getRecommendations(seriesId, page = 1) {
        try {
            const cacheKey = `recommendations_${seriesId}_${page}`;
            if (this.cache[cacheKey]) return this.cache[cacheKey];

            const response = await fetch(
                `${this.proxyBaseUrl}?path=/tv/${seriesId}/recommendations&page=${page}`
            );
            if (!response.ok) {
                throw new Error(`TMDB recommendations failed with ${response.status}`);
            }
            const data = await response.json();
            this.cache[cacheKey] = data;
            return data;
        } catch (error) {
            console.error('Recommendations error:', error);
            return this.getMockRecommendations();
        }
    }

    /**
     * Get reviews for a series
     */
    async getReviews(seriesId) {
        try {
            const response = await fetch(
                `${this.proxyBaseUrl}?path=/tv/${seriesId}/reviews`
            );
            if (!response.ok) {
                throw new Error(`TMDB reviews failed with ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Reviews error:', error);
            return { results: [] };
        }
    }

    /**
     * Format image URL
     */
    getImageUrl(path, size = 'w500') {
        if (!path) return null;
        if (String(path).startsWith('http')) {
            return path;
        }
        return `/api/tmdb-image?size=${encodeURIComponent(size)}&path=${encodeURIComponent(path)}`;
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache = {};
        console.log('API cache cleared');
    }

    /**
     * Mock data for demo
     */
    getMockSearchResults(query) {
        return {
            results: [
                {
                    id: 1,
                    name: `Results for "${query}"`,
                    overview: 'Mock search results placeholder'
                }
            ]
        };
    }

    getMockTrendingResults() {
        return {
            results: [
                { id: 1, name: 'Breaking Bad', popularity: 100 },
                { id: 2, name: 'The Office', popularity: 95 },
                { id: 3, name: 'Stranger Things', popularity: 90 }
            ]
        };
    }

    getMockGenreResults() {
        return {
            results: [
                { id: 1, name: 'Series 1', vote_average: 8.5 },
                { id: 2, name: 'Series 2', vote_average: 8.3 }
            ]
        };
    }

    getMockRecommendations() {
        return {
            results: [
                { id: 101, name: 'Recommended Series 1' },
                { id: 102, name: 'Recommended Series 2' }
            ]
        };
    }

    /**
     * Batch requests
     */
    async batchFetch(urls) {
        try {
            const promises = urls.map(url => fetch(url).then(r => r.json()));
            return await Promise.all(promises);
        } catch (error) {
            console.error('Batch fetch error:', error);
            return [];
        }
    }

    /**
     * Get rate limit status
     */
    async getRateLimitStatus() {
        try {
            const response = await fetch(
                `${this.baseUrl}/account?api_key=${this.apiKey}`
            );
            return await response.json();
        } catch (error) {
            console.error('Rate limit check error:', error);
            return null;
        }
    }

    /**
     * Initialize with API key
     */
    static initialize(apiKey) {
        const client = new TMDBApiClient();
        client.apiKey = apiKey;
        return client;
    }
}

// Initialize global API client
const tmdbApi = new TMDBApiClient();
window.tmdbApi = tmdbApi;
window.TMDBApiClient = TMDBApiClient;

console.log('✅ TMDB API Module loaded');
