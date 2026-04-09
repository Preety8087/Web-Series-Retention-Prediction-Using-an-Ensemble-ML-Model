<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ page import="java.util.Map" %>
<%
    Map<String, Object> overview = (Map<String, Object>) request.getAttribute("overview");
%>
<!DOCTYPE html>
<html>
<head>
    <title>Admin Overview</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="${pageContext.request.contextPath}/assets/css/app.css" rel="stylesheet">
</head>
<body>
<div class="shell container-fluid">
    <div class="card-dark mb-4">
        <div class="app-title">Admin Overview Dashboard</div>
        <p class="muted mb-0">Platform KPIs, retention signals, and ML operations summary.</p>
    </div>

    <div class="kpi-grid">
        <div class="card-dark">
            <div class="muted">Total Users</div>
            <h2><%= overview.get("totalUsers") %></h2>
        </div>
        <div class="card-dark">
            <div class="muted">Total Sessions</div>
            <h2><%= overview.get("totalSessions") %></h2>
        </div>
        <div class="card-dark">
            <div class="muted">Completion Rate</div>
            <h2><%= String.format("%.1f", overview.get("completionRate")) %>%</h2>
        </div>
        <div class="card-dark">
            <div class="muted">Top Genre</div>
            <h2><%= overview.get("topGenre") %></h2>
        </div>
    </div>
</div>
</body>
</html>
