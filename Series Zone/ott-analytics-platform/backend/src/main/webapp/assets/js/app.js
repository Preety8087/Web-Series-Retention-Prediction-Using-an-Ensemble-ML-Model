async function requestPrediction(features) {
    const response = await fetch("/api/predictions/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(features)
    });
    return response.json();
}
