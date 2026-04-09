package com.serieszone.config;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public final class DatabaseConfig {
    private static final String DB_URL = "jdbc:mysql://localhost:3306/series_zone_analytics";
    private static final String DB_USER = "root";
    private static final String DB_PASSWORD = "your_password";

    private DatabaseConfig() {
    }

    public static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(DB_URL, DB_USER, DB_PASSWORD);
    }
}
