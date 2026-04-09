#!/usr/bin/env python3
"""
Series Zone - Complete System Verification
Tests all components working together.
"""

import json
from pathlib import Path


def safe_print(message=""):
    try:
        print(message)
    except UnicodeEncodeError:
        print(str(message).encode("ascii", errors="replace").decode("ascii"))


safe_print("\n" + "=" * 70)
safe_print("SERIES ZONE - COMPLETE SYSTEM VERIFICATION")
safe_print("=" * 70)

project_dir = Path(__file__).parent
required_files = [
    "index.html",
    "server.py",
    "retention_model_trainer.py",
    "assets/js/watch-tracking.js",
    "assets/js/ml-insights-ui.js",
    "assets/js/advanced-ml-system.js",
    "assets/js/ml-recommendations.js",
    "assets/css/style.css",
]

safe_print("\n1. Checking Project Structure...")
all_present = True
for file in required_files:
    filepath = project_dir / file
    if filepath.exists():
        size_kb = filepath.stat().st_size / 1024
        safe_print(f"   [OK] {file} ({size_kb:.1f}KB)")
    else:
        safe_print(f"   [MISSING] {file}")
        all_present = False

safe_print("\n2. Checking ML Model...")
model_dir = project_dir / "ml_models"
model_path = model_dir / "retention_model.pkl"
report_path = model_dir / "model_report.json"

if model_path.exists():
    size_mb = model_path.stat().st_size / (1024 ** 2)
    safe_print(f"   [OK] Trained model found ({size_mb:.2f}MB)")
    safe_print(f"      Location: {model_path}")
else:
    safe_print("   [MISSING] Trained model not found")
    safe_print("      Run: python retention_model_trainer.py")

if report_path.exists():
    with open(report_path, encoding="utf-8") as file:
        report = json.load(file)
    safe_print("   [OK] Model report found")
    safe_print(f"      Accuracy: {report['model_performance']['accuracy']:.1%}")
    safe_print(f"      Precision: {report['model_performance']['precision']:.1%}")
    safe_print(f"      F1-Score: {report['model_performance']['f1']:.1%}")
    safe_print(f"      AUC-ROC: {report['model_performance']['auc_roc']:.1%}")
else:
    safe_print("   [MISSING] Model report not found")

safe_print("\n3. Checking JavaScript Modules...")
js_modules = [
    ("Watch Tracking", "assets/js/watch-tracking.js"),
    ("ML System", "assets/js/advanced-ml-system.js"),
    ("ML UI", "assets/js/ml-insights-ui.js"),
    ("Recommendations", "assets/js/ml-recommendations.js"),
    ("Dashboard", "assets/js/professional-dashboard.js"),
]

for name, filepath in js_modules:
    full_path = project_dir / filepath
    if full_path.exists():
        with open(full_path, encoding="utf-8", errors="ignore") as file:
            content = file.read()
            classes = content.count("class ")
            lines = len(content.split("\n"))
        safe_print(f"   [OK] {name}: {lines} lines, {classes} classes")
    else:
        safe_print(f"   [MISSING] {name}: NOT FOUND")

safe_print("\n4. Checking HTML Structure...")
html_file = project_dir / "index.html"
if html_file.exists():
    with open(html_file, encoding="utf-8", errors="ignore") as file:
        html = file.read()

    checks = {
        "ML Insights Button": "mlInsightsBtn",
        "ML Modal": "mlInsightsModal",
        "Watch Tracking": "watch-tracking.js",
        "ML System": "advanced-ml-system.js",
        "Professional Dashboard": "professional-dashboard.js",
        "Chart.js": "chart.js",
    }

    for check_name, check_string in checks.items():
        if check_string in html:
            safe_print(f"   [OK] {check_name}")
        else:
            safe_print(f"   [MISSING] {check_name}")

safe_print("\n5. Checking Web Server...")
try:
    import urllib.request

    response = urllib.request.urlopen("http://localhost:3000", timeout=2)
    safe_print("   [OK] Web server running on localhost:3000")
    safe_print(f"      Status: {response.status}")
except Exception as exc:
    safe_print(f"   [WARN] Web server not responding: {exc}")
    safe_print("      Start with: python server.py")

safe_print("\n6. Checking Python ML Pipeline...")
try:
    import numpy
    import pandas as pd
    import sklearn

    safe_print(f"   [OK] pandas: {pd.__version__}")
    safe_print(f"   [OK] scikit-learn: {sklearn.__version__}")
    safe_print(f"   [OK] numpy: {numpy.__version__}")
except ImportError as exc:
    safe_print(f"   [MISSING] {exc}")
    safe_print("      Install: pip install pandas scikit-learn numpy")

safe_print("\n" + "=" * 70)
safe_print("SYSTEM VERIFICATION COMPLETE")
safe_print("=" * 70)

safe_print("\nQuick Start Guide:")
safe_print("   1. Browser: http://localhost:3000/")
safe_print("   2. Sign up and watch movies (auto-tracks retention)")
safe_print("   3. Click 'ML Insights' to see analysis dashboard")
safe_print("   4. Python: python retention_model_trainer.py (train model)")
safe_print("   5. Check ml_models/model_report.json for results")

safe_print("\nKey Files:")
safe_print(f"   - ML Code: {project_dir / 'retention_model_trainer.py'}")
safe_print(f"   - Model Report: {report_path if report_path.exists() else 'Not yet generated'}")
safe_print(f"   - Main App: {project_dir / 'index.html'}")

safe_print("\n" + "=" * 70 + "\n")
