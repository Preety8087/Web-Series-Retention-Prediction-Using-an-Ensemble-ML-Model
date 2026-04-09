package com.serieszone.model;

public class PredictionResult {
    private String predictedClass;
    private double churnProbability;
    private String intervention;
    private double accuracy;
    private double precision;
    private double recall;
    private double f1Score;
    private double rocAuc;

    public String getPredictedClass() { return predictedClass; }
    public void setPredictedClass(String predictedClass) { this.predictedClass = predictedClass; }
    public double getChurnProbability() { return churnProbability; }
    public void setChurnProbability(double churnProbability) { this.churnProbability = churnProbability; }
    public String getIntervention() { return intervention; }
    public void setIntervention(String intervention) { this.intervention = intervention; }
    public double getAccuracy() { return accuracy; }
    public void setAccuracy(double accuracy) { this.accuracy = accuracy; }
    public double getPrecision() { return precision; }
    public void setPrecision(double precision) { this.precision = precision; }
    public double getRecall() { return recall; }
    public void setRecall(double recall) { this.recall = recall; }
    public double getF1Score() { return f1Score; }
    public void setF1Score(double f1Score) { this.f1Score = f1Score; }
    public double getRocAuc() { return rocAuc; }
    public void setRocAuc(double rocAuc) { this.rocAuc = rocAuc; }
}
