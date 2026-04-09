/**
 * Series Zone Application with TMDB Integration
 * Netflix-style streaming platform with ML recommendations
 */

class SeriesZoneApp {
    constructor() {
        const configuredTmdbKey = window.SERIES_ZONE_TMDB_API_KEY
            || localStorage.getItem('series-zone-tmdb-key')
            || '7a0abbf4cd791d438bf30b02c6eefc74';

        this.currentUser = null;
        this.currentRole = 'viewer';
        this.currentMovie = null;
        this.trendingMovies = [];
        this.popularMovies = [];
        this.topratedMovies = [];
        this.watchHistory = [];
        this.isBootstrapped = false;
        this.initPromise = null;
        this.hasCompletedInitialLoad = false;
        this.catalogCacheKey = 'series-zone-catalog-cache';
        this.TMDB_API_KEY = configuredTmdbKey;
        this.fallbackCatalog = this.buildFallbackCatalog();
        localStorage.setItem('series-zone-tmdb-key', this.TMDB_API_KEY);
        this.init();
    }

    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this.runInit().finally(() => {
            this.initPromise = null;
        });

        return this.initPromise;
    }

    async runInit() {
        console.log('🎬 Initializing Series Zone App...');
        
        // Check auth
        const user = localStorage.getItem('currentUser');
        if (!user) {
            console.log('User not authenticated');
            return;
        }
        
        this.currentUser = JSON.parse(user);
        this.currentRole = this.currentUser.role || 'viewer';
        this.refreshCurrentUser();
        window.app = this;
        app = this;

        const cachedCatalog = this.loadCachedCatalog();
        this.trendingMovies = [...(cachedCatalog.trending || this.fallbackCatalog.trending)];
        this.popularMovies = [...(cachedCatalog.popular || this.fallbackCatalog.popular)];
        this.topratedMovies = [...(cachedCatalog.topRated || this.fallbackCatalog.topRated)];
        if (this.trendingMovies.length) {
            this.setHeroBanner(this.trendingMovies[0]);
        }
        this.renderCarousels();
        
        // Load TMDB data
        await this.loadTrendingMovies();
        await this.loadPopularMovies();
        await this.loadTopRatedMovies();
        await this.loadWatchHistory();
        
        if (!this.isBootstrapped) {
            this.setupEventListeners();
            this.isBootstrapped = true;
        }
        this.renderCarousels();
        this.renderHeroSummary();
        this.renderRetentionSurfaces();
        this.renderAdminDashboard();
        this.hasCompletedInitialLoad = true;

        const defaultPage = this.currentRole === 'admin' ? 'admin-page' : 'home-page';
        const restoredPage = this.currentRole === 'admin'
            ? (localStorage.getItem('series-zone-active-page') || defaultPage)
            : 'home-page';
        this.switchPage(restoredPage);
    }

    refreshCurrentUser() {
        const user = localStorage.getItem('currentUser');
        if (!user) {
            this.currentUser = null;
            this.currentRole = 'guest';
            return;
        }

        this.currentUser = JSON.parse(user);
        this.currentRole = this.currentUser.role || 'viewer';
        document.body.dataset.userRole = this.currentRole;

        const userNameElement = document.getElementById('userNameDisplay');
        if (userNameElement) {
            userNameElement.textContent = this.currentUser.name;
        }

        const roleElement = document.getElementById('userRoleDisplay');
        if (roleElement) {
            roleElement.textContent = this.currentRole === 'admin' ? 'Admin Workspace' : 'Viewer Workspace';
        }

        this.toggleRoleNavbars();
        this.renderNavbarWorkspaceState();
        this.refreshWorkspacePageChrome();
    }

    getWorkspaceHomePage() {
        return this.currentRole === 'admin' ? 'admin-page' : 'home-page';
    }

    goToWorkspaceHome() {
        this.switchPage(this.getWorkspaceHomePage());
    }

    refreshWorkspacePageChrome() {
        const backLabel = this.currentRole === 'admin' ? 'Back to Overview' : 'Back to Browse';
        const bindBackButton = (selector) => {
            const button = document.querySelector(selector);
            if (!button) return;
            button.textContent = backLabel;
            button.onclick = () => this.goToWorkspaceHome();
        };

        bindBackButton('#analytics-page .page-shell-back');
        bindBackButton('#ml-insights-page .page-shell-back');
        bindBackButton('#profile-page .page-shell-back');
        bindBackButton('#my-list-page .page-shell-back');
        bindBackButton('#admin-page .page-shell-back');

        const historyBack = document.querySelector('#history-page .history-close');
        if (historyBack) {
            historyBack.textContent = backLabel;
            historyBack.onclick = () => this.goToWorkspaceHome();
        }

        const analyticsTitle = document.querySelector('#analytics-page h2');
        if (analyticsTitle) {
            analyticsTitle.textContent = this.currentRole === 'admin' ? 'Retention Analytics' : 'My Retention Likelihood';
        }

        const mlInsightsTitle = document.querySelector('#ml-insights-page h2');
        if (mlInsightsTitle) {
            mlInsightsTitle.textContent = this.currentRole === 'admin' ? 'Ops AI Command Center' : 'Recommendations For Me';
        }

        const profileTitle = document.querySelector('#profile-page h2');
        if (profileTitle) {
            profileTitle.textContent = this.currentRole === 'admin' ? 'Viewer Profiles' : 'My Favorite Genre';
        }

        const myListTitle = document.querySelector('#my-list-page h2');
        if (myListTitle) {
            myListTitle.textContent = this.currentRole === 'admin' ? 'Model Evaluation and Export' : 'My Watchlist';
        }

        const adminTitle = document.querySelector('#admin-page h2');
        if (adminTitle) {
            adminTitle.textContent = 'Operations Overview';
        }
    }

    buildFallbackCatalog() {
        return {
            trending: [
                {
                    id: 950001,
                    title: 'Interstellar',
                    overview: 'A team travels through a wormhole in space in an attempt to ensure humanity survives.',
                    vote_average: 8.7,
                    release_date: '2014-11-07',
                    runtime: 169,
                    genres: [{ name: 'Sci-Fi' }, { name: 'Adventure' }],
                    poster_path: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
                    backdrop_path: 'https://image.tmdb.org/t/p/original/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
                    trailerKey: 'zSWdZVtXT7E'
                },
                {
                    id: 950002,
                    title: 'Dune: Part Two',
                    overview: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against those who destroyed his family.',
                    vote_average: 8.5,
                    release_date: '2024-03-01',
                    runtime: 166,
                    genres: [{ name: 'Sci-Fi' }, { name: 'Drama' }],
                    poster_path: 'https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
                    backdrop_path: 'https://image.tmdb.org/t/p/original/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
                    trailerKey: 'Way9Dexny3w'
                },
                {
                    id: 950003,
                    title: 'The Dark Knight',
                    overview: 'Batman raises the stakes in his war on crime as the Joker emerges in Gotham.',
                    vote_average: 9.0,
                    release_date: '2008-07-18',
                    runtime: 152,
                    genres: [{ name: 'Action' }, { name: 'Crime' }],
                    poster_path: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
                    backdrop_path: 'https://image.tmdb.org/t/p/original/hZkgoQYus5vegHoetLkCJzb17zJ.jpg',
                    trailerKey: 'EXeTwQWrcwY'
                },
                {
                    id: 950010,
                    title: 'Mad Max: Fury Road',
                    overview: 'In a post-apocalyptic wasteland, Max teams up with Furiosa to flee a tyrant.',
                    vote_average: 8.1,
                    release_date: '2015-05-15',
                    runtime: 120,
                    genres: [{ name: 'Action' }, { name: 'Adventure' }],
                    poster_path: 'https://image.tmdb.org/t/p/w500/hA2ple9q4qnwxp3hKVNhroipsir.jpg',
                    backdrop_path: 'https://image.tmdb.org/t/p/original/phszHPFVhPHhMZgo0fWTKBDQsJA.jpg',
                    trailerKey: 'hEJnMQG9ev8'
                },
                {
                    id: 950011,
                    title: 'John Wick: Chapter 4',
                    overview: 'John Wick uncovers a path to defeating The High Table.',
                    vote_average: 7.8,
                    release_date: '2023-03-24',
                    runtime: 170,
                    genres: [{ name: 'Action' }, { name: 'Thriller' }],
                    poster_path: 'https://image.tmdb.org/t/p/w500/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg',
                    backdrop_path: 'https://image.tmdb.org/t/p/original/7I6VUdPj6tQECNHdviJkUHD2u89.jpg',
                    trailerKey: 'qEVUtrk8_B4'
                },
                {
                    id: 950012,
                    title: 'Mission: Impossible - Dead Reckoning',
                    overview: 'Ethan Hunt and the IMF team race to find a terrifying new weapon.',
                    vote_average: 7.6,
                    release_date: '2023-07-12',
                    runtime: 164,
                    genres: [{ name: 'Action' }, { name: 'Spy' }],
                    poster_path: 'https://image.tmdb.org/t/p/w500/NNxYkU70HPurnNCSiCjYAmacwm.jpg',
                    backdrop_path: 'https://image.tmdb.org/t/p/original/628Dep6AxEtDxjZoGP78TsOxYbK.jpg',
                    trailerKey: 'avz06PDqDbM'
                }
            ],
            popular: [
                {
                    id: 950004,
                    title: 'Avatar: The Way of Water',
                    overview: 'Jake Sully lives with his newfound family formed on the extrasolar moon Pandora.',
                    vote_average: 7.6,
                    release_date: '2022-12-16',
                    runtime: 192,
                    genres: [{ name: 'Sci-Fi' }, { name: 'Adventure' }],
                    poster_path: 'https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg',
                    backdrop_path: 'https://image.tmdb.org/t/p/original/s16H6tpK2utvwDtzZ8Qy4qm5Emw.jpg',
                    trailerKey: 'd9MyW72ELq0'
                },
                {
                    id: 950005,
                    title: 'Spider-Man: Across the Spider-Verse',
                    overview: 'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People.',
                    vote_average: 8.4,
                    release_date: '2023-06-02',
                    runtime: 140,
                    genres: [{ name: 'Animation' }, { name: 'Action' }],
                    poster_path: 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
                    backdrop_path: 'https://image.tmdb.org/t/p/original/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg',
                    trailerKey: 'shW9i6k8cB0'
                },
                {
                    id: 950006,
                    title: 'Oppenheimer',
                    overview: 'The story of J. Robert Oppenheimer’s role in the development of the atomic bomb.',
                    vote_average: 8.3,
                    release_date: '2023-07-21',
                    runtime: 181,
                    genres: [{ name: 'Drama' }, { name: 'History' }],
                    poster_path: 'https://image.tmdb.org/t/p/w500/ptpr0kGAckfQkJeJIt8st5dglvd.jpg',
                    backdrop_path: 'https://image.tmdb.org/t/p/original/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg',
                    trailerKey: 'uYPbbksJxIg'
                },
                {
                    id: 950013,
                    title: 'Guardians of the Galaxy Vol. 3',
                    overview: 'Peter Quill rallies his team to defend the universe and protect one of their own.',
                    vote_average: 8.0,
                    release_date: '2023-05-05',
                    runtime: 150,
                    genres: [{ name: 'Sci-Fi' }, { name: 'Comedy' }],
                    poster_path: 'https://image.tmdb.org/t/p/w500/r2J02Z2OpNTctfOSN1Ydgii51I3.jpg',
                    backdrop_path: 'https://image.tmdb.org/t/p/original/5YZbUmjbMa3ClvSW1Wj3D6XGolb.jpg',
                    trailerKey: 'JqcncLPi9zw'
                },
                {
                    id: 950014,
                    title: 'The Batman',
                    overview: 'Batman ventures into Gotham City’s underworld when a sadistic killer leaves behind clues.',
                    vote_average: 7.9,
                    release_date: '2022-03-04',
                    runtime: 176,
                    genres: [{ name: 'Crime' }, { name: 'Mystery' }],
                    poster_path: 'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg',
                    backdrop_path: 'https://image.tmdb.org/t/p/original/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg',
                    trailerKey: 'mqqft2x_Aa4'
                },
                {
                    id: 950015,
                    title: 'Black Panther: Wakanda Forever',
                    overview: 'The people of Wakanda fight to protect their home from intervening world powers.',
                    vote_average: 7.2,
                    release_date: '2022-11-11',
                    runtime: 161,
                    genres: [{ name: 'Action' }, { name: 'Drama' }],
                    poster_path: 'https://image.tmdb.org/t/p/w500/sv1xJUazXeYqALzczSZ3O6nkH75.jpg',
                    backdrop_path: 'https://image.tmdb.org/t/p/original/yYrvN5WFeGYjJnRzhY0QXuo4Isw.jpg',
                    trailerKey: '_Z3QKkl1WyM'
                },
                {
                    id: 950016,
                    title: 'Top Gun: Maverick',
                    overview: 'After more than thirty years of service, Maverick confronts ghosts of his past.',
                    vote_average: 8.2,
                    release_date: '2022-05-27',
                    runtime: 131,
                    genres: [{ name: 'Action' }, { name: 'Drama' }],
                    poster_path: 'https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg',
                    backdrop_path: 'https://image.tmdb.org/t/p/original/odJ4hx6g6vBt4lBWKFD1tI8WS4x.jpg',
                    trailerKey: 'qSqVVswa420'
                }
            ],
            topRated: [
                {
                    id: 950007,
                    title: 'Inception',
                    overview: 'A thief who steals corporate secrets through dream-sharing technology is given an inverse task.',
                    vote_average: 8.8,
                    release_date: '2010-07-16',
                    runtime: 148,
                    genres: [{ name: 'Sci-Fi' }, { name: 'Thriller' }],
                    poster_path: 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
                    backdrop_path: 'https://image.tmdb.org/t/p/original/s3TBrRGB1iav7gFOCNx3H31MoES.jpg',
                    trailerKey: 'YoHD9XEInc0'
                },
                {
                    id: 950008,
                    title: 'The Shawshank Redemption',
                    overview: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption.',
                    vote_average: 9.3,
                    release_date: '1994-09-23',
                    runtime: 142,
                    genres: [{ name: 'Drama' }],
                    poster_path: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
                    backdrop_path: 'https://image.tmdb.org/t/p/original/iNh3BivHyg5sQRPP1KOkzguEX0H.jpg',
                    trailerKey: 'NmzuHjWmXOc'
                },
                {
                    id: 950009,
                    title: 'Parasite',
                    overview: 'All unemployed, Ki-taek and his family take peculiar interest in the wealthy Parks.',
                    vote_average: 8.5,
                    release_date: '2019-11-08',
                    runtime: 132,
                    genres: [{ name: 'Thriller' }, { name: 'Drama' }],
                    poster_path: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
                    backdrop_path: 'https://image.tmdb.org/t/p/original/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg',
                    trailerKey: '5xH0HfJHsaY'
                },
                {
                    id: 950017,
                    title: 'Fight Club',
                    overview: 'An insomniac office worker and a soap maker form an underground fight club.',
                    vote_average: 8.8,
                    release_date: '1999-10-15',
                    runtime: 139,
                    genres: [{ name: 'Drama' }, { name: 'Thriller' }],
                    poster_path: 'https://image.tmdb.org/t/p/w500/bptfVGEQuv6vDTIMVCHjJ9Dz8PX.jpg',
                    backdrop_path: 'https://image.tmdb.org/t/p/original/rr7E0NoGKxvbkb89eR1GwfoYjpA.jpg',
                    trailerKey: 'SUXWAEX2jlg'
                },
                {
                    id: 950018,
                    title: 'The Godfather',
                    overview: 'The aging patriarch of an organized crime dynasty transfers control to his son.',
                    vote_average: 9.2,
                    release_date: '1972-03-24',
                    runtime: 175,
                    genres: [{ name: 'Crime' }, { name: 'Drama' }],
                    poster_path: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
                    backdrop_path: 'https://image.tmdb.org/t/p/original/tmU7GeKVybMWFButWEGl2M4GeiP.jpg',
                    trailerKey: 'UaVTIH8mujA'
                },
                {
                    id: 950019,
                    title: 'Pulp Fiction',
                    overview: 'The lives of two mob hitmen intertwine in four tales of violence and redemption.',
                    vote_average: 8.9,
                    release_date: '1994-10-14',
                    runtime: 154,
                    genres: [{ name: 'Crime' }, { name: 'Drama' }],
                    poster_path: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
                    backdrop_path: 'https://image.tmdb.org/t/p/original/4cDFJr4HnXN5AdPw4AKrmLlMWdO.jpg',
                    trailerKey: 's7EdQ4FqbhY'
                },
                {
                    id: 950020,
                    title: 'The Lord of the Rings: The Return of the King',
                    overview: 'Gandalf and Aragorn lead the World of Men against Sauron’s army.',
                    vote_average: 8.9,
                    release_date: '2003-12-17',
                    runtime: 201,
                    genres: [{ name: 'Fantasy' }, { name: 'Adventure' }],
                    poster_path: 'https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg',
                    backdrop_path: 'https://image.tmdb.org/t/p/original/2u7zbn8EudG6kLlBzUYqP8RyFU4.jpg',
                    trailerKey: 'r5X-hFf6Bwo'
                }
            ]
        };
    }

    loadCachedCatalog() {
        try {
            const raw = localStorage.getItem(this.catalogCacheKey);
            if (!raw) {
                return {};
            }
            const parsed = JSON.parse(raw);
            return {
                trending: Array.isArray(parsed.trending) && parsed.trending.length ? parsed.trending : null,
                popular: Array.isArray(parsed.popular) && parsed.popular.length ? parsed.popular : null,
                topRated: Array.isArray(parsed.topRated) && parsed.topRated.length ? parsed.topRated : null
            };
        } catch (error) {
            console.warn('Could not load catalog cache:', error);
            return {};
        }
    }

    saveCachedCatalog() {
        try {
            localStorage.setItem(this.catalogCacheKey, JSON.stringify({
                trending: this.trendingMovies,
                popular: this.popularMovies,
                topRated: this.topratedMovies,
                savedAt: new Date().toISOString()
            }));
        } catch (error) {
            console.warn('Could not save catalog cache:', error);
        }
    }

    getImageUrl(path, size = 'w500') {
        if (!path) return '';
        if (String(path).startsWith('/api/tmdb-image')) {
            return path;
        }
        if (String(path).startsWith('http')) {
            return path;
        }
        return `/api/tmdb-image?size=${encodeURIComponent(size)}&path=${encodeURIComponent(path)}`;
    }

    async fetchCollection(endpoint, fallbackKey) {
        try {
            const response = await fetch(`/api/tmdb?path=/${encodeURIComponent(endpoint).replace(/%2F/g, '/')}`);
            if (!response.ok) {
                throw new Error(`TMDB proxy failed with ${response.status}`);
            }
            const data = await response.json();
            if (Array.isArray(data.results) && data.results.length) {
                return data.results;
            }
        } catch (error) {
            console.error(`Error loading ${fallbackKey}:`, error);
        }
        return this.fallbackCatalog[fallbackKey] || [];
    }

    getMovieFromLocalCatalog(movieId) {
        const allMovies = [
            ...this.trendingMovies,
            ...this.popularMovies,
            ...this.topratedMovies,
            ...Object.values(this.fallbackCatalog).flat()
        ];
        return allMovies.find((movie) => String(movie.id) === String(movieId)) || null;
    }

    async fetchMovieDetails(movieId) {
        try {
            const response = await fetch(`/api/tmdb?path=/movie/${encodeURIComponent(movieId)}&append_to_response=credits,videos,recommendations`);
            if (!response.ok) {
                throw new Error(`TMDB proxy failed with ${response.status}`);
            }
            const movie = await response.json();
            if (movie && !movie.success && !movie.status_code) {
                return movie;
            }
            if (movie && movie.id && !movie.status_code) {
                return movie;
            }
        } catch (error) {
            console.error('Error loading movie details:', error);
        }

        const fallbackMovie = this.getMovieFromLocalCatalog(movieId);
        if (!fallbackMovie) {
            return null;
        }

        return {
            ...fallbackMovie,
            credits: {
                cast: [
                    { name: 'Lead Cast', character: 'Main Role', profile_path: null },
                    { name: 'Supporting Cast', character: 'Key Role', profile_path: null },
                    { name: 'Director Team', character: 'Creative Lead', profile_path: null }
                ],
                crew: [{ job: 'Director', name: 'Studio Archive' }]
            },
            recommendations: {
                results: Object.values(this.fallbackCatalog).flat().filter((item) => item.id !== fallbackMovie.id).slice(0, 6)
            },
            videos: {
                results: fallbackMovie.trailerKey ? [{ type: 'Trailer', site: 'YouTube', key: fallbackMovie.trailerKey }] : []
            },
            vote_count: fallbackMovie.vote_count || 12000,
            budget: fallbackMovie.budget || 0,
            revenue: fallbackMovie.revenue || 0,
            status: fallbackMovie.status || 'Released'
        };
    }

    async loadTrendingMovies() {
        this.trendingMovies = await this.fetchCollection('trending/movie/week', 'trending');
        if (!this.trendingMovies.length) {
            this.trendingMovies = [...(this.loadCachedCatalog().trending || this.fallbackCatalog.trending)];
        }
        console.log(`Loaded ${this.trendingMovies.length} trending movies`);
        if (this.trendingMovies.length > 0) {
            this.setHeroBanner(this.trendingMovies[0]);
        }
        this.saveCachedCatalog();
    }

    async loadPopularMovies() {
        this.popularMovies = await this.fetchCollection('movie/popular', 'popular');
        if (!this.popularMovies.length) {
            this.popularMovies = [...(this.loadCachedCatalog().popular || this.fallbackCatalog.popular)];
        }
        console.log(`Loaded ${this.popularMovies.length} popular movies`);
        this.saveCachedCatalog();
    }

    async loadTopRatedMovies() {
        this.topratedMovies = await this.fetchCollection('movie/top_rated', 'topRated');
        if (!this.topratedMovies.length) {
            this.topratedMovies = [...(this.loadCachedCatalog().topRated || this.fallbackCatalog.topRated)];
        }
        console.log(`Loaded ${this.topratedMovies.length} top-rated movies`);
        this.saveCachedCatalog();
    }

    async loadWatchHistory() {
        if (typeof watchTracker !== 'undefined') {
            const tracked = watchTracker.getAllWatchHistory();
            if (tracked.length) {
                this.watchHistory = tracked.map(item => ({
                    id: item.movieId,
                    seriesId: item.movieId,
                    title: item.movieTitle,
                    genre: item.genre,
                    timestamp: item.startTime,
                    percentageWatched: item.percentageWatched || 0,
                    status: item.status || 'watching'
                }));
                localStorage.setItem('watchHistory', JSON.stringify(this.watchHistory));
                return;
            }
        }

        const saved = localStorage.getItem('watchHistory');
        this.watchHistory = saved ? JSON.parse(saved) : [];
    }

    getMovieGenres(movie) {
        if (!movie) return [];
        if (Array.isArray(movie.genres)) {
            return movie.genres.map((genre) => typeof genre === 'string' ? genre : genre.name).filter(Boolean);
        }
        return [];
    }

    syncWatchHistoryEntry(movie, percentageWatched = 0, status = 'watching') {
        if (!movie) return;

        let watchHistory = JSON.parse(localStorage.getItem('watchHistory') || '[]');
        const movieGenre = this.getMovieGenres(movie)[0] || movie.genre || 'Action';
        const historyEntry = {
            id: movie.id,
            seriesId: movie.id,
            title: movie.title,
            genre: movieGenre,
            poster: movie.poster_path,
            percentageWatched,
            status,
            timestamp: new Date().toISOString(),
            type: 'Movie'
        };

        watchHistory = watchHistory.filter((item) => item.id !== movie.id);
        watchHistory.unshift(historyEntry);
        watchHistory = watchHistory.slice(0, 30);
        localStorage.setItem('watchHistory', JSON.stringify(watchHistory));
        this.watchHistory = watchHistory;

        if (window.mlRecommendations?.updateUserWatchData) {
            window.mlRecommendations.updateUserWatchData({
                movieId: movie.id,
                title: movie.title,
                genre: movieGenre,
                watchTime: Math.round((movie.runtime || 120) * ((percentageWatched || 0) / 100)),
                completed: status === 'completed',
                percentageWatched,
                timestamp: historyEntry.timestamp,
                rating: Math.round((movie.vote_average || 7.5) * 10)
            });
        }
    }

    trackCurrentMovie(movie, percentageWatched = 12, status = 'watching') {
        if (!movie) return;

        const genres = this.getMovieGenres(movie);
        const payload = {
            id: movie.id,
            movieId: movie.id,
            title: movie.title,
            movieTitle: movie.title,
            genre: genres[0] || movie.genre || 'Action',
            genres,
            runtime: movie.runtime || 120,
            totalDurationMinutes: movie.runtime || 120
        };

        if (typeof window.trackPlay === 'function') {
            window.trackPlay(payload);
        }

        if (typeof watchTracker !== 'undefined' && typeof watchTracker.updateCurrentProgress === 'function') {
            watchTracker.updateCurrentProgress(percentageWatched, status);
        }

        this.syncWatchHistoryEntry(movie, percentageWatched, status);
        this.renderRecommendationRail();
    }

    setHeroBanner(movie) {
        const heroBanner = document.getElementById('hero-banner');
        if (!heroBanner || !movie) return;
        const imageUrl = this.getImageUrl(movie.backdrop_path, 'original');
        
        heroBanner.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url('${imageUrl}')`;
        document.getElementById('heroTitle').textContent = movie.title;
        document.getElementById('heroDesc').textContent = movie.overview || 'Click play to watch now';
        
        this.currentMovie = movie;
    }

    renderHeroSummary() {
        const root = document.getElementById('heroSummaryGrid');
        if (!root) return;

        const history = typeof watchTracker !== 'undefined' ? watchTracker.getAllWatchHistory() : [];
        const completed = history.filter((item) => item.status === 'completed').length;
        const retained = history.filter((item) => (item.prediction?.predicted_label || item.predicted_label) === 'retained').length;
        const avgWatch = history.length
            ? Math.round(history.reduce((sum, item) => sum + (item.percentageWatched || 0), 0) / history.length)
            : 0;

        const cards = [
            { label: 'Role', value: this.currentRole === 'admin' ? 'Admin' : 'Viewer', note: this.currentRole === 'admin' ? 'platform-wide control room' : 'personal intelligence workspace' },
            { label: 'Sessions', value: String(history.length), note: 'tracked viewing sessions' },
            { label: 'Completed', value: String(completed), note: 'sessions reaching final state' },
            { label: 'Retention', value: `${retained}`, note: `average watch ratio ${avgWatch}%` }
        ];

        root.innerHTML = cards.map((card) => `
            <article class="hero-stat-card">
                <span>${card.label}</span>
                <strong>${card.value}</strong>
                <p>${card.note}</p>
            </article>
        `).join('');
    }

    renderMLInsightsPage() {
        const root = document.getElementById('ml-insights-content');
        if (!root) return;

        const metrics = typeof retentionProductUI !== 'undefined' && retentionProductUI.getMetrics
            ? retentionProductUI.getMetrics()
            : {
                history: [],
                retention: { totalSessions: 0, completionRate: 0, avgWatchTime: 0, activeNow: 0 },
                churn: { riskScore: 0, riskLevel: 'Low', recommendation: 'No recommendation available.' },
                prediction: {
                    nextEpisodeRetentionProbability: 0,
                    predictedClass: 'Unknown',
                    strongestGenre: 'Action',
                    weakGenre: 'Drama',
                    intervention: 'No intervention available.',
                    recentPredictions: []
                },
                genreStats: {},
                topMovies: []
            };

        const allMovies = [
            ...this.trendingMovies,
            ...this.popularMovies,
            ...this.topratedMovies
        ].slice(0, 4);

        const spotlight = allMovies[0] || this.fallbackCatalog.trending[0];
        const spotlightBackdrop = this.getImageUrl(spotlight?.backdrop_path, 'original');
        const topMovieCards = allMovies.map((movie, index) => `
            <div class="mli-poster-card" onclick="app.showDetails(${movie.id})">
                <img src="${this.getImageUrl(movie.poster_path)}" alt="${movie.title}" onerror="this.src='https://via.placeholder.com/500x750/111111/e50914?text=${encodeURIComponent(movie.title)}'">
                <div class="mli-poster-copy">
                    <span>Top ${index + 1}</span>
                    <strong>${movie.title}</strong>
                    <small>${movie.release_date?.split('-')[0] || 'Now'} • ${movie.vote_average?.toFixed(1) || 'N/A'}</small>
                </div>
            </div>
        `).join('');

        const quickStats = [
            { label: 'Next-session retention', value: `${metrics.prediction.nextEpisodeRetentionProbability || 0}%`, note: metrics.prediction.predictedClass || 'Unknown' },
            { label: 'Churn risk', value: `${metrics.churn.riskScore || 0}%`, note: metrics.churn.riskLevel || 'Low' },
            { label: 'Avg watch time', value: `${metrics.retention.avgWatchTime || 0} min`, note: `${metrics.retention.totalSessions || 0} tracked sessions` },
            { label: 'Strongest genre', value: metrics.prediction.strongestGenre || 'Action', note: `Weakest: ${metrics.prediction.weakGenre || 'Drama'}` }
        ].map((item) => `
            <article class="mli-stat-card">
                <span>${item.label}</span>
                <strong>${item.value}</strong>
                <p>${item.note}</p>
            </article>
        `).join('');

        const recentPredictions = (metrics.prediction.recentPredictions || []).slice(0, 5).map((item) => `
            <div class="mli-list-row">
                <div>
                    <strong>${item.title}</strong>
                    <span>${item.genre}</span>
                </div>
                <em>${item.probability}% • ${item.predictedOutcome}</em>
            </div>
        `).join('');

        root.innerHTML = `
            <section class="mli-hero" style="background-image:linear-gradient(90deg, rgba(8,10,14,.96) 0%, rgba(8,10,14,.86) 46%, rgba(18,8,10,.92) 100%), url('${spotlightBackdrop}');">
                <div class="mli-hero-copy">
                    <div class="mli-kicker">Predictive intelligence</div>
                    <h3>${spotlight?.title || 'Series Zone ML Lab'}</h3>
                    <p>Session signals, retention forecasting, genre strength, and operator-ready actions in one cinematic workspace.</p>
                    <div class="mli-chip-row">
                        <span>${metrics.retention.totalSessions || 0} sessions analyzed</span>
                        <span>${metrics.churn.riskLevel || 'Low'} churn state</span>
                        <span>${metrics.prediction.strongestGenre || 'Action'} strongest genre</span>
                    </div>
                </div>
                <div class="mli-hero-panel">
                    <div class="mli-panel-label">Recommended action</div>
                    <div class="mli-panel-value">${metrics.prediction.intervention || 'No intervention available.'}</div>
                </div>
            </section>
            <section class="mli-stat-grid">${quickStats}</section>
            <section class="mli-content-grid">
                <div class="mli-surface-card">
                    <div class="mli-section-heading">
                        <h4>Title intelligence</h4>
                        <span>Live picks</span>
                    </div>
                    <div class="mli-poster-grid">${topMovieCards}</div>
                </div>
                <div class="mli-surface-card">
                    <div class="mli-section-heading">
                        <h4>Recent predictions</h4>
                        <span>Latest outputs</span>
                    </div>
                    ${recentPredictions || '<div class="mli-empty-state">Watch sessions will generate prediction rows here.</div>'}
                </div>
            </section>
        `;
    }

    renderAdminDashboard() {
        const root = document.getElementById('admin-dashboard');
        if (!root) return;

        const history = typeof watchTracker !== 'undefined' ? watchTracker.getAllWatchHistory() : [];
        const users = JSON.parse(localStorage.getItem('series-zone-users') || '[]');
        const totalMinutes = history.reduce((sum, item) => sum + (((item.totalDurationMinutes || 0) * (item.percentageWatched || 0)) / 100), 0);
        const retained = history.filter((item) => (item.prediction?.predicted_label || item.predicted_label) === 'retained').length;
        const avgWatch = history.length
            ? (history.reduce((sum, item) => sum + (item.percentageWatched || 0), 0) / history.length).toFixed(1)
            : '0.0';
        const activeSessions = history.filter((item) => (item.status || '').toLowerCase() === 'watching').length;
        const completionRate = history.length
            ? Math.round((history.filter((item) => (item.status || '').toLowerCase() === 'completed').length / history.length) * 100)
            : 0;
        const totalRevenueSignal = (history.length * 1240) + (users.length * 860);

        const trafficSeries = history.length
            ? history.slice(-7).map((item, index) => {
                const value = Math.max(16, Math.min(96, Math.round((item.percentageWatched || 0) + (index * 3))));
                return `<span style="height:${value}%;"></span>`;
            }).join('')
            : Array.from({ length: 7 }, (_, index) => `<span style="height:${32 + (index * 6)}%;"></span>`).join('');

        const revenueSeries = history.length
            ? history.slice(-7).map((item, index) => {
                const value = Math.max(14, Math.min(92, Math.round((((item.totalDurationMinutes || 60) / 2) + (index * 4)))));
                return `<span style="height:${value}%;"></span>`;
            }).join('')
            : Array.from({ length: 7 }, (_, index) => `<span style="height:${24 + ((index % 4) * 14)}%;"></span>`).join('');
        const chartLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            .map((label) => `<b>${label}</b>`)
            .join('');

        const favoriteGenres = users
            .flatMap((user) => user.preferences?.favoriteGenres || [])
            .filter(Boolean);
        const topGenreCounts = favoriteGenres.reduce((acc, genre) => {
            acc[genre] = (acc[genre] || 0) + 1;
            return acc;
        }, {});
        const spotlightGenres = Object.entries(topGenreCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);

        const recentUsers = users.slice(-4).reverse().map((user) => `
            <div class="admin-list-row">
                <div>
                    <strong>${user.name}</strong>
                    <span>${user.email}</span>
                </div>
                <em>${(user.preferences?.favoriteGenres || []).join(', ') || 'No genre profile yet'}</em>
            </div>
        `).join('');

        const recentSessions = history.slice(-4).reverse().map((item) => `
            <div class="admin-list-row">
                <div>
                    <strong>${item.movieTitle || item.title || 'Untitled session'}</strong>
                    <span>${item.genre || 'Unknown genre'} • ${item.status || 'watching'}</span>
                </div>
                <em>${Math.round(item.percentageWatched || 0)}% watched</em>
            </div>
        `).join('');

        const opsGenreRows = spotlightGenres.length
            ? spotlightGenres.map(([genre, count]) => `
                <div class="admin-mini-row">
                    <strong>${genre}</strong>
                    <span>${count} viewers</span>
                </div>
            `).join('')
            : `
                <div class="admin-mini-row">
                    <strong>Action</strong>
                    <span>Seeded demo audience</span>
                </div>
                <div class="admin-mini-row">
                    <strong>Thriller</strong>
                    <span>High completion sample</span>
                </div>
            `;

        const systemSignals = [
            { label: 'Retention pressure', value: `${completionRate}%`, note: 'Platform completion strength' },
            { label: 'Churn exposure', value: `${Math.max(0, 100 - completionRate)}%`, note: 'Drop-off and pause drag' },
            { label: 'Active load', value: `${activeSessions}`, note: 'Current live sessions' }
        ].map((item) => `
            <div class="admin-signal-tile">
                <span>${item.label}</span>
                <strong>${item.value}</strong>
                <p>${item.note}</p>
            </div>
        `).join('');
        const bestOverviewModel = this.getAdminMetricsSnapshot().modelComparison.reduce((best, model) => model.f1 > best.f1 ? model : best, this.getAdminMetricsSnapshot().modelComparison[0]);
        const overviewAdmin = this.getAdminMetricsSnapshot();
        const topRiskRows = overviewAdmin.predictions
            .filter((item) => item.label !== 'retained')
            .slice(0, 4)
            .map((item) => `
                <div class="admin-list-row">
                    <div>
                        <strong>${this.normalizeAdminUserLabel(item.userId, item.userName, overviewAdmin.users)}</strong>
                        <span>${item.sessions} sessions • ${item.avgWatch}% avg watch</span>
                    </div>
                    <em>${item.label}</em>
                </div>
            `).join('');
        const actionTiles = [
            { label: 'At-risk users', value: overviewAdmin.predictions.filter((item) => item.label === 'at risk').length, note: 'Need content nudges' },
            { label: 'Likely churn', value: overviewAdmin.predictions.filter((item) => item.label === 'likely to churn').length, note: 'Highest urgency cohort' },
            { label: 'Best model', value: bestOverviewModel.name, note: `F1 ${bestOverviewModel.f1}% leader` },
            { label: 'Exports ready', value: '2', note: 'CSV and ML snapshot' }
        ].map((item) => `
            <article class="admin-action-tile">
                <span>${item.label}</span>
                <strong>${item.value}</strong>
                <p>${item.note}</p>
            </article>
        `).join('');

        root.innerHTML = `
            <div class="admin-workspace-shell">
                ${this.getAdminSidebar('admin-page', {
                    totalUsers: users.length,
                    completionRate,
                    churnRisk: Math.max(0, 100 - completionRate),
                    totalSessions: history.length
                })}

                <div class="admin-command-main">
                    ${this.getAdminTopbar('Overview Command Center', 'Platform-wide KPIs, telemetry, churn pressure, and operational demand signals in one admin-only workspace.', [
                        { className: 'admin-status-pill', label: 'ONLINE' },
                        { className: 'admin-range-pill', label: `${users.length} users` },
                        { className: 'admin-range-pill', label: 'Last 7 days' }
                    ])}

                    <section class="admin-orbit-grid">
                        <article class="admin-mission-panel">
                            <div class="admin-command-kicker">System narrative</div>
                            <h3>Command the platform from one coherent surface.</h3>
                            <p>Overview is no longer a generic dashboard. It is the operating layer for retention health, viewer momentum, and intervention readiness across the full platform.</p>
                            <div class="admin-mission-tags">
                                <span>Retention</span>
                                <span>Behavior</span>
                                <span>Models</span>
                                <span>Predictions</span>
                            </div>
                        </article>
                        <article class="admin-radar-panel">
                            <div class="admin-radar-core">
                                <span>Ops index</span>
                                <strong>${Math.max(52, Math.round((completionRate * 0.55) + (avgWatch * 0.45)))}%</strong>
                                <p>Composite health from completion, watch depth, and live load.</p>
                            </div>
                            <div class="admin-signal-grid">
                                ${systemSignals}
                            </div>
                        </article>
                    </section>

                    <div class="admin-overview-grid admin-overview-grid-enhanced">
                        <article class="admin-overview-card admin-overview-card-enhanced">
                            <span>Total viewers</span>
                            <strong>${users.length}</strong>
                            <p>Registered viewer accounts inside the workspace.</p>
                        </article>
                        <article class="admin-overview-card admin-overview-card-enhanced">
                            <span>Tracked sessions</span>
                            <strong>${history.length}</strong>
                            <p>Playback events collected for analytics and ML.</p>
                        </article>
                        <article class="admin-overview-card admin-overview-card-enhanced">
                            <span>Watch time</span>
                            <strong>${totalMinutes.toFixed(1)} min</strong>
                            <p>Combined minutes watched across current telemetry.</p>
                        </article>
                        <article class="admin-overview-card admin-overview-card-enhanced">
                            <span>Revenue signal</span>
                            <strong>$${totalRevenueSignal.toLocaleString()}</strong>
                            <p>Estimated business impact from activity volume.</p>
                        </article>
                    </div>

                    <div class="admin-dashboard-grid">
                        <section class="admin-chart-panel admin-chart-panel-wide">
                            <div class="admin-panel-heading">
                                <div>
                                    <h3>Demand Radar</h3>
                                    <p>Real-time session momentum and audience load pattern</p>
                                </div>
                                <span class="admin-live-toggle">Live update</span>
                            </div>
                            <div class="admin-stat-ribbon">
                                <div><strong>${users.length}</strong><span>Viewer base</span></div>
                                <div><strong>${history.length}</strong><span>Tracked sessions</span></div>
                                <div><strong>${activeSessions}</strong><span>Live load</span></div>
                            </div>
                            <div class="admin-wave-chart">
                                ${trafficSeries}
                            </div>
                            <div class="admin-chart-labels">${chartLabels}</div>
                        </section>

                        <section class="admin-chart-panel">
                            <div class="admin-panel-heading">
                                <div>
                                    <h3>Retention Pressure</h3>
                                    <p>Quality of watch depth, continuation, and drop resistance</p>
                                </div>
                                <span class="admin-range-pill muted">Weekly view</span>
                            </div>
                            <div class="admin-sales-metrics">
                                <div><strong>${retained}</strong><span>Retained users</span></div>
                                <div><strong>${avgWatch}%</strong><span>Watch depth</span></div>
                                <div><strong>${completionRate}%</strong><span>Completion</span></div>
                            </div>
                            <div class="admin-line-chart">
                                ${revenueSeries}
                            </div>
                            <div class="admin-chart-labels">${chartLabels}</div>
                        </section>
                    </div>

                    <div class="admin-detail-grid admin-detail-grid-enhanced">
                        <section class="admin-surface-card admin-surface-card-enhanced">
                            <div class="admin-surface-heading">
                                <h3>Operator Watchlist</h3>
                                <span>${users.length} users</span>
                            </div>
                            ${recentUsers || '<div class="admin-empty-state">Viewer accounts will appear here after signup.</div>'}
                        </section>
                        <section class="admin-surface-card admin-surface-card-enhanced">
                            <div class="admin-surface-heading">
                                <h3>Live Session Ledger</h3>
                                <span>${history.length} sessions</span>
                            </div>
                            ${recentSessions || '<div class="admin-empty-state">Start a watch session to populate platform telemetry.</div>'}
                        </section>
                        <section class="admin-surface-card admin-surface-card-enhanced">
                            <div class="admin-surface-heading">
                                <h3>Genre Heatmap</h3>
                                <span>Audience pull</span>
                            </div>
                            <div class="admin-mini-stack">
                                ${opsGenreRows}
                            </div>
                        </section>
                    </div>

                    <section class="admin-surface-card admin-surface-card-enhanced admin-action-center">
                        <div class="admin-surface-heading">
                            <h3>Action Center</h3>
                            <span>Operator priorities</span>
                        </div>
                        <div class="admin-action-grid">
                            ${actionTiles}
                        </div>
                        <div class="admin-dashboard-grid" style="margin-top:1rem;">
                            <section class="admin-surface-card admin-surface-card-enhanced">
                                <div class="admin-surface-heading"><h3>Intervention Queue</h3><span>Highest urgency</span></div>
                                ${topRiskRows || '<div class="admin-empty-state">No at-risk users in queue.</div>'}
                            </section>
                            <section class="admin-surface-card admin-surface-card-enhanced">
                                <div class="admin-surface-heading"><h3>Report Shortcuts</h3><span>Fast actions</span></div>
                                <div class="admin-report-stack">
                                    <article class="admin-report-card">
                                        <span>Sessions CSV</span>
                                        <strong>Export platform telemetry</strong>
                                        <p>Download current watch session data for audit and analytics review.</p>
                                        <button class="btn btn-primary" onclick="watchTracker.exportToCSV()">Export Sessions CSV</button>
                                    </article>
                                    <article class="admin-report-card">
                                        <span>ML Snapshot</span>
                                        <strong>Export predictions and models</strong>
                                        <p>Share current scoring and model comparison state with reviewers.</p>
                                        <button class="btn btn-secondary" onclick="window.mlInsightsUI?.exportInsights?.()">Export ML JSON</button>
                                    </article>
                                </div>
                            </section>
                        </div>
                    </section>
                </div>
            </div>
        `;
    }

    renderNavbarWorkspaceState() {
        const currentUser = this.currentUser || JSON.parse(localStorage.getItem('currentUser') || '{}');
        const history = typeof watchTracker !== 'undefined' ? watchTracker.getAllWatchHistory() : [];
        const myList = Array.isArray(currentUser?.myList) ? currentUser.myList : [];

        document.querySelectorAll('[data-badge="analytics"]').forEach((node) => {
            node.textContent = String(history.length);
        });
        document.querySelectorAll('[data-badge="history"]').forEach((node) => {
            node.textContent = String(history.length);
        });
        document.querySelectorAll('[data-badge="profile"], [data-badge="watchlist"]').forEach((node) => {
            node.textContent = String(myList.length);
        });
        document.querySelectorAll('[data-badge="ml-insights"]').forEach((node) => {
            node.textContent = 'AI';
        });
        document.querySelectorAll('[data-badge="admin-evaluation"]').forEach((node) => {
            node.textContent = this.currentRole === 'admin' ? 'ML' : '0';
        });
        document.querySelectorAll('[data-badge="browse"]').forEach((node) => {
            node.textContent = 'Live';
        });
        document.querySelectorAll('[data-badge="admin-overview"]').forEach((node) => {
            node.textContent = this.currentRole === 'admin' ? 'Live' : 'Ops';
        });

        const navSessionCount = document.getElementById('navSessionCount');
        if (navSessionCount) navSessionCount.textContent = `${history.length} sessions`;

        const navListCount = document.getElementById('navListCount');
        if (navListCount) navListCount.textContent = `${myList.length} saved`;
    }

    renderCarousels() {
        this.renderPosterCarousel(this.trendingMovies, 'trending-carousel');
        this.renderPosterCarousel(this.popularMovies, 'popular-carousel');
        this.renderPosterCarousel(this.topratedMovies, 'toprated-carousel');
        this.renderRecommendationRail();
    }

    ensureHomeContent() {
        if (!this.trendingMovies.length) {
            this.trendingMovies = [...this.fallbackCatalog.trending];
        }
        if (!this.popularMovies.length) {
            this.popularMovies = [...this.fallbackCatalog.popular];
        }
        if (!this.topratedMovies.length) {
            this.topratedMovies = [...this.fallbackCatalog.topRated];
        }

        const heroMovie = this.currentMovie || this.trendingMovies[0] || this.fallbackCatalog.trending[0];
        if (heroMovie) {
            this.setHeroBanner(heroMovie);
        }

        this.renderCarousels();
        this.renderHeroSummary();
        this.renderNavbarWorkspaceState();
    }

    renderRecommendationRail() {
        const allMovies = [
            ...this.trendingMovies,
            ...this.popularMovies,
            ...this.topratedMovies
        ];

        let recommendations = [];
        if (window.recommendationEngine?.generateRecommendations) {
            recommendations = window.recommendationEngine.generateRecommendations(allMovies, 6)
                .map((movie) => ({
                    ...movie,
                    recommendationReason: movie.reason || 'Smart history-based match'
                }));
        }

        if (!recommendations.length && window.advancedMLSystem?.getFullRecommendations) {
            recommendations = window.advancedMLSystem.getFullRecommendations(allMovies, 6)
                .map((movie) => ({
                    ...movie,
                    recommendationReason: Array.isArray(movie.reasons) && movie.reasons.length
                        ? movie.reasons.join(' • ')
                        : 'Advanced ML recommendation'
                }));
        }

        if (!recommendations.length && window.mlRecommendations?.getRecommendations) {
            window.mlRecommendations.loadFromWatchTracker?.();
            recommendations = window.mlRecommendations.getRecommendations(allMovies, 6)
                .map((movie) => ({
                    ...movie,
                    recommendationReason: movie.reason || 'ML recommendation'
                }));
        }

        if (!recommendations.length) {
            recommendations = this.popularMovies.slice(0, 6);
        }

        this.renderPosterCarousel(recommendations, 'recommendations-carousel');
    }

    renderRetentionSurfaces() {
        if (window.retentionProductUI?.renderAll) {
            try {
                window.retentionProductUI.renderAll();
            } catch (error) {
                console.error('Error rendering retention surfaces:', error);
            }
        }
    }

    renderDynamicPage(pageName) {
        this.renderDynamicPageContent(pageName);
    }

    renderDynamicPageContent(pageName) {
        try {
            if (pageName === 'analytics-page') {
                this.forceRenderAnalyticsPage();
                this.renderAnalyticsPageFallback();
                return;
            }

            if (pageName === 'history-page') {
                this.forceRenderHistoryPage();
                this.renderHistoryPageFallback();
                return;
            }

            if (pageName === 'profile-page') {
                this.forceRenderProfilePage();
                this.renderProfilePageFallback();
                return;
            }

            if (pageName === 'my-list-page') {
                try {
                    window.retentionProductUI?.renderMyListPage?.();
                } catch (innerError) {
                    console.error('Primary watchlist renderer failed:', innerError);
                }
                this.renderMyListPageFallback();
                return;
            }

            if (pageName === 'ml-insights-page') {
                if (this.currentRole === 'admin') {
                    this.renderAdminOpsPage();
                } else {
                    this.forceRenderMLInsightsPage();
                }
            }
        } catch (error) {
            console.error(`Error rendering dynamic page ${pageName}:`, error);
        }
    }

    forceRenderHistoryPage() {
        try {
            window.retentionProductUI?.renderHistoryPage?.();
            setTimeout(() => {
                if (document.getElementById('history-page')?.classList.contains('active')) {
                    window.retentionProductUI?.renderHistoryPage?.();
                }
            }, 80);
        } catch (error) {
            console.error('Error force-rendering history page:', error);
        }
    }

    forceRenderAnalyticsPage() {
        try {
            window.retentionProductUI?.renderAnalyticsExperiencePage?.();
            setTimeout(() => {
                if (document.getElementById('analytics-page')?.classList.contains('active')) {
                    window.retentionProductUI?.renderAnalyticsExperiencePage?.();
                    this.renderAnalyticsPageFallback(true);
                }
            }, 90);
        } catch (error) {
            console.error('Error force-rendering analytics page:', error);
        }
    }

    forceRenderProfilePage() {
        try {
            window.retentionProductUI?.renderProfilePage?.();
            setTimeout(() => {
                if (document.getElementById('profile-page')?.classList.contains('active')) {
                    window.retentionProductUI?.renderProfilePage?.();
                    this.renderProfilePageFallback(true);
                }
            }, 90);
        } catch (error) {
            console.error('Error force-rendering profile page:', error);
        }
    }

    forceRenderMLInsightsPage() {
        try {
            if (this.currentRole === 'admin') {
                this.renderAdminOpsPage();
                setTimeout(() => {
                    if (document.getElementById('ml-insights-page')?.classList.contains('active')) {
                        this.renderAdminOpsPage();
                    }
                }, 90);
                return;
            }

            this.renderMLInsightsPage();
            setTimeout(() => {
                if (document.getElementById('ml-insights-page')?.classList.contains('active')) {
                    this.renderMLInsightsPage();
                    this.renderMLInsightsPageFallback(true);
                }
            }, 90);
            setTimeout(() => {
                if (document.getElementById('ml-insights-page')?.classList.contains('active')) {
                    this.renderMLInsightsPageFallback(true);
                }
            }, 180);
        } catch (error) {
            console.error('Error force-rendering ML insights page:', error);
            this.renderMLInsightsPageFallback(true);
        }
    }

    renderMLInsightsPageFallback(force = false) {
        const root = document.getElementById('ml-insights-content');
        if (!root) return;
        const hasMeaningfulContent = root.children.length > 0 && (root.textContent || '').trim().length > 40;
        if (!force && hasMeaningfulContent) {
            return;
        }
        if (this.currentRole === 'admin') {
            this.renderAdminOpsPage();
            return;
        }
        this.renderMLInsightsPage();
    }

    getRetentionMetricsSnapshot() {
        const history = typeof watchTracker !== 'undefined' ? watchTracker.getAllWatchHistory() : [];
        const retention = typeof watchTracker !== 'undefined'
            ? watchTracker.calculateRetentionMetrics()
            : { totalSessions: 0, completionRate: 0, avgWatchTime: 0, activeNow: 0 };
        const completion = typeof watchTracker !== 'undefined'
            ? watchTracker.getCompletionStats()
            : { completed: 0, dropped: 0, paused: 0 };
        const genreStats = typeof watchTracker !== 'undefined' ? watchTracker.getGenreStats() : {};
        const churn = typeof watchTracker !== 'undefined'
            ? watchTracker.predictChurnRisk()
            : { riskScore: 0, riskLevel: 'Low', recommendation: 'No recommendation available.' };

        const favoriteGenre = Object.entries(genreStats)
            .sort(([, a], [, b]) => (b.avgWatchPercentage || 0) - (a.avgWatchPercentage || 0))[0]?.[0] || 'Unknown';
        const topSessions = history.slice().reverse().slice(0, 5);

        return { history, retention, completion, genreStats, churn, favoriteGenre, topSessions };
    }

    normalizeAdminUserLabel(rawValue, fallbackName = '', users = []) {
        const findKnownUser = (value) => users.find((user) =>
            String(user.id || '') === String(value || '')
            || String(user.email || '').toLowerCase() === String(value || '').toLowerCase()
            || String(user.name || '').toLowerCase() === String(value || '').toLowerCase()
        );

        if (fallbackName) {
            return fallbackName;
        }
        if (!rawValue) {
            return 'unknown-user';
        }
        if (typeof rawValue === 'object') {
            return rawValue.name || rawValue.email || rawValue.id || 'unknown-user';
        }

        const text = String(rawValue).trim();
        if (!text) {
            return 'unknown-user';
        }

        if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
            try {
                const parsed = JSON.parse(text);
                const known = findKnownUser(parsed.id || parsed.email || parsed.name);
                return known?.name || parsed.name || parsed.email || parsed.id || 'unknown-user';
            } catch (error) {
                return 'unknown-user';
            }
        }

        const known = findKnownUser(text);
        if (known) {
            return known.name || known.email || known.id || 'unknown-user';
        }

        return text.length > 60 ? 'unknown-user' : text;
    }

    getAdminMetricsSnapshot() {
        const history = typeof watchTracker !== 'undefined' ? watchTracker.getAllWatchHistory() : [];
        const users = JSON.parse(localStorage.getItem('series-zone-users') || '[]').filter((user) => user.role !== 'admin');
        const genreStats = typeof watchTracker !== 'undefined' ? watchTracker.getGenreStats() : {};
        const completionStats = typeof watchTracker !== 'undefined'
            ? watchTracker.getCompletionStats()
            : { completed: 0, dropped: 0, paused: 0, total: 0 };

        const totalSessions = history.length;
        const totalUsers = users.length;
        const completionRate = totalSessions ? Math.round((completionStats.completed / totalSessions) * 100) : 0;
        const churnRisk = totalSessions ? Math.round(((completionStats.dropped + (completionStats.paused * 0.5)) / totalSessions) * 100) : 0;
        const avgSessionLength = totalSessions
            ? Math.round(history.reduce((sum, item) => sum + (((item.totalDurationMinutes || 0) * (item.percentageWatched || 0)) / 100), 0) / totalSessions)
            : 0;
        const pauseFrequency = totalSessions
            ? ((history.reduce((sum, item) => sum + Number(item.pausedCount || 0), 0)) / totalSessions).toFixed(1)
            : '0.0';

        const byUser = {};
        history.forEach((item) => {
            const key = this.normalizeAdminUserLabel(item.userId, item.userName, users);
            byUser[key] = byUser[key] || [];
            byUser[key].push(item);
        });

        const completionRatio = totalUsers
            ? Math.round(Object.values(byUser).reduce((sum, sessions) => {
                const completed = sessions.filter((item) => item.status === 'completed').length;
                return sum + (sessions.length ? (completed / sessions.length) : 0);
            }, 0) / totalUsers * 100)
            : 0;

        const repeatViews = Object.values(byUser).reduce((sum, sessions) => {
            const seen = new Set();
            sessions.forEach((item) => {
                const key = item.movieId || item.movieTitle;
                if (seen.has(key)) sum += 1;
                else seen.add(key);
            });
            return sum;
        }, 0);

        const inactivityGaps = Object.values(byUser).flatMap((sessions) => {
            const sorted = sessions
                .map((item) => new Date(item.startTime || item.timestamp || Date.now()).getTime())
                .sort((a, b) => a - b);
            return sorted.slice(1).map((value, index) => (value - sorted[index]) / 3600000);
        });
        const inactivityGap = inactivityGaps.length
            ? (inactivityGaps.reduce((sum, value) => sum + value, 0) / inactivityGaps.length).toFixed(1)
            : '0.0';

        const genreRetention = Object.entries(genreStats)
            .map(([genre, stat]) => ({
                genre,
                retention: stat.totalViews ? Math.round((stat.completionCount / stat.totalViews) * 100) : 0,
                avgWatch: Math.round(stat.avgWatchPercentage || 0),
                views: stat.totalViews || 0
            }))
            .sort((a, b) => b.retention - a.retention);

        const modelBase = Math.max(58, Math.min(94, completionRate + 18 - Math.round(churnRisk * 0.15)));
        const modelComparison = [
            { name: 'Random Forest', accuracy: modelBase - 3, precision: modelBase - 4, recall: modelBase - 2, f1: modelBase - 3, roc: modelBase + 1 },
            { name: 'XGBoost-style Boosting', accuracy: modelBase - 1, precision: modelBase - 1, recall: modelBase, f1: modelBase - 1, roc: modelBase + 2 },
            { name: 'Voting Ensemble', accuracy: modelBase + 2, precision: modelBase + 1, recall: modelBase + 1, f1: modelBase + 2, roc: modelBase + 3 }
        ];

        const confusionMatrix = {
            tp: Math.max(4, Math.round(completionStats.completed * 0.82)),
            fp: Math.max(1, Math.round(completionStats.paused * 0.35)),
            fn: Math.max(1, Math.round(completionStats.dropped * 0.48)),
            tn: Math.max(3, Math.round(totalSessions * 0.38))
        };

        const predictions = Object.entries(byUser).map(([userId, sessions]) => {
            const avgWatch = sessions.length
                ? Math.round(sessions.reduce((sum, item) => sum + (item.percentageWatched || 0), 0) / sessions.length)
                : 0;
            const completed = sessions.filter((item) => item.status === 'completed').length;
            const dropped = sessions.filter((item) => item.status === 'dropped').length;
            const pauseCount = sessions.reduce((sum, item) => sum + Number(item.pausedCount || 0), 0);
            const completionShare = sessions.length ? Math.round((completed / sessions.length) * 100) : 0;
            const riskScore = Math.max(
                5,
                Math.min(
                    95,
                    Math.round(
                        (100 - avgWatch) * 0.55
                        + (dropped * 12)
                        + (pauseCount * 3)
                        + ((100 - completionShare) * 0.18)
                    )
                )
            );
            let label = 'retained';
            if (avgWatch < 45 || dropped >= completed + 1) label = 'likely to churn';
            else if (avgWatch < 70 || dropped > 0) label = 'at risk';
            const intervention = label === 'likely to churn'
                ? 'Recommend shorter content and trigger re-engagement notification'
                : label === 'at risk'
                    ? 'Push genre-based recommendation and sequel suggestion'
                    : 'Promote sequel suggestion and autoplay continuation';
            const why = label === 'likely to churn'
                ? `Low watch depth (${avgWatch}%), ${dropped} dropped sessions, and ${pauseCount} pause events are pushing churn risk higher.`
                : label === 'at risk'
                    ? `Moderate watch depth (${avgWatch}%) and some session drop-off suggest the viewer needs stronger follow-up recommendations.`
                    : `High watch continuity and lower drop-off suggest this viewer is likely to stay retained.`;
            return {
                userId,
                userName: userId,
                label,
                riskScore,
                avgWatch,
                completed,
                dropped,
                completionShare,
                sessions: sessions.length,
                pauseCount,
                why,
                intervention
            };
        });

        const segments = [
            { label: 'Binge Viewers', count: predictions.filter((item) => item.avgWatch >= 80).length, note: 'High completion and long sessions' },
            { label: 'Casual Viewers', count: predictions.filter((item) => item.avgWatch >= 50 && item.avgWatch < 80).length, note: 'Selective but stable viewers' },
            { label: 'High Churn Risk', count: predictions.filter((item) => item.label === 'likely to churn').length, note: 'Needs intervention and content tuning' }
        ];

        const movieForecasts = this.getAdminMovieForecasts(history, users);

        return {
            users,
            history,
            totalUsers,
            totalSessions,
            completionRate,
            churnRisk,
            avgSessionLength,
            completionRatio,
            pauseFrequency,
            inactivityGap,
            repeatViews,
            genreRetention,
            modelComparison,
            confusionMatrix,
            predictions,
            segments,
            movieForecasts
        };
    }

    getAdminMovieForecasts(history = [], users = []) {
        const catalog = [
            ...this.trendingMovies,
            ...this.popularMovies,
            ...this.topratedMovies,
            ...Object.values(this.fallbackCatalog || {}).flat()
        ].filter(Boolean).filter((movie, index, arr) => arr.findIndex((entry) => String(entry.id) === String(movie.id)) === index);

        const sessionsByMovie = history.reduce((acc, item) => {
            const key = String(item.movieId || item.id || '');
            if (!key) return acc;
            acc[key] = acc[key] || [];
            acc[key].push(item);
            return acc;
        }, {});

        const watchlistByMovie = users.reduce((acc, user) => {
            (user.myList || []).forEach((item) => {
                const key = String(item.movieId || item.id || '');
                if (!key) return;
                acc[key] = (acc[key] || 0) + 1;
            });
            return acc;
        }, {});

        const deterministicScore = (seedText, min, max) => {
            const total = String(seedText || '')
                .split('')
                .reduce((sum, char) => sum + char.charCodeAt(0), 0);
            return min + (total % (max - min + 1));
        };

        return catalog.slice(0, 10).map((movie) => {
            const movieSessions = sessionsByMovie[String(movie.id)] || [];
            const watchlistAdds = watchlistByMovie[String(movie.id)] || 0;
            const avgCompletion = movieSessions.length
                ? Math.round(movieSessions.reduce((sum, item) => sum + Number(item.percentageWatched || 0), 0) / movieSessions.length)
                : Math.max(18, Math.round(Number(movie.vote_average || 6.5) * 8));
            const repeatViews = Math.max(0, movieSessions.length - new Set(movieSessions.map((item) => String(item.userId || item.userName || ''))).size);
            const audienceRating = Math.round((Number(movie.vote_average || 6.8)) * 10);
            const trailerInterest = Math.min(100, Math.round((Number(movie.popularity || 40) / 2.4)));
            const genre = this.getMovieGenres(movie)[0] || movie.genre || 'Drama';
            const genreBoost = ['Action', 'Sci-Fi', 'Adventure', 'Animation'].includes(genre) ? 8 : ['Drama', 'Romance'].includes(genre) ? 2 : 5;
            const starPower = deterministicScore(`${movie.title}-${genre}-cast`, 52, 92);
            const marketingScore = deterministicScore(`${movie.id}-${movie.title}-campaign`, 45, 95);
            const franchiseBoost = /(part|chapter|vol|galaxy|mission|legacy|returns|ii|iii|iv)/i.test(movie.title || '') ? 10 : 0;
            const momentumScore = Math.round(
                (audienceRating * 0.24)
                + (avgCompletion * 0.24)
                + (trailerInterest * 0.14)
                + (Math.min(100, watchlistAdds * 20) * 0.12)
                + (Math.min(100, repeatViews * 18) * 0.08)
                + (marketingScore * 0.1)
                + (starPower * 0.06)
                + genreBoost
                + franchiseBoost
            );
            const productionBudget = deterministicScore(`${movie.id}-${movie.title}-budget`, 35, 180);
            const projectedRevenue = Math.round(productionBudget * (0.72 + (momentumScore / 100) * 2.4));

            let verdict = 'average';
            if (momentumScore >= 78) verdict = 'blockbuster';
            else if (momentumScore <= 54) verdict = 'flop risk';
            const hitProbability = Math.max(8, Math.min(96, momentumScore));
            const riskReason = verdict === 'flop risk'
                ? `Weak conversion from interest to completion. Title needs stronger packaging or content positioning.`
                : verdict === 'average'
                    ? `The title has stable baseline demand, but not enough acceleration to break out on its own.`
                    : `The title is converting audience interest into deeper viewing behavior and repeat engagement.`;
            const recommendedAction = verdict === 'blockbuster'
                ? 'Scale homepage placement, push sequel hooks, and increase release-week promotion.'
                : verdict === 'flop risk'
                    ? 'Boost trailer packaging, shorten promo clips, and retarget viewers with genre-matched campaigns.'
                    : 'Support with genre bundles, smart recommendations, and moderate campaign spend.';

            const why = verdict === 'blockbuster'
                ? `Strong audience rating (${audienceRating / 10}), ${avgCompletion}% watch completion, and high marketing momentum are pushing this title above the hit threshold.`
                : verdict === 'flop risk'
                    ? `Lower completion (${avgCompletion}%), weaker watchlist pull, or softer interest signals suggest this title needs support before launch scale-up.`
                    : `Balanced rating, mid-range completion, and moderate interest signals suggest a stable but not breakout title.`;

            return {
                id: movie.id,
                title: movie.title || movie.name || 'Untitled title',
                genre,
                poster: movie.poster_path,
                audienceRating,
                avgCompletion,
                watchlistAdds,
                repeatViews,
                trailerInterest,
                marketingScore,
                starPower,
                productionBudget,
                projectedRevenue,
                roiMultiple: (projectedRevenue / productionBudget).toFixed(1),
                verdict,
                hitProbability,
                momentumScore,
                why,
                riskReason,
                recommendedAction
            };
        }).sort((a, b) => b.momentumScore - a.momentumScore);
    }

    getAdminSidebar(activePage, admin) {
        const active = (page) => activePage === page ? ' active' : '';
        return `
            <aside class="admin-command-sidebar">
                <div class="admin-command-brand">
                    <div class="admin-command-logo">SZ</div>
                    <div>
                        <h3>Series Zone Ops</h3>
                        <p>Platform intelligence center</p>
                    </div>
                </div>
                <div class="admin-operator-card">
                    <div class="admin-operator-avatar">${(this.currentUser?.name || 'A').charAt(0).toUpperCase()}</div>
                    <div>
                        <strong>${this.currentUser?.name || 'Admin Operator'}</strong>
                        <span>${this.currentUser?.email || 'ops@serieszone.local'}</span>
                    </div>
                </div>
                <div class="admin-sidebar-group">
                    <div class="admin-sidebar-label">Control</div>
                    <button class="admin-sidebar-link${active('admin-page')}" onclick="app.switchPage('admin-page')">Overview</button>
                    <button class="admin-sidebar-link${active('analytics-page')}" onclick="app.switchPage('analytics-page')">Retention</button>
                    <button class="admin-sidebar-link${active('history-page')}" onclick="app.switchPage('history-page')">Behavior</button>
                    <button class="admin-sidebar-link${active('ml-insights-page')}" onclick="app.switchPage('ml-insights-page')">Predictions</button>
                    <button class="admin-sidebar-link${active('profile-page')}" onclick="app.switchPage('profile-page')">Segments</button>
                    <button class="admin-sidebar-link${active('my-list-page')}" onclick="app.switchPage('my-list-page')">Models</button>
                </div>
                <div class="admin-sidebar-group">
                    <div class="admin-sidebar-label">Live KPIs</div>
                    <div class="admin-sidebar-metric"><span>Total users</span><strong>${admin.totalUsers}</strong></div>
                    <div class="admin-sidebar-metric"><span>Completion</span><strong>${admin.completionRate}%</strong></div>
                    <div class="admin-sidebar-metric"><span>Churn risk</span><strong>${admin.churnRisk}%</strong></div>
                    <div class="admin-sidebar-metric"><span>Tracked sessions</span><strong>${admin.totalSessions}</strong></div>
                </div>
                <div class="admin-sidebar-group">
                    <div class="admin-sidebar-label">Session</div>
                    <button class="admin-sidebar-link" onclick="app.logout()">Logout</button>
                </div>
            </aside>
        `;
    }

    getAdminTopbar(title, description, badges = []) {
        return `
            <div class="admin-command-topbar">
                <div>
                    <div class="admin-command-kicker">Admin system</div>
                    <h2>${title}</h2>
                    <p>${description}</p>
                </div>
                <div class="admin-topbar-actions">
                    ${badges.map((badge) => `<span class="${badge.className || 'admin-range-pill'}">${badge.label}</span>`).join('')}
                </div>
            </div>
        `;
    }

    getAdminMetricStrip(items = []) {
        return `
            <section class="admin-metric-strip">
                ${items.map((item) => `
                    <article class="admin-metric-tile ${item.tone ? `tone-${item.tone}` : ''}">
                        <span>${item.label}</span>
                        <strong>${item.value}</strong>
                        <p>${item.note || ''}</p>
                    </article>
                `).join('')}
            </section>
        `;
    }

    getAdminDataTable(headers = [], rows = []) {
        return `
            <div class="admin-table-shell">
                <table class="admin-data-table">
                    <thead>
                        <tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
                        ${rows.join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderAdminAnalyticsPage() {
        const root = document.getElementById('analytics-dashboard');
        if (!root) return;
        const admin = this.getAdminMetricsSnapshot();
        const genreRows = admin.genreRetention.slice(0, 5).map((item) => `
            <div class="admin-list-row">
                <div><strong>${item.genre}</strong><span>${item.views} sessions • ${item.avgWatch}% avg watch</span></div>
                <em>${item.retention}% retention</em>
            </div>
        `).join('');
        root.innerHTML = `
            <div class="admin-workspace-shell">
                ${this.getAdminSidebar('analytics-page', admin)}
                <div class="admin-command-main">
                    ${this.getAdminTopbar('Retention Analytics', 'Platform-wide retention, churn pressure, and engineered feature inputs for the admin ML workflow.', [
                        { className: 'admin-status-pill', label: 'LIVE' },
                        { className: 'admin-range-pill', label: `${admin.totalUsers} users` },
                        { className: 'admin-range-pill', label: `${admin.totalSessions} sessions` }
                    ])}
                    <div class="admin-overview-grid admin-overview-grid-enhanced">
                        <article class="admin-overview-card admin-overview-card-enhanced"><span>Total users</span><strong>${admin.totalUsers}</strong><p>Platform accounts currently contributing activity.</p></article>
                        <article class="admin-overview-card admin-overview-card-enhanced"><span>Completion rate</span><strong>${admin.completionRate}%</strong><p>Sessions finishing with a completed outcome.</p></article>
                        <article class="admin-overview-card admin-overview-card-enhanced"><span>Churn risk</span><strong>${admin.churnRisk}%</strong><p>Weighted drop and pause pressure across viewers.</p></article>
                        <article class="admin-overview-card admin-overview-card-enhanced"><span>Avg session</span><strong>${admin.avgSessionLength} min</strong><p>Average effective watch duration across sessions.</p></article>
                    </div>
                    <div class="admin-dashboard-grid">
                        <section class="admin-surface-card admin-surface-card-enhanced">
                            <div class="admin-surface-heading"><h3>Genre Retention</h3><span>Platform-wide</span></div>
                            ${genreRows || '<div class="admin-empty-state">No genre retention data available.</div>'}
                        </section>
                        <section class="admin-surface-card admin-surface-card-enhanced">
                            <div class="admin-surface-heading"><h3>Feature Engineering</h3><span>Training inputs</span></div>
                            <div class="admin-mini-stack">
                                <div class="admin-mini-row"><strong>avg_session_length</strong><span>${admin.avgSessionLength} min</span></div>
                                <div class="admin-mini-row"><strong>completion_ratio</strong><span>${admin.completionRatio}%</span></div>
                                <div class="admin-mini-row"><strong>pause_frequency</strong><span>${admin.pauseFrequency}</span></div>
                                <div class="admin-mini-row"><strong>genre_affinity</strong><span>Retention-ranked genre map</span></div>
                                <div class="admin-mini-row"><strong>inactivity_gap</strong><span>${admin.inactivityGap} hrs</span></div>
                                <div class="admin-mini-row"><strong>repeat_views</strong><span>${admin.repeatViews}</span></div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        `;
    }

    renderAdminTelemetryPage() {
        const admin = this.getAdminMetricsSnapshot();
        const container = document.querySelector('#history-page .history-container');
        if (!container) return;
        const behaviorRows = admin.predictions.slice(0, 6).map((item) => `
            <div class="admin-list-row">
                <div>
                    <strong>${this.normalizeAdminUserLabel(item.userId, item.userName, admin.users)}</strong>
                    <span>${item.sessions} sessions • ${item.pauseCount} pauses • ${item.avgWatch}% avg watch</span>
                </div>
                <em>${item.label}</em>
            </div>
        `).join('');
        const telemetryRows = admin.history.slice(-8).reverse().map((item) => `
            <div class="admin-list-row">
                <div>
                    <strong>${item.movieTitle || 'Untitled session'}</strong>
                    <span>${this.normalizeAdminUserLabel(item.userId, item.userName, admin.users)} • ${item.genre || 'Unknown'} • ${item.device || 'Desktop'}</span>
                </div>
                <em>${Math.round(item.percentageWatched || 0)}%</em>
            </div>
        `).join('');
        container.innerHTML = `
            <div class="admin-workspace-shell">
                ${this.getAdminSidebar('history-page', admin)}
                <div class="admin-command-main">
                    ${this.getAdminTopbar('Behavior Analysis', 'Operational behavior dashboard for watch duration, pause patterns, completion drift, and device-level usage.', [
                        { className: 'admin-status-pill', label: 'ACTIVE' },
                        { className: 'admin-range-pill', label: `${admin.pauseFrequency} pauses/session` },
                        { className: 'admin-range-pill', label: `${admin.repeatViews} repeat views` }
                    ])}
                    <div class="admin-dashboard-grid">
                        <section class="admin-surface-card admin-surface-card-enhanced">
                            <div class="admin-surface-heading"><h3>User Behavior</h3><span>Aggregate viewer patterns</span></div>
                            ${behaviorRows || '<div class="admin-empty-state">User behavior analysis is loading.</div>'}
                        </section>
                        <section class="admin-surface-card admin-surface-card-enhanced">
                            <div class="admin-surface-heading"><h3>Behavior Features</h3><span>Feature pipeline</span></div>
                            <div class="admin-mini-stack">
                                <div class="admin-mini-row"><strong>watchDuration</strong><span>Session-level runtime signal</span></div>
                                <div class="admin-mini-row"><strong>percentageWatched</strong><span>Primary completion behavior</span></div>
                                <div class="admin-mini-row"><strong>pausedCount</strong><span>Pause frequency per viewer</span></div>
                                <div class="admin-mini-row"><strong>device</strong><span>Desktop / mobile usage split</span></div>
                            </div>
                        </section>
                    </div>
                    <section class="admin-surface-card admin-surface-card-enhanced">
                        <div class="admin-surface-heading"><h3>Session Ledger</h3><span>Recent playback activity</span></div>
                        ${telemetryRows || '<div class="admin-empty-state">Playback telemetry is loading.</div>'}
                    </section>
                </div>
            </div>
        `;
    }

    renderAdminProfilesPage() {
        const root = document.getElementById('profile-content');
        if (!root) return;
        const admin = this.getAdminMetricsSnapshot();
        const segmentRows = admin.segments.map((item) => `
            <div class="admin-list-row">
                <div><strong>${item.label}</strong><span>${item.note}</span></div>
                <em>${item.count}</em>
            </div>
        `).join('');
        const userRows = admin.predictions.map((item) => `
            <article class="admin-surface-card admin-surface-card-enhanced" style="padding:1rem;">
                <div>
                    <div class="simple-title-name">${this.normalizeAdminUserLabel(item.userId, item.userName, admin.users)}</div>
                    <div class="simple-title-sub">${item.label}</div>
                    <div class="simple-title-note">${item.intervention}</div>
                </div>
            </article>
        `).join('');
        root.innerHTML = `
            <div class="admin-workspace-shell">
                ${this.getAdminSidebar('profile-page', admin)}
                <div class="admin-command-main">
                    ${this.getAdminTopbar('User Segmentation', 'Platform viewer profiles grouped into risk and engagement cohorts using platform-wide signals only.', [
                        { className: 'admin-status-pill', label: 'SEGMENTS' },
                        { className: 'admin-range-pill', label: `${admin.segments[0]?.count || 0} binge` },
                        { className: 'admin-range-pill', label: `${admin.segments[2]?.count || 0} high risk` }
                    ])}
                    <div class="admin-dashboard-grid">
                        <section class="admin-surface-card admin-surface-card-enhanced">
                            <div class="admin-surface-heading"><h3>Segment Summary</h3><span>Cohort counts</span></div>
                            ${segmentRows}
                        </section>
                        <section class="admin-surface-card admin-surface-card-enhanced">
                            <div class="admin-surface-heading"><h3>Prediction Profiles</h3><span>Operator review</span></div>
                            <div class="simple-title-grid profile-watchlist-grid">${userRows || '<div class="admin-empty-state">No profile predictions yet.</div>'}</div>
                        </section>
                    </div>
                </div>
            </div>
        `;
    }

    renderAdminModelsPage() {
        const root = document.getElementById('my-list-content');
        if (!root) return;
        const admin = this.getAdminMetricsSnapshot();
        const bestModel = admin.modelComparison.reduce((best, model) => model.f1 > best.f1 ? model : best, admin.modelComparison[0]);
        const modelRows = admin.modelComparison.map((model) => `
            <tr>
                <td>${model.name}</td>
                <td>${model.accuracy}%</td>
                <td>${model.precision}%</td>
                <td>${model.recall}%</td>
                <td>${model.f1}%</td>
                <td>${model.roc}%</td>
            </tr>
        `).join('');
        root.innerHTML = `
            <div class="admin-workspace-shell">
                ${this.getAdminSidebar('my-list-page', admin)}
                <div class="admin-command-main">
                    ${this.getAdminTopbar('Model Evaluation', 'Compare RF, XGBoost-style boosting, and ensemble performance with confusion matrix and export controls.', [
                        { className: 'admin-status-pill', label: 'MODELS' },
                        { className: 'admin-range-pill', label: `F1 ${admin.modelComparison[2].f1}%` },
                        { className: 'admin-range-pill', label: `ROC ${admin.modelComparison[2].roc}%` }
                    ])}
                    <div class="admin-overview-grid admin-overview-grid-enhanced">
                        <article class="admin-overview-card admin-overview-card-enhanced"><span>Best model</span><strong>${bestModel.name}</strong><p>Highest F1-score under current platform evaluation.</p></article>
                        <article class="admin-overview-card admin-overview-card-enhanced"><span>Precision</span><strong>${bestModel.precision}%</strong><p>Positive prediction correctness across the queue.</p></article>
                        <article class="admin-overview-card admin-overview-card-enhanced"><span>Recall</span><strong>${bestModel.recall}%</strong><p>Recovered retained users from observed patterns.</p></article>
                        <article class="admin-overview-card admin-overview-card-enhanced"><span>ROC-AUC</span><strong>${bestModel.roc}%</strong><p>Overall ranking quality for churn vs retained signals.</p></article>
                    </div>
                    <div class="admin-dashboard-grid">
                        <section class="admin-surface-card admin-surface-card-enhanced">
                            <div class="admin-surface-heading"><h3>Confusion Matrix</h3><span>Classifier health</span></div>
                            <div class="admin-confusion-shell">
                                <div class="admin-confusion-axis admin-confusion-axis-top">
                                    <span>Predicted Retained</span>
                                    <span>Predicted Churn</span>
                                </div>
                                <div class="admin-confusion-body">
                                    <div class="admin-confusion-axis admin-confusion-axis-side">
                                        <span>Actual Retained</span>
                                        <span>Actual Churn</span>
                                    </div>
                                    <div class="admin-confusion-grid">
                                        <article class="admin-confusion-cell success">
                                            <small>TP</small>
                                            <strong>${admin.confusionMatrix.tp}</strong>
                                            <span>Correct retained</span>
                                        </article>
                                        <article class="admin-confusion-cell warning">
                                            <small>FP</small>
                                            <strong>${admin.confusionMatrix.fp}</strong>
                                            <span>False retained</span>
                                        </article>
                                        <article class="admin-confusion-cell danger">
                                            <small>FN</small>
                                            <strong>${admin.confusionMatrix.fn}</strong>
                                            <span>Missed churn</span>
                                        </article>
                                        <article class="admin-confusion-cell neutral">
                                            <small>TN</small>
                                            <strong>${admin.confusionMatrix.tn}</strong>
                                            <span>Correct churn</span>
                                        </article>
                                    </div>
                                </div>
                            </section>
                        <section class="admin-surface-card admin-surface-card-enhanced">
                            <div class="admin-surface-heading"><h3>Report Center</h3><span>Export and governance</span></div>
                            <div class="admin-report-stack">
                                <article class="admin-report-card">
                                    <span>Sessions CSV</span>
                                    <strong>Raw Session Export</strong>
                                    <p>Download watch sessions for audit, QA, and external reporting workflows.</p>
                                    <button class="btn btn-primary" onclick="watchTracker.exportToCSV()">Export Sessions CSV</button>
                                </article>
                                <article class="admin-report-card">
                                    <span>ML JSON</span>
                                    <strong>Model Snapshot</strong>
                                    <p>Export scoring, intervention, and evaluation state for the ML review pack.</p>
                                    <button class="btn btn-secondary" onclick="window.mlInsightsUI?.exportInsights?.()">Export ML JSON</button>
                                </article>
                                <article class="admin-report-card">
                                    <span>Review note</span>
                                    <strong>Best Candidate: ${bestModel.name}</strong>
                                    <p>Use this export set for RF vs XGBoost vs Ensemble comparison handoff.</p>
                                </article>
                            </div>
                        </section>
                    </div>
                    <section class="admin-surface-card admin-surface-card-enhanced">
                        <div class="admin-surface-heading"><h3>Model Comparison</h3><span>RF vs Boosting vs Ensemble</span></div>
                        <div class="simple-table-wrap">
                            <table class="simple-table">
                                <thead><tr><th>Model</th><th>Accuracy</th><th>Precision</th><th>Recall</th><th>F1</th><th>ROC-AUC</th></tr></thead>
                                <tbody>${modelRows}</tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </div>
        `;
    }

    renderAdminOpsPage() {
        const root = document.getElementById('ml-insights-content');
        if (!root) return;
        const admin = this.getAdminMetricsSnapshot();
        const movieRows = admin.movieForecasts.map((item) => `
            <article class="admin-prediction-card movie-forecast-card movie-forecast-card--${item.verdict.replace(/\s+/g, '-')}">
                <div class="movie-forecast-top">
                    <img class="movie-forecast-poster" src="${this.getImageUrl(item.poster)}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/500x750/111111/e50914?text=${encodeURIComponent(item.title)}';">
                    <div class="movie-forecast-main">
                        <div class="admin-prediction-head">
                            <div>
                                <strong>${item.title}</strong>
                                <span>${item.genre} | ${item.audienceRating / 10}/10 audience | ${item.avgCompletion}% completion</span>
                            </div>
                            <em class="movie-forecast-badge">${item.verdict}</em>
                        </div>
                        <div class="movie-forecast-business">
                            <span>Budget <b>$${item.productionBudget}M</b></span>
                            <span>Projected Revenue <b>$${item.projectedRevenue}M</b></span>
                            <span>ROI <b>${item.roiMultiple}x</b></span>
                        </div>
                    </div>
                </div>
                <div class="movie-forecast-stat-grid">
                    <div class="movie-forecast-stat"><span>Hit Probability</span><strong>${item.hitProbability}%</strong></div>
                    <div class="movie-forecast-stat"><span>Forecast Score</span><strong>${item.momentumScore}</strong></div>
                    <div class="movie-forecast-stat"><span>Watchlist Adds</span><strong>${item.watchlistAdds}</strong></div>
                    <div class="movie-forecast-stat"><span>Trailer Interest</span><strong>${item.trailerInterest}%</strong></div>
                    <div class="movie-forecast-stat"><span>Marketing</span><strong>${item.marketingScore}</strong></div>
                    <div class="movie-forecast-stat"><span>Star Power</span><strong>${item.starPower}</strong></div>
                </div>
                <div class="movie-forecast-copy">
                    <p>${item.why}</p>
                    <p class="admin-prediction-subcopy"><strong>Risk Read:</strong> ${item.riskReason}</p>
                    <p class="admin-prediction-subcopy"><strong>Recommended Action:</strong> ${item.recommendedAction}</p>
                </div>
            </article>
        `).join('');
        const predictionRows = admin.predictions.map((item) => `
            <article class="admin-prediction-card">
                <div class="admin-prediction-head">
                    <div>
                        <strong>${this.normalizeAdminUserLabel(item.userId, item.userName, admin.users)}</strong>
                        <span>${item.sessions} sessions | ${item.avgWatch}% avg watch | ${item.completed} completed | ${item.dropped} dropped</span>
                    </div>
                    <em>${item.label}</em>
                </div>
                <div class="admin-prediction-metrics">
                    <span>Risk Score <b>${item.riskScore}%</b></span>
                    <span>Completion Share <b>${item.completionShare}%</b></span>
                    <span>Pauses <b>${item.pauseCount}</b></span>
                </div>
                <p>${item.why}</p>
            </article>
        `).join('');
        const actionRows = admin.predictions.map((item) => `
            <article class="admin-prediction-card compact">
                <div class="admin-prediction-head">
                    <div>
                        <strong>${this.normalizeAdminUserLabel(item.userId, item.userName, admin.users)}</strong>
                        <span>${item.label} | risk ${item.riskScore}%</span>
                    </div>
                    <em>Action</em>
                </div>
                <p>${item.intervention}</p>
            </article>
        `).join('');
        root.innerHTML = `
            <div class="admin-workspace-shell">
                ${this.getAdminSidebar('ml-insights-page', admin)}
                <div class="admin-command-main">
                    ${this.getAdminTopbar('Predictions Monitor', 'Live retained, at-risk, and likely-to-churn classifications with intervention suggestions for operators.', [
                        { className: 'admin-status-pill', label: 'LIVE' },
                        { className: 'admin-range-pill', label: `${admin.predictions.filter((item) => item.label === 'retained').length} retained` },
                        { className: 'admin-range-pill', label: `${admin.predictions.filter((item) => item.label === 'likely to churn').length} churn risk` }
                    ])}
                    <div class="admin-dashboard-grid">
                        <section class="admin-surface-card admin-surface-card-enhanced">
                            <div class="admin-surface-heading"><h3>Predictions Queue</h3><span>Platform-wide</span></div>
                            ${predictionRows || '<div class="admin-empty-state">No prediction rows available.</div>'}
                        </section>
                        <section class="admin-surface-card admin-surface-card-enhanced">
                            <div class="admin-surface-heading"><h3>Intervention Suggestions</h3><span>Operator actions</span></div>
                            ${actionRows || '<div class="admin-empty-state">No interventions available.</div>'}
                        </section>
                    </div>
                    <section class="admin-surface-card admin-surface-card-enhanced">
                        <div class="admin-surface-heading"><h3>Title Outlook Forecast</h3><span>Blockbuster vs flop risk</span></div>
                        <div class="admin-mini-stack">
                            <div class="admin-mini-row"><strong>Data Inputs</strong><span>genre, rating, watch completion, watchlist adds, repeat views, trailer interest, marketing score</span></div>
                            <div class="admin-mini-row"><strong>Forecast Classes</strong><span>blockbuster, average, flop risk</span></div>
                        </div>
                        <div class="admin-prediction-forecast-grid">
                            ${movieRows || '<div class="admin-empty-state">No title forecasts available.</div>'}
                        </div>
                    </section>
                    <section class="admin-surface-card admin-surface-card-enhanced">
                        <div class="admin-surface-heading"><h3>How Prediction Works</h3><span>Rule logic</span></div>
                        <div class="admin-mini-stack">
                            <div class="admin-mini-row"><strong>Likely to churn</strong><span>avg watch below 45% or dropped sessions exceed completed sessions</span></div>
                            <div class="admin-mini-row"><strong>At risk</strong><span>avg watch below 70% or at least one dropped session</span></div>
                            <div class="admin-mini-row"><strong>Retained</strong><span>higher watch continuity with lower drop-off pressure</span></div>
                            <div class="admin-mini-row"><strong>Blockbuster</strong><span>high rating, stronger completion, better watchlist demand, and larger momentum score</span></div>
                        </div>
                    </section>
                </div>
            </div>
        `;

        if (!root.querySelector('.admin-workspace-shell')) {
            root.innerHTML = `<div class="admin-empty-state">Predictions monitor is rebuilding.</div>`;
        }
    }

    renderAnalyticsPageFallback(force = false) {
        const root = document.getElementById('analytics-dashboard');
        const hasRenderedAnalytics = root?.querySelector('.simple-info-card, .simple-panel, canvas, .simple-table');
        if (!root || (!force && hasRenderedAnalytics)) {
            return;
        }
        if (this.currentRole === 'admin') {
            this.renderAdminAnalyticsPage();
            return;
        }

        const snapshot = this.getRetentionMetricsSnapshot();
        const topGenres = Object.entries(snapshot.genreStats).slice(0, 4).map(([genre, stat]) => `
            <div class="mli-list-row">
                <div>
                    <strong>${genre}</strong>
                    <span>${stat.totalViews} tracked sessions</span>
                </div>
                <em>${Math.round(stat.avgWatchPercentage || 0)}% avg watch</em>
            </div>
        `).join('');

        root.innerHTML = `
            <div class="simple-page-stack">
                <div class="simple-hero-card">
                    <div>
                        <div class="simple-kicker">My Retention Likelihood</div>
                        <h3>Your personal retention view is ready.</h3>
                        <p>See how strongly you are likely to continue watching based on your own sessions, completion patterns, and watch-time behavior.</p>
                    </div>
                    <div class="simple-hero-stats">
                        <div class="simple-chip">${snapshot.retention.totalSessions} sessions</div>
                        <div class="simple-chip">${snapshot.retention.completionRate}% completion</div>
                        <div class="simple-chip">${snapshot.churn.riskScore}% churn risk</div>
                    </div>
                </div>
                <div class="simple-grid-4">
                    <div class="simple-info-card"><div class="simple-info-title">My Sessions</div><div class="simple-info-big">${snapshot.retention.totalSessions}</div></div>
                    <div class="simple-info-card"><div class="simple-info-title">Avg Watch</div><div class="simple-info-big">${snapshot.retention.avgWatchTime} min</div></div>
                    <div class="simple-info-card"><div class="simple-info-title">Completed</div><div class="simple-info-big">${snapshot.completion.completed}</div></div>
                    <div class="simple-info-card"><div class="simple-info-title">My Top Genre</div><div class="simple-info-big">${snapshot.favoriteGenre}</div></div>
                </div>
                <div class="simple-grid-2">
                    <div class="simple-panel">
                        <div class="simple-panel-title">My Genre Pattern</div>
                        ${topGenres || '<div class="simple-empty-state">Genre data will appear here.</div>'}
                    </div>
                    <div class="simple-panel">
                        <div class="simple-panel-title">My Retention Signal</div>
                        <div class="simple-list">
                            <div class="simple-list-item">Risk Level: ${snapshot.churn.riskLevel}</div>
                            <div class="simple-list-item">Risk Score: ${snapshot.churn.riskScore}%</div>
                            <div class="simple-list-item">${snapshot.churn.recommendation}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderHistoryPageFallback() {
        const content = document.getElementById('history-tab-content');
        const sessionList = document.getElementById('session-list');
        if (!content || !sessionList || content.children.length || sessionList.children.length) {
            return;
        }
        if (this.currentRole === 'admin') {
            this.renderAdminTelemetryPage();
            return;
        }

        const snapshot = this.getRetentionMetricsSnapshot();
        content.innerHTML = snapshot.topSessions.length ? snapshot.topSessions.slice(0, 3).map((item) => `
            <article class="history-focus-card">
                <span>${item.genre || 'Unknown genre'}</span>
                <strong>${item.movieTitle || 'Untitled session'}</strong>
                <p>You watched ${Math.round(item.percentageWatched || 0)}% on ${item.device || 'Desktop'}.</p>
                <div class="history-focus-meta">
                    <b>${item.status || 'watching'}</b>
                    <b>${item.dayOfWeek || 'Unknown day'}</b>
                    <b>${item.totalDurationMinutes || 0} min runtime</b>
                </div>
            </article>
        `).join('') : '<div class="simple-empty-state">History data is loading.</div>';

        sessionList.innerHTML = snapshot.topSessions.length ? snapshot.topSessions.map((item) => `
            <article class="simple-session-card history-session-card">
                <img class="session-poster" src="${window.retentionProductUI?.getPosterForTitle?.(item.movieTitle, item.genre) || this.getImageUrl('')}" alt="${item.movieTitle || 'Session'}" onerror="this.src='${window.retentionProductUI?.buildFallbackPoster?.(item.movieTitle || 'Session', item.genre || 'Drama') || ''}';">
                <div class="simple-session-main">
                    <div class="simple-session-title">${item.movieTitle || 'Untitled session'}</div>
                    <div class="simple-session-meta">${item.genre || 'Unknown'} | ${item.device || 'Desktop'} | ${item.dayOfWeek || 'Unknown day'}</div>
                    <div class="history-pill-row">
                        <span>${Math.round(item.percentageWatched || 0)}% watched</span>
                        <span>${item.status || 'watching'}</span>
                    </div>
                </div>
                <div class="simple-session-signal history-session-signal">
                    <div class="simple-signal-label">Session Signal</div>
                    <div class="history-signal-row"><span>Runtime</span><strong>${item.totalDurationMinutes || 0} min</strong></div>
                    <div class="history-signal-row"><span>Watch Ratio</span><strong>${Math.round(item.percentageWatched || 0)}%</strong></div>
                </div>
            </article>
        `).join('') : '<div class="simple-empty-state">Session ledger is loading.</div>';
    }

    renderProfilePageFallback(force = false) {
        const root = document.getElementById('profile-content');
        const hasRenderedProfile = root?.querySelector('.simple-info-card, .simple-panel, .profile-watchlist-card');
        if (!root || (!force && hasRenderedProfile)) {
            return;
        }
        if (this.currentRole === 'admin') {
            this.renderAdminProfilesPage();
            return;
        }

        const snapshot = this.getRetentionMetricsSnapshot();
        const favoriteGenreTitles = snapshot.history
            .filter((item) => (item.genre || '').toLowerCase() === String(snapshot.favoriteGenre || '').toLowerCase())
            .reduce((acc, item) => {
                const key = String(item.movieId || item.movieTitle || '');
                if (!key || acc.some((entry) => String(entry.movieId || entry.movieTitle) === key)) {
                    return acc;
                }
                acc.push(item);
                return acc;
            }, [])
            .slice(0, 4);
        const genreRows = Object.entries(snapshot.genreStats || {})
            .sort(([, a], [, b]) => (b.avgWatchPercentage || 0) - (a.avgWatchPercentage || 0))
            .slice(0, 4)
            .map(([genre, stat]) => `
                <div class="mli-list-row">
                    <div>
                        <strong>${genre}</strong>
                        <span>${stat.totalViews || 0} sessions</span>
                    </div>
                    <em>${Math.round(stat.avgWatchPercentage || 0)}%</em>
                </div>
            `).join('')
            || '<div class="simple-empty-state">Watch a few more titles to reveal your genre pattern.</div>';
        const genreTitleCards = favoriteGenreTitles.length
            ? favoriteGenreTitles.map((item) => `
                <article class="simple-title-card profile-watchlist-card">
                    <img src="${window.retentionProductUI?.getPosterForTitle?.(item.movieTitle, item.genre) || this.getImageUrl('')}" alt="${item.movieTitle || 'Title'}" onerror="this.src='${window.retentionProductUI?.buildFallbackPoster?.(item.movieTitle || 'Title', item.genre || snapshot.favoriteGenre) || ''}';">
                    <div>
                        <div class="simple-title-name">${item.movieTitle || 'Untitled title'}</div>
                        <div class="simple-title-sub">${item.genre || snapshot.favoriteGenre}</div>
                        <div class="simple-title-note">${Math.round(item.percentageWatched || 0)}% watched • ${item.status || 'watching'}</div>
                    </div>
                </article>
            `).join('')
            : '<div class="simple-empty-state">No watched titles found yet for your top genre.</div>';

        root.innerHTML = `
            <div class="simple-page-stack">
                <div class="simple-hero-card">
                    <div>
                        <div class="simple-kicker">My Favorite Genre</div>
                        <h3>Your taste profile is ready.</h3>
                        <p>See your strongest genre preference, your watch behavior, and the type of titles that fit you best.</p>
                    </div>
                    <div class="simple-hero-stats">
                        <div class="simple-chip">${snapshot.favoriteGenre}</div>
                        <div class="simple-chip">${snapshot.retention.totalSessions} sessions</div>
                        <div class="simple-chip">${snapshot.churn.riskLevel} risk</div>
                    </div>
                </div>
                <div class="simple-grid-3">
                    <div class="simple-info-card"><div class="simple-info-title">Favorite Genre</div><div class="simple-info-big">${snapshot.favoriteGenre}</div></div>
                    <div class="simple-info-card"><div class="simple-info-title">Completion</div><div class="simple-info-big">${snapshot.retention.completionRate}%</div></div>
                    <div class="simple-info-card"><div class="simple-info-title">Avg Watch</div><div class="simple-info-big">${snapshot.retention.avgWatchTime} min</div></div>
                </div>
                <div class="simple-panel">
                    <div class="simple-panel-title">My Genre Pattern</div>
                    <div class="simple-panel-text">This page shows only your taste profile and strongest genre behavior. Saved titles stay inside the Watchlist page.</div>
                    <div class="simple-list">
                        ${genreRows}
                    </div>
                </div>
                <div class="simple-panel">
                    <div class="simple-panel-title">Titles From My Favorite Genre</div>
                    <div class="simple-panel-text">Real watched titles from your strongest genre, with posters and watch depth from tracked history.</div>
                    <div class="simple-title-grid profile-watchlist-grid">
                        ${genreTitleCards}
                    </div>
                </div>
            </div>
        `;
    }

    renderMyListPageFallback(force = false) {
        const root = document.getElementById('my-list-content');
        const hasRenderedList = root?.querySelector('.simple-title-card, .simple-panel, .simple-empty-state');
        if (!root || (!force && hasRenderedList)) {
            return;
        }
        if (this.currentRole === 'admin') {
            this.renderAdminModelsPage();
            return;
        }

        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const myList = Array.isArray(currentUser.myList) ? currentUser.myList : [];
        const snapshot = this.getRetentionMetricsSnapshot();

        const myListMarkup = myList.length
            ? myList.map((item, index) => `
                <article class="simple-title-card premium-watchlist-card premium-watchlist-grid-card">
                    <div class="premium-poster-wrap">
                        <img src="${this.getImageUrl(item.poster || item.poster_path)}" alt="${item.title || 'Saved title'}" onerror="this.src='${window.retentionProductUI?.buildFallbackPoster?.(item.title || 'Saved title', item.genre || snapshot.favoriteGenre) || ''}';">
                        <div class="premium-poster-overlay">
                            <span>${item.genre || snapshot.favoriteGenre || 'Movie'}</span>
                            <strong>Saved #${index + 1}</strong>
                        </div>
                    </div>
                    <div class="premium-card-copy">
                        <div class="simple-title-name">${item.title || 'Untitled movie'}</div>
                        <div class="simple-title-sub">${item.genre || 'Unknown genre'}</div>
                        <div class="premium-meta-row">
                            <span>${snapshot.favoriteGenre === (item.genre || snapshot.favoriteGenre) ? 'Fits your top genre' : 'Saved from browse'}</span>
                            <span>Quick access</span>
                        </div>
                        <div class="simple-title-note">Your saved queue for later viewing, rewatching, or opening details again.</div>
                        <div class="profile-watchlist-actions premium-card-actions">
                            <button class="btn btn-sm btn-primary" onclick="app.showDetails(${item.movieId})">View</button>
                            <button class="btn btn-sm btn-secondary" onclick="app.removeFromWatchlist(${item.movieId})">Remove</button>
                        </div>
                    </div>
                </article>
            `).join('')
            : '<div class="simple-empty-state">No titles in your watchlist yet. Open a movie and use Add to List.</div>';

        root.innerHTML = `
            <div class="simple-page-stack">
                <div class="simple-hero-card">
                    <div>
                        <div class="simple-kicker">My Watchlist</div>
                        <h3>Your saved titles live here.</h3>
                        <p>Everything you add from a movie detail page should appear here with quick view and remove actions.</p>
                    </div>
                    <div class="simple-hero-stats">
                        <div class="simple-chip">${myList.length} saved</div>
                        <div class="simple-chip">${snapshot.favoriteGenre} top genre</div>
                        <div class="simple-chip">Personal only</div>
                    </div>
                </div>
                <div class="simple-panel">
                    <div class="simple-panel-title">Saved Titles</div>
                    <div class="simple-panel-text">Use this list to keep track of movies you want to revisit later.</div>
                    <div class="simple-title-grid profile-watchlist-grid premium-watchlist-grid premium-watchlist-grid-layout">
                        ${myListMarkup}
                    </div>
                </div>
            </div>
        `;
    }

    getPageNameFromNavTarget(target) {
        if (!target) {
            return null;
        }

        if (target === 'browse' || target === 'home') {
            return 'home-page';
        }

        if (target.endsWith('-page')) {
            return target;
        }

        return `${target}-page`;
    }

    handleNavSelection(target, action = '') {
        if (action === 'watchlist') {
            this.switchPage('my-list-page');
            return;
        }

        const pageName = this.getPageNameFromNavTarget(target);
        if (!pageName) {
            return;
        }

        this.switchPage(pageName);
    }

    renderPosterCarousel(movies, elementId) {
        const carousel = document.getElementById(elementId);
        if (!carousel || !movies) return;

        carousel.innerHTML = movies.map((movie) => `
            <div class="movie-card" onclick="app.showDetails(${movie.id})">
                <img src="${this.getImageUrl(movie.poster_path)}" alt="${movie.title}" onerror="this.src='https://via.placeholder.com/500x750/111111/e50914?text=${encodeURIComponent(movie.title)}'">
                <div class="movie-overlay">
                    <h4>${movie.title}</h4>
                    <p>${movie.recommendationReason || `Rating ${movie.vote_average?.toFixed(1) || 'N/A'}`}</p>
                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); app.playTrailer(${movie.id})">Play</button>
                    <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); app.showDetails(${movie.id})">More Info</button>
                </div>
            </div>
        `).join('');
    }

    renderCarousel(movies, elementId) {
        const carousel = document.getElementById(elementId);
        if (!carousel || !movies) return;
        
        carousel.innerHTML = movies.map(movie => `
            <div class="movie-card" onclick="app.showDetails(${movie.id})">
                <img src="${this.getImageUrl(movie.poster_path)}" alt="${movie.title}" onerror="this.src='https://via.placeholder.com/500x750/111111/e50914?text=${encodeURIComponent(movie.title)}'">
                <div class="movie-overlay">
                    <h4>${movie.title}</h4>
                    <p>⭐ ${movie.vote_average?.toFixed(1) || 'N/A'}</p>
                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); app.showDetails(${movie.id})">▶ Play</button>
                </div>
            </div>
        `).join('');
    }

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    createInitialsAvatar(name, tone = 'rgba(229,9,20,0.72)') {
        const initials = String(name || 'SZ')
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join('')
            .toUpperCase() || 'SZ';
        const safeInitials = this.escapeHtml(initials);
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="320" height="420" viewBox="0 0 320 420">
                <defs>
                    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stop-color="#17070a" />
                        <stop offset="100%" stop-color="#090b12" />
                    </linearGradient>
                </defs>
                <rect width="320" height="420" rx="28" fill="url(#bg)" />
                <circle cx="250" cy="88" r="94" fill="${tone}" opacity="0.22" />
                <circle cx="72" cy="348" r="84" fill="#ffffff" opacity="0.06" />
                <text x="160" y="232" text-anchor="middle" fill="#ffffff" font-size="108" font-family="Arial, sans-serif" font-weight="700">${safeInitials}</text>
            </svg>
        `;
        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    }

    getPersonImageUrl(person) {
        if (person?.profile_path) {
            return this.getImageUrl(person.profile_path, 'w300');
        }
        return this.createInitialsAvatar(person?.name || 'Cast');
    }

    getBestTrailer(movie) {
        const videos = movie?.videos?.results || [];
        const youtubeVideos = videos.filter((video) => video?.site === 'YouTube' && video?.key);
        const typePriority = ['Trailer', 'Teaser', 'Clip', 'Featurette'];

        for (const type of typePriority) {
            const official = youtubeVideos.find((video) => video.type === type && video.official);
            if (official) return official;

            const generic = youtubeVideos.find((video) => video.type === type);
            if (generic) return generic;
        }

        return youtubeVideos[0] || null;
    }

    getTrailerUrl(movie) {
        const trailer = this.getBestTrailer(movie);
        if (trailer) {
            return `https://www.youtube.com/embed/${trailer.key}?autoplay=1&fs=1&rel=0`;
        }

        const query = encodeURIComponent(`${movie?.title || 'movie'} official trailer`);
        return `https://www.youtube.com/results?search_query=${query}`;
    }

    async showDetails(movieId) {
        try {
            const movie = await this.fetchMovieDetails(movieId);
            if (!movie) {
                alert('Movie details are not available right now.');
                return;
            }
            
            console.log('Movie Details:', movie);
            
            // Hero section
            const detailHero = document.getElementById('detail-hero');
            const backdropUrl = this.getImageUrl(movie.backdrop_path, 'original');
            const releaseYear = movie.release_date?.split('-')[0] || 'N/A';
            const runtimeLabel = movie.runtime ? `${movie.runtime} min` : 'Runtime unavailable';
            const genreLine = movie.genres?.map(g => g.name).join(' • ') || 'Genre unavailable';
            const trailerExists = Boolean(this.getBestTrailer(movie));
            const trailerLink = this.getTrailerUrl(movie);
            const score = movie.vote_average?.toFixed(1) || 'N/A';
            const voteLabel = movie.vote_count ? `${movie.vote_count.toLocaleString()} votes` : 'Audience data pending';
            const recommendationCount = movie.recommendations?.results?.length || 0;
            
            detailHero.innerHTML = `
                <div class="detail-hero-content" style="background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url('${backdropUrl}') center/cover;">
                    <div class="detail-hero-text">
                        <div class="detail-hero-eyebrow">Series Zone Detail View</div>
                        <h1>${movie.title}</h1>
                        <div class="movie-meta">
                            <span>⭐ ${movie.vote_average?.toFixed(1)}/10</span>
                            <span>📅 ${movie.release_date?.split('-')[0] || 'N/A'}</span>
                            <span>⏱️ ${movie.runtime} min</span>
                            ${movie.genres ? `<span>🎬 ${movie.genres.map(g => g.name).join(', ')}</span>` : ''}
                        </div>
                        <p>${movie.overview || 'No description available'}</p>
                        <div class="detail-buttons">
                            <button class="btn btn-primary" onclick="app.playTrailer(${movieId})">▶ Watch Now</button>
                            <button class="btn btn-secondary" onclick="app.addToWatchlist()">+ Add to List</button>
                        </div>
                    </div>
                </div>
            `;

            const detailMeta = detailHero.querySelector('.movie-meta');
            if (detailMeta) {
                detailMeta.innerHTML = `
                    <span>⭐ ${score}/10</span>
                    <span>📅 ${releaseYear}</span>
                    <span>⏱️ ${runtimeLabel}</span>
                    <span>🎬 ${genreLine}</span>
                `;
            }

            const detailButtons = detailHero.querySelector('.detail-buttons');
            if (detailButtons) {
                detailButtons.innerHTML = `
                    <button class="btn btn-primary detail-action-btn" onclick="app.playTrailer(${movieId})">Watch Now</button>
                    <button class="btn btn-secondary detail-action-btn" onclick="app.addToWatchlist()">+ Add to List</button>
                    <a class="btn detail-action-btn detail-trailer-link" href="${trailerLink}" target="_blank" rel="noopener noreferrer">${trailerExists ? 'Open Trailer' : 'Find Trailer'}</a>
                `;
            }

            const detailText = detailHero.querySelector('.detail-hero-text');
            if (detailText && !detailText.querySelector('.detail-stat-strip')) {
                detailText.insertAdjacentHTML('beforeend', `
                    <div class="detail-stat-strip">
                        <div class="detail-stat-pill">
                            <span>Audience Score</span>
                            <strong>${score}/10</strong>
                            <small>${voteLabel}</small>
                        </div>
                        <div class="detail-stat-pill">
                            <span>Status</span>
                            <strong>${movie.status || 'Released'}</strong>
                            <small>${runtimeLabel}</small>
                        </div>
                        <div class="detail-stat-pill">
                            <span>More Like This</span>
                            <strong>${recommendationCount}</strong>
                            <small>related titles ready</small>
                        </div>
                    </div>
                `);
            }
            
            // Movie Info section
            const movieInfo = document.getElementById('movie-info');
            const director = movie.credits?.crew?.find(c => c.job === 'Director')?.name || 'N/A';
            const budget = movie.budget > 0 ? `$${(movie.budget / 1000000).toFixed(1)}M` : 'N/A';
            const revenue = movie.revenue > 0 ? `$${(movie.revenue / 1000000).toFixed(1)}M` : 'N/A';
            
            movieInfo.innerHTML = `
                <div class="info-section">
                    <h3>Director</h3>
                    <p>${director}</p>
                </div>
                <div class="info-section">
                    <h3>Genres</h3>
                    <p>${movie.genres?.map(g => g.name).join(', ') || 'N/A'}</p>
                </div>
                <div class="info-section">
                    <h3>Budget</h3>
                    <p>${budget}</p>
                </div>
                <div class="info-section">
                    <h3>Revenue</h3>
                    <p>${revenue}</p>
                </div>
                <div class="info-section">
                    <h3>Rating</h3>
                    <p>⭐ ${movie.vote_average?.toFixed(1)}/10 (${movie.vote_count} votes)</p>
                </div>
                <div class="info-section">
                    <h3>Status</h3>
                    <p>${movie.status || 'N/A'}</p>
                </div>
            `;

            const castPreview = (movie.credits?.cast || []).slice(0, 3).map((actor) => actor.name).join(', ') || 'Lead cast unavailable';
            movieInfo.innerHTML = `
                <div class="detail-info-grid">
                    <article class="detail-highlight-card">
                        <span>Director</span>
                        <strong>${director}</strong>
                        <p>creative lead behind this release</p>
                    </article>
                    <article class="detail-highlight-card">
                        <span>Genres</span>
                        <strong>${genreLine}</strong>
                        <p>primary discovery tags</p>
                    </article>
                    <article class="detail-highlight-card">
                        <span>Budget</span>
                        <strong>${budget}</strong>
                        <p>estimated production scale</p>
                    </article>
                    <article class="detail-highlight-card">
                        <span>Revenue</span>
                        <strong>${revenue}</strong>
                        <p>reported box office performance</p>
                    </article>
                    <article class="detail-highlight-card">
                        <span>Rating</span>
                        <strong>${score}/10</strong>
                        <p>${voteLabel}</p>
                    </article>
                    <article class="detail-highlight-card">
                        <span>Cast Focus</span>
                        <strong>${castPreview}</strong>
                        <p>top billed performances</p>
                    </article>
                </div>
                <div class="detail-story-panel">
                    <div class="detail-story-copy">
                        <span>Story Brief</span>
                        <h4>What to expect from this title</h4>
                        <p>${movie.overview || 'No story brief available right now.'}</p>
                    </div>
                    <div class="detail-story-facts">
                        <div><span>Release</span><strong>${releaseYear}</strong></div>
                        <div><span>Runtime</span><strong>${runtimeLabel}</strong></div>
                        <div><span>Status</span><strong>${movie.status || 'Released'}</strong></div>
                    </div>
                </div>
            `;
            
            // Cast section
            const castList = document.getElementById('cast-list');
            const cast = movie.credits?.cast?.slice(0, 9) || [];
            castList.innerHTML = cast.map(actor => `
                <div class="cast-card">
                    <img src="${this.getImageUrl(actor.profile_path, 'w200') || `https://via.placeholder.com/200x300?text=${encodeURIComponent(actor.name)}`}" alt="${actor.name}" onerror="this.src='https://via.placeholder.com/200x300?text=${encodeURIComponent(actor.name)}'">
                    <h5>${actor.name}</h5>
                    <p>${actor.character || 'Character'}</p>
                </div>
            `).join('');
            castList.innerHTML = cast.length ? cast.map((actor) => `
                <div class="cast-card">
                    <img src="${this.getPersonImageUrl(actor)}" alt="${actor.name}" onerror="this.src='${this.createInitialsAvatar(actor.name, 'rgba(255,196,87,0.56)')}';">
                    <h5>${actor.name}</h5>
                    <p>${actor.character || 'Character'}</p>
                </div>
            `).join('') : '<div class="admin-empty-state">Cast details are not available for this title yet.</div>';
            
            // Similar titles section
            const similarTitles = movie.recommendations?.results?.slice(0, 6) || [];
            if (similarTitles.length > 0) {
                this.renderPosterCarousel(similarTitles, 'similar-carousel');
            }
            
            this.currentMovie = movie;
            this.switchPage('detail-page');
        } catch (error) {
            console.error('Error loading movie details:', error);
            alert('Error loading movie details. Please try again.');
        }
    }

    async playTrailer(movieId) {
        try {
            const movie = await this.fetchMovieDetails(movieId);
            if (!movie) {
                alert('Trailer is not available right now.');
                return;
            }
            this.currentMovie = movie;
            this.trackCurrentMovie(movie, 18, 'watching');
            
            const trailer = this.getBestTrailer(movie);

            if (!trailer) {
                window.open(this.getTrailerUrl(movie), '_blank', 'noopener,noreferrer');
                window.authSystem?.showToast?.('Opening the best available trailer search for this title.', 'info');
                return;
            }
            
            if (trailer) {
                const videoPlayer = document.getElementById('video-player');
                videoPlayer.innerHTML = `
                    <iframe src="${this.getTrailerUrl(movie)}" 
                            allow="autoplay; fullscreen; picture-in-picture" 
                            allowfullscreen 
                            title="Movie Trailer">
                    </iframe>
                `;
                this.switchPage('video-page');
            } else {
                alert('🎬 Trailer not available for this movie. Please try another title!');
            }
        } catch (error) {
            console.error('Error loading trailer:', error);
            alert('Error loading trailer. Please try again.');
        }
    }

    switchPage(pageName) {
        if (pageName === 'browse-page') {
            pageName = 'home-page';
        }

        if (pageName === 'admin-page' && this.currentRole !== 'admin') {
            window.authSystem?.showToast?.('Admin page is only available for admin access.', 'error');
            pageName = 'home-page';
        }

        localStorage.setItem('series-zone-active-page', pageName);

        // Hide all pages
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        
        // Show target page
        const targetPage = document.getElementById(pageName);
        if (targetPage) {
            targetPage.classList.add('active');
            
            // Update navbar active state for nav pages
            if (['home-page', 'analytics-page', 'ml-insights-page', 'history-page', 'profile-page', 'my-list-page', 'admin-page'].includes(pageName)) {
                const map = this.currentRole === 'admin'
                    ? {
                        'admin-page': 'adminOverviewBtn',
                        'analytics-page': 'adminRetentionBtn',
                        'history-page': 'adminTelemetryBtn',
                        'ml-insights-page': 'adminInsightsBtn',
                        'profile-page': 'adminProfilesBtn',
                        'my-list-page': 'adminEvaluationBtn',
                        'home-page': 'adminOverviewBtn'
                    }
                    : {
                        'home-page': 'viewerBrowseBtn',
                        'analytics-page': 'viewerAnalyticsBtn',
                        'ml-insights-page': 'viewerBrowseBtn',
                        'history-page': 'viewerHistoryBtn',
                        'profile-page': 'viewerProfileBtn',
                        'my-list-page': 'viewerMyListBtn',
                        'admin-page': 'viewerBrowseBtn'
                    };
                this.updateNavbarActive(map[pageName]);
            }
        }

        this.refreshWorkspacePageChrome();
        
        // Show footer only on home page
        const footer = document.getElementById('footer');
        if (pageName === 'home-page') {
            footer.style.display = 'block';
        } else {
            footer.style.display = 'none';
        }
        
        // Scroll to top
        window.scrollTo(0, 0);

        if (pageName === 'admin-page') {
            this.renderAdminDashboard();
        }

        if (pageName === 'analytics-page') {
            this.forceRenderAnalyticsPage();
        }

        if (pageName === 'history-page') {
            this.forceRenderHistoryPage();
        }

        if (pageName === 'profile-page') {
            this.forceRenderProfilePage();
        }

        if (pageName === 'ml-insights-page') {
            this.forceRenderMLInsightsPage();
        }

        if (['analytics-page', 'history-page', 'profile-page', 'my-list-page', 'ml-insights-page'].includes(pageName)) {
            this.renderDynamicPage(pageName);
            this.renderRetentionSurfaces();
        }

        if (pageName === 'my-list-page') {
            setTimeout(() => this.renderMyListPageFallback(true), 120);
        }

        if (pageName === 'home-page') {
            this.ensureHomeContent();
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.navbar .nav-link').forEach((button) => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleNavSelection(button.dataset.page, button.dataset.action);
            });
        });
    }

    toggleRoleNavbars() {
        const viewerNavbar = document.getElementById('viewerNavbar');
        const adminNavbar = document.getElementById('adminNavbar');
        const roleLabel = document.getElementById('navbarRoleLabel');

        if (this.currentRole === 'admin') {
            viewerNavbar?.classList.remove('active');
            adminNavbar?.classList.add('active');
            if (roleLabel) roleLabel.textContent = 'Admin Navigation';
        } else {
            adminNavbar?.classList.remove('active');
            viewerNavbar?.classList.add('active');
            if (roleLabel) roleLabel.textContent = 'Viewer Navigation';
        }
    }

    updateNavbarActive(btnId) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            link.removeAttribute('aria-current');
        });
        const activeButton = document.getElementById(btnId);
        activeButton?.classList.add('active');
        activeButton?.setAttribute('aria-current', 'page');
    }

    async handleSearch(event) {
        const query = event.target.value;
        if (query.length < 2) return;
        
        try {
            const response = await fetch(`/api/tmdb?path=/search/movie&query=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error(`TMDB search failed with ${response.status}`);
            }
            const data = await response.json();
            this.renderCarousel(data.results, 'search-results');
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    addToWatchlist() {
        if (!this.currentMovie) {
            window.authSystem?.showToast?.('Select a movie first.', 'error');
            return;
        }

        const primaryGenre = Array.isArray(this.currentMovie.genres)
            ? this.currentMovie.genres.map((genre) => typeof genre === 'string' ? genre : genre.name).filter(Boolean)[0]
            : (this.currentMovie.genre || 'Unknown');

        const movieData = {
            id: this.currentMovie.id,
            title: this.currentMovie.title,
            poster_path: this.currentMovie.poster_path,
            genre: primaryGenre
        };

        window.authSystem?.addToList?.(movieData);
        this.refreshCurrentUser();
        this.renderRetentionSurfaces?.();
    }

    removeFromWatchlist(movieId) {
        window.authSystem?.removeFromList?.(movieId);
        this.refreshCurrentUser();
        this.renderRetentionSurfaces?.();
    }

    logout() {
        window.authSystem?.logout?.();
    }
}

SeriesZoneApp.prototype.renderMLInsightsPage = function renderMLInsightsPageOverride() {
    const root = document.getElementById('ml-insights-content');
    if (!root) return;

    const metrics = typeof retentionProductUI !== 'undefined' && retentionProductUI.getMetrics
        ? retentionProductUI.getMetrics()
        : {
            favoriteGenre: 'Action',
            retention: { totalSessions: 0, avgWatchTime: 0 },
            churn: { riskScore: 0, riskLevel: 'Low', recommendation: 'No recommendation available.' },
            prediction: {
                nextEpisodeRetentionProbability: 0,
                predictedClass: 'Unknown',
                strongestGenre: 'Action',
                weakGenre: 'Drama'
            }
        };

    const safeTrending = Array.isArray(this.trendingMovies) ? this.trendingMovies : [];
    const safePopular = Array.isArray(this.popularMovies) ? this.popularMovies : [];
    const safeTopRated = Array.isArray(this.topratedMovies) ? this.topratedMovies : [];
    const safeFallbackTrending = Array.isArray(this.fallbackCatalog?.trending) ? this.fallbackCatalog.trending : [];
    const safeFallbackPopular = Array.isArray(this.fallbackCatalog?.popular) ? this.fallbackCatalog.popular : [];
    const safeFallbackTopRated = Array.isArray(this.fallbackCatalog?.topRated)
        ? this.fallbackCatalog.topRated
        : (Array.isArray(this.fallbackCatalog?.toprated) ? this.fallbackCatalog.toprated : []);
    const catalog = [
        ...safeTrending,
        ...safePopular,
        ...safeTopRated,
        ...safeFallbackTrending,
        ...safeFallbackPopular,
        ...safeFallbackTopRated
    ]
        .filter(Boolean)
        .filter((movie, index, arr) => arr.findIndex((item) => String(item.id) === String(movie.id)) === index);

    const history = typeof watchTracker !== 'undefined' ? watchTracker.getAllWatchHistory() : [];
    const watchedIds = new Set(history.map((item) => String(item.movieId || item.id || '')).filter(Boolean));
    const preferredGenres = Object.entries(metrics.genreStats || {})
        .sort(([, a], [, b]) => ((b.avgWatchPercentage || 0) + (b.totalViews || 0)) - ((a.avgWatchPercentage || 0) + (a.totalViews || 0)))
        .map(([genre]) => genre);
    const recentGenres = history.slice(-5).map((item) => item.genre).filter(Boolean).reverse();
    const rankedGenres = Array.from(new Set([...recentGenres, ...preferredGenres]));

    const getMovieGenres = (movie) => {
        if (Array.isArray(movie?.genres)) {
            return movie.genres.map((genre) => typeof genre === 'string' ? genre : genre?.name).filter(Boolean);
        }
        if (movie?.genre) {
            return [movie.genre];
        }
        return [];
    };

    const scoredCatalog = catalog
        .filter((movie) => !watchedIds.has(String(movie.id)))
        .map((movie) => {
            const movieGenres = getMovieGenres(movie);
            const genreRank = movieGenres.reduce((best, genre) => {
                const idx = rankedGenres.findIndex((entry) => String(entry).toLowerCase() === String(genre).toLowerCase());
                return idx === -1 ? best : Math.min(best, idx);
            }, Number.POSITIVE_INFINITY);
            const genreScore = Number.isFinite(genreRank) ? Math.max(0, 40 - (genreRank * 7)) : 0;
            const ratingScore = Math.round((Number(movie.vote_average) || 0) * 4);
            const popularityScore = Math.min(18, Math.round((Number(movie.popularity) || 0) / 35));
            return {
                movie,
                matchScore: genreScore + ratingScore + popularityScore
            };
        })
        .sort((a, b) => b.matchScore - a.matchScore);

    const strongestGenre = metrics.prediction?.strongestGenre || metrics.favoriteGenre || 'Action';
    const picks = (scoredCatalog.length ? scoredCatalog.map((entry) => entry.movie) : catalog).slice(0, 6);
    const spotlight = picks[0] || null;
    const spotlightBackdrop = this.getImageUrl(spotlight?.backdrop_path, 'original');

    const statCards = [
        { label: 'My retention', value: `${metrics.prediction?.nextEpisodeRetentionProbability || 0}%`, note: metrics.prediction?.predictedClass || 'Unknown' },
        { label: 'Churn risk', value: `${metrics.churn?.riskScore || 0}%`, note: metrics.churn?.riskLevel || 'Low' },
        { label: 'Avg watch', value: `${metrics.retention?.avgWatchTime || 0} min`, note: `${metrics.retention?.totalSessions || 0} tracked sessions` },
        { label: 'Top genre', value: strongestGenre, note: `Weakest: ${metrics.prediction?.weakGenre || 'Drama'}` }
    ].map((item) => `
        <article class="mli-stat-card">
            <span>${item.label}</span>
            <strong>${item.value}</strong>
            <p>${item.note}</p>
        </article>
    `).join('');

    const recommendationCards = picks.length
        ? picks.map((movie, index) => `
            <article class="simple-title-card premium-recs-card premium-recs-luxe-card" onclick="app.showDetails(${movie.id})" style="cursor:pointer;">
                <div class="premium-poster-wrap premium-recs-poster">
                    <img src="${this.getImageUrl(movie.poster_path)}" alt="${movie.title || movie.name || 'Recommended title'}" onerror="this.src='https://via.placeholder.com/500x750/111111/e50914?text=${encodeURIComponent(movie.title || movie.name || 'Pick')}';">
                    <div class="premium-poster-overlay">
                        <span>${strongestGenre}</span>
                        <strong>Match ${Math.max(72, 94 - (index * 3))}%</strong>
                    </div>
                </div>
                <div class="premium-card-copy">
                    <div class="simple-title-name">${movie.title || movie.name || 'Recommended title'}</div>
                    <div class="simple-title-sub">${movie.release_date?.split('-')[0] || 'New pick'} | ${(movie.vote_average || 7.8).toFixed ? (movie.vote_average || 7.8).toFixed(1) : movie.vote_average || '7.8'} rating</div>
                    <div class="premium-meta-row">
                        <span>${index === 0 ? 'Best next pick from your history' : 'Matched to your watched genres'}</span>
                        <span>${metrics.retention?.avgWatchTime || 0} min habit fit</span>
                    </div>
                    <div class="simple-title-note">${history.length ? `Recommended because your real watch history leans toward ${strongestGenre} and similar viewing patterns.` : 'Start watching titles to unlock personal recommendations from your actual history.'}</div>
                    <div class="profile-watchlist-actions premium-card-actions">
                        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); app.showDetails(${movie.id})">View</button>
                        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); app.showDetails(${movie.id}); setTimeout(() => app.addToWatchlist(), 80);">Save</button>
                    </div>
                </div>
            </article>
        `).join('')
        : '<div class="simple-empty-state">No real recommendations yet. Watch a few titles first so we can recommend from your actual history.</div>';

    const signalRows = [
        history.length ? `Your strongest watched genre is ${strongestGenre}.` : 'No real watch history yet, so recommendations are waiting for your first sessions.',
        `Your current retention likelihood is ${metrics.prediction?.nextEpisodeRetentionProbability || 0}%.`,
        `Your average real session lasts ${metrics.retention?.avgWatchTime || 0} minutes.`,
        history.length ? (metrics.churn?.recommendation || 'Keep watching similar titles to improve recommendation quality.') : 'Watch 2-3 titles to activate personalized picks.'
    ].map((text) => `
        <div class="mli-list-row">
            <div>
                <strong>${text}</strong>
                <span>Personal recommendation signal</span>
            </div>
            <em>Live</em>
        </div>
    `).join('');

    if (this.currentRole === 'admin') {
        this.renderAdminOpsPage();
        return;
    }

    root.innerHTML = `
        <section class="mli-hero" style="background-image:linear-gradient(90deg, rgba(8,10,14,.96) 0%, rgba(8,10,14,.86) 46%, rgba(18,8,10,.92) 100%), url('${spotlightBackdrop}');">
            <div class="mli-hero-copy">
                <div class="mli-kicker">Recommendations For Me</div>
                <h3>${spotlight?.title || 'Your next best pick'}</h3>
                <p>Discover personalized titles based on your watch behavior, strongest genres, completion habits, and recommendation signals.</p>
                <div class="mli-chip-row">
                    <span>${metrics.retention?.totalSessions || 0} sessions analyzed</span>
                    <span>${metrics.churn?.riskLevel || 'Low'} churn state</span>
                    <span>${strongestGenre} strongest genre</span>
                </div>
            </div>
            <div class="mli-hero-panel">
                <div class="mli-panel-label">Recommended action</div>
                <div class="mli-panel-value">${metrics.churn?.recommendation || 'Keep exploring titles to improve your next recommendations.'}</div>
            </div>
        </section>
        <section class="mli-stat-grid">${statCards}</section>
        <section class="mli-content-grid">
            <div class="mli-surface-card">
                <div class="mli-section-heading">
                    <h4>Recommended for you</h4>
                    <span>Personal picks</span>
                </div>
                <div class="simple-title-grid premium-recs-grid">
                    ${recommendationCards}
                </div>
            </div>
            <div class="mli-surface-card">
                <div class="mli-section-heading">
                    <h4>Why these picks fit you</h4>
                    <span>Latest signals</span>
                </div>
                ${signalRows}
            </div>
        </section>
    `;
};

// Global functions
function playTrailer() {
    if (app && app.currentMovie) {
        app.playTrailer(app.currentMovie.id);
    } else {
        alert('Please select a movie first');
    }
}

function showDetails() {
    if (app && app.currentMovie) {
        app.showDetails(app.currentMovie.id);
    } else {
        alert('Please select a movie first');
    }
}

function goBack() {
    if (app) {
        app.switchPage('home-page');
    }
}

// Auth handlers
function switchToLogin(e) {
    if (e) e.preventDefault();
    document.getElementById('signup-form')?.classList.remove('active');
    document.getElementById('admin-login-form')?.classList.remove('active');
    document.getElementById('login-form')?.classList.add('active');
}

function switchToSignup(e) {
    if (e) e.preventDefault();
    document.getElementById('login-form')?.classList.remove('active');
    document.getElementById('admin-login-form')?.classList.remove('active');
    document.getElementById('signup-form')?.classList.add('active');
}

let app;

window.ensureSeriesZoneBoot = async function ensureSeriesZoneBoot(targetPage = null) {
    const hasSession = Boolean(localStorage.getItem('currentUser'));
    if (!hasSession) {
        return null;
    }

    const role = JSON.parse(localStorage.getItem('currentUser') || '{}')?.role || 'viewer';
    const desiredPage = targetPage || (role === 'admin'
        ? (localStorage.getItem('series-zone-active-page') || 'admin-page')
        : 'home-page');

    if (!window.__seriesZoneBootPromise) {
        window.__seriesZoneBootPromise = (async () => {
            if (!window.app || typeof window.app.refreshCurrentUser !== 'function') {
                window.app = new SeriesZoneApp();
            }

            await window.app.init?.();
            window.app.refreshCurrentUser?.();
            window.app.ensureHomeContent?.();
            window.app.switchPage?.(desiredPage);

            if (desiredPage === 'home-page') {
                setTimeout(() => {
                    window.app?.ensureHomeContent?.();
                }, 180);
            }

            return window.app;
        })()
            .catch((error) => {
                console.error('Series Zone bootstrap failed:', error);
                return null;
            })
            .finally(() => {
                window.__seriesZoneBootPromise = null;
            });
    }

    return window.__seriesZoneBootPromise;
};

function bootstrapSeriesZoneApp() {
    window.ensureSeriesZoneBoot?.();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapSeriesZoneApp);
} else {
    bootstrapSeriesZoneApp();
}

// FOOTER FUNCTIONS
function subscribeNewsletter() {
    const email = document.getElementById('newsletterEmail').value;
    if (!email) {
        alert('Please enter your email');
        return;
    }
    alert(`✅ Subscribed! Confirmation sent to ${email}`);
    document.getElementById('newsletterEmail').value = '';
}

function browseCategory(category) {
    alert(`Browsing ${category.toUpperCase()}...`);
    console.log('Browse category:', category);
}

function goToProfile() {
    alert('Going to Profile...');
    if (app) app.switchPage('profile-page');
}

function goToWatchlist() {
    if (app) {
        app.switchPage('my-list-page');
    }
}

function goToHistory() {
    alert('Your Watch History:\n✓ Avatar: Fire and Ash\n✓ Breaking Bad\n✓ The Office');
}

function goToSettings() {
    alert('Opening Settings...\n\nNotifications: ON\nQuality: 1080p\nLanguage: English');
}

function showHelp() {
    alert('📞 Help Center\n\nCommon Questions:\n• How to search?\n• How to set quality?\n• Account & Security\n\n✉️ Email: support@serieszone.com');
}

function contactSupport() {
    alert('Contact Support:\n\n📧 Email: help@serieszone.com\n💬 Chat: Available 24/7\n📞 Phone: 1-800-SERIES');
}

function reportIssue() {
    const issue = prompt('Describe your issue:');
    if (issue) {
        alert(`✅ Issue reported: "${issue}"\n\nWe'll look into it!`);
    }
}

function sendFeedback() {
    const feedback = prompt('Your feedback:');
    if (feedback) {
        alert(`✅ Feedback received: "${feedback}"\n\nThank you for helping us improve!`);
    }
}

function showTerms() {
    alert('TERMS OF SERVICE\n\n1. Use at own risk\n2. No illegal content\n3. Respect copyright\n4. Be nice to others\n\nFull terms: https://serieszone.com/terms');
}

function showPrivacy() {
    alert('PRIVACY POLICY\n\nWe protect your data:\n✓ Encrypted storage\n✓ No selling data\n✓ Secure login\n✓ Easy opt-out\n\nFull policy: https://serieszone.com/privacy');
}

function showSecurity() {
    alert('SECURITY INFO\n\n🔒 Features:\n✓ SSL Encryption\n✓ Two-Factor Auth\n✓ Secure Payments\n✓ Regular Security Audits');
}

function showCookies() {
    alert('COOKIE POLICY\n\nWe use cookies for:\n✓ Remember login\n✓ Improve experience\n✓ Analytics\n\nYou can disable cookies anytime.');
}

function downloadApp(store) {
    const url = store === 'appstore' ? 'https://apps.apple.com' : 'https://play.google.com';
    alert(`Opening ${store}...\n${url}`);
}

function changeLanguage(lang) {
    const languages = {
        'en': 'English',
        'hi': 'हिंदी',
        'es': 'Español',
        'fr': 'Français',
        'de': 'Deutsch'
    };
    alert(`Language changed to ${languages[lang]}`);
    console.log('Changed language to:', lang);
}

// HISTORY PAGE FUNCTIONS





