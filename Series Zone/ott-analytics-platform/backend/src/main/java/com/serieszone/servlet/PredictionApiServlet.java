package com.serieszone.servlet;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serieszone.model.PredictionResult;
import com.serieszone.service.MLPredictionService;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@WebServlet("/api/predictions/user")
public class PredictionApiServlet extends HttpServlet {
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final MLPredictionService mlPredictionService = new MLPredictionService();

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        try {
            Map<String, Object> payload = objectMapper.readValue(req.getInputStream(), Map.class);
            PredictionResult result = mlPredictionService.predictForUser(payload);
            resp.setContentType("application/json");
            objectMapper.writeValue(resp.getOutputStream(), result);
        } catch (Exception exception) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            Map<String, Object> error = new HashMap<>();
            error.put("error", exception.getMessage());
            resp.setContentType("application/json");
            objectMapper.writeValue(resp.getOutputStream(), error);
        }
    }
}
