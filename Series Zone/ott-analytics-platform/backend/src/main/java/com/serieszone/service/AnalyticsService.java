package com.serieszone.service;

import com.serieszone.config.DatabaseConfig;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.HashMap;
import java.util.Map;

public class AnalyticsService {
    public Map<String, Object> getAdminOverview() throws Exception {
        Map<String, Object> data = new HashMap<>();
        try (Connection connection = DatabaseConfig.getConnection()) {
            data.put("totalUsers", singleInt(connection, "SELECT COUNT(*) FROM users WHERE role = 'viewer'"));
            data.put("totalSessions", singleInt(connection, "SELECT COUNT(*) FROM watch_sessions"));
            data.put("completionRate", singleDouble(connection,
                "SELECT COALESCE(AVG(CASE WHEN completed = TRUE THEN 100 ELSE 0 END), 0) FROM watch_sessions"));
            data.put("avgWatchRatio", singleDouble(connection,
                "SELECT COALESCE(AVG(percentage_watched), 0) FROM watch_sessions"));
            data.put("topGenre", singleString(connection,
                "SELECT genre FROM watch_sessions GROUP BY genre ORDER BY AVG(percentage_watched) DESC LIMIT 1"));
        }
        return data;
    }

    public Map<String, Object> getViewerDashboard(long userId) throws Exception {
        Map<String, Object> data = new HashMap<>();
        try (Connection connection = DatabaseConfig.getConnection()) {
            PreparedStatement statement = connection.prepareStatement(
                "SELECT COALESCE(AVG(percentage_watched), 0) AS avg_ratio, " +
                "COALESCE(AVG(watch_duration), 0) AS avg_duration, " +
                "COUNT(*) AS total_sessions " +
                "FROM watch_sessions WHERE user_id = ?");
            statement.setLong(1, userId);
            ResultSet resultSet = statement.executeQuery();
            if (resultSet.next()) {
                data.put("avgWatchRatio", resultSet.getDouble("avg_ratio"));
                data.put("avgSessionLength", resultSet.getDouble("avg_duration"));
                data.put("totalSessions", resultSet.getInt("total_sessions"));
            }
        }
        return data;
    }

    private int singleInt(Connection connection, String sql) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet rs = statement.executeQuery()) {
            return rs.next() ? rs.getInt(1) : 0;
        }
    }

    private double singleDouble(Connection connection, String sql) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet rs = statement.executeQuery()) {
            return rs.next() ? rs.getDouble(1) : 0;
        }
    }

    private String singleString(Connection connection, String sql) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet rs = statement.executeQuery()) {
            return rs.next() ? rs.getString(1) : "Unknown";
        }
    }
}
