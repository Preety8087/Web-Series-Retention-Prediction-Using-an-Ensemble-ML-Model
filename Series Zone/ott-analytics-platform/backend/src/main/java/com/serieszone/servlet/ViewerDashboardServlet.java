package com.serieszone.servlet;

import com.serieszone.service.AnalyticsService;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

@WebServlet("/viewer/dashboard")
public class ViewerDashboardServlet extends HttpServlet {
    private final AnalyticsService analyticsService = new AnalyticsService();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        try {
            long demoUserId = 1L;
            req.setAttribute("viewerMetrics", analyticsService.getViewerDashboard(demoUserId));
            req.getRequestDispatcher("/viewer/dashboard.jsp").forward(req, resp);
        } catch (Exception exception) {
            throw new ServletException("Unable to load viewer dashboard", exception);
        }
    }
}
