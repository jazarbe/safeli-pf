-- Archivo: foot.lua
local delitos_data = require("delitos_data")

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
      process_call_tagless_node  = false,
      u_turn_penalty             = 0
    },
    default_speed = 5, -- Velocidad base caminando: 5 km/h
    pre_speeds = {}
  }
end

-- Esta función analiza cada segmento de calle del mapa
function process_way(profile, way, result)
  -- Permitir que el peatón camine por cualquier calle residencial/peatonal por defecto
  result.forward_speed = profile.default_speed
  result.backward_speed = profile.default_speed

  -- OSRM no da las coordenadas exactas de la calle directamente aquí de forma simple, 
  -- pero podemos usar un punto estimado del segmento para evaluar el peligro:
  local nodes_count = way:get_nodes_count()
  if nodes_count > 0 then
    -- Tomamos el primer nodo del segmento de calle para evaluar su posición geográfica
    local primer_nodo = way:get_node_at(0)
    if primer_nodo and primer_nodo:location() then
        local lat_calle = primer_nodo:location():lat()
        local lng_calle = primer_nodo:location():lon()

        -- Recorremos tus delitos exportados desde Supabase
        for _, delito in ipairs(delitos_data.zonas) do
            -- Usamos tu función matemática
            local dist = calcular_distancia(lat_calle, lng_calle, delito.lat, delito.lng)
            
            if dist <= delito.radio then
                -- CLASIFICACIÓN UNIFICADA: Si hay peligro, reducimos drásticamente la velocidad.
                -- Al bajar la velocidad, OSRM va a calcular que se tarda más por acá y buscará otro camino.
                local penalizacion = delito.gravedad * 0.18
                result.forward_speed = math.max(0.5, result.forward_speed * (1 - penalizacion))
                result.backward_speed = math.max(0.5, result.backward_speed * (1 - penalizacion))
            end
        end
    end
  end
end

function process_node(profile, node, result)
  -- Requerido por OSRM para procesar cruces de calles
end

return {
  setup = setup,
  process_way = process_way,
  process_node = process_node
}