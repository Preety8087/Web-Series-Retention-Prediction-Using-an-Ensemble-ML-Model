package com.serieszone.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serieszone.model.PredictionResult;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Map;

public class MLPredictionService {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    public PredictionResult predictForUser(Map<String, Object> features) throws Exception {
        String payload = OBJECT_MAPPER.writeValueAsString(features);
        ProcessBuilder pb = new ProcessBuilder("python", "ml/predict_retention.py", payload);
        pb.redirectErrorStream(true);
        Process process = pb.start();

        StringBuilder output = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
            new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line);
            }
        }

        int exitCode = process.waitFor();
        if (exitCode != 0) {
            throw new IllegalStateException("Python prediction failed: " + output);
        }

        return OBJECT_MAPPER.readValue(output.toString(), PredictionResult.class);
    }
}
