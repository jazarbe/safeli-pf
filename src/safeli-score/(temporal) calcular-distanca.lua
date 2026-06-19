-- Función matemática para calcular la distancia en metros entre dos coordenadas (Haversine)
function calcular_distancia(lat1, lon1, lat2, lon2)
    local r = 6371000 -- Radio de la Tierra en metros
    local dLat = math.rad(lat2 - lat1)
    local dLon = math.rad(lon2 - lon1)
    local a = math.sin(dLat / 2) * math.sin(dLat / 2) +
              math.cos(math.rad(lat1)) * math.cos(math.rad(lat2)) *
              math.sin(dLon / 2) * math.sin(dLon / 2)
    local c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c -- Devuelve la distancia exacta en metros
end