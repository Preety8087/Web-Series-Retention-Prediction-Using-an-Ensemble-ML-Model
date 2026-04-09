/**
 * Series Zone Application
 * Main application logic and initialization
 */

class SeriesZoneApp {
    constructor() {
        this.currentUser = null;
        this.series = [];
        this.watchHistory = [];
        this.recommendations = [];
        this.init();
    }

    async init() {
        console.log('Initializing Series Zone App...');
        await this.loadSeries();
        await this.loadWatchHistory();
        this.setupEventListeners();
        this.renderFeatured();
    }

    async loadSeries() {
        // Mock data for series
        this.series = [
            {
                id: 1,
                title: 'Breaking Bad',
                genre: 'drama',
                rating: 9.5,
                image: 'breaking-bad.jpg',
                description: 'A chemistry teacher turned meth producer',
                episodes: 62
            },
            {
                id: 2,
                title: 'The Office',
                genre: 'comedy',
                rating: 9.0,
                image: 'the-office.jpg',
                description: 'Mockumentary about office employees',
                episodes: 201
            },
            {
                id: 3,
                title: 'Stranger Things',
                genre: 'sci-fi',
                rating: 8.7,
                image: 'stranger-things.jpg',
                description: 'Supernatural events in a small town',
                episodes: 42
            },
            {
                id: 4,
                title: 'Dark',
                genre: 'thriller',
                rating: 8.9,
                image: 'dark.jpg',
                description: 'Time travel mysteries in a German town',
                episodes: 26
            },
            {
                id: 5,
                title: 'The Crown',
                genre: 'drama',
                rating: 8.6,
                image: 'the-crown.jpg',
                description: 'Life of Queen Elizabeth II',
                episodes: 50
            }
        ];
        console.log(`Loaded ${this.series.length} series`);
    }

    async loadWatchHistory() {
        const saved = localStorage.getItem('watchHistory');
        this.watchHistory = saved ? JSON.parse(saved) : [];
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e));
        }

        // Genre filter
        const genreFilter = document.getElementById('genreFilter');
        if (genreFilter) {
            genreFilter.addEventListener('change', (e) => this.handleGenreFilter(e));
        }

        // Start watching button
        const startBtn = document.getElementById('startWatchingBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => navigateToPage('browse'));
        }
    }

    handleSearch(event) {
        const query = event.target.value.toLowerCase();
        const filtered = this.series.filter(s => 
            s.title.toLowerCase().includes(query)
        );
        this.renderSeriesGrid(filtered, 'series-grid');
    }

    handleGenreFilter(event) {
        const genre = event.target.value;
        const filtered = genre ? 
            this.series.filter(s => s.genre === genre) : 
            this.series;
        this.renderSeriesGrid(filtered, 'series-grid');
    }

    renderFeatured() {
        const carousel = document.getElementById('trending-carousel');
        if (!carousel) return;
        
        carousel.innerHTML = this.series
            .slice(0, 3)
            .map(s => `
                <div class="carousel-item">
                    <div class="series-card">
                        <div class="series-card-image" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                            ${s.title}
                        </div>
                        <div class="series-card-content">
                            <h3>${s.title}</h3>
                            <p class="rating">⭐ ${s.rating}</p>
                            <p class="description">${s.description}</p>
                            <button class="btn btn-sm" onclick="app.playSeriesAnimation(${s.id})">Play</button>
                        </div>
                    </div>
                </div>
            `).join('');
    }

    renderSeriesGrid(seriesData = null, elementId = 'series-grid') {
        const grid = document.getElementById(elementId);
        if (!grid) return;

        const data = seriesData || this.series;
        grid.innerHTML = data
            .map(s => `
                <div class="series-card">
                    <div class="series-card-image" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        ${s.title}
                    </div>
                    <div class="series-card-content">
                        <h3>${s.title}</h3>
                        <p class="genre">${s.genre}</p>
                        <p class="rating">⭐ ${s.rating}</p>
                        <p class="episodes">${s.episodes} Episodes</p>
                        <button class="btn btn-sm" onclick="app.playSeriesAnimation(${s.id})">Play</button>
                    </div>
                </div>
            `).join('');
    }

    playSeriesAnimation(seriesId) {
        const series = this.series.find(s => s.id === seriesId);
        if (series) {
            // Record in watch history
            const viewed = {
                seriesId,
                title: series.title,
                timestamp: new Date().toISOString(),
                genre: series.genre
            };
            this.watchHistory.push(viewed);
            localStorage.setItem('watchHistory', JSON.stringify(this.watchHistory));
            
            alert(`Now Playing: ${series.title}\n\nEnjoy your show! 🍿`);
        }
    }

    getRecommendations() {
        if (this.watchHistory.length === 0) {
            return this.series;
        }
        
        // Simple recommendation: based on genres watched
        const watchedGenres = [...new Set(this.watchHistory.map(w => w.genre))];
        const recommended = this.series.filter(s => 
            watchedGenres.includes(s.genre) && 
            !this.watchHistory.some(w => w.seriesId === s.id)
        );
        
        return recommended.length > 0 ? recommended : this.series;
    }

    getAnalytics() {
        return {
            totalWatched: this.watchHistory.length,
            genres: [...new Set(this.watchHistory.map(w => w.genre))],
            favoriteGenre: this.watchHistory.length > 0 ? 
                this.getMostFrequent(this.watchHistory.map(w => w.genre)) : 'None',
            lastWatched: this.watchHistory.length > 0 ? 
                this.watchHistory[this.watchHistory.length - 1].title : 'None'
        };
    }

    getMostFrequent(arr) {
        return arr.reduce((a, b, _, self) => 
            self.filter(v => v === a).length >= self.filter(v => v === b).length ? a : b
        );
    }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', function() {
    app = new SeriesZoneApp();
});
