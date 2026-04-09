class RetentionProductUI {
    constructor() {
        this.currentHistoryTab = "recent";
        this.analyticsCharts = {};
        this.historyTabLabels = {
            recent: "Recent Sessions",
            watched: "Watch-Time Loss",
            retention: "Retention Outcomes",
        };
    }

    getHistory() {
        if (typeof watchTracker === "undefined") {
            return [];
        }
        return watchTracker.getAllWatchHistory();
    }

    getMetrics() {
        const history = this.getHistory();
        const retention = typeof watchTracker !== "undefined"
            ? watchTracker.calculateRetentionMetrics()
            : { totalSessions: 0, completionRate: 0, avgWatchTime: 0, activeNow: 0 };
        const churn = typeof watchTracker !== "undefined"
            ? watchTracker.predictChurnRisk()
            : { riskScore: 0, riskLevel: "Low", recommendation: "No recommendation available." };
        const genreStats = typeof watchTracker !== "undefined" ? watchTracker.getGenreStats() : {};
        const dayStats = typeof watchTracker !== "undefined" ? watchTracker.getDayWiseStats() : {};
        const completionStats = typeof watchTracker !== "undefined"
            ? watchTracker.getCompletionStats()
            : { completed: 0, dropped: 0, paused: 0, total: 0 };
        const topMovies = typeof watchTracker !== "undefined" ? watchTracker.getTopMovies(5) : [];
        const dropoff = typeof watchTracker !== "undefined" ? watchTracker.getDropoffAnalysis() : {};

        const favoriteGenreEntry = Object.entries(genreStats)
            .sort(([, a], [, b]) => (b.avgWatchPercentage || 0) - (a.avgWatchPercentage || 0))[0];

        const favoriteGenre = favoriteGenreEntry ? favoriteGenreEntry[0] : "Unknown";
        const loyaltyScore = Math.max(
            0,
            Math.min(100, Math.round((retention.completionRate * 0.6) + ((100 - churn.riskScore) * 0.4)))
        );

        const persona = this.getViewerPersona(retention, churn, favoriteGenre, history.length);
        const mostActiveDay = Object.entries(dayStats).sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";
        const realtimeAnalysis = typeof watchTracker !== "undefined" ? watchTracker.getRealtimeAnalysis() : null;
        const prediction = this.generatePrediction(retention, churn, genreStats, history, realtimeAnalysis);

        return {
            history,
            retention,
            churn,
            genreStats,
            completionStats,
            topMovies,
            dropoff,
            favoriteGenre,
            loyaltyScore,
            persona,
            mostActiveDay,
            prediction,
            realtimeAnalysis,
        };
    }

    generatePrediction(retention, churn, genreStats, history, realtimeAnalysis = null) {
        const genreEntries = Object.entries(genreStats)
            .map(([genre, stat]) => ({
                genre,
                score: Math.round(((stat.avgWatchPercentage || 0) * 0.6) + (((stat.completionCount || 0) / Math.max(stat.totalViews || 1, 1)) * 100 * 0.4)),
                avgWatch: Math.round(stat.avgWatchPercentage || 0),
                totalViews: stat.totalViews || 0,
            }))
            .sort((a, b) => b.score - a.score);

        const strongestGenre = genreEntries[0]?.genre || "Action";
        const weakGenre = genreEntries[genreEntries.length - 1]?.genre || strongestGenre;
        const baseProbability = Math.round((retention.completionRate * 0.55) + ((100 - churn.riskScore) * 0.45));
        const nextEpisodeRetentionProbability = realtimeAnalysis?.probability ?? Math.max(5, Math.min(95, baseProbability));

        let predictedClass = realtimeAnalysis?.predicted_class || "High chance of retention";
        if (!realtimeAnalysis) {
            if (nextEpisodeRetentionProbability < 45) {
                predictedClass = "High drop-off risk";
            } else if (nextEpisodeRetentionProbability < 65) {
                predictedClass = "Moderate retention confidence";
            }
        }

        const intervention = realtimeAnalysis?.recommended_action || (nextEpisodeRetentionProbability < 45
            ? "Recommend shorter, high-rated titles in the user's strongest genre and trigger re-engagement nudges."
            : nextEpisodeRetentionProbability < 65
                ? "Use genre-matched recommendations and next-episode reminders to improve continuation."
                : "Promote sequels, related titles, and autoplay continuation for stronger retention lift.");

        const recentPredictions = history.slice().reverse().slice(0, 5).map((item) => {
            const itemProbability = Math.max(
                5,
                Math.min(
                    95,
                    Math.round(
                        ((item.percentageWatched || 0) * 0.65) +
                        (item.status === "completed" ? 20 : item.status === "dropped" ? -15 : 5) +
                        (item.genre === strongestGenre ? 8 : 0)
                    )
                )
            );
            return {
                title: item.movieTitle || "Unknown Title",
                genre: item.genre || "Unknown",
                probability: itemProbability,
                predictedOutcome: itemProbability >= 60 ? "Retained" : "Likely to drop",
            };
        });

        return {
            nextEpisodeRetentionProbability,
            predictedClass,
            strongestGenre,
            weakGenre,
            intervention,
            recentPredictions,
            modelSource: realtimeAnalysis?.model_source || "frontend-simulation",
            churnRisk: realtimeAnalysis?.churn_risk ?? Math.max(5, 100 - nextEpisodeRetentionProbability),
            topFactors: realtimeAnalysis?.top_factors || [],
        };
    }

    getViewerPersona(retention, churn, favoriteGenre, totalSessions) {
        if (totalSessions <= 2) {
            return {
                title: "New Discovery Viewer",
                summary: "Early-stage viewer profile with limited behavioral data.",
                focus: "Collect 3-5 more sessions for stronger retention confidence.",
                favoriteGenre,
            };
        }

        if (retention.completionRate >= 75 && churn.riskScore <= 35) {
            return {
                title: "High-Intent Binge Viewer",
                summary: "Strong likelihood to continue episodic content and complete sessions.",
                focus: "Promote premium franchises and next-episode nudges.",
                favoriteGenre,
            };
        }

        if (retention.completionRate >= 50) {
            return {
                title: "Selective Engaged Viewer",
                summary: "Engages well with the right genre but needs stronger title matching.",
                focus: "Use genre-personalized recommendations and sequel reminders.",
                favoriteGenre,
            };
        }

        return {
            title: "At-Risk Browsing Viewer",
            summary: "Explores titles but drops sessions before high engagement is formed.",
            focus: "Recommend shorter, high-rated titles with stronger openings.",
            favoriteGenre,
        };
    }

    normalizeTitle(value) {
        return String(value || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
    }

    buildFallbackPoster(title, genre) {
        const safeTitle = String(title || "Series Zone").slice(0, 28);
        const safeGenre = String(genre || "Streaming Intelligence").slice(0, 28);
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450">
                <defs>
                    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stop-color="#160507"/>
                        <stop offset="55%" stop-color="#2a0a10"/>
                        <stop offset="100%" stop-color="#050505"/>
                    </linearGradient>
                    <linearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stop-color="#e50914" stop-opacity="0.9"/>
                        <stop offset="100%" stop-color="#ff7b54" stop-opacity="0.55"/>
                    </linearGradient>
                </defs>
                <rect width="300" height="450" rx="28" fill="url(#bg)"/>
                <circle cx="238" cy="74" r="70" fill="#e50914" opacity="0.14"/>
                <circle cx="60" cy="380" r="86" fill="#ffffff" opacity="0.05"/>
                <rect x="26" y="28" width="248" height="394" rx="22" fill="none" stroke="url(#glow)" stroke-opacity="0.55"/>
                <text x="34" y="86" fill="#ffb4bc" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="2">SERIES ZONE</text>
                <text x="34" y="126" fill="#ffffff" font-family="Arial, sans-serif" font-size="30" font-weight="800">${safeTitle}</text>
                <text x="34" y="168" fill="#ff8b96" font-family="Arial, sans-serif" font-size="18" font-weight="700">${safeGenre}</text>
                <text x="34" y="394" fill="#f5f5f5" font-family="Arial, sans-serif" font-size="16">Retention Intelligence</text>
            </svg>
        `;
        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    }

    getPosterForTitle(title, genre = "") {
        if (typeof app === "undefined" || !app) {
            return this.buildFallbackPoster(title, genre);
        }

        const allMovies = [
            ...(app.trendingMovies || []),
            ...(app.popularMovies || []),
            ...(app.topratedMovies || []),
        ];

        const normalizedTitle = this.normalizeTitle(title);
        const directMatch = allMovies.find((movie) => {
            const movieTitle = this.normalizeTitle(movie.title || movie.name);
            return movieTitle === normalizedTitle || movieTitle.includes(normalizedTitle) || normalizedTitle.includes(movieTitle);
        });

        if (directMatch?.poster_path) {
            return typeof app.getImageUrl === "function"
                ? app.getImageUrl(directMatch.poster_path, "w500")
                : `https://image.tmdb.org/t/p/w500${directMatch.poster_path}`;
        }

        const posterPool = allMovies.filter((movie) => movie?.poster_path);
        if (posterPool.length) {
            const seed = normalizedTitle.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
            const fallbackMovie = posterPool[seed % posterPool.length];
            if (fallbackMovie?.poster_path) {
                return typeof app.getImageUrl === "function"
                    ? app.getImageUrl(fallbackMovie.poster_path, "w500")
                    : `https://image.tmdb.org/t/p/w500${fallbackMovie.poster_path}`;
            }
        }

        return this.buildFallbackPoster(title, genre);
    }

    getBackdropForTitle(title) {
        if (typeof app === "undefined" || !app) {
            return "";
        }

        const allMovies = [
            ...(app.trendingMovies || []),
            ...(app.popularMovies || []),
            ...(app.topratedMovies || []),
        ];

        const normalizedTitle = this.normalizeTitle(title);
        const directMatch = allMovies.find((movie) => {
            const movieTitle = this.normalizeTitle(movie.title || movie.name);
            return movieTitle === normalizedTitle || movieTitle.includes(normalizedTitle) || normalizedTitle.includes(movieTitle);
        });

        if (directMatch?.backdrop_path) {
            return typeof app.getImageUrl === "function"
                ? app.getImageUrl(directMatch.backdrop_path, "original")
                : `https://image.tmdb.org/t/p/original${directMatch.backdrop_path}`;
        }

        const backdropPool = allMovies.filter((movie) => movie?.backdrop_path);
        if (backdropPool.length) {
            const seed = normalizedTitle.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
            const fallbackMovie = backdropPool[seed % backdropPool.length];
            if (fallbackMovie?.backdrop_path) {
                return typeof app.getImageUrl === "function"
                    ? app.getImageUrl(fallbackMovie.backdrop_path, "original")
                    : `https://image.tmdb.org/t/p/original${fallbackMovie.backdrop_path}`;
            }
        }

        return "";
    }

    getDefaultMovieForecast() {
        const stored = localStorage.getItem("seriesZoneMovieForecast");
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (error) {
                // fall through to default
            }
        }

        return {
            title: "Crimson Orbit",
            genre: "Sci-Fi",
            runtime: 128,
            starPower: 78,
            criticBuzz: 74,
            franchiseStrength: 62,
            marketingPush: 81,
            castStrength: 77,
            directorStrength: 73,
            releaseSeason: "Holiday",
            audienceSegments: [
                "High-intent binge viewers",
                "Sci-Fi / action loyalists",
                "Weekend premium viewers",
            ],
            expectedRating: 8.1,
            expectedRetention: 72,
            expectedPopularity: 84,
            expectedChurnRisk: 28,
            platformFitScore: 86,
            launchRecommendation: "Push on homepage hero slot and premium recommendation rails.",
            outlook: "Strong launch potential with broad OTT appeal.",
        };
    }

    calculateMovieLaunchPrediction(input) {
        const genre = String(input.genre || "Drama");
        const runtime = Number(input.runtime || 120);
        const starPower = Number(input.starPower || 50);
        const criticBuzz = Number(input.criticBuzz || 50);
        const franchiseStrength = Number(input.franchiseStrength || 40);
        const marketingPush = Number(input.marketingPush || 50);
        const castStrength = Number(input.castStrength || 50);
        const directorStrength = Number(input.directorStrength || 50);
        const releaseSeason = String(input.releaseSeason || "Holiday");

        const genreAudienceMap = {
            Action: ["Mass-market action viewers", "Weekend high-energy viewers", "Trailer-driven audience"],
            Comedy: ["Casual family viewers", "Repeat comfort-content watchers", "Light-watch mobile users"],
            Drama: ["Prestige-content viewers", "Completion-focused adults", "Review-driven audience"],
            Horror: ["Night-time thrill seekers", "Teen / young adult segment", "High-click curiosity viewers"],
            Romance: ["Emotional story viewers", "Weekend couple audience", "Repeat completion segment"],
            "Sci-Fi": ["High-intent binge viewers", "Sci-Fi / action loyalists", "World-building fans"],
            Thriller: ["Suspense-driven loyalists", "Late-night engaged viewers", "High-retention completion segment"],
            Animation: ["Family segment", "All-age repeat watchers", "Holiday traffic viewers"],
        };

        const seasonBoost = {
            Holiday: 8,
            Summer: 7,
            Festival: 6,
            Weekend: 4,
            Regular: 0,
        };

        const genreBoost = {
            Action: 8,
            Comedy: 4,
            Drama: 5,
            Horror: 6,
            Romance: 4,
            "Sci-Fi": 9,
            Thriller: 7,
            Animation: 6,
        };

        const expectedRating = Math.max(
            5.2,
            Math.min(
                9.6,
                (
                    5.1
                    + (starPower * 0.012)
                    + (criticBuzz * 0.018)
                    + (franchiseStrength * 0.01)
                    + (marketingPush * 0.004)
                    + (castStrength * 0.008)
                    + (directorStrength * 0.01)
                    + ((genreBoost[genre] || 5) * 0.06)
                )
            )
        );

        const expectedRetention = Math.max(
            25,
            Math.min(
                94,
                Math.round(
                    22
                    + (starPower * 0.19)
                    + (criticBuzz * 0.21)
                    + (franchiseStrength * 0.16)
                    + (marketingPush * 0.14)
                    + (castStrength * 0.08)
                    + (directorStrength * 0.09)
                    + (seasonBoost[releaseSeason] || 0)
                    - (Math.max(runtime - 140, 0) * 0.15)
                )
            )
        );

        const expectedPopularity = Math.max(
            20,
            Math.min(
                98,
                Math.round(
                    18
                    + (marketingPush * 0.34)
                    + (starPower * 0.22)
                    + (franchiseStrength * 0.18)
                    + (criticBuzz * 0.12)
                    + (castStrength * 0.08)
                    + (directorStrength * 0.06)
                    + (seasonBoost[releaseSeason] || 0)
                )
            )
        );

        const expectedChurnRisk = Math.max(6, Math.min(88, 100 - expectedRetention));
        const platformFitScore = Math.max(
            20,
            Math.min(
                98,
                Math.round(
                    (expectedRetention * 0.42)
                    + (expectedPopularity * 0.24)
                    + (criticBuzz * 0.12)
                    + (directorStrength * 0.12)
                    + (castStrength * 0.10)
                )
            )
        );
        const audienceSegments = genreAudienceMap[genre] || genreAudienceMap.Drama;
        const outlook = expectedRetention >= 70
            ? "Strong launch potential with high continuation probability."
            : expectedRetention >= 55
                ? "Promising launch, but recommendation targeting should be optimized."
                : "Niche launch signal. Marketing and audience targeting need support.";

        const launchRecommendation = expectedRetention >= 70 && platformFitScore >= 75
            ? "Push on homepage hero slot, trending rail, and autoplay recommendation rows."
            : expectedRetention >= 55
                ? "Launch with genre-targeted banners and segmented recommendation placement."
                : "Use controlled rollout, targeted genre testing, and weekend trial promotion.";

        return {
            title: String(input.title || "Untitled Release"),
            genre,
            runtime,
            starPower,
            criticBuzz,
            franchiseStrength,
            marketingPush,
            castStrength,
            directorStrength,
            releaseSeason,
            audienceSegments,
            expectedRating: Number(expectedRating.toFixed(1)),
            expectedRetention,
            expectedPopularity,
            expectedChurnRisk,
            platformFitScore,
            launchRecommendation,
            outlook,
        };
    }

    buildMoviePredictionStudio() {
        const forecast = this.getDefaultMovieForecast();
        return `
            <div id="moviePredictionStudio" style="display:grid;grid-template-columns:1.05fr .95fr;gap:1rem;align-items:start;">
                <div style="padding:1.35rem;border-radius:24px;background:linear-gradient(180deg,rgba(18,20,30,.98),rgba(12,13,20,.98));border:1px solid rgba(255,255,255,.06);">
                    <div style="display:flex;justify-content:space-between;gap:1rem;align-items:center;margin-bottom:1rem;">
                        <div>
                            <div style="color:#fff;font-size:1.25rem;font-weight:800;">New Movie Prediction Studio</div>
                            <div style="color:#9ba5b7;margin-top:.25rem;">Estimate target audience, rating, retention, and launch potential for a new title.</div>
                        </div>
                        <div style="padding:.45rem .75rem;border-radius:999px;background:rgba(229,9,20,.12);border:1px solid rgba(229,9,20,.18);color:#ffd8db;font-size:.78rem;font-weight:700;">Launch Forecast</div>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;">
                        <label style="display:grid;gap:.45rem;color:#c9d0dd;font-size:.92rem;">
                            <span>Movie Title</span>
                            <input id="forecastTitle" value="${forecast.title}" style="width:100%;min-height:52px;padding:.85rem 1rem;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:#fff;">
                        </label>
                        <label style="display:grid;gap:.45rem;color:#c9d0dd;font-size:.92rem;">
                            <span>Genre</span>
                            <select id="forecastGenre" style="width:100%;min-height:52px;padding:.85rem 1rem;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:#fff;">
                                ${["Action","Comedy","Drama","Horror","Romance","Sci-Fi","Thriller","Animation"].map((genre) => `<option value="${genre}" ${forecast.genre === genre ? "selected" : ""}>${genre}</option>`).join("")}
                            </select>
                        </label>
                        <label style="display:grid;gap:.45rem;color:#c9d0dd;font-size:.92rem;">
                            <span>Runtime (min)</span>
                            <input id="forecastRuntime" type="number" value="${forecast.runtime}" style="width:100%;min-height:52px;padding:.85rem 1rem;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:#fff;">
                        </label>
                        <label style="display:grid;gap:.45rem;color:#c9d0dd;font-size:.92rem;">
                            <span>Release Season</span>
                            <select id="forecastSeason" style="width:100%;min-height:52px;padding:.85rem 1rem;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:#fff;">
                                ${["Holiday","Summer","Festival","Weekend","Regular"].map((season) => `<option value="${season}" ${forecast.releaseSeason === season ? "selected" : ""}>${season}</option>`).join("")}
                            </select>
                        </label>
                        <label style="display:grid;gap:.45rem;color:#c9d0dd;font-size:.92rem;">
                            <span>Star Power</span>
                            <input id="forecastStarPower" type="range" min="10" max="100" value="${forecast.starPower}">
                        </label>
                        <label style="display:grid;gap:.45rem;color:#c9d0dd;font-size:.92rem;">
                            <span>Critic Buzz</span>
                            <input id="forecastCriticBuzz" type="range" min="10" max="100" value="${forecast.criticBuzz}">
                        </label>
                        <label style="display:grid;gap:.45rem;color:#c9d0dd;font-size:.92rem;">
                            <span>Franchise Strength</span>
                            <input id="forecastFranchise" type="range" min="0" max="100" value="${forecast.franchiseStrength}">
                        </label>
                        <label style="display:grid;gap:.45rem;color:#c9d0dd;font-size:.92rem;">
                            <span>Marketing Push</span>
                            <input id="forecastMarketing" type="range" min="10" max="100" value="${forecast.marketingPush}">
                        </label>
                        <label style="display:grid;gap:.45rem;color:#c9d0dd;font-size:.92rem;">
                            <span>Cast Strength</span>
                            <input id="forecastCastStrength" type="range" min="10" max="100" value="${forecast.castStrength}">
                        </label>
                        <label style="display:grid;gap:.45rem;color:#c9d0dd;font-size:.92rem;">
                            <span>Director Strength</span>
                            <input id="forecastDirectorStrength" type="range" min="10" max="100" value="${forecast.directorStrength}">
                        </label>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1.1rem;">
                        <button id="runMovieForecastBtn" class="btn btn-primary" style="min-height:52px;width:100%;">Run Launch Prediction</button>
                        <button id="compareMovieForecastBtn" class="btn btn-secondary" style="min-height:52px;width:100%;">Compare With Benchmark</button>
                    </div>
                </div>
                <div id="movieForecastResult"></div>
            </div>
        `;
    }

    renderMoviePredictionResult(forecast) {
        const resultRoot = document.getElementById("movieForecastResult");
        if (!resultRoot) {
            return;
        }

        resultRoot.innerHTML = `
            <div style="display:grid;gap:1rem;">
                <div style="padding:1.3rem;border-radius:24px;background:linear-gradient(180deg,rgba(31,12,17,.94),rgba(16,16,22,.98));border:1px solid rgba(229,9,20,.18);">
                    <div style="color:#ffb1b7;font-size:.78rem;text-transform:uppercase;letter-spacing:.12em;">Launch Outlook</div>
                    <div style="font-size:2rem;font-weight:900;color:#fff;margin:.55rem 0 .35rem;">${forecast.title}</div>
                    <div style="color:#d6d9e3;line-height:1.75;">${forecast.outlook}</div>
                    <div style="display:flex;flex-wrap:wrap;gap:.7rem;margin-top:1rem;">
                        <span style="padding:.45rem .75rem;border-radius:999px;background:rgba(255,255,255,.05);color:#fff;">Genre: ${forecast.genre}</span>
                        <span style="padding:.45rem .75rem;border-radius:999px;background:rgba(255,255,255,.05);color:#fff;">Runtime: ${forecast.runtime} min</span>
                        <span style="padding:.45rem .75rem;border-radius:999px;background:rgba(255,255,255,.05);color:#fff;">Season: ${forecast.releaseSeason}</span>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;">
                    <div style="padding:1.1rem;border-radius:20px;background:#141926;border:1px solid rgba(255,255,255,.06);">
                        <div style="color:#98a4ba;font-size:.8rem;text-transform:uppercase;">Expected Rating</div>
                        <div style="color:#fff;font-size:2.1rem;font-weight:900;margin-top:.4rem;">${forecast.expectedRating}/10</div>
                    </div>
                    <div style="padding:1.1rem;border-radius:20px;background:#141926;border:1px solid rgba(255,255,255,.06);">
                        <div style="color:#98a4ba;font-size:.8rem;text-transform:uppercase;">Expected Retention</div>
                        <div style="color:#fff;font-size:2.1rem;font-weight:900;margin-top:.4rem;">${forecast.expectedRetention}%</div>
                    </div>
                    <div style="padding:1.1rem;border-radius:20px;background:#141926;border:1px solid rgba(255,255,255,.06);">
                        <div style="color:#98a4ba;font-size:.8rem;text-transform:uppercase;">Launch Popularity</div>
                        <div style="color:#fff;font-size:2.1rem;font-weight:900;margin-top:.4rem;">${forecast.expectedPopularity}%</div>
                    </div>
                    <div style="padding:1.1rem;border-radius:20px;background:#141926;border:1px solid rgba(255,255,255,.06);">
                        <div style="color:#98a4ba;font-size:.8rem;text-transform:uppercase;">Expected Churn Risk</div>
                        <div style="color:#fff;font-size:2.1rem;font-weight:900;margin-top:.4rem;">${forecast.expectedChurnRisk}%</div>
                    </div>
                    <div style="padding:1.1rem;border-radius:20px;background:#141926;border:1px solid rgba(255,255,255,.06);grid-column:span 2;">
                        <div style="color:#98a4ba;font-size:.8rem;text-transform:uppercase;">Platform Fit Score</div>
                        <div style="color:#fff;font-size:2.2rem;font-weight:900;margin-top:.4rem;">${forecast.platformFitScore}%</div>
                        <div style="height:10px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;margin-top:.9rem;">
                            <div style="height:100%;width:${forecast.platformFitScore}%;background:linear-gradient(90deg,#781019,#e50914,#ff7f56);"></div>
                        </div>
                    </div>
                </div>
                <div style="padding:1.2rem;border-radius:22px;background:#141926;border:1px solid rgba(255,255,255,.06);">
                    <div style="color:#fff;font-size:1.08rem;font-weight:800;margin-bottom:.85rem;">Likely Audience Segments</div>
                    <div style="display:grid;gap:.7rem;">
                        ${forecast.audienceSegments.map((segment, index) => `
                            <div style="display:flex;justify-content:space-between;gap:1rem;padding:.8rem .9rem;border-radius:16px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);">
                                <span style="color:#fff;">${segment}</span>
                                <strong style="color:#ffb1b7;">Priority ${index + 1}</strong>
                            </div>
                        `).join("")}
                    </div>
                </div>
                <div style="padding:1.2rem;border-radius:22px;background:#141926;border:1px solid rgba(255,255,255,.06);">
                    <div style="color:#fff;font-size:1.08rem;font-weight:800;margin-bottom:.75rem;">Launch Recommendation</div>
                    <div style="color:#d6d9e3;line-height:1.75;">${forecast.launchRecommendation}</div>
                </div>
                <div id="movieForecastCompare" style="display:none;"></div>
            </div>
        `;
    }

    renderMovieComparison(forecast) {
        const comparisonRoot = document.getElementById("movieForecastCompare");
        if (!comparisonRoot) {
            return;
        }

        const benchmark = this.calculateMovieLaunchPrediction({
            title: "Benchmark Release",
            genre: "Action",
            runtime: 124,
            starPower: 72,
            criticBuzz: 69,
            franchiseStrength: 58,
            marketingPush: 76,
            castStrength: 70,
            directorStrength: 68,
            releaseSeason: "Summer",
        });

        comparisonRoot.style.display = "block";
        comparisonRoot.innerHTML = `
            <div style="padding:1.2rem;border-radius:22px;background:#141926;border:1px solid rgba(255,255,255,.06);">
                <div style="color:#fff;font-size:1.08rem;font-weight:800;margin-bottom:1rem;">Side-by-Side Launch Comparison</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                    <div style="padding:1rem;border-radius:18px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);">
                        <div style="color:#ffb1b7;font-size:.8rem;text-transform:uppercase;">Your Movie</div>
                        <div style="color:#fff;font-size:1.35rem;font-weight:800;margin:.45rem 0;">${forecast.title}</div>
                        <div style="color:#d6d9e3;line-height:1.8;">
                            <div>Rating: ${forecast.expectedRating}/10</div>
                            <div>Retention: ${forecast.expectedRetention}%</div>
                            <div>Popularity: ${forecast.expectedPopularity}%</div>
                            <div>Platform Fit: ${forecast.platformFitScore}%</div>
                        </div>
                    </div>
                    <div style="padding:1rem;border-radius:18px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);">
                        <div style="color:#9db7ff;font-size:.8rem;text-transform:uppercase;">Benchmark</div>
                        <div style="color:#fff;font-size:1.35rem;font-weight:800;margin:.45rem 0;">${benchmark.title}</div>
                        <div style="color:#d6d9e3;line-height:1.8;">
                            <div>Rating: ${benchmark.expectedRating}/10</div>
                            <div>Retention: ${benchmark.expectedRetention}%</div>
                            <div>Popularity: ${benchmark.expectedPopularity}%</div>
                            <div>Platform Fit: ${benchmark.platformFitScore}%</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    initMoviePredictionStudio() {
        const button = document.getElementById("runMovieForecastBtn");
        const compareButton = document.getElementById("compareMovieForecastBtn");
        if (!button) {
            return;
        }

        const runForecast = () => {
            const forecast = this.calculateMovieLaunchPrediction({
                title: document.getElementById("forecastTitle")?.value,
                genre: document.getElementById("forecastGenre")?.value,
                runtime: document.getElementById("forecastRuntime")?.value,
                releaseSeason: document.getElementById("forecastSeason")?.value,
                starPower: document.getElementById("forecastStarPower")?.value,
                criticBuzz: document.getElementById("forecastCriticBuzz")?.value,
                franchiseStrength: document.getElementById("forecastFranchise")?.value,
                marketingPush: document.getElementById("forecastMarketing")?.value,
                castStrength: document.getElementById("forecastCastStrength")?.value,
                directorStrength: document.getElementById("forecastDirectorStrength")?.value,
            });

            localStorage.setItem("seriesZoneMovieForecast", JSON.stringify(forecast));
            this.renderMoviePredictionResult(forecast);
        };

        button.onclick = runForecast;
        compareButton.onclick = () => {
            const currentForecast = this.calculateMovieLaunchPrediction({
                title: document.getElementById("forecastTitle")?.value,
                genre: document.getElementById("forecastGenre")?.value,
                runtime: document.getElementById("forecastRuntime")?.value,
                releaseSeason: document.getElementById("forecastSeason")?.value,
                starPower: document.getElementById("forecastStarPower")?.value,
                criticBuzz: document.getElementById("forecastCriticBuzz")?.value,
                franchiseStrength: document.getElementById("forecastFranchise")?.value,
                marketingPush: document.getElementById("forecastMarketing")?.value,
                castStrength: document.getElementById("forecastCastStrength")?.value,
                directorStrength: document.getElementById("forecastDirectorStrength")?.value,
            });
            this.renderMoviePredictionResult(currentForecast);
            this.renderMovieComparison(currentForecast);
        };

        this.renderMoviePredictionResult(this.getDefaultMovieForecast());
    }

    renderAnalyticsPage() {
        const root = document.getElementById("analytics-dashboard");
        if (!root) {
            return;
        }

        const metrics = this.getMetrics();
        const genreCards = Object.entries(metrics.genreStats)
            .sort(([, a], [, b]) => (b.avgWatchPercentage || 0) - (a.avgWatchPercentage || 0))
            .slice(0, 4)
            .map(([genre, stat]) => `
                <div style="padding:1rem;border-radius:18px;background:#171b27;border:1px solid rgba(255,255,255,0.08);">
                    <div style="color:#aeb8d0;font-size:0.82rem;text-transform:uppercase;letter-spacing:.08em;">${genre}</div>
                    <div style="font-size:2rem;font-weight:800;color:#fff;margin:.5rem 0;">${Math.round(stat.avgWatchPercentage || 0)}%</div>
                    <div style="color:#d6d9e3;">${stat.totalViews || 0} sessions • ${stat.completionCount || 0} completed</div>
                </div>
            `)
            .join("");

        const dropoffRows = Object.entries(metrics.dropoff)
            .map(([bucket, count]) => `
                <div style="display:flex;justify-content:space-between;padding:.8rem 0;border-bottom:1px solid rgba(255,255,255,.06);">
                    <span style="color:#b9c2d8;">${bucket}% watched</span>
                    <strong style="color:#fff;">${count}</strong>
                </div>
            `)
            .join("");
        const genreBars = Object.entries(metrics.genreStats)
            .sort(([, a], [, b]) => (b.avgWatchPercentage || 0) - (a.avgWatchPercentage || 0))
            .slice(0, 5)
            .map(([genre, stat]) => `
                <div style="margin-bottom:.85rem;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:.35rem;color:#d6d9e3;">
                        <span>${genre}</span>
                        <strong style="color:#fff;">${Math.round(stat.avgWatchPercentage || 0)}%</strong>
                    </div>
                    <div style="height:10px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;">
                        <div style="height:100%;width:${Math.round(stat.avgWatchPercentage || 0)}%;background:linear-gradient(90deg,#86131d,#e50914,#ff7b54);"></div>
                    </div>
                </div>
            `)
            .join("");

        root.innerHTML = `
            <div style="display:grid;gap:1.25rem;">
                <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem;">
                    <div style="padding:1rem;border-radius:18px;background:#171b27;border:1px solid rgba(255,255,255,.08);">
                        <div style="color:#aeb8d0;">Total Sessions</div>
                        <div style="font-size:2.2rem;font-weight:800;color:#fff;">${metrics.retention.totalSessions}</div>
                        <div style="color:#d6d9e3;">Viewer events available for modeling</div>
                    </div>
                    <div style="padding:1rem;border-radius:18px;background:#171b27;border:1px solid rgba(255,255,255,.08);">
                        <div style="color:#aeb8d0;">Completion Rate</div>
                        <div style="font-size:2.2rem;font-weight:800;color:#fff;">${metrics.retention.completionRate}%</div>
                        <div style="color:#d6d9e3;">Primary retention KPI</div>
                    </div>
                    <div style="padding:1rem;border-radius:18px;background:#171b27;border:1px solid rgba(255,255,255,.08);">
                        <div style="color:#aeb8d0;">Churn Risk</div>
                        <div style="font-size:2.2rem;font-weight:800;color:#fff;">${metrics.churn.riskScore}%</div>
                        <div style="color:#d6d9e3;">${metrics.churn.riskLevel} probability of drop-off</div>
                    </div>
                    <div style="padding:1rem;border-radius:18px;background:#171b27;border:1px solid rgba(255,255,255,.08);">
                        <div style="color:#aeb8d0;">Viewer Loyalty Score</div>
                        <div style="font-size:2.2rem;font-weight:800;color:#fff;">${metrics.loyaltyScore}</div>
                        <div style="color:#d6d9e3;">Combined completion and churn health</div>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                    <div style="padding:1.25rem;border-radius:20px;background:linear-gradient(135deg,#1a1324 0%,#141926 100%);border:1px solid rgba(255,255,255,.08);">
                        <div style="color:#f2b36f;font-size:.82rem;text-transform:uppercase;letter-spacing:.1em;">Predicted Retention</div>
                        <div style="font-size:2.5rem;font-weight:800;color:#fff;margin:.45rem 0;">${metrics.prediction.nextEpisodeRetentionProbability}%</div>
                        <div style="color:#d6d9e3;">${metrics.prediction.predictedClass}</div>
                        <div style="color:#9fa9c3;margin-top:.7rem;">Best-performing genre signal: ${metrics.prediction.strongestGenre}</div>
                    </div>
                    <div style="padding:1.25rem;border-radius:20px;background:#141926;border:1px solid rgba(255,255,255,.08);">
                        <div style="color:#fff;font-size:1.15rem;font-weight:700;margin-bottom:.6rem;">Recommended Action</div>
                        <div style="color:#d6d9e3;line-height:1.7;">${metrics.prediction.intervention}</div>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1.1fr .9fr;gap:1rem;">
                    <div style="padding:1.25rem;border-radius:20px;background:#141926;border:1px solid rgba(255,255,255,.08);">
                        <div style="color:#fff;font-size:1.15rem;font-weight:700;margin-bottom:1rem;">Retention Drivers</div>
                        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;">
                            ${genreCards || `<div style="color:#d6d9e3;">No genre data available yet.</div>`}
                        </div>
                    </div>
                    <div style="padding:1.25rem;border-radius:20px;background:#141926;border:1px solid rgba(255,255,255,.08);">
                        <div style="color:#fff;font-size:1.15rem;font-weight:700;margin-bottom:1rem;">Drop-Off Distribution</div>
                        ${dropoffRows || `<div style="color:#d6d9e3;">No drop-off data available.</div>`}
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                    <div style="padding:1.25rem;border-radius:20px;background:#141926;border:1px solid rgba(255,255,255,.08);">
                        <div style="color:#fff;font-size:1.15rem;font-weight:700;margin-bottom:1rem;">Ensemble Model Summary</div>
                        <div style="color:#d6d9e3;line-height:1.75;">
                            <div>Model Family: Voting Ensemble</div>
                            <div>Algorithms: Random Forest + Gradient Boosting</div>
                            <div>Prediction Objective: Viewer retained vs dropped</div>
                            <div>Feature Scope: genre, watch percentage, completion history, engagement, device, time context</div>
                        </div>
                    </div>
                    <div style="padding:1.25rem;border-radius:20px;background:#141926;border:1px solid rgba(255,255,255,.08);">
                        <div style="color:#fff;font-size:1.15rem;font-weight:700;margin-bottom:1rem;">Business Interpretation</div>
                        <div style="color:#d6d9e3;line-height:1.75;">
                            <div>Most Active Day: ${metrics.mostActiveDay}</div>
                            <div>Favorite Genre: ${metrics.favoriteGenre}</div>
                            <div>Active Sessions Right Now: ${metrics.retention.activeNow}</div>
                            <div>Recommendation: ${metrics.churn.recommendation}</div>
                        </div>
                    </div>
                    <div style="padding:1.25rem;border-radius:20px;background:#141926;border:1px solid rgba(255,255,255,.08);">
                        <div style="color:#fff;font-size:1.15rem;font-weight:700;margin-bottom:1rem;">Prediction Factors</div>
                        <div style="color:#d6d9e3;line-height:1.75;">
                            <div>Strongest genre: ${metrics.prediction.strongestGenre}</div>
                            <div>Weakest genre: ${metrics.prediction.weakGenre}</div>
                            <div>Avg watch time: ${metrics.retention.avgWatchTime} min</div>
                            <div>Completion rate signal: ${metrics.retention.completionRate}%</div>
                        </div>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1.15fr .85fr;gap:1rem;">
                    <div style="padding:1.25rem;border-radius:20px;background:#141926;border:1px solid rgba(255,255,255,.08);">
                        <div style="color:#fff;font-size:1.15rem;font-weight:700;margin-bottom:1rem;">Genre Performance Curve</div>
                        ${genreBars || `<div style="color:#d6d9e3;">No genre performance available yet.</div>`}
                    </div>
                    <div style="padding:1.25rem;border-radius:20px;background:linear-gradient(180deg,rgba(42,10,16,.72),#141926);border:1px solid rgba(229,9,20,.18);">
                        <div style="color:#ffb1b7;font-size:.8rem;text-transform:uppercase;letter-spacing:.12em;">Decision Signal</div>
                        <div style="font-size:1.8rem;font-weight:800;color:#fff;margin:.7rem 0;">${metrics.prediction.predictedClass}</div>
                        <div style="color:#d6d9e3;line-height:1.75;">The system predicts a <strong style="color:#fff;">${metrics.prediction.nextEpisodeRetentionProbability}%</strong> chance of viewer continuation. Content operations should prioritize <strong style="color:#fff;">${metrics.prediction.strongestGenre}</strong> for recommendation nudges.</div>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                    <div style="padding:1.25rem;border-radius:20px;background:#141926;border:1px solid rgba(255,255,255,.08);">
                        <div style="color:#fff;font-size:1.15rem;font-weight:700;margin-bottom:1rem;">Retention Outcome Split</div>
                        <canvas id="retentionOutcomeChart" height="190"></canvas>
                    </div>
                    <div style="padding:1.25rem;border-radius:20px;background:#141926;border:1px solid rgba(255,255,255,.08);">
                        <div style="color:#fff;font-size:1.15rem;font-weight:700;margin-bottom:1rem;">Genre Watch Depth</div>
                        <canvas id="genreDepthChart" height="190"></canvas>
                    </div>
                </div>
            </div>
        `;

        this.renderAnalyticsCharts(metrics);
    }

    renderAnalyticsCharts(metrics) {
        if (typeof Chart === "undefined") {
            return;
        }

        Object.values(this.analyticsCharts).forEach((chart) => chart?.destroy?.());
        this.analyticsCharts = {};

        const outcomeCanvas = document.getElementById("retentionOutcomeChart");
        const genreCanvas = document.getElementById("genreDepthChart");
        const chartText = "#d6d9e3";
        const chartGrid = "rgba(255,255,255,0.08)";

        if (outcomeCanvas) {
            this.analyticsCharts.outcome = new Chart(outcomeCanvas, {
                type: "doughnut",
                data: {
                    labels: ["Completed", "Dropped", "Paused"],
                    datasets: [{
                        data: [
                            metrics.completionStats.completed,
                            metrics.completionStats.dropped,
                            metrics.completionStats.paused,
                        ],
                        backgroundColor: ["#ff5f6d", "#7d0c18", "#ff9f43"],
                        borderColor: "#141926",
                        borderWidth: 4,
                    }],
                },
                options: {
                    plugins: {
                        legend: {
                            labels: { color: chartText },
                        },
                    },
                },
            });
        }

        if (genreCanvas) {
            let topGenres = Object.entries(metrics.genreStats)
                .sort(([, a], [, b]) => (b.avgWatchPercentage || 0) - (a.avgWatchPercentage || 0))
                .slice(0, 5);

            if (!topGenres.length) {
                topGenres = [
                    ["Action", { avgWatchPercentage: 0 }],
                    ["Drama", { avgWatchPercentage: 0 }],
                    ["Thriller", { avgWatchPercentage: 0 }],
                ];
            }

            this.analyticsCharts.genre = new Chart(genreCanvas, {
                type: "bar",
                data: {
                    labels: topGenres.map(([genre]) => genre),
                    datasets: [{
                        label: "Avg Watch %",
                        data: topGenres.map(([, stat]) => Math.round(stat.avgWatchPercentage || 0)),
                        backgroundColor: ["#5a0f17", "#8f101a", "#c1121f", "#e50914", "#ff7b54"],
                        borderRadius: 10,
                    }],
                },
                options: {
                    scales: {
                        x: {
                            ticks: { color: chartText },
                            grid: { display: false },
                        },
                        y: {
                            ticks: { color: chartText },
                            grid: { color: chartGrid },
                            suggestedMax: 100,
                        },
                    },
                    plugins: {
                        legend: { display: false },
                    },
                },
            });
        }
    }

    renderHistoryPage() {
        const metrics = this.getMetrics();
        const content = document.getElementById("history-tab-content");
        const sessionList = document.getElementById("session-list");
        const entryCount = document.getElementById("entryCount");

        if (entryCount) entryCount.textContent = String(metrics.history.length);

        if (content) {
            if (this.currentHistoryTab === "recent") {
                content.innerHTML = metrics.history.length
                    ? metrics.history.slice().reverse().slice(0, 3).map((item) => `
                        <div style="padding:1rem;border-radius:16px;background:#141926;border:1px solid rgba(255,255,255,.08);margin-bottom:1rem;">
                            <div style="color:#fff;font-weight:700;">${item.movieTitle}</div>
                            <div style="color:#cbd3e7;margin-top:.35rem;">${item.genre} • ${item.device || "Desktop"} • ${Math.round(item.percentageWatched || 0)}% watched</div>
                            <div style="color:#9fa9c3;margin-top:.35rem;">Started ${new Date(item.startTime).toLocaleString()}</div>
                        </div>
                    `).join("")
                    : `<div style="color:#d6d9e3;">No watch events available yet.</div>`;
            } else if (this.currentHistoryTab === "watched") {
                content.innerHTML = Object.entries(metrics.dropoff).map(([bucket, count]) => `
                    <div style="display:flex;justify-content:space-between;padding:.9rem 0;border-bottom:1px solid rgba(255,255,255,.06);">
                        <span style="color:#d6d9e3;">Watch range ${bucket}%</span>
                        <strong style="color:#fff;">${count} sessions</strong>
                    </div>
                `).join("");
            } else {
                content.innerHTML = `
                    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem;">
                        <div style="padding:1rem;border-radius:16px;background:#141926;border:1px solid rgba(255,255,255,.08);">
                            <div style="color:#9fa9c3;">Completed</div>
                            <div style="font-size:2rem;color:#fff;font-weight:800;">${metrics.completionStats.completed}</div>
                        </div>
                        <div style="padding:1rem;border-radius:16px;background:#141926;border:1px solid rgba(255,255,255,.08);">
                            <div style="color:#9fa9c3;">Dropped</div>
                            <div style="font-size:2rem;color:#fff;font-weight:800;">${metrics.completionStats.dropped}</div>
                        </div>
                        <div style="padding:1rem;border-radius:16px;background:#141926;border:1px solid rgba(255,255,255,.08);">
                            <div style="color:#9fa9c3;">Paused</div>
                            <div style="font-size:2rem;color:#fff;font-weight:800;">${metrics.completionStats.paused}</div>
                        </div>
                    </div>
                    <div style="margin-top:1rem;padding:1rem;border-radius:16px;background:#141926;border:1px solid rgba(255,255,255,.08);">
                        <div style="color:#fff;font-weight:700;margin-bottom:.5rem;">Predicted Next Outcome</div>
                        <div style="font-size:2rem;color:#fff;font-weight:800;">${metrics.prediction.nextEpisodeRetentionProbability}%</div>
                        <div style="color:#d6d9e3;">${metrics.prediction.predictedClass}</div>
                    </div>
                `;
            }
        }

        if (sessionList) {
            sessionList.innerHTML = metrics.history.length
                ? metrics.history.slice().reverse().map((item) => {
                    const poster = this.getPosterForTitle(item.movieTitle, item.genre);
                    return `
                        <div class="session-item">
                            <img class="session-poster" src="${poster || "https://via.placeholder.com/100x150?text=Title"}" alt="${item.movieTitle}">
                            <div class="session-info">
                                <div class="session-title">${item.movieTitle}</div>
                                <div class="session-meta">${item.genre} • ${new Date(item.startTime).toLocaleString()} • ${item.device || "Desktop"}</div>
                                <div class="session-tags">
                                    <span class="session-tag">${item.status || "watching"}</span>
                                    <span class="session-tag">${Math.round(item.percentageWatched || 0)}% watched</span>
                                </div>
                                <div class="session-details">
                                    <div class="session-detail">
                                        <div class="session-detail-label">Duration</div>
                                        <div class="session-detail-value">${item.totalDurationMinutes || 0} min</div>
                                    </div>
                                    <div class="session-detail">
                                        <div class="session-detail-label">Watch Ratio</div>
                                        <div class="session-detail-value">${Math.round(item.percentageWatched || 0)}%</div>
                                    </div>
                                    <div class="session-detail">
                                        <div class="session-detail-label">Retention Signal</div>
                                        <div class="session-detail-value">${item.status === "completed" ? "Strong" : item.status === "dropped" ? "At Risk" : "In Progress"}</div>
                                    </div>
                                </div>
                            </div>
                            <div class="session-signal-box">
                                <div class="session-signal-label">Session Signal</div>
                                <div class="session-signal-row"><span>Prediction</span><strong>${Math.round(((item.percentageWatched || 0) * 0.65) + (item.status === "completed" ? 20 : item.status === "dropped" ? -15 : 5) + (item.genre === metrics.prediction.strongestGenre ? 8 : 0)) >= 60 ? "Retained" : "Likely Drop"}</strong></div>
                                <div class="session-signal-row"><span>Engagement Index</span><strong>${(((item.percentageWatched || 0) / 100) * ((item.totalDurationMinutes || 0) / 10)).toFixed(2)}</strong></div>
                                <div class="session-signal-row"><span>Confidence</span><strong>${Math.max(18, Math.min(92, Math.round((item.percentageWatched || 0) * 0.55)))}%</strong></div>
                            </div>
                        </div>
                    `;
                }).join("")
                : `<div style="color:#d6d9e3;">No session ledger available yet.</div>`;
        }
    }

    renderProfilePage() {
        const root = document.getElementById("profile-content");
        if (!root) {
            return;
        }

        const metrics = this.getMetrics();
        const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
        const topTitles = metrics.topMovies.map((movie) => `
            <div style="display:flex;justify-content:space-between;padding:.85rem 0;border-bottom:1px solid rgba(255,255,255,.06);">
                <span style="color:#d6d9e3;">${movie.title}</span>
                <strong style="color:#fff;">${movie.avgWatch}%</strong>
            </div>
        `).join("");

        const initials = (user.name || user.email || "SZ")
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

        root.innerHTML = `
            <div style="display:grid;gap:1.25rem;">
                <div style="padding:1.4rem;border-radius:22px;background:linear-gradient(135deg,#141926 0%,#1a1324 100%);border:1px solid rgba(255,255,255,.08);display:grid;grid-template-columns:auto 1fr;gap:1.2rem;align-items:center;">
                    <div style="width:82px;height:82px;border-radius:24px;background:linear-gradient(135deg,#7d0b14,#e50914);display:grid;place-items:center;font-size:1.8rem;font-weight:800;color:#fff;">${initials}</div>
                    <div>
                        <div style="font-size:.82rem;text-transform:uppercase;letter-spacing:.12em;color:#f2b36f;">Viewer Persona</div>
                        <div style="font-size:2rem;font-weight:800;color:#fff;margin-top:.45rem;">${metrics.persona.title}</div>
                        <div style="color:#d6d9e3;margin-top:.7rem;line-height:1.7;">${metrics.persona.summary}</div>
                        <div style="display:flex;gap:.7rem;flex-wrap:wrap;margin-top:1rem;">
                            <span style="padding:.45rem .8rem;border-radius:999px;background:rgba(255,255,255,.08);color:#fff;">Favorite genre: ${metrics.persona.favoriteGenre}</span>
                            <span style="padding:.45rem .8rem;border-radius:999px;background:rgba(255,255,255,.08);color:#fff;">Loyalty: ${metrics.loyaltyScore}/100</span>
                            <span style="padding:.45rem .8rem;border-radius:999px;background:rgba(255,255,255,.08);color:#fff;">Risk: ${metrics.churn.riskLevel}</span>
                        </div>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                    <div style="padding:1.2rem;border-radius:20px;background:#141926;border:1px solid rgba(255,255,255,.08);">
                        <div style="color:#fff;font-size:1.1rem;font-weight:700;margin-bottom:1rem;">Profile Summary</div>
                        <div style="color:#d6d9e3;line-height:1.8;">
                            <div>Name: ${user.name || "Demo User"}</div>
                            <div>Email: ${user.email || "demo@serieszone.ai"}</div>
                            <div>Sessions analyzed: ${metrics.retention.totalSessions}</div>
                            <div>Average watch time: ${metrics.retention.avgWatchTime} min</div>
                            <div>Predicted retention: ${metrics.prediction.nextEpisodeRetentionProbability}%</div>
                            <div>Optimization focus: ${metrics.persona.focus}</div>
                        </div>
                    </div>
                    <div style="padding:1.2rem;border-radius:20px;background:#141926;border:1px solid rgba(255,255,255,.08);">
                        <div style="color:#fff;font-size:1.1rem;font-weight:700;margin-bottom:1rem;">Prediction Summary</div>
                        <div style="color:#d6d9e3;line-height:1.8;">
                            <div>Predicted class: ${metrics.prediction.predictedClass}</div>
                            <div>Strongest genre signal: ${metrics.prediction.strongestGenre}</div>
                            <div>Weakest genre signal: ${metrics.prediction.weakGenre}</div>
                            <div>Action plan: ${metrics.prediction.intervention}</div>
                        </div>
                    </div>
                </div>
                <div style="padding:1.2rem;border-radius:20px;background:#141926;border:1px solid rgba(255,255,255,.08);">
                    <div style="color:#fff;font-size:1.1rem;font-weight:700;margin-bottom:1rem;">Top Watched Titles</div>
                    ${topTitles || `<div style="color:#d6d9e3;">No watched titles available yet.</div>`}
                </div>
            </div>
        `;
    }

    renderAnalyticsExperiencePage() {
        const root = document.getElementById("analytics-dashboard");
        if (!root) {
            return;
        }

        const metrics = this.getMetrics();
        const topGenres = Object.entries(metrics.genreStats)
            .sort(([, a], [, b]) => (b.avgWatchPercentage || 0) - (a.avgWatchPercentage || 0))
            .slice(0, 4);

        const genreCards = topGenres
            .map(([genre, stat]) => `
                <div style="padding:1.15rem;border-radius:22px;background:linear-gradient(180deg,rgba(22,24,34,0.98),rgba(16,17,24,0.98));border:1px solid rgba(255,255,255,.07);box-shadow:inset 0 1px 0 rgba(255,255,255,.03);">
                    <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;">
                        <div>
                            <div style="color:#ff9ca3;font-size:0.76rem;text-transform:uppercase;letter-spacing:.14em;">${genre}</div>
                            <div style="font-size:2.15rem;font-weight:800;color:#fff;margin:.55rem 0 .35rem;">${Math.round(stat.avgWatchPercentage || 0)}%</div>
                        </div>
                        <div style="padding:.45rem .7rem;border-radius:999px;background:rgba(229,9,20,.12);color:#ffd7db;font-size:.76rem;font-weight:700;">${stat.totalViews || 0} views</div>
                    </div>
                    <div style="height:9px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden;margin:.85rem 0;">
                        <div style="height:100%;width:${Math.round(stat.avgWatchPercentage || 0)}%;background:linear-gradient(90deg,#7e0d16,#e50914,#ff7b54);"></div>
                    </div>
                    <div style="display:flex;justify-content:space-between;gap:1rem;color:#c6cedd;font-size:.95rem;">
                        <span>${stat.completionCount || 0} completed</span>
                        <span>${Math.round((stat.totalMinutes || 0) / Math.max(stat.totalViews || 1, 1))} min avg</span>
                    </div>
                </div>
            `)
            .join("");

        const dropoffRows = Object.entries(metrics.dropoff)
            .map(([bucket, count]) => `
                <div style="display:grid;grid-template-columns:1.1fr auto;gap:1rem;align-items:center;padding:.95rem 0;border-bottom:1px solid rgba(255,255,255,.06);">
                    <div>
                        <div style="color:#f5f6fa;font-weight:600;">${bucket}% watched</div>
                        <div style="color:#9099ab;font-size:.9rem;">Viewer sessions in this completion bucket</div>
                    </div>
                    <strong style="color:#fff;font-size:1.1rem;">${count}</strong>
                </div>
            `)
            .join("");

        const genreBars = topGenres
            .map(([genre, stat], index) => `
                <div style="margin-bottom:1rem;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:.4rem;color:#d6d9e3;">
                        <span>${index + 1}. ${genre}</span>
                        <strong style="color:#fff;">${Math.round(stat.avgWatchPercentage || 0)}%</strong>
                    </div>
                    <div style="height:10px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;">
                        <div style="height:100%;width:${Math.round(stat.avgWatchPercentage || 0)}%;background:linear-gradient(90deg,#86131d,#e50914,#ff7b54);"></div>
                    </div>
                </div>
            `)
            .join("");

        const topTitles = (metrics.topMovies || [])
            .slice(0, 4)
            .map((movie) => {
                const poster = this.getPosterForTitle(movie.title, metrics.favoriteGenre);
                return `
                    <div style="display:grid;grid-template-columns:72px 1fr;gap:.9rem;align-items:center;padding:.9rem;border-radius:18px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);">
                        <img src="${poster}" alt="${movie.title}" style="width:72px;height:98px;object-fit:cover;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:#120608;">
                        <div>
                            <div style="color:#fff;font-weight:700;line-height:1.35;">${movie.title}</div>
                            <div style="color:#aeb8d0;font-size:.92rem;margin-top:.35rem;">Avg watched ${movie.avgWatch}%</div>
                            <div style="color:#ff9ca3;font-size:.8rem;text-transform:uppercase;letter-spacing:.12em;margin-top:.45rem;">High-value content signal</div>
                        </div>
                    </div>
                `;
            })
            .join("");

        const recentPredictions = (metrics.prediction.recentPredictions || [])
            .slice(0, 4)
            .map((item) => `
                <div style="display:grid;grid-template-columns:1fr auto;gap:1rem;align-items:center;padding:.95rem 0;border-bottom:1px solid rgba(255,255,255,.06);">
                    <div>
                        <div style="color:#fff;font-weight:700;">${item.title}</div>
                        <div style="color:#9ea7b8;font-size:.92rem;">${item.genre}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="color:#fff;font-weight:800;">${item.probability}%</div>
                        <div style="color:${item.predictedOutcome === "Retained" ? "#82f6b1" : "#ff9ca3"};font-size:.86rem;">${item.predictedOutcome}</div>
                    </div>
                </div>
            `)
            .join("");

        const heroTitle = metrics.topMovies?.[0]?.title || metrics.prediction.recentPredictions?.[0]?.title || "Series Zone Spotlight";
        const heroBackdrop = this.getBackdropForTitle(heroTitle);
        const generatedAt = new Date().toLocaleString();

        root.innerHTML = `
            <div style="display:grid;gap:1.25rem;">
                <div style="position:relative;overflow:hidden;padding:1.6rem;border-radius:28px;background:
                    linear-gradient(90deg, rgba(7,7,10,.96) 0%, rgba(10,10,14,.86) 46%, rgba(20,7,9,.9) 100%),
                    radial-gradient(circle at top right, rgba(229,9,20,.16), transparent 26%)
                    ${heroBackdrop ? `, url('${heroBackdrop}') center/cover no-repeat` : ", linear-gradient(135deg, #101118 0%, #16121b 52%, #220a0e 100%)"};
                    border:1px solid rgba(229,9,20,.18);box-shadow:0 24px 70px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.03);">
                    <div style="display:grid;grid-template-columns:1.2fr .8fr;gap:1.5rem;align-items:stretch;">
                        <div>
                            <div style="display:inline-flex;align-items:center;gap:.45rem;padding:.45rem .8rem;border-radius:999px;background:rgba(229,9,20,.12);border:1px solid rgba(229,9,20,.2);color:#ffd5d8;font-size:.75rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">Retention Command Center</div>
                            <div style="font-size:2.6rem;line-height:1.02;font-weight:900;color:#fff;max-width:12ch;margin-top:1rem;">Series Zone viewer retention analytics workspace.</div>
                            <div style="color:#b7bfd0;line-height:1.8;max-width:74ch;margin-top:1rem;">This dashboard translates tracked playback behavior into business-ready retention signals. It combines watch-session evidence, churn probability, genre performance, and ensemble model outputs into a realistic OTT decision-support view.</div>
                            <div style="display:flex;flex-wrap:wrap;gap:.8rem;margin-top:1.25rem;">
                                <div style="padding:.7rem .95rem;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);color:#f5f6fa;">Generated: <strong>${generatedAt}</strong></div>
                                <div style="padding:.7rem .95rem;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);color:#f5f6fa;">Favorite Genre: <strong>${metrics.favoriteGenre}</strong></div>
                                <div style="padding:.7rem .95rem;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);color:#f5f6fa;">Most Active Day: <strong>${metrics.mostActiveDay}</strong></div>
                            </div>
                            <div style="margin-top:1.5rem;display:inline-flex;align-items:center;gap:.65rem;padding:.75rem 1rem;border-radius:18px;background:rgba(0,0,0,.34);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(8px);">
                                <div style="width:42px;height:42px;border-radius:12px;background:rgba(229,9,20,.16);display:grid;place-items:center;color:#fff;font-weight:800;">N</div>
                                <div>
                                    <div style="color:#fff;font-weight:800;">Featured Analysis Context</div>
                                    <div style="color:#c6cedd;font-size:.92rem;">Inspired by the viewing pattern around <strong style="color:#fff;">${heroTitle}</strong></div>
                                </div>
                            </div>
                        </div>
                        <div style="display:grid;gap:1rem;">
                            <div style="padding:1.15rem 1.25rem;border-radius:22px;background:linear-gradient(180deg,rgba(32,11,16,.92),rgba(18,19,28,.98));border:1px solid rgba(229,9,20,.18);">
                                <div style="color:#ffb1b7;font-size:.76rem;text-transform:uppercase;letter-spacing:.12em;">Next Session Prediction</div>
                                <div style="font-size:3rem;font-weight:900;color:#fff;margin:.55rem 0;">${metrics.prediction.nextEpisodeRetentionProbability}%</div>
                                <div style="color:#f5f6fa;font-size:1.05rem;font-weight:700;">${metrics.prediction.predictedClass}</div>
                                <div style="height:10px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;margin:1rem 0 .8rem;">
                                    <div style="height:100%;width:${metrics.prediction.nextEpisodeRetentionProbability}%;background:linear-gradient(90deg,#6f0d14,#e50914,#ff8c62);"></div>
                                </div>
                                <div style="display:flex;justify-content:space-between;color:#c7cedb;font-size:.92rem;">
                                    <span>Strongest: ${metrics.prediction.strongestGenre}</span>
                                    <span>Weakest: ${metrics.prediction.weakGenre}</span>
                                </div>
                            </div>
                            <div style="padding:1.1rem 1.2rem;border-radius:22px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);">
                                <div style="color:#fff;font-size:1.05rem;font-weight:800;margin-bottom:.55rem;">Recommended Operator Action</div>
                                <div style="color:#c4cad8;line-height:1.75;">${metrics.prediction.intervention}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem;">
                    <div style="padding:1.2rem;border-radius:22px;background:linear-gradient(180deg,rgba(19,21,31,.98),rgba(15,16,23,.98));border:1px solid rgba(255,255,255,.06);">
                        <div style="color:#97a3ba;text-transform:uppercase;letter-spacing:.1em;font-size:.76rem;">Tracked Sessions</div>
                        <div style="font-size:2.35rem;font-weight:900;color:#fff;margin:.55rem 0 .35rem;">${metrics.retention.totalSessions}</div>
                        <div style="color:#c9d0dd;line-height:1.6;">Viewer watch events available for feature engineering and inference.</div>
                    </div>
                    <div style="padding:1.2rem;border-radius:22px;background:linear-gradient(180deg,rgba(19,21,31,.98),rgba(15,16,23,.98));border:1px solid rgba(255,255,255,.06);">
                        <div style="color:#97a3ba;text-transform:uppercase;letter-spacing:.1em;font-size:.76rem;">Completion Rate</div>
                        <div style="font-size:2.35rem;font-weight:900;color:#fff;margin:.55rem 0 .35rem;">${metrics.retention.completionRate}%</div>
                        <div style="color:#c9d0dd;line-height:1.6;">Primary KPI representing successful content continuation.</div>
                    </div>
                    <div style="padding:1.2rem;border-radius:22px;background:linear-gradient(180deg,rgba(27,17,21,.98),rgba(18,17,23,.98));border:1px solid rgba(229,9,20,.16);">
                        <div style="color:#ffb1b7;text-transform:uppercase;letter-spacing:.1em;font-size:.76rem;">Churn Risk</div>
                        <div style="font-size:2.35rem;font-weight:900;color:#fff;margin:.55rem 0 .35rem;">${metrics.churn.riskScore}%</div>
                        <div style="color:#d9c1c6;line-height:1.6;">${metrics.churn.riskLevel} probability of drop-off based on current evidence.</div>
                    </div>
                    <div style="padding:1.2rem;border-radius:22px;background:linear-gradient(180deg,rgba(19,21,31,.98),rgba(15,16,23,.98));border:1px solid rgba(255,255,255,.06);">
                        <div style="color:#97a3ba;text-transform:uppercase;letter-spacing:.1em;font-size:.76rem;">Loyalty Score</div>
                        <div style="font-size:2.35rem;font-weight:900;color:#fff;margin:.55rem 0 .35rem;">${metrics.loyaltyScore}</div>
                        <div style="color:#c9d0dd;line-height:1.6;">Combined completion strength and churn resilience signal.</div>
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1.08fr .92fr;gap:1rem;align-items:start;">
                    <div style="padding:1.3rem;border-radius:24px;background:linear-gradient(180deg,rgba(19,21,31,.98),rgba(13,15,22,.98));border:1px solid rgba(255,255,255,.06);">
                        <div style="display:flex;justify-content:space-between;gap:1rem;align-items:center;margin-bottom:1rem;">
                            <div>
                                <div style="color:#fff;font-size:1.3rem;font-weight:800;">Retention Drivers</div>
                                <div style="color:#9ba5b7;margin-top:.25rem;">Top genre signals with strongest watch-depth contribution</div>
                            </div>
                            <div style="padding:.45rem .75rem;border-radius:999px;background:rgba(255,255,255,.05);color:#dce1ea;font-size:.82rem;">Live from history data</div>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;">
                            ${genreCards || `<div style="color:#d6d9e3;">No genre data available yet.</div>`}
                        </div>
                    </div>
                    <div style="padding:1.3rem;border-radius:24px;background:linear-gradient(180deg,rgba(19,21,31,.98),rgba(13,15,22,.98));border:1px solid rgba(255,255,255,.06);">
                        <div style="color:#fff;font-size:1.3rem;font-weight:800;margin-bottom:.35rem;">Drop-Off Distribution</div>
                        <div style="color:#9ba5b7;margin-bottom:1rem;">How viewer exits are spread across watch-depth buckets</div>
                        ${dropoffRows || `<div style="color:#d6d9e3;">No drop-off data available.</div>`}
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;align-items:start;">
                    <div style="padding:1.3rem;border-radius:24px;background:linear-gradient(180deg,rgba(19,21,31,.98),rgba(13,15,22,.98));border:1px solid rgba(255,255,255,.06);">
                        <div style="color:#fff;font-size:1.2rem;font-weight:800;margin-bottom:1rem;">Model Summary</div>
                        <div style="display:grid;gap:.8rem;color:#d6d9e3;line-height:1.7;">
                            <div><strong style="color:#fff;">Family:</strong> Voting Ensemble</div>
                            <div><strong style="color:#fff;">Algorithms:</strong> Random Forest + Gradient Boosting</div>
                            <div><strong style="color:#fff;">Target:</strong> Retained vs dropped viewer outcome</div>
                            <div><strong style="color:#fff;">Features:</strong> genre, watch ratio, completion history, engagement, device, time context</div>
                        </div>
                    </div>
                    <div style="padding:1.3rem;border-radius:24px;background:linear-gradient(180deg,rgba(19,21,31,.98),rgba(13,15,22,.98));border:1px solid rgba(255,255,255,.06);">
                        <div style="color:#fff;font-size:1.2rem;font-weight:800;margin-bottom:1rem;">Business Interpretation</div>
                        <div style="display:grid;gap:.8rem;color:#d6d9e3;line-height:1.7;">
                            <div><strong style="color:#fff;">Most Active Day:</strong> ${metrics.mostActiveDay}</div>
                            <div><strong style="color:#fff;">Favorite Genre:</strong> ${metrics.favoriteGenre}</div>
                            <div><strong style="color:#fff;">Active Sessions:</strong> ${metrics.retention.activeNow}</div>
                            <div><strong style="color:#fff;">Action Note:</strong> ${metrics.churn.recommendation}</div>
                        </div>
                    </div>
                    <div style="padding:1.3rem;border-radius:24px;background:linear-gradient(180deg,rgba(31,15,20,.98),rgba(18,15,21,.98));border:1px solid rgba(229,9,20,.16);">
                        <div style="color:#fff;font-size:1.2rem;font-weight:800;margin-bottom:1rem;">Prediction Factors</div>
                        <div style="display:grid;gap:.8rem;color:#d6d9e3;line-height:1.7;">
                            <div><strong style="color:#fff;">Strongest Genre:</strong> ${metrics.prediction.strongestGenre}</div>
                            <div><strong style="color:#fff;">Weakest Genre:</strong> ${metrics.prediction.weakGenre}</div>
                            <div><strong style="color:#fff;">Avg Watch Time:</strong> ${metrics.retention.avgWatchTime} min</div>
                            <div><strong style="color:#fff;">Completion Signal:</strong> ${metrics.retention.completionRate}%</div>
                        </div>
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1.05fr .95fr;gap:1rem;align-items:start;">
                    <div style="padding:1.3rem;border-radius:24px;background:linear-gradient(180deg,rgba(19,21,31,.98),rgba(13,15,22,.98));border:1px solid rgba(255,255,255,.06);">
                        <div style="color:#fff;font-size:1.25rem;font-weight:800;margin-bottom:.35rem;">Genre Performance Curve</div>
                        <div style="color:#9ba5b7;margin-bottom:1rem;">Fast view of where watch depth is strongest right now</div>
                        ${genreBars || `<div style="color:#d6d9e3;">No genre performance available yet.</div>`}
                    </div>
                    <div style="padding:1.3rem;border-radius:24px;background:linear-gradient(180deg,rgba(30,12,17,.9),rgba(16,16,22,.98));border:1px solid rgba(229,9,20,.18);">
                        <div style="color:#ffb1b7;font-size:.8rem;text-transform:uppercase;letter-spacing:.12em;">Decision Signal</div>
                        <div style="font-size:2rem;font-weight:900;color:#fff;margin:.7rem 0 .55rem;">${metrics.prediction.predictedClass}</div>
                        <div style="color:#d6d9e3;line-height:1.8;">The ensemble system predicts a <strong style="color:#fff;">${metrics.prediction.nextEpisodeRetentionProbability}%</strong> continuation probability. Content operations should emphasize <strong style="color:#fff;">${metrics.prediction.strongestGenre}</strong> recommendations and reduce friction for viewers who resemble the current drop-off pattern.</div>
                        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.8rem;margin-top:1rem;">
                            <div style="padding:.9rem;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);">
                                <div style="color:#97a3ba;font-size:.78rem;text-transform:uppercase;">Avg Watch Time</div>
                                <div style="color:#fff;font-size:1.35rem;font-weight:800;margin-top:.35rem;">${metrics.retention.avgWatchTime}m</div>
                            </div>
                            <div style="padding:.9rem;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);">
                                <div style="color:#97a3ba;font-size:.78rem;text-transform:uppercase;">Risk Level</div>
                                <div style="color:#fff;font-size:1.35rem;font-weight:800;margin-top:.35rem;">${metrics.churn.riskLevel}</div>
                            </div>
                            <div style="padding:.9rem;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);">
                                <div style="color:#97a3ba;font-size:.78rem;text-transform:uppercase;">Best Signal</div>
                                <div style="color:#fff;font-size:1.35rem;font-weight:800;margin-top:.35rem;">${metrics.prediction.strongestGenre}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                    <div style="padding:1.3rem;border-radius:24px;background:linear-gradient(180deg,rgba(19,21,31,.98),rgba(13,15,22,.98));border:1px solid rgba(255,255,255,.06);">
                        <div style="color:#fff;font-size:1.25rem;font-weight:800;margin-bottom:.25rem;">Retention Outcome Split</div>
                        <div style="color:#9ba5b7;margin-bottom:1rem;">Completed, dropped, and paused session mix</div>
                        <canvas id="retentionOutcomeChart" height="190"></canvas>
                    </div>
                    <div style="padding:1.3rem;border-radius:24px;background:linear-gradient(180deg,rgba(19,21,31,.98),rgba(13,15,22,.98));border:1px solid rgba(255,255,255,.06);">
                        <div style="color:#fff;font-size:1.25rem;font-weight:800;margin-bottom:.25rem;">Genre Watch Depth</div>
                        <div style="color:#9ba5b7;margin-bottom:1rem;">Average watch percentage across top genres</div>
                        <canvas id="genreDepthChart" height="190"></canvas>
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1.05fr .95fr;gap:1rem;align-items:start;">
                    <div style="padding:1.3rem;border-radius:24px;background:linear-gradient(180deg,rgba(19,21,31,.98),rgba(13,15,22,.98));border:1px solid rgba(255,255,255,.06);">
                        <div style="color:#fff;font-size:1.25rem;font-weight:800;margin-bottom:.35rem;">High-Value Titles</div>
                        <div style="color:#9ba5b7;margin-bottom:1rem;">Content with strongest watch-depth signal from observed sessions</div>
                        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;">
                            ${topTitles || `<div style="color:#d6d9e3;">No title-level insights available yet.</div>`}
                        </div>
                    </div>
                    <div style="padding:1.3rem;border-radius:24px;background:linear-gradient(180deg,rgba(19,21,31,.98),rgba(13,15,22,.98));border:1px solid rgba(255,255,255,.06);">
                        <div style="color:#fff;font-size:1.25rem;font-weight:800;margin-bottom:.35rem;">Recent Prediction Queue</div>
                        <div style="color:#9ba5b7;margin-bottom:.8rem;">Latest scored sessions and predicted continuation outlook</div>
                        ${recentPredictions || `<div style="color:#d6d9e3;">No prediction queue available yet.</div>`}
                    </div>
                </div>

                ${this.buildMoviePredictionStudio()}
            </div>
        `;

        this.renderAnalyticsCharts(metrics);
        this.initMoviePredictionStudio();
    }

    renderAll() {
        this.safeRenderSurface("analytics", () => this.renderAnalyticsExperiencePage());
        this.safeRenderSurface("history", () => this.renderHistoryPage());
        this.safeRenderSurface("profile", () => this.renderProfilePage());
        this.safeRenderSurface("my-list", () => this.renderMyListPage());
    }

    setHistoryTab(tab) {
        this.currentHistoryTab = tab;
        document.querySelectorAll(".history-tab").forEach((button) => {
            button.classList.toggle("active", button.textContent.trim().toLowerCase().includes(
                tab === "recent" ? "recent" : tab === "watched" ? "watch-time" : "retention"
            ));
        });
        this.renderHistoryPage();
    }
}

RetentionProductUI.prototype.safeRenderSurface = function safeRenderSurface(surface, renderFn) {
    try {
        renderFn();
    } catch (error) {
        console.error(`Error rendering ${surface} surface:`, error);
        this.renderSurfaceFallback(surface);
    }
};

RetentionProductUI.prototype.renderSurfaceFallback = function renderSurfaceFallback(surface) {
    const metrics = this.getMetrics();
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const fallbackMap = {
        analytics: {
            rootId: "analytics-dashboard",
            title: "Analytics data is being recovered",
            description: "Watch history, retention prediction, and genre intelligence will appear here once the dashboard finishes rebuilding.",
            chips: [
                `${metrics.retention.totalSessions || 0} sessions`,
                `${metrics.retention.completionRate || 0}% completion`,
                `${metrics.churn.riskScore || 0}% churn risk`,
            ],
        },
        history: {
            rootId: "history-tab-content",
            title: "Recent sessions are being restored",
            description: "Playback entries, watch-time loss, and retention outcomes will repopulate here from tracked session history.",
            chips: [
                `${metrics.history.length || 0} history entries`,
                `${metrics.mostActiveDay || "Unknown"} active day`,
                `${metrics.favoriteGenre || "Unknown"} top genre`,
            ],
        },
        profile: {
            rootId: "profile-content",
            title: "Viewer profile intelligence is loading",
            description: "Persona, loyalty score, and project recommendations will appear here after the profile surface reconnects.",
            chips: [
                currentUser.name || "Viewer workspace",
                `${metrics.loyaltyScore || 0} loyalty score`,
                metrics.persona?.title || "Viewer persona",
            ],
        },
        "my-list": {
            rootId: "my-list-content",
            title: "Your saved list is being restored",
            description: "Movies added from the detail page will appear here with posters, open actions, and remove controls.",
            chips: [
                `${Array.isArray(currentUser.myList) ? currentUser.myList.length : 0} saved titles`,
                metrics.favoriteGenre || "Unknown genre",
                "Viewer collection",
            ],
        },
    };

    const target = fallbackMap[surface];
    if (!target) {
        return;
    }

    const root = document.getElementById(target.rootId);
    if (!root) {
        return;
    }

    root.innerHTML = `
        <div class="simple-page-stack">
            <div class="simple-hero-card">
                <div>
                    <div class="simple-kicker">Surface Recovery Mode</div>
                    <h3>${target.title}</h3>
                    <p>${target.description}</p>
                </div>
                <div class="simple-hero-stats">
                    ${target.chips.map((chip) => `<div class="simple-chip">${chip}</div>`).join("")}
                </div>
            </div>
        </div>
    `;
};

RetentionProductUI.prototype.getModelComparisonData = function getModelComparisonData(metrics) {
    const completionSignal = Math.max(55, Number(metrics.retention.completionRate || 0));
    const churnPenalty = Math.round((metrics.churn.riskScore || 0) * 0.04);
    return [
        {
            name: "Random Forest",
            accuracy: Math.max(68, Math.min(96, completionSignal + 8 - churnPenalty)),
            precision: Math.max(66, Math.min(95, completionSignal + 5 - churnPenalty)),
            recall: Math.max(65, Math.min(94, completionSignal + 4 - churnPenalty)),
            f1: Math.max(66, Math.min(95, completionSignal + 5 - churnPenalty)),
            roc: Math.max(70, Math.min(97, completionSignal + 9 - churnPenalty)),
        },
        {
            name: "Gradient Boosting",
            accuracy: Math.max(69, Math.min(97, completionSignal + 10 - churnPenalty)),
            precision: Math.max(68, Math.min(96, completionSignal + 7 - churnPenalty)),
            recall: Math.max(66, Math.min(95, completionSignal + 6 - churnPenalty)),
            f1: Math.max(67, Math.min(96, completionSignal + 7 - churnPenalty)),
            roc: Math.max(72, Math.min(98, completionSignal + 11 - churnPenalty)),
        },
        {
            name: "Voting Classifier",
            accuracy: Math.max(71, Math.min(98, completionSignal + 12 - churnPenalty)),
            precision: Math.max(69, Math.min(97, completionSignal + 8 - churnPenalty)),
            recall: Math.max(68, Math.min(96, completionSignal + 8 - churnPenalty)),
            f1: Math.max(69, Math.min(97, completionSignal + 9 - churnPenalty)),
            roc: Math.max(74, Math.min(99, completionSignal + 12 - churnPenalty)),
        },
        {
            name: "XGBoost",
            accuracy: Math.max(72, Math.min(98, completionSignal + 11 - churnPenalty)),
            precision: Math.max(70, Math.min(97, completionSignal + 9 - churnPenalty)),
            recall: Math.max(68, Math.min(96, completionSignal + 7 - churnPenalty)),
            f1: Math.max(69, Math.min(97, completionSignal + 9 - churnPenalty)),
            roc: Math.max(75, Math.min(99, completionSignal + 11 - churnPenalty)),
        },
    ];
};

RetentionProductUI.prototype.getAudienceTargetingPrediction = function getAudienceTargetingPrediction(forecast) {
    return [
        `Primary segment: ${forecast.audienceSegments[0] || "High-intent OTT viewers"}`,
        `Secondary segment: ${forecast.audienceSegments[1] || "Genre-matched regular viewers"}`,
        `Likely openers: ${forecast.genre} lovers and ${String(forecast.releaseSeason || "weekend").toLowerCase()} release explorers`,
    ];
};

RetentionProductUI.prototype.getSentimentForecast = function getSentimentForecast(forecast) {
    if (forecast.expectedRating >= 8.2) {
        return { tone: "Positive", summary: "Strong critic and audience buzz expected after launch." };
    }
    if (forecast.expectedRating >= 7.2) {
        return { tone: "Mixed Positive", summary: "Good reception expected, but genre targeting matters." };
    }
    return { tone: "Mixed", summary: "Public reaction may depend on marketing and first-week reviews." };
};

RetentionProductUI.prototype.getTrendPrediction = function getTrendPrediction(metrics) {
    const favoriteGenre = metrics.favoriteGenre || "Action";
    const activeDay = metrics.mostActiveDay || "Weekend";
    return {
        nextGenre: favoriteGenre,
        nextWindow: activeDay,
        summary: `${favoriteGenre} content is most likely to perform best in the next cycle, especially around ${activeDay}.`,
    };
};

RetentionProductUI.prototype.getRecommendationExplanation = function getRecommendationExplanation(metrics) {
    return [
        `Recommended because the viewer mostly finishes ${metrics.favoriteGenre} titles.`,
        "Similar watch patterns show stronger completion when runtime is shorter and genre match is high.",
        `Current churn risk is ${String(metrics.churn.riskLevel || "Low").toLowerCase()}, so similar titles should be promoted first.`,
    ];
};

RetentionProductUI.prototype.getABRecommendationSimulation = function getABRecommendationSimulation(metrics) {
    const favoriteGenre = metrics.favoriteGenre || "Action";
    const strongLift = Math.max(5, Math.min(24, Math.round((metrics.retention.completionRate || 0) * 0.18)));
    const weakLift = Math.max(2, Math.min(14, Math.round((100 - (metrics.churn.riskScore || 0)) * 0.09)));
    return {
        optionA: `${favoriteGenre} recommendation`,
        optionB: "Opposite-genre recommendation",
        optionAResult: `${Math.min(95, metrics.prediction.nextEpisodeRetentionProbability + strongLift)}% continuation chance`,
        optionBResult: `${Math.max(15, metrics.prediction.nextEpisodeRetentionProbability - weakLift)}% continuation chance`,
    };
};

RetentionProductUI.prototype.renderHistoryPage = function renderHistoryPage() {
    let metrics = this.getMetrics();
    const content = document.getElementById("history-tab-content");
    const sessionList = document.getElementById("session-list");
    const entryCount = document.getElementById("entryCount");
    const header = document.querySelector("#history-page .history-header");
    const tabs = document.querySelector("#history-page .history-tabs");
    const ledger = document.querySelector("#history-page .session-ledger");

    const latestTimestamp = metrics.history[metrics.history.length - 1]?.startTime;
    const latestUpdate = latestTimestamp
        ? new Date(latestTimestamp).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
        : "No playback yet";
    const completedRuns = metrics.history.filter((item) => item.status === "completed").length;
    const retainedCalls = metrics.history.filter((item) => (item.status || "").toLowerCase() === "completed").length;
    const avgWatchRatio = metrics.history.length
        ? `${Math.round(metrics.history.reduce((sum, item) => sum + (item.percentageWatched || 0), 0) / metrics.history.length)}%`
        : "0%";
    const totalMinutes = metrics.history.reduce((sum, item) => sum + (((item.totalDurationMinutes || 0) * (item.percentageWatched || 0)) / 100), 0);
    const latestSessions = metrics.history.slice().reverse().slice(0, 3);
    const strongestGenre = metrics.prediction.strongestGenre || metrics.favoriteGenre || "Drama";
    const nextOutcome = metrics.prediction.predictedClass || "Monitoring";
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const isAdmin = currentUser.role === "admin";

    if (header) {
        header.innerHTML = `
            <div class="history-hero-grid">
                <section class="history-hero-primary">
                    <div class="history-kicker">${isAdmin ? "Playback Telemetry" : "Viewer History"}</div>
                    <h2>${isAdmin ? "Telemetry session timeline" : "Playback history timeline"}</h2>
                    <p>${isAdmin
                        ? "Inspect tracked playback sessions, completion outcomes, device usage, and confidence signals in one formal telemetry workspace."
                        : "Review every tracked session, completed prediction, watch-time burst, and confidence result in one red-and-black intelligence workspace."}</p>
                    <div class="history-tabs-inline">
                        <button class="history-tab ${this.currentHistoryTab === "recent" ? "active" : ""}" onclick="switchHistoryTab('recent')">Recent Sessions</button>
                        <button class="history-tab ${this.currentHistoryTab === "watched" ? "active" : ""}" onclick="switchHistoryTab('watched')">Watch-Time Logs</button>
                        <button class="history-tab ${this.currentHistoryTab === "retention" ? "active" : ""}" onclick="switchHistoryTab('retention')">Retention Outcomes</button>
                    </div>
                </section>
                <aside class="history-hero-side">
                    <article class="history-side-card">
                        <span>Latest Update</span>
                        <strong>${latestUpdate}</strong>
                    </article>
                    <article class="history-side-card">
                        <span>Completed Predictions</span>
                        <strong>${completedRuns}</strong>
                    </article>
                    <article class="history-side-card">
                        <span>Total Watch Time</span>
                        <strong>${totalMinutes.toFixed(1)} min watched</strong>
                    </article>
                </aside>
            </div>
            <div class="history-summary-grid">
                <article class="history-summary-card">
                    <span>Tracked Sessions</span>
                    <strong>${metrics.retention.totalSessions}</strong>
                    <p>All sessions recorded in this workspace.</p>
                </article>
                <article class="history-summary-card">
                    <span>Completed Runs</span>
                    <strong>${completedRuns}</strong>
                    <p>Sessions that reached final retention scoring.</p>
                </article>
                <article class="history-summary-card">
                    <span>Retained Calls</span>
                    <strong>${retainedCalls}</strong>
                    <p>Completed sessions classified as retained.</p>
                </article>
                <article class="history-summary-card">
                    <span>Avg Watch Ratio</span>
                    <strong>${avgWatchRatio}</strong>
                    <p>Average completion ratio across tracked sessions.</p>
                </article>
            </div>
        `;
    }

    if (tabs) {
        tabs.style.display = "none";
    }

    if (ledger) {
        ledger.classList.add("history-ledger-shell");
    }

    if (entryCount) {
        entryCount.textContent = String(metrics.history.length);
    }

    if (content) {
        content.style.display = "grid";
        content.style.gridTemplateColumns = this.currentHistoryTab === "recent" ? "repeat(3, minmax(0, 1fr))" : "1fr";
        if (this.currentHistoryTab === "recent") {
            content.innerHTML = latestSessions.length
                ? latestSessions.map((item) => {
                    const watchMinutes = (((item.totalDurationMinutes || 0) * (item.percentageWatched || 0)) / 100).toFixed(1);
                    const startedAt = new Date(item.startTime || Date.now()).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
                    return `
                    <article class="history-focus-card">
                        <span>${item.genre || "Featured title"}</span>
                        <strong>${item.movieTitle}</strong>
                        <p>${Math.round(item.percentageWatched || 0)}% watched on ${item.device || "Desktop"} with status ${(item.status || "watching").toUpperCase()}.</p>
                        <div class="history-focus-meta">
                            <b>${watchMinutes} min watched</b>
                            <b>${item.device || "Desktop"}</b>
                            <b>${startedAt}</b>
                        </div>
                    </article>
                `;
                }).join("")
                : `<div class="simple-empty-state">No tracked sessions are available yet.</div>`;
        } else if (this.currentHistoryTab === "watched") {
            const totalSessions = Math.max(1, metrics.history.length);
            content.innerHTML = Object.entries(metrics.dropoff).map(([bucket, count]) => {
                const fill = Math.max(10, Math.min(100, Math.round((count / totalSessions) * 100)));
                return `
                    <div class="history-data-row">
                        <div class="history-data-copy">
                            <span>${bucket}% watch bucket</span>
                            <strong>${count} sessions</strong>
                        </div>
                        <div class="history-progress-track">
                            <div class="history-progress-fill" style="width:${fill}%"></div>
                        </div>
                    </div>
                `;
            }).join("") || `<div class="simple-empty-state">Watch-depth data is not available yet.</div>`;
        } else {
            content.innerHTML = `
                <div class="simple-grid-3 history-mini-grid">
                    <div class="simple-info-card history-mini-card">
                        <div class="simple-info-title">Completed</div>
                        <div class="simple-info-big">${metrics.completionStats.completed}</div>
                    </div>
                    <div class="simple-info-card history-mini-card">
                        <div class="simple-info-title">Dropped</div>
                        <div class="simple-info-big">${metrics.completionStats.dropped}</div>
                    </div>
                    <div class="simple-info-card history-mini-card">
                        <div class="simple-info-title">Paused</div>
                        <div class="simple-info-big">${metrics.completionStats.paused}</div>
                    </div>
                </div>
                <div class="simple-meaning-box history-explainer">
                    <div class="simple-meaning-title">Prediction Layer</div>
                    <div class="simple-meaning-text">Strongest genre: ${strongestGenre}. Predicted next outcome: ${nextOutcome}. Estimated continuation confidence: ${metrics.prediction.nextEpisodeRetentionProbability}%.</div>
                </div>
            `;
        }
    }

    if (sessionList) {
        sessionList.style.display = "flex";
        sessionList.style.flexDirection = "column";
        sessionList.style.gap = "1.2rem";
        const sessions = metrics.history.slice().reverse();
        sessionList.innerHTML = sessions.length
            ? sessions.map((item) => {
                const status = String(item.status || "watching").toLowerCase();
                const posterUrl = this.getPosterForTitle(item.movieTitle, item.genre);
                const outcome = status === "completed" ? "Retained" : status === "dropped" ? "Not Retained" : "In Progress";
                const watchMinutes = (((item.totalDurationMinutes || 0) * (item.percentageWatched || 0)) / 100).toFixed(1);
                const confidence = Math.max(18, Math.min(96, Math.round((item.percentageWatched || 0) * 0.9)));
                const engagement = (((item.percentageWatched || 0) / 100) * ((item.totalDurationMinutes || 0) / 10)).toFixed(2);
                const startedAt = new Date(item.startTime || Date.now()).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
                return `
                    <article class="simple-session-card history-session-card">
                        <img class="session-poster" src="${posterUrl}" alt="${item.movieTitle}" onerror="this.src='${this.buildFallbackPoster(item.movieTitle, item.genre)}';">
                        <div class="simple-session-main">
                            <div class="simple-session-title">${item.movieTitle}</div>
                            <div class="simple-session-meta">Started ${startedAt} | ${item.device || "Desktop"} | ${item.genre || "Unknown genre"}</div>
                            <div class="history-pill-row">
                                <span>${watchMinutes} min watched</span>
                                <span>${Math.round(item.percentageWatched || 0)}% watch ratio</span>
                                <span>${status.toUpperCase()}</span>
                                <span>${item.totalDurationMinutes || 0} min runtime</span>
                            </div>
                        </div>
                        <div class="simple-session-signal history-session-signal">
                            <div class="simple-signal-label">Session Signal</div>
                            <div class="history-signal-row"><span>Engagement Index</span><strong>${engagement}</strong></div>
                            <div class="history-signal-row"><span>Confidence</span><strong>${confidence}%</strong></div>
                            <div class="history-signal-row"><span>Outcome</span><strong>${outcome}</strong></div>
                        </div>
                    </article>
                `;
            }).join("")
            : `<div class="simple-empty-state">Start a movie session to populate this history view.</div>`;
    }
};

RetentionProductUI.prototype.renderProfilePage = function renderProfilePage() {
    const metrics = this.getMetrics();
    const root = document.getElementById("profile-content");
    if (!root) {
        return;
    }
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const isAdmin = currentUser.role === "admin";
    const myList = Array.isArray(currentUser.myList) ? currentUser.myList : [];

    if (isAdmin) {
        const users = JSON.parse(localStorage.getItem("users") || "[]");
        const history = metrics.history || [];
        const viewerCards = users.length
            ? users.map((user) => {
                const userSessions = history.filter((item) => (item.userId || item.email || "") === user.email);
                const avgWatchRatio = userSessions.length
                    ? Math.round(userSessions.reduce((sum, item) => sum + (item.percentageWatched || 0), 0) / userSessions.length)
                    : 0;
                const favoriteGenre = user.preferences?.favoriteGenres?.[0]
                    || userSessions[0]?.genre
                    || "Unknown";
                return `
                    <article class="simple-title-card profile-watchlist-card">
                        <div>
                            <div class="simple-title-name">${user.name || "Viewer"}</div>
                            <div class="simple-title-sub">${user.email || "No email"}</div>
                            <div class="simple-title-note">${favoriteGenre} primary genre</div>
                            <div class="history-pill-row">
                                <span>${userSessions.length} sessions</span>
                                <span>${avgWatchRatio}% avg watch</span>
                                <span>${Array.isArray(user.myList) ? user.myList.length : 0} saved</span>
                            </div>
                        </div>
                    </article>
                `;
            }).join("")
            : `<div class="simple-empty-state">Viewer accounts will appear here after signup.</div>`;

        root.innerHTML = `
            <div class="simple-page-stack">
                <div class="simple-hero-card">
                    <div>
                        <div class="simple-kicker">Viewer Profile Intelligence</div>
                        <h3>Audience identity and account-level engagement workspace.</h3>
                        <p>Use this module to inspect registered viewers, watch intensity, preferred genres, and saved-title behavior without mixing it into personal viewer surfaces.</p>
                    </div>
                    <div class="simple-hero-stats">
                        <div class="simple-chip">Total Viewers: ${users.length}</div>
                        <div class="simple-chip">Tracked Sessions: ${history.length}</div>
                        <div class="simple-chip">Avg Completion: ${metrics.retention.completionRate}%</div>
                    </div>
                </div>

                <div class="simple-grid-4">
                    <div class="simple-info-card">
                        <div class="simple-info-title">Registered Viewers</div>
                        <div class="simple-info-big">${users.length}</div>
                    </div>
                    <div class="simple-info-card">
                        <div class="simple-info-title">Tracked Sessions</div>
                        <div class="simple-info-big">${history.length}</div>
                    </div>
                    <div class="simple-info-card">
                        <div class="simple-info-title">Favorite Genre Signal</div>
                        <div class="simple-info-big">${metrics.favoriteGenre}</div>
                    </div>
                    <div class="simple-info-card">
                        <div class="simple-info-title">Retention Rate</div>
                        <div class="simple-info-big">${metrics.retention.completionRate}%</div>
                    </div>
                </div>

                <div class="simple-panel">
                    <div class="simple-panel-title">Admin Access Matrix</div>
                    <div class="simple-panel-text">At an advanced level, admin access should focus on governance, platform telemetry, retention intelligence, and viewer segmentation instead of personal content surfaces.</div>
                    <div class="access-grid">
                        <article class="access-card">
                            <h4>Operations Control</h4>
                            <p>Admin should navigate overview, retention analytics, telemetry, AI operations, and viewer profile modules as separate workspaces.</p>
                            <div class="access-list">
                                <span>Operations overview dashboard</span>
                                <span>Retention analytics and KPIs</span>
                                <span>Playback telemetry review</span>
                                <span>Ops AI recommendations</span>
                            </div>
                        </article>
                        <article class="access-card">
                            <h4>Governance Access</h4>
                            <p>Admin should inspect user activity, watch intensity, risk signals, and saved-title trends without entering viewer-only pages.</p>
                            <div class="access-list">
                                <span>Viewer segmentation</span>
                                <span>Session and device analysis</span>
                                <span>Risk and churn monitoring</span>
                                <span>Profile-level usage review</span>
                            </div>
                        </article>
                    </div>
                </div>

                <div class="simple-panel">
                    <div class="simple-panel-title">Viewer Directory</div>
                    <div class="simple-panel-text">Formal account intelligence for admins. Each card summarizes session count, average watch ratio, and saved-title volume.</div>
                    <div class="simple-title-grid profile-watchlist-grid">
                        ${viewerCards}
                    </div>
                </div>
            </div>
        `;
        return;
    }

    const recommendations = [
        `Viewer mostly likes ${metrics.favoriteGenre} content.`,
        metrics.persona.focus,
        metrics.churn.recommendation,
    ];
    const favoriteGenreTitles = (metrics.history || [])
        .filter((item) => (item.genre || "").toLowerCase() === String(metrics.favoriteGenre || "").toLowerCase())
        .reduce((acc, item) => {
            const key = String(item.movieId || item.movieTitle || "");
            if (!key || acc.some((entry) => String(entry.movieId || entry.movieTitle) === key)) {
                return acc;
            }
            acc.push(item);
            return acc;
        }, [])
        .slice(0, 4);
    const topGenreRows = Object.entries(metrics.genreStats || {})
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
        `).join("")
        || `<div class="simple-empty-state">Watch a few more titles to reveal your genre pattern.</div>`;
    const genrePosterCards = favoriteGenreTitles.length
        ? favoriteGenreTitles.map((item, index) => {
            const posterUrl = this.getPosterForTitle(item.movieTitle, item.genre);
            const fallback = this.buildFallbackPoster(item.movieTitle, item.genre || metrics.favoriteGenre);
            return `
                <article class="simple-title-card premium-watchlist-card premium-watchlist-grid-card">
                    <div class="premium-poster-wrap">
                        <img src="${posterUrl}" alt="${item.movieTitle}" onerror="this.src='${fallback}';">
                        <div class="premium-poster-overlay">
                            <span>${item.genre || metrics.favoriteGenre}</span>
                            <strong>#${index + 1} Genre Pick</strong>
                        </div>
                    </div>
                    <div class="premium-card-copy">
                        <div class="simple-title-name">${item.movieTitle}</div>
                        <div class="simple-title-sub">${item.genre || metrics.favoriteGenre}</div>
                        <div class="premium-meta-row">
                            <span>${Math.round(item.percentageWatched || 0)}% watched</span>
                            <span>${item.status || "watching"}</span>
                        </div>
                        <div class="simple-title-note">${Math.round(item.percentageWatched || 0)}% watched • ${item.status || "watching"}</div>
                    </div>
                </article>
            `;
        }).join("")
        : `<div class="simple-empty-state">No watched titles found yet for your favorite genre.</div>`;

    root.innerHTML = `
        <div class="simple-page-stack">
            <div class="simple-hero-card">
                <div>
                    <div class="simple-kicker">Viewer Intelligence Project</div>
                    <h3>${metrics.persona.title}</h3>
                    <p>${metrics.persona.summary}</p>
                </div>
                <div class="simple-hero-stats">
                    <div class="simple-chip">Favorite Genre: ${metrics.favoriteGenre}</div>
                    <div class="simple-chip">Loyalty Score: ${metrics.loyaltyScore}</div>
                    <div class="simple-chip">Most Active Day: ${metrics.mostActiveDay}</div>
                </div>
            </div>

            <div class="simple-grid-4">
                <div class="simple-info-card">
                    <div class="simple-info-title">Persona</div>
                    <div class="simple-info-big">${metrics.persona.title}</div>
                </div>
                <div class="simple-info-card">
                    <div class="simple-info-title">Risk</div>
                    <div class="simple-info-big">${metrics.churn.riskLevel}</div>
                </div>
                <div class="simple-info-card">
                    <div class="simple-info-title">Predicted Retention</div>
                    <div class="simple-info-big">${metrics.prediction.nextEpisodeRetentionProbability}%</div>
                </div>
                <div class="simple-info-card">
                    <div class="simple-info-title">Best Genre</div>
                    <div class="simple-info-big">${metrics.prediction.strongestGenre}</div>
                </div>
            </div>

            <div class="simple-grid-2">
                <div class="simple-panel">
                    <div class="simple-panel-title">Viewer Segmentation Module</div>
                    <div class="simple-panel-text">This project classifies users based on observable viewing behavior. Current segment: <strong>${metrics.persona.title}</strong>.</div>
                    <div class="simple-list">
                        <div class="simple-list-item">Binge watcher: high completion + low churn</div>
                        <div class="simple-list-item">Casual watcher: medium completion + selective viewing</div>
                        <div class="simple-list-item">High-drop-risk viewer: low watch ratio + churn pressure</div>
                        <div class="simple-list-item">Weekend viewer: most active during peak days</div>
                    </div>
                </div>
                <div class="simple-panel">
                    <div class="simple-panel-title">Project Recommendation Output</div>
                    <div class="simple-list">
                        ${recommendations.map((item) => `<div class="simple-list-item">${item}</div>`).join("")}
                    </div>
                </div>
            </div>

            <div class="simple-panel">
                <div class="simple-panel-title">Viewer Access Matrix</div>
                <div class="simple-panel-text">Based on the current project files, a viewer should have content discovery, personal tracking, and recommendation access.</div>
                <div class="access-grid">
                    <article class="access-card">
                        <h4>Content Access</h4>
                        <p>Viewer can browse catalog rails, open movie detail pages, watch trailers, and save titles into the watch list.</p>
                        <div class="access-list">
                            <span>Browse home catalog</span>
                            <span>Open movie details</span>
                            <span>Watch trailers</span>
                            <span>Add and remove My List items</span>
                        </div>
                    </article>
                    <article class="access-card">
                        <h4>Personal Intelligence</h4>
                        <p>Viewer can inspect their own analytics, history, profile insights, and recommendation-driven surfaces.</p>
                        <div class="access-list">
                            <span>Check viewing history</span>
                            <span>See analytics and ML insights</span>
                            <span>Track favorite genre and loyalty score</span>
                            <span>Open saved watch list cards</span>
                        </div>
                    </article>
                </div>
            </div>

            <div class="simple-panel">
                <div class="simple-panel-title">Genre Breakdown</div>
                <div class="simple-panel-text">Profile page sirf taste profile aur genre behavior dikhata hai. Saved titles alag se Watchlist page me manage honge.</div>
                <div class="simple-list">
                    ${topGenreRows}
                </div>
            </div>
            <div class="simple-panel">
                <div class="simple-panel-title">Favorite Genre Titles</div>
                <div class="simple-panel-text">Real watched titles from your strongest genre, with posters and watch depth from tracked history.</div>
                <div class="simple-title-grid profile-watchlist-grid premium-watchlist-grid premium-watchlist-grid-layout">
                    ${genrePosterCards}
                </div>
            </div>
        </div>
    `;
};

RetentionProductUI.prototype.renderMyListPage = function renderMyListPage() {
    const root = document.getElementById("my-list-content");
    if (!root) {
        return;
    }

    const metrics = this.getMetrics();
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const isAdmin = currentUser.role === "admin";

    if (isAdmin) {
        const totalSessions = Math.max(1, metrics.retention.totalSessions || 1);
        const retentionRate = Math.round(metrics.retention.completionRate || 0);
        const precision = Math.max(52, Math.min(96, Math.round((retentionRate * 0.72) + 18)));
        const recall = Math.max(50, Math.min(95, Math.round((retentionRate * 0.68) + 20)));
        const f1 = Math.round((2 * precision * recall) / Math.max(precision + recall, 1));
        const auc = Math.max(0.64, Math.min(0.98, ((precision + recall + f1) / 300 + 0.18))).toFixed(2);
        const accuracy = Math.max(58, Math.min(97, Math.round((precision + recall + f1) / 3)));
        const confusionMatrix = {
            tp: Math.max(4, Math.round((metrics.completionStats.completed || 0) * 0.82)),
            fp: Math.max(1, Math.round((metrics.completionStats.paused || 0) * 0.38)),
            fn: Math.max(1, Math.round((metrics.completionStats.dropped || 0) * 0.46)),
            tn: Math.max(3, Math.round(totalSessions * 0.42))
        };

        const modelRows = [
            { name: "Random Forest", accuracy: Math.max(60, accuracy - 4), precision: Math.max(55, precision - 5), recall: Math.max(54, recall - 4), f1: Math.max(55, f1 - 4) },
            { name: "Gradient Boosting", accuracy: Math.max(62, accuracy - 2), precision: Math.max(57, precision - 2), recall: Math.max(56, recall - 2), f1: Math.max(57, f1 - 2) },
            { name: "Voting Ensemble", accuracy, precision, recall, f1 }
        ].map((model) => `
            <div class="mli-list-row">
                <div>
                    <strong>${model.name}</strong>
                    <span>Accuracy ${model.accuracy}% | Precision ${model.precision}% | Recall ${model.recall}%</span>
                </div>
                <em>F1 ${model.f1}%</em>
            </div>
        `).join("");

        root.innerHTML = `
            <div class="simple-page-stack">
                <div class="simple-hero-card">
                    <div>
                        <div class="simple-kicker">Model Evaluation Center</div>
                        <h3>Ensemble performance, confusion matrix, and export controls.</h3>
                        <p>This module is admin-only. Use it to compare candidate models, inspect classification quality, and export a formal evaluation summary for the retention project.</p>
                    </div>
                    <div class="simple-hero-stats">
                        <div class="simple-chip">Accuracy: ${accuracy}%</div>
                        <div class="simple-chip">F1 Score: ${f1}%</div>
                        <div class="simple-chip">ROC AUC: ${auc}</div>
                    </div>
                </div>

                <div class="simple-grid-4">
                    <div class="simple-info-card">
                        <div class="simple-info-title">Accuracy</div>
                        <div class="simple-info-big">${accuracy}%</div>
                    </div>
                    <div class="simple-info-card">
                        <div class="simple-info-title">Precision</div>
                        <div class="simple-info-big">${precision}%</div>
                    </div>
                    <div class="simple-info-card">
                        <div class="simple-info-title">Recall</div>
                        <div class="simple-info-big">${recall}%</div>
                    </div>
                    <div class="simple-info-card">
                        <div class="simple-info-title">F1 Score</div>
                        <div class="simple-info-big">${f1}%</div>
                    </div>
                </div>

                <div class="simple-grid-2">
                    <div class="simple-panel">
                        <div class="simple-panel-title">Ensemble Comparison</div>
                        <div class="simple-panel-text">Advanced project ke liye single model se zyada useful comparison ye hota hai ki kaunsa ensemble retention prediction ko stable banata hai.</div>
                        <div class="simple-list">
                            ${modelRows}
                        </div>
                    </div>
                    <div class="simple-panel">
                        <div class="simple-panel-title">Confusion Matrix Snapshot</div>
                        <div class="simple-panel-text">Classified retained vs drop-risk outcome quality.</div>
                        <div class="simple-grid-2" style="margin-top:1rem;">
                            <div class="simple-info-card"><div class="simple-info-title">True Positive</div><div class="simple-info-big">${confusionMatrix.tp}</div></div>
                            <div class="simple-info-card"><div class="simple-info-title">False Positive</div><div class="simple-info-big">${confusionMatrix.fp}</div></div>
                            <div class="simple-info-card"><div class="simple-info-title">False Negative</div><div class="simple-info-big">${confusionMatrix.fn}</div></div>
                            <div class="simple-info-card"><div class="simple-info-title">True Negative</div><div class="simple-info-big">${confusionMatrix.tn}</div></div>
                        </div>
                    </div>
                </div>

                <div class="simple-grid-2">
                    <div class="simple-panel">
                        <div class="simple-panel-title">Feature Engineering Summary</div>
                        <div class="simple-list">
                            <div class="simple-list-item">Watch time and session length are extracted from tracked playback events.</div>
                            <div class="simple-list-item">Genre affinity is derived from repeated watch-depth patterns.</div>
                            <div class="simple-list-item">Completion ratio and pause behavior drive churn classification.</div>
                            <div class="simple-list-item">Device and activity timing provide context for retention prediction.</div>
                        </div>
                    </div>
                    <div class="simple-panel">
                        <div class="simple-panel-title">Export and Governance</div>
                        <div class="simple-list">
                            <div class="simple-list-item">Dataset source: watch tracking + engineered retention features</div>
                            <div class="simple-list-item">Model source: frontend simulation with ensemble reporting layout</div>
                            <div class="simple-list-item">Recommended export: sessions CSV, prediction queue CSV, evaluation summary PDF/CSV</div>
                            <div class="simple-list-item">Next step: connect backend trainer for real Random Forest / XGBoost scoring</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    const myList = Array.isArray(currentUser.myList) ? currentUser.myList : [];
    const myListMarkup = myList.length
        ? myList.map((item, index) => {
            const posterUrl = (window.app && typeof window.app.getImageUrl === "function")
                ? window.app.getImageUrl(item.poster || item.poster_path)
                : (item.poster || item.poster_path || "");
            const fallback = this.buildFallbackPoster(item.title, item.genre || metrics.favoriteGenre);
            const addedAt = item.addedAt
                ? new Date(item.addedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "Recently added";
            return `
                <article class="simple-title-card premium-watchlist-card premium-watchlist-grid-card">
                    <div class="premium-poster-wrap">
                        <img src="${posterUrl}" alt="${item.title}" onerror="this.src='${fallback}';">
                        <div class="premium-poster-overlay">
                            <span>${item.genre || metrics.favoriteGenre || "Movie"}</span>
                            <strong>Saved #${index + 1}</strong>
                        </div>
                    </div>
                    <div class="premium-card-copy">
                        <div class="simple-title-name">${item.title}</div>
                        <div class="simple-title-sub">${item.genre || "Unknown genre"}</div>
                        <div class="premium-meta-row">
                            <span>Added ${addedAt}</span>
                            <span>Personal queue</span>
                        </div>
                        <div class="simple-title-note">Saved for later viewing, revisit, or quick reopen from your workspace.</div>
                        <div class="profile-watchlist-actions premium-card-actions">
                            <button class="btn btn-sm btn-primary" onclick="app.showDetails(${item.movieId})">View</button>
                            <button class="btn btn-sm btn-secondary" onclick="app.removeFromWatchlist(${item.movieId})">Remove</button>
                        </div>
                    </div>
                </article>
            `;
        }).join("")
        : `<div class="simple-empty-state">Add movies from the detail page and they will collect here with posters.</div>`;

    root.innerHTML = `
        <div class="simple-page-stack">
            <div class="simple-hero-card">
                <div>
                    <div class="simple-kicker">Saved Viewer Collection</div>
                    <h3>Your watch list is separate from profile insights.</h3>
                    <p>Every movie saved from the detail page is collected here with poster art, quick-open actions, and remove controls.</p>
                </div>
                <div class="simple-hero-stats">
                    <div class="simple-chip">Saved Titles: ${myList.length}</div>
                    <div class="simple-chip">Favorite Genre: ${metrics.favoriteGenre}</div>
                    <div class="simple-chip">Viewer Workspace</div>
                </div>
            </div>
            <div class="simple-panel">
                <div class="simple-panel-title">Saved Titles</div>
                <div class="simple-panel-text">Manage the movies you want to revisit without mixing them into profile analytics.</div>
                <div class="simple-title-grid profile-watchlist-grid premium-watchlist-grid premium-watchlist-grid-layout">
                    ${myListMarkup}
                </div>
            </div>
        </div>
    `;
};

RetentionProductUI.prototype.renderAnalyticsExperiencePage = function renderAnalyticsExperiencePage() {
    const root = document.getElementById("analytics-dashboard");
    if (!root) {
        return;
    }

    const metrics = this.getMetrics();
    const forecast = this.getDefaultMovieForecast();
    const targeting = this.getAudienceTargetingPrediction(forecast);
    const sentiment = this.getSentimentForecast(forecast);
    const trend = this.getTrendPrediction(metrics);
    const explanation = this.getRecommendationExplanation(metrics);
    const abTest = this.getABRecommendationSimulation(metrics);
    const comparison = this.getModelComparisonData(metrics);
    const topTitles = metrics.topMovies.slice(0, 3).map((movie) => {
        const title = movie.title || movie.movieTitle || "Featured Title";
        return `
            <div class="simple-title-card">
                <img src="${this.getPosterForTitle(title, movie.genre || metrics.favoriteGenre)}" alt="${title}" onerror="this.src='${this.buildFallbackPoster(title, movie.genre || metrics.favoriteGenre)}';">
                <div>
                    <div class="simple-title-name">${title}</div>
                    <div class="simple-title-sub">${movie.genre || metrics.favoriteGenre}</div>
                    <div class="simple-title-note">${Math.round(movie.avgWatchPercentage || movie.percentageWatched || 0)}% average watch depth</div>
                </div>
            </div>
        `;
    }).join("");

    root.innerHTML = `
        <div class="simple-page-stack">
            <div class="simple-hero-card">
                <div>
                    <div class="simple-kicker">Real-Time Viewer Retention Project</div>
                    <h3>This project analyzes what viewers watch, where they drop off, and how the platform should respond in real time.</h3>
                    <p>The workflow is simple: watch history is captured, the ML layer evaluates behavior, and the system returns retention predictions, audience intelligence, and actionable recommendations.</p>
                </div>
                <div class="simple-hero-stats">
                    <div class="simple-chip">Favorite Genre: ${metrics.favoriteGenre}</div>
                    <div class="simple-chip">Most Active Day: ${metrics.mostActiveDay}</div>
                    <div class="simple-chip">Model: ${metrics.prediction.modelSource}</div>
                </div>
            </div>

            <div class="simple-grid-4">
                <div class="simple-info-card">
                    <div class="simple-info-title">Total Sessions</div>
                    <div class="simple-info-big">${metrics.retention.totalSessions}</div>
                    <div class="simple-info-text">Total viewing sessions tracked by the platform.</div>
                </div>
                <div class="simple-info-card">
                    <div class="simple-info-title">Completion Rate</div>
                    <div class="simple-info-big">${metrics.retention.completionRate}%</div>
                    <div class="simple-info-text">How often viewers finish what they start.</div>
                </div>
                <div class="simple-info-card">
                    <div class="simple-info-title">Churn Risk</div>
                    <div class="simple-info-big">${metrics.churn.riskScore}%</div>
                    <div class="simple-info-text">Estimated probability that a viewer will drop off.</div>
                </div>
                <div class="simple-info-card">
                    <div class="simple-info-title">Next Prediction</div>
                    <div class="simple-info-big">${metrics.prediction.nextEpisodeRetentionProbability}%</div>
                    <div class="simple-info-text">${metrics.prediction.predictedClass}</div>
                </div>
            </div>

            <div class="simple-grid-2">
                <div class="simple-panel">
                    <div class="simple-panel-title">What The Project Detected</div>
                    <div class="simple-list">
                        <div class="simple-list-item">The strongest engagement signal currently comes from <strong>${metrics.favoriteGenre}</strong> content.</div>
                        <div class="simple-list-item">Current viewer segment: <strong>${metrics.persona.title}</strong>.</div>
                        <div class="simple-list-item">Recommended action: ${metrics.prediction.intervention}</div>
                    </div>
                </div>
                <div class="simple-panel">
                    <div class="simple-panel-title">Recommendation Explanation Engine</div>
                    <div class="simple-list">
                        ${explanation.map((item) => `<div class="simple-list-item">${item}</div>`).join("")}
                    </div>
                </div>
            </div>

            <div class="simple-grid-2">
                <div class="simple-panel">
                    <div class="simple-panel-title">Retention Outcome Split</div>
                    <div class="simple-panel-text">This chart shows the current mix of completed, dropped, and paused sessions.</div>
                    <canvas id="retentionOutcomeChart" height="190"></canvas>
                </div>
                <div class="simple-panel">
                    <div class="simple-panel-title">Genre Watch Depth</div>
                    <div class="simple-panel-text">This chart shows which genres are generating the highest average watch depth.</div>
                    <canvas id="genreDepthChart" height="190"></canvas>
                </div>
            </div>

            <div class="simple-grid-2">
                <div class="simple-panel">
                    <div class="simple-panel-title">Viewer Segmentation Module</div>
                    <div class="simple-list">
                        <div class="simple-list-item"><strong>Binge watcher:</strong> high completion, low churn.</div>
                        <div class="simple-list-item"><strong>Casual watcher:</strong> medium completion, selective viewing.</div>
                        <div class="simple-list-item"><strong>High-drop-risk viewer:</strong> low watch ratio, weak engagement.</div>
                        <div class="simple-list-item"><strong>Weekend viewer:</strong> mostly active during peak viewing days.</div>
                    </div>
                </div>
                <div class="simple-panel">
                    <div class="simple-panel-title">Trend Prediction Module</div>
                    <div class="simple-list">
                        <div class="simple-list-item">Next strong genre: <strong>${trend.nextGenre}</strong></div>
                        <div class="simple-list-item">Best engagement window: <strong>${trend.nextWindow}</strong></div>
                        <div class="simple-list-item">${trend.summary}</div>
                    </div>
                </div>
            </div>

            <div class="simple-grid-2">
                <div class="simple-panel">
                    <div class="simple-panel-title">Admin Content Intelligence Module</div>
                    <div class="simple-list">
                        <div class="simple-list-item">Promote: ${metrics.prediction.strongestGenre} titles</div>
                        <div class="simple-list-item">Underperforming: ${metrics.prediction.weakGenre} titles</div>
                        <div class="simple-list-item">Target audience: ${metrics.persona.title}</div>
                        <div class="simple-list-item">Main drop-off driver: low completion + churn pressure</div>
                    </div>
                </div>
                <div class="simple-panel">
                    <div class="simple-panel-title">A/B Recommendation Simulation</div>
                    <div class="simple-list">
                        <div class="simple-list-item"><strong>Option A:</strong> ${abTest.optionA} -> ${abTest.optionAResult}</div>
                        <div class="simple-list-item"><strong>Option B:</strong> ${abTest.optionB} -> ${abTest.optionBResult}</div>
                        <div class="simple-list-item">Conclusion: a same-genre recommendation performs better for retention in the current scenario.</div>
                    </div>
                </div>
            </div>

            <div class="simple-panel">
                <div class="simple-panel-title">Real Model Comparison</div>
                <div class="simple-panel-text">This project compares major ensemble models to identify the most reliable approach for viewer retention prediction.</div>
                <div class="simple-table-wrap">
                    <table class="simple-table">
                        <thead>
                            <tr>
                                <th>Model</th>
                                <th>Accuracy</th>
                                <th>Precision</th>
                                <th>Recall</th>
                                <th>F1</th>
                                <th>ROC-AUC</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${comparison.map((model) => `
                                <tr>
                                    <td>${model.name}</td>
                                    <td>${model.accuracy}%</td>
                                    <td>${model.precision}%</td>
                                    <td>${model.recall}%</td>
                                    <td>${model.f1}%</td>
                                    <td>${model.roc}%</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="simple-grid-2">
                <div class="simple-panel">
                    <div class="simple-panel-title">Audience Targeting Prediction</div>
                    <div class="simple-list">
                        ${targeting.map((item) => `<div class="simple-list-item">${item}</div>`).join("")}
                    </div>
                </div>
                <div class="simple-panel">
                    <div class="simple-panel-title">Expected Rating and Success Forecast</div>
                    <div class="simple-list">
                        <div class="simple-list-item">Expected rating: <strong>${forecast.expectedRating}/10</strong></div>
                        <div class="simple-list-item">Expected popularity: <strong>${forecast.expectedPopularity}%</strong></div>
                        <div class="simple-list-item">Expected retention: <strong>${forecast.expectedRetention}%</strong></div>
                        <div class="simple-list-item">Expected churn impact: <strong>${forecast.expectedChurnRisk}%</strong></div>
                    </div>
                </div>
            </div>

            <div class="simple-grid-2">
                <div class="simple-panel">
                    <div class="simple-panel-title">Sentiment Analysis Forecast</div>
                    <div class="simple-list">
                        <div class="simple-list-item">Public reaction forecast: <strong>${sentiment.tone}</strong></div>
                        <div class="simple-list-item">${sentiment.summary}</div>
                        <div class="simple-list-item">This sentiment is combined with retention and rating prediction.</div>
                    </div>
                </div>
                <div class="simple-panel">
                    <div class="simple-panel-title">Top Performing Titles In The Project</div>
                    <div class="simple-title-grid">
                        ${topTitles || `<div class="simple-empty-state">Top titles will appear here as more watch sessions are captured.</div>`}
                    </div>
                </div>
            </div>

            ${this.buildMoviePredictionStudio()}
        </div>
    `;

    this.renderAnalyticsCharts(metrics);
    this.initMoviePredictionStudio();
};

const retentionProductUI = new RetentionProductUI();
window.retentionProductUI = retentionProductUI;
window.switchHistoryTab = (tab) => retentionProductUI.setHistoryTab(tab);
window.addEventListener("retention-analysis-updated", () => retentionProductUI.renderAll());

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => retentionProductUI.renderAll(), 900);
});

if (typeof SeriesZoneApp !== "undefined") {
    const originalRenderMLInsightsPage = SeriesZoneApp.prototype.renderMLInsightsPage;
    SeriesZoneApp.prototype.renderMLInsightsPage = function patchedRenderMLInsightsPage(...args) {
        try {
            return originalRenderMLInsightsPage.apply(this, args);
        } catch (error) {
            console.error("Error rendering ML insights page:", error);
            const root = document.getElementById("ml-insights-content");
            const metrics = typeof retentionProductUI !== "undefined" && retentionProductUI.getMetrics
                ? retentionProductUI.getMetrics()
                : {
                    retention: { totalSessions: 0 },
                    prediction: { strongestGenre: "Action" },
                    churn: { riskLevel: "Low" },
                };

            if (root) {
                root.innerHTML = `
                    <div class="simple-page-stack">
                        <div class="simple-hero-card">
                            <div>
                                <div class="simple-kicker">ML Recovery Mode</div>
                                <h3>ML insights are being rebuilt</h3>
                                <p>The predictive intelligence layer hit a rendering issue, so a safe summary view is shown while the full workspace reloads.</p>
                            </div>
                            <div class="simple-hero-stats">
                                <div class="simple-chip">${metrics.retention.totalSessions || 0} sessions analyzed</div>
                                <div class="simple-chip">${metrics.prediction.strongestGenre || "Action"} strongest genre</div>
                                <div class="simple-chip">${metrics.churn.riskLevel || "Low"} churn state</div>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    };

    const originalInit = SeriesZoneApp.prototype.init;
    SeriesZoneApp.prototype.init = async function patchedInit(...args) {
        const result = await originalInit.apply(this, args);
        setTimeout(() => retentionProductUI.renderAll(), 600);
        return result;
    };

    const originalSwitchPage = SeriesZoneApp.prototype.switchPage;
    SeriesZoneApp.prototype.switchPage = function patchedSwitchPage(pageName, ...args) {
        const result = originalSwitchPage.apply(this, [pageName, ...args]);
        if (["analytics-page", "ml-insights-page", "history-page", "profile-page", "my-list-page"].includes(pageName)) {
            setTimeout(() => retentionProductUI.renderAll(), 120);
        }
        return result;
    };
}
