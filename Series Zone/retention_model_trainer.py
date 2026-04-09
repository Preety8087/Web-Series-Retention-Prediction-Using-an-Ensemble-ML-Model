#!/usr/bin/env python3
"""
Series Zone Retention Prediction Model
Machine Learning Pipeline for Viewer Retention Analysis
Demonstrates ensemble learning with real-world feature engineering
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import os
import sys
from pathlib import Path

try:
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import StandardScaler, LabelEncoder
    from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
    from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, roc_auc_score, roc_curve
    import joblib
    sklearn_available = True
except ImportError:
    sklearn_available = False
    print("⚠️ Scikit-learn not installed. Model training requires: pip install scikit-learn")

class RetentionModelGenerator:
    """Generate realistic synthetic watch data for retention analysis"""
    
    def __init__(self, num_users=50, num_sessions=200):
        self.num_users = num_users
        self.num_sessions = num_sessions
        self.genres = ['Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Sci-Fi', 'Thriller', 'Animation']
        self.devices = ['Desktop', 'Mobile', 'Tablet']
        self.times_of_day = ['Morning', 'Afternoon', 'Evening', 'Night']
        
    def generate_synthetic_data(self):
        """Generate realistic synthetic watch history data"""
        print("🔄 Generating synthetic watch data...")
        
        data = {
            'user_id': [],
            'movie_id': [],
            'genre': [],
            'runtime_minutes': [],
            'user_rating': [],
            'movie_rating': [],
            'watch_percentage': [],
            'session_duration_minutes': [],
            'device_type': [],
            'time_of_day': [],
            'day_of_week': [],
            'is_first_watch': [],
            'previous_completions': [],
            'average_completion_rate': [],
            'engagement_score': [],
            'retention': []  # Target: 1 = retained (continued watching), 0 = dropped
        }
        
        # Generate sessions
        for session_idx in range(self.num_sessions):
            user_id = np.random.randint(1, self.num_users + 1)
            movie_id = np.random.randint(1, 1000)
            genre = np.random.choice(self.genres)
            runtime = np.random.normal(120, 25)  # Most movies 90-150 minutes
            user_rating = np.random.uniform(0, 100)
            movie_rating = np.random.uniform(4, 9.5) * 10  # 40-95 score
            device = np.random.choice(self.devices)
            time_of_day = np.random.choice(self.times_of_day)
            day_of_week = np.random.randint(0, 7)
            
            # Feature engineering: watch behavior patterns
            is_first_watch = 1 if np.random.random() < 0.3 else 0
            previous_completions = np.random.randint(0, 20)
            average_completion_rate = np.clip(previous_completions / 10 + np.random.normal(0, 10), 0, 100)
            
            # Engagement score: combines multiple factors
            engagement_score = (
                (user_rating / 100) * 30 +
                (movie_rating / 100) * 30 +
                (average_completion_rate / 100) * 25 +
                (0.05 if time_of_day == 'Evening' else 0) * 10 +
                (0.05 if device == 'Desktop' else 0) * 5
            )
            engagement_score = np.clip(engagement_score, 0, 100)
            
            # Simulate watch percentage based on engagement and movie quality
            base_watch = 20 + (engagement_score / 2)
            watch_percentage = np.clip(
                base_watch + np.random.normal(0, 15),
                5, 100
            )
            
            session_duration = (watch_percentage / 100) * runtime
            
            # Determine retention (1 = user continued to next episode, 0 = dropped)
            # Retention probability increases with:
            # - Higher engagement score
            # - Higher watch percentage
            # - Evening viewing (more engaged)
            # - Higher previous completion rates
            drop_probability = (
                (1 - engagement_score / 100) * 0.4 +
                (1 - watch_percentage / 100) * 0.3 +
                (0.2 if time_of_day == 'Night' else 0) * 0.2 +
                (1 - average_completion_rate / 100) * 0.1
            )
            drop_probability = np.clip(drop_probability, 0.05, 0.95)
            retention = 1 if np.random.random() > drop_probability else 0
            
            # Append to data
            data['user_id'].append(user_id)
            data['movie_id'].append(movie_id)
            data['genre'].append(genre)
            data['runtime_minutes'].append(runtime)
            data['user_rating'].append(user_rating)
            data['movie_rating'].append(movie_rating)
            data['watch_percentage'].append(watch_percentage)
            data['session_duration_minutes'].append(session_duration)
            data['device_type'].append(device)
            data['time_of_day'].append(time_of_day)
            data['day_of_week'].append(day_of_week)
            data['is_first_watch'].append(is_first_watch)
            data['previous_completions'].append(previous_completions)
            data['average_completion_rate'].append(average_completion_rate)
            data['engagement_score'].append(engagement_score)
            data['retention'].append(retention)
        
        df = pd.DataFrame(data)
        print(f"✅ Generated {len(df)} synthetic sessions")
        print(f"   Retention rate: {(df['retention'].sum() / len(df) * 100):.1f}%")
        
        return df
    
    def engineer_features(self, df):
        """Create advanced ML features from raw data"""
        print("🛠️ Engineering features...")
        
        df_engineered = df.copy()
        
        # Encode categorical features
        le_genre = LabelEncoder()
        le_device = LabelEncoder()
        le_time = LabelEncoder()
        
        df_engineered['genre_encoded'] = le_genre.fit_transform(df['genre'])
        df_engineered['device_encoded'] = le_device.fit_transform(df['device_type'])
        df_engineered['time_encoded'] = le_time.fit_transform(df['time_of_day'])
        
        # Create interaction features
        df_engineered['rating_engagement'] = (df['movie_rating'] / 10) * (df['engagement_score'] / 100)
        df_engineered['watch_engagement_interaction'] = (df['watch_percentage'] / 100) * (df['engagement_score'] / 100)
        df_engineered['completion_watch_ratio'] = df['average_completion_rate'] / (df['watch_percentage'] + 1)
        
        # Polynomial features
        df_engineered['runtime_squared'] = df['runtime_minutes'] ** 2
        df_engineered['engagement_squared'] = (df['engagement_score'] / 100) ** 2
        
        # Normalize continuous features
        scaler = StandardScaler()
        continuous_cols = ['runtime_minutes', 'user_rating', 'movie_rating', 'engagement_score', 'watch_percentage']
        df_engineered[continuous_cols] = scaler.fit_transform(df[continuous_cols])
        
        print(f"✅ Created {len(df_engineered.columns)} features after engineering")
        
        return df_engineered, le_genre, le_device, le_time, scaler


class RetentionModel:
    """ML Model for viewer retention prediction"""
    
    def __init__(self):
        self.model = None
        self.feature_cols = []
        self.metrics = {}
        
    def train(self, X_train, X_test, y_train, y_test):
        """Train ensemble model with multiple algorithms"""
        print("\n🤖 Training ensemble ML model...")
        
        self.feature_cols = X_train.columns.tolist()
        
        # Create individual models
        rf_model = RandomForestClassifier(
            n_estimators=50,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
        
        gb_model = GradientBoostingClassifier(
            n_estimators=50,
            learning_rate=0.1,
            max_depth=5,
            random_state=42
        )
        
        # Voting ensemble
        self.model = VotingClassifier(
            estimators=[
                ('Random Forest', rf_model),
                ('Gradient Boosting', gb_model)
            ],
            voting='soft',
            n_jobs=-1
        )
        
        # Train
        self.model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test)
        y_pred_proba = self.model.predict_proba(X_test)[:, 1]
        
        self.metrics = {
            'accuracy': accuracy_score(y_test, y_pred),
            'precision': precision_score(y_test, y_pred),
            'recall': recall_score(y_test, y_pred),
            'f1': f1_score(y_test, y_pred),
            'auc_roc': roc_auc_score(y_test, y_pred_proba),
            'confusion_matrix': confusion_matrix(y_test, y_pred).tolist()
        }
        
        print("✅ Model trained successfully!")
        print(f"\n📊 Model Performance:")
        print(f"   Accuracy:  {self.metrics['accuracy']:.1%}")
        print(f"   Precision: {self.metrics['precision']:.1%}")
        print(f"   Recall:    {self.metrics['recall']:.1%}")
        print(f"   F1-Score:  {self.metrics['f1']:.1%}")
        print(f"   AUC-ROC:   {self.metrics['auc_roc']:.1%}")
        
        return self.metrics
    
    def predict(self, X):
        """Predict retention for new data"""
        if self.model is None:
            raise ValueError("Model not trained yet")
        
        predictions = self.model.predict(X)
        probabilities = self.model.predict_proba(X)
        
        return predictions, probabilities
    
    def save(self, filepath):
        """Save trained model"""
        if self.model is None:
            print("❌ No model to save")
            return
        
        joblib.dump(self.model, filepath)
        print(f"💾 Model saved to {filepath}")
    
    def get_feature_importance(self):
        """Get feature importance from ensemble"""
        importances = []
        
        for estimator in self.model.estimators_:
            if hasattr(estimator, 'feature_importances_'):
                importances.append(estimator.feature_importances_)
        
        if importances:
            avg_importance = np.mean(importances, axis=0)
            feature_importance = dict(zip(self.feature_cols, avg_importance))
            sorted_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
            
            print("\n🎯 Top 10 Important Features for Retention:")
            for i, (feature, importance) in enumerate(sorted_features[:10], 1):
                print(f"   {i}. {feature}: {importance:.3f}")
            
            return dict(sorted_features)
        
        return {}


def main():
    """Main execution function"""
    print("\n" + "="*60)
    print("🎬 SERIES ZONE - RETENTION PREDICTION MODEL")
    print("Machine Learning Pipeline for Viewer Retention")
    print("="*60)
    
    if not sklearn_available:
        print("\n❌ ERROR: Required packages not installed")
        print("Install with: pip install pandas scikit-learn numpy")
        return
    
    # Generate synthetic data
    generator = RetentionModelGenerator(num_users=100, num_sessions=500)
    df = generator.generate_synthetic_data()
    
    # Feature engineering
    df_engineered, le_genre, le_device, le_time, scaler = generator.engineer_features(df)
    
    # Prepare training/test split
    feature_cols = [col for col in df_engineered.columns if col not in ['user_id', 'movie_id', 'genre', 'device_type', 'time_of_day', 'retention']]
    X = df_engineered[feature_cols]
    y = df_engineered['retention']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    print(f"\n📊 Data Split:")
    print(f"   Training set: {len(X_train)} samples ({len(X_train)/len(X)*100:.1f}%)")
    print(f"   Test set: {len(X_test)} samples ({len(X_test)/len(X)*100:.1f}%)")
    print(f"   Training retention distribution: {y_train.sum()}/{len(y_train)} retained ({y_train.sum()/len(y_train)*100:.1f}%)")
    
    # Train model
    model = RetentionModel()
    metrics = model.train(X_train, X_test, y_train, y_test)
    
    # Feature importance
    feature_importance = model.get_feature_importance()
    
    # Make predictions on test set
    print("\n🔮 Sample Predictions:")
    predictions, probabilities = model.predict(X_test.head(5))
    for i, (pred, prob) in enumerate(zip(predictions[:5], probabilities[:5])):
        retention_prob = prob[1] * 100
        status = "✅ RETAINED" if pred == 1 else "❌ DROPPED"
        print(f"   Sample {i+1}: {status} (Confidence: {max(prob)*100:.1f}%)")
    
    # Save results
    output_dir = Path(__file__).parent.parent.parent / 'ml_models'
    output_dir.mkdir(exist_ok=True)
    
    # Save model
    model_path = output_dir / 'retention_model.pkl'
    model.save(str(model_path))
    
    # Save report
    report = {
        'timestamp': datetime.now().isoformat(),
        'dataset_info': {
            'total_sessions': len(df),
            'retention_rate': float(df['retention'].sum() / len(df)),
            'features': len(feature_cols)
        },
        'model_performance': metrics,
        'top_features': dict(list(feature_importance.items())[:10])
    }
    
    report_path = output_dir / 'model_report.json'
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n💾 Report saved to {report_path}")
    
    print("\n" + "="*60)
    print("✅ Training complete!")
    print("="*60 + "\n")


if __name__ == '__main__':
    main()
