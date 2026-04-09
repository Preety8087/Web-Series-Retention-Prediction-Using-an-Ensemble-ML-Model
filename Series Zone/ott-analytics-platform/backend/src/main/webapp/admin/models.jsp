<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<!DOCTYPE html>
<html>
<head>
    <title>Model Evaluation</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="${pageContext.request.contextPath}/assets/css/app.css" rel="stylesheet">
</head>
<body>
<div class="shell container-fluid">
    <div class="card-dark mb-4">
        <div class="app-title">ML Models and Evaluation</div>
        <p class="muted">Random Forest, Gradient Boosting, Voting Ensemble, confusion matrix, precision, recall, F1, and ROC-AUC.</p>
    </div>

    <div class="kpi-grid">
        <div class="card-dark"><div class="muted">Random Forest</div><h2>84%</h2></div>
        <div class="card-dark"><div class="muted">Gradient Boosting</div><h2>86%</h2></div>
        <div class="card-dark"><div class="muted">Voting Ensemble</div><h2>89%</h2></div>
        <div class="card-dark"><div class="muted">ROC-AUC</div><h2>0.91</h2></div>
    </div>
</div>
</body>
</html>
