package com.serieszone.model;

import java.sql.Timestamp;

public class WatchSession {
    private long userId;
    private long movieId;
    private String genre;
    private int watchDuration;
    private double percentageWatched;
    private int pausedCount;
    private boolean completed;
    private String device;
    private Timestamp timestamp;

    public long getUserId() { return userId; }
    public void setUserId(long userId) { this.userId = userId; }
    public long getMovieId() { return movieId; }
    public void setMovieId(long movieId) { this.movieId = movieId; }
    public String getGenre() { return genre; }
    public void setGenre(String genre) { this.genre = genre; }
    public int getWatchDuration() { return watchDuration; }
    public void setWatchDuration(int watchDuration) { this.watchDuration = watchDuration; }
    public double getPercentageWatched() { return percentageWatched; }
    public void setPercentageWatched(double percentageWatched) { this.percentageWatched = percentageWatched; }
    public int getPausedCount() { return pausedCount; }
    public void setPausedCount(int pausedCount) { this.pausedCount = pausedCount; }
    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }
    public String getDevice() { return device; }
    public void setDevice(String device) { this.device = device; }
    public Timestamp getTimestamp() { return timestamp; }
    public void setTimestamp(Timestamp timestamp) { this.timestamp = timestamp; }
}
