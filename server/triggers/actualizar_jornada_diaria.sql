-- =============================================================================
-- TRIGGER: Actualizar jornada_diaria automáticamente
-- =============================================================================
-- 
-- Este trigger se ejecuta después de cada INSERT en la tabla 'fichaje' y
-- actualiza o crea el registro correspondiente en 'jornada_diaria'.
-- 
-- Cálculos que realiza:
-- - hora_inicio: Primer fichaje de tipo 'entrada' del día
-- - hora_fin: Último fichaje de tipo 'salida' del día
-- - horas_trabajadas: Diferencia entre entrada y salida menos pausas
-- - horas_pausas: Suma de todas las pausas (pausa_fin - pausa_inicio)
-- =============================================================================

CREATE OR REPLACE FUNCTION actualizar_jornada_diaria_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_fecha DATE;
  v_id_empleado BIGINT;
  v_hora_inicio TIMESTAMP WITH TIME ZONE;
  v_hora_fin TIMESTAMP WITH TIME ZONE;
  v_horas_trabajadas NUMERIC(6,2);
  v_horas_pausas NUMERIC(6,2);
  v_estado VARCHAR(50);
  v_id_jornada BIGINT;
BEGIN
  -- Obtener la fecha del fichaje (solo la parte de fecha, sin hora)
  v_fecha := DATE(NEW.timestamp_registro);
  v_id_empleado := NEW.id_empleado;
  
  -- Obtener primer fichaje de tipo 'entrada' del día
  SELECT timestamp_registro INTO v_hora_inicio
  FROM fichaje
  WHERE id_empleado = v_id_empleado
    AND DATE(timestamp_registro) = v_fecha
    AND tipo_registro = 'entrada'
  ORDER BY timestamp_registro ASC
  LIMIT 1;
  
  -- Obtener último fichaje de tipo 'salida' del día
  SELECT timestamp_registro INTO v_hora_fin
  FROM fichaje
  WHERE id_empleado = v_id_empleado
    AND DATE(timestamp_registro) = v_fecha
    AND tipo_registro = 'salida'
  ORDER BY timestamp_registro DESC
  LIMIT 1;
  
  -- Calcular duración total de pausas
  WITH pausas_calculadas AS (
    SELECT 
      inicio.timestamp_registro AS pausa_inicio,
      fin.timestamp_registro AS pausa_fin,
      EXTRACT(EPOCH FROM (fin.timestamp_registro - inicio.timestamp_registro)) / 3600.0 AS duracion_horas
    FROM fichaje inicio
    LEFT JOIN LATERAL (
      SELECT timestamp_registro
      FROM fichaje
      WHERE id_empleado = inicio.id_empleado
        AND DATE(timestamp_registro) = DATE(inicio.timestamp_registro)
        AND tipo_registro = 'pausa_fin'
        AND timestamp_registro > inicio.timestamp_registro
      ORDER BY timestamp_registro ASC
      LIMIT 1
    ) fin ON TRUE
    WHERE inicio.id_empleado = v_id_empleado
      AND DATE(inicio.timestamp_registro) = v_fecha
      AND inicio.tipo_registro = 'pausa_inicio'
      AND fin.timestamp_registro IS NOT NULL
  )
  SELECT COALESCE(SUM(duracion_horas), 0) INTO v_horas_pausas
  FROM pausas_calculadas;
  
  -- Calcular horas trabajadas
  IF v_hora_inicio IS NOT NULL AND v_hora_fin IS NOT NULL THEN
    v_horas_trabajadas := EXTRACT(EPOCH FROM (v_hora_fin - v_hora_inicio)) / 3600.0 - v_horas_pausas;
    -- Asegurar que no sea negativo
    IF v_horas_trabajadas < 0 THEN
      v_horas_trabajadas := 0;
    END IF;
    v_estado := 'cerrada';
  ELSE
    v_horas_trabajadas := 0;
    v_estado := 'abierta';
  END IF;
  
  -- Verificar si ya existe un registro en jornada_diaria
  SELECT id_jornada INTO v_id_jornada
  FROM jornada_diaria
  WHERE id_empleado = v_id_empleado
    AND fecha = v_fecha;
  
  -- Si existe, actualizar; si no, insertar
  IF v_id_jornada IS NOT NULL THEN
    UPDATE jornada_diaria
    SET 
      hora_inicio = v_hora_inicio,
      hora_fin = v_hora_fin,
      horas_trabajadas = v_horas_trabajadas,
      horas_pausas = v_horas_pausas,
      estado = v_estado
    WHERE id_jornada = v_id_jornada;
  ELSE
    INSERT INTO jornada_diaria (
      id_empleado,
      fecha,
      hora_inicio,
      hora_fin,
      horas_trabajadas,
      horas_pausas,
      horas_extra,
      estado
    ) VALUES (
      v_id_empleado,
      v_fecha,
      v_hora_inicio,
      v_hora_fin,
      v_horas_trabajadas,
      v_horas_pausas,
      0, -- horas_extra se calculan posteriormente por la aplicación
      v_estado
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger si existe (para poder recrearlo)
DROP TRIGGER IF EXISTS trigger_actualizar_jornada_diaria ON fichaje;

-- Crear el trigger
CREATE TRIGGER trigger_actualizar_jornada_diaria
  AFTER INSERT ON fichaje
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_jornada_diaria_fn();

-- Nota: Este trigger también debería ejecutarse después de UPDATE o DELETE
-- pero por ahora solo lo configuramos para INSERT como solicitó el usuario
