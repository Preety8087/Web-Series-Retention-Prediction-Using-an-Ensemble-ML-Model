<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ page import="java.util.Map" %>
<%
    Map<String, Object> viewerMetrics = (Map<String, Object>) request.getAttribute("viewerMetrics");
%>
<!DOCTYPE html>
<html>
<head>
    <title>Viewer Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="${pageContext.request.contextPath}/assets/css/app.css" rel="stylesheet">
</head>
<body>
<div class="shell container-fluid">
    <div class="card-dark mb-4">
        <div class="app-title">Viewer Dashboard</div>
        <p class="muted mb-0">Personal streaming workspace with recommendations, analytics, and retention likelihood.</p>
    </div>

    <div class="kpi-grid">
        <div class="card-dark">
            <div class="muted">My Sessions</div>
            <h2><%= viewerMetrics.get("totalSessions") %></h2>
        </div>
        <div class="card-dark">
            <div class="muted">Avg Watch Ratio</div>
            <h2><%= String.format("%.1f", viewerMetrics.get("avgWatchRatio")) %>%</h2>
        </div>
        <div class="card-dark">
            <div class="muted">Avg Session Length</div>
            <h2><%= String.format("%.1f", viewerMetrics.get("avgSessionLength")) %> min</h2>
        </div>
        <div class="card-dark">
            <div class="muted">My Retention Likelihood</div>
            <h2>76%</h2>
        </div>
    </div>
</div>
</body>
</html>
