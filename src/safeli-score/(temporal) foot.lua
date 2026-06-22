local delitos_data = dofile("/data/delitos_data.lua")

-- Tu función matemática (Haversine) para medir distancia
function calcular_distancia(lat1, lon1, lat2, lon2)
    local r = 6371000 -- Radio de la Tierra en metros
    local dLat = math.rad(lat2 - lat1)
    local dLon = math.rad(lon2 - lon1)
    local a = math.sin(dLat / 2) * math.sin(dLat / 2) +
              math.cos(math.rad(lat1)) * math.cos(math.rad(lat2)) *
              math.sin(dLon / 2) * math.sin(dLon / 2)
    local c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c -- Distancia exacta en metros
end

-- Configuración base requerida por OSRM
api_version = 4

function setup()
  return {
    properties = {
      max_speed_for_map_matching = 5, -- km/h
      weight_name                = 'duration',
      -- CRUCIAL: Cambiar a true para que OSRM procese las coordenadas de TODOS los nodos
      process_call_tagless_node  = true, 
      u_turn_penalty             = 0
    },
    default_speed = 5, -- Velocidad base caminando: 5 km/h
    pre_speeds = {}
  }
end

-- Define las velocidades base de las calles
function process_way(profile, way, result)
  result.forward_speed = profile.default_speed
  result.backward_speed = profile.default_speed
end

-- Esta función analiza cada nodo/esquina del mapa geográficamente
function process_node(profile, node, result)
  if node and node:location() then
    local lat_nodo = node:location():lat()
    local lng_nodo = node:location():lon()

    local penalizacion_total = 0

    -- Recorremos tus delitos exportados desde Supabase
    for _, delito in ipairs(delitos_data.zonas) do
        local dist = calcular_distancia(lat_nodo, lng_nodo, delito.lat, delito.lng)
        
        if dist <= delito.radio then
            -- Si la esquina está en zona de peligro, le sumamos un costo de tiempo.
            -- Ejemplo: cada punto de gravedad le añade 90 segundos de "demora virtual".
            -- Al simular que tardás más por acá, el ruteador buscará un camino alternativo seguro.
            local segundos_penalizacion = delito.gravedad * 90
            penalizacion_total = penalizacion_total + segundos_penalizacion
        end
    end

    -- Si el nodo es peligroso, le inyectamos el peso extra al grafo de OSRM
    if penalizacion_total > 0 then
        result.duration = (result.duration or 0) + penalizacion_total
        result.weight = (result.weight or 0) + penalizacion_total
    end
  end
end

return {
  setup = setup,
  process_way = process_way,
  process_node = process_node
}