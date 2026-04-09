INSERT INTO users (name, email, password_hash, role, favorite_genre) VALUES
('Preety Nayak', 'preety@example.com', 'demo_hash', 'viewer', 'Action'),
('Rahul Sharma', 'rahul@example.com', 'demo_hash', 'viewer', 'Sci-Fi'),
('Platform Admin', 'admin@velocon.ai', 'demo_hash', 'admin', 'Analytics');

INSERT INTO movies (title, genre, duration_minutes, poster_url, description) VALUES
('The Hidden Dungeon', 'Fantasy', 145, 'https://image.tmdb.org/t/p/w500/test1.jpg', 'Fantasy action drama.'),
('Midnight Protocol', 'Thriller', 128, 'https://image.tmdb.org/t/p/w500/test2.jpg', 'Cyber thriller series film.'),
('Frieren Beyond Journeys End', 'Adventure', 132, 'https://image.tmdb.org/t/p/w500/test3.jpg', 'Adventure fantasy title.'),
('The Batman', 'Crime', 176, 'https://image.tmdb.org/t/p/w500/test4.jpg', 'Dark detective story.'),
('Dune Part Two', 'Sci-Fi', 166, 'https://image.tmdb.org/t/p/w500/test5.jpg', 'Sci-fi epic.');

INSERT INTO watch_sessions (user_id, movie_id, genre, watch_duration, percentage_watched, paused_count, completed, device, session_timestamp) VALUES
(1, 1, 'Fantasy', 98, 67.50, 2, FALSE, 'Desktop', '2026-04-01 21:15:00'),
(1, 4, 'Crime', 154, 87.40, 1, TRUE, 'Desktop', '2026-04-02 20:00:00'),
(1, 5, 'Sci-Fi', 64, 38.10, 3, FALSE, 'Mobile', '2026-04-03 23:00:00'),
(2, 5, 'Sci-Fi', 146, 92.00, 0, TRUE, 'TV', '2026-04-02 19:00:00'),
(2, 2, 'Thriller', 42, 28.00, 4, FALSE, 'Mobile', '2026-04-04 22:10:00'),
(2, 3, 'Adventure', 110, 83.30, 1, TRUE, 'Desktop', '2026-04-05 18:40:00');

INSERT INTO watchlists (user_id, movie_id) VALUES
(1, 5),
(1, 3),
(2, 1);

INSERT INTO ml_predictions (user_id, retention_class, churn_probability, recommended_intervention, model_name) VALUES
(1, 'at_risk', 71.20, 'Recommend shorter content and sequel nudges', 'Voting Ensemble'),
(2, 'retained', 18.40, 'Promote genre-based recommendations', 'Voting Ensemble');
