# Series Zone OTT Analytics Platform

Advanced-level OTT analytics platform with two separate systems:

1. Viewer System
2. Admin System

Stack:

- Frontend: JSP, HTML, CSS, Bootstrap, JavaScript
- Backend: Java Servlets
- Database: MySQL
- ML Layer: Python + scikit-learn

## Folder Structure

```text
ott-analytics-platform/
├── backend/
│   └── src/
│       └── main/
│           ├── java/
│           │   └── com/serieszone/
│           │       ├── config/
│           │       ├── model/
│           │       ├── service/
│           │       └── servlet/
│           ├── resources/
│           │   └── application.properties.example
│           └── webapp/
│               ├── WEB-INF/
│               │   └── web.xml
│               ├── assets/
│               │   ├── css/
│               │   └── js/
│               ├── viewer/
│               │   ├── dashboard.jsp
│               │   └── profile.jsp
│               └── admin/
│                   ├── overview.jsp
│                   ├── retention.jsp
│                   ├── models.jsp
│                   └── profiles.jsp
├── database/
│   ├── schema.sql
│   └── sample_data.sql
├── ml/
│   ├── data/
│   │   └── watch_sessions.csv
│   ├── outputs/
│   ├── predict_retention.py
│   ├── requirements.txt
│   └── train_retention_model.py
└── pom.xml
```

## Systems

### Viewer System

- Browse titles
- Movie details
- Watchlist
- Watch history
- Personal analytics
- Personalized recommendations
- Profile page

Only personal data should appear:

- My watchlist
- My history
- My favorite genre
- My recommendations
- My retention likelihood

### Admin System

- Overview dashboard
- Retention analytics
- User behavior analysis
- Feature engineering summary
- ML model comparison
- Evaluation dashboard
- Prediction monitor
- User segmentation
- Export reports

Only platform-wide data should appear.

## Database Setup

1. Create a MySQL database:

```sql
CREATE DATABASE series_zone_analytics;
```

2. Run:

```bash
mysql -u root -p series_zone_analytics < database/schema.sql
mysql -u root -p series_zone_analytics < database/sample_data.sql
```

## Python ML Setup

1. Create a Python environment.
2. Install dependencies:

```bash
pip install -r ml/requirements.txt
```

3. Train the model:

```bash
python ml/train_retention_model.py
```

This generates:

- `ml/outputs/retention_model.pkl`
- `ml/outputs/model_metrics.json`

## Java Setup

1. Update database credentials in:

`backend/src/main/resources/application.properties.example`

2. Build:

```bash
mvn clean package
```

3. Deploy the generated WAR to Tomcat.

## API Integration Flow

1. Java servlet receives admin or viewer request.
2. JDBC reads MySQL data.
3. `MLPredictionService` calls Python script with JSON input.
4. Python returns prediction payload in JSON.
5. Servlet forwards data to JSP or returns JSON to frontend JS.

## What Is Runnable Here

This scaffold is complete and connected at architecture level:

- schema
- dummy data
- Java servlet structure
- JSP pages
- Python ML scripts
- Java/Python integration hook

To fully run it, you still need:

- MySQL running
- Python environment
- Maven
- Tomcat or another servlet container

## Suggested Next Build Steps

1. Replace dummy movie catalog with TMDB or internal catalog API.
2. Add login/session handling with servlet filters.
3. Replace demo metrics with live SQL aggregations.
4. Add Chart.js visualizations on admin JSP pages.
5. Schedule nightly model retraining.
