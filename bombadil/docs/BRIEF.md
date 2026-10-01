# Brief de desarrollo — Sakura (MVP)

> Documento para Claude Code. Ponlo en la raíz del repo (puedes renombrarlo a `CLAUDE.md` o referenciarlo desde ahí).
> Nombre de trabajo: **Sakura**. Owner: Felipe Garzón (producto, comportamiento, primer usuario).

---

## 1. Qué estamos construyendo

Sakura es un **asistente de longevidad basado en evidencia**. Toma los exámenes de laboratorio y las mediciones de una persona (PDFs de distintos laboratorios y años, presión arterial, peso, cintura, actividad, sueño), los convierte en una línea de tiempo interpretada y acompaña a la persona a sostener cambios de hábitos contra metas concretas.

Posicionamiento: **longevidad sin humo**. Nada de suplementos milagro ni "edad biológica" mágica. Nos enfocamos en las palancas con mejor evidencia: capacidad cardiorrespiratoria, fuerza, presión arterial, lípidos, glucosa, hígado, sueño y alcohol.

El valor diferencial no es interpretar un examen (eso se volverá commodity), sino tres cosas:
1. **Mirada longitudinal y relacional**: tendencias entre años y conexiones entre marcadores (p. ej. HDL bajando + triglicéridos subiendo + ALT subiendo + cintura alta = un mismo cuadro metabólico, no cuatro problemas).
2. **Diseño del cambio sostenido**: pocas prioridades a la vez, metas cortas, retroalimentación contra la propia línea base.
3. **Contexto local (Colombia)**: laboratorios, alimentos accesibles, costos y sistema de salud reales.

## 2. Objetivo de este MVP

No es un SaaS público. Es la herramienta para operar un **piloto concierge con 10 a 15 personas durante 8 a 12 semanas**, con Felipe como operador y usuario cero.

El piloto debe responder tres preguntas:
- **Retención**: ¿siguen reportando datos en la semana 6?
- **Efecto**: ¿cambia al menos un hábito o marcador medible?
- **Disposición a pagar**: ¿cuánto pagarían por continuar?

Todo lo que no ayude a responder esas preguntas queda fuera del MVP. Preferir flujos semi-manuales operados por el admin antes que automatizaciones complejas.

## 3. Usuarios y roles

- **Admin/operador** (Felipe): crea participantes, revisa y corrige extracciones de PDFs, aprueba los informes antes de que el participante los vea, ve métricas del piloto.
- **Participante**: sube exámenes, registra mediciones, responde check-ins semanales, ve su línea de tiempo, informe y metas.

## 4. Alcance

### Dentro del MVP
1. **Onboarding + consentimiento**: consentimiento informado explícito para tratamiento de datos de salud (ver §7), datos básicos (edad, sexo, altura) y objetivo personal en texto libre.
2. **Ingesta de exámenes**: subir PDF → extracción estructurada con la API de Claude → **revisión humana obligatoria** por el admin → guardar resultados normalizados.
3. **Catálogo de biomarcadores**: nombre canónico, sinónimos (cada laboratorio los llama distinto), unidad canónica y conversiones, rango de referencia y rango "óptimo" con fuente citada.
4. **Línea de tiempo**: gráfico por marcador con todos los puntos históricos, rango de referencia sombreado y dirección de la tendencia.
5. **Informe interpretativo**: generado con Claude a partir de datos estructurados (nunca del PDF crudo). Estructura fija: qué empeoró, qué mejoró, qué está estable, cómo se conectan los hallazgos, 1 a 3 prioridades y qué conviene consultar con el médico. Pasa por aprobación del admin.
6. **Mediciones manuales**: peso, cintura, presión arterial (con fecha, hora y brazo), frecuencia cardiaca en reposo, horas de sueño y minutos de ejercicio.
7. **Metas**: metas a 3, 6 y 12 meses por métrica, con estado (en camino / estancado / retrocediendo) calculado contra línea base y meta.
8. **Check-in semanal**: formulario corto (menos de 2 minutos) con mediciones de la semana, adherencia a las 1-3 prioridades y una pregunta abierta. Respuesta breve generada por Claude con el tono definido en §6.
9. **Reglas de escalamiento** (ver §6.3): deterministas, en código, no dependen del LLM.
10. **Panel del admin**: participantes, check-ins pendientes, retención por semana, alertas activas y registro de disposición a pagar.

### Fuera del MVP (no construir todavía)
- Integración con wearables (Strava, Apple Health, Garmin). Dejar la interfaz de datos preparada para agregarla después.
- Pagos, planes o suscripciones.
- App móvil nativa (web responsive es suficiente).
- "Edad biológica" o scores propietarios.
- Chat libre ilimitado con el asistente.
- Alianzas o integración directa con laboratorios.

## 5. Stack sugerido

Propuesta inicial; Claude Code puede proponer alternativas justificadas antes de empezar.

- **Frontend + backend**: Next.js (App Router) + TypeScript.
- **Base de datos y autenticación**: Supabase (Postgres + Auth + Storage), con **Row Level Security** en todas las tablas con datos de participantes.
- **LLM**: API de Anthropic (Claude). Salidas estructuradas en JSON validadas con Zod.
- **Gráficos**: Recharts.
- **Hosting**: Vercel.
- **Testing**: Vitest para lógica de dominio y Playwright para 2 o 3 flujos críticos.

Principios técnicos:
- La lógica clínica (conversión de unidades, clasificación contra rangos, tendencias, estados de metas, reglas de escalamiento) vive en un **módulo de dominio puro, sin LLM y con tests**.
- El LLM solo hace dos cosas: (a) extraer datos de PDFs a JSON, y (b) redactar texto a partir de datos ya estructurados y calculados.
- Todos los prompts viven versionados en `/prompts`, y cada salida del LLM guarda qué versión de prompt y qué modelo la generó.

## 6. Principios de producto y guardrails

### 6.1 Tono (aplica a todo texto generado)
- Español, tuteo, cercano pero profesional.
- Honesto sin ser alarmista: si algo preocupa, se dice; si no, no se infla.
- Máximo 1-3 prioridades por vez. Distinguir "esto debes hacerlo" de "esto sería bueno".
- Si la persona va bien, reconocerlo brevemente; si va mal, decirlo sin sermonear.
- Recomendaciones realistas para Colombia (alimentos locales y accesibles, costos razonables).
- Prosa clara, poco formato. No empezar con elogios ni muletillas.

### 6.2 Lo que Sakura NO hace
- No diagnostica. Usa lenguaje de "patrón compatible con" o "vale la pena confirmar con tu médico".
- No recomienda ni ajusta medicamentos.
- No reemplaza al médico. Toda interpretación incluye cuándo conviene consultar.

Este límite es también la frontera regulatoria: mantenernos en bienestar y educación y no acercarnos a "software como dispositivo médico" ante el INVIMA. Cualquier feature que cruce esa línea se discute antes de construirse.

### 6.3 Reglas de escalamiento
Implementar como tabla configurable (no hardcodeada) con tres niveles: **urgencia**, **consultar pronto** y **mencionar en la próxima cita**.

- Nivel urgencia: se muestra de inmediato al participante con indicación de acudir a urgencias y se notifica al admin. Aplica a mediciones de presión arterial en rango de crisis y a síntomas de alarma reportados en el check-in (dolor torácico, dificultad para respirar, síntomas neurológicos).
- Los umbrales exactos se dejan en un archivo de configuración marcado como **PENDIENTE DE VALIDAR con médico asesor**. Usar valores de guías reconocidas como placeholder y citar la fuente en el archivo.
- El LLM nunca decide si algo es urgente; recibe el nivel ya calculado y solo redacta.

## 7. Datos y privacidad

Los datos de salud son **datos sensibles** bajo la Ley 1581 de 2012 (habeas data, Colombia). Requisitos mínimos del MVP:
- Consentimiento informado explícito, específico y registrado (versión del texto, fecha y hora).
- Aviso de privacidad accesible.
- Cifrado en tránsito y en reposo; PDFs en bucket privado con URLs firmadas de corta duración.
- RLS: cada participante solo ve lo suyo; el admin ve todo.
- Exportación y eliminación completa de datos a solicitud del participante.
- Log de auditoría de accesos del admin a datos de participantes.
- **Nunca** subir exámenes reales al repositorio. Usar fixtures sintéticos o anonimizados para tests.
- No enviar al LLM datos identificativos innecesarios (nombre, cédula): antes de la extracción, eliminar o enmascarar lo posible.

## 8. Modelo de datos inicial (orientativo)

- `participants`: id, auth_user_id, fecha de nacimiento, sexo, altura_cm, objetivo, fecha de inicio del piloto, estado.
- `consents`: participant_id, versión, texto_hash, aceptado_en.
- `lab_documents`: participant_id, storage_path, laboratorio, fecha de toma, estado (subido / extraído / revisado).
- `biomarkers` (catálogo): código, nombre, sinónimos[], unidad canónica, conversiones, rango de referencia (por sexo si aplica), rango óptimo, fuente.
- `lab_results`: document_id, biomarker_code, valor_original, unidad_original, valor_canonico, flag, corregido_por_admin.
- `measurements`: participant_id, tipo (peso, cintura, PA sistólica/diastólica, FC, sueño, ejercicio), valor, unidad, medido_en, contexto (JSON: brazo, mañana/noche…).
- `goals`: participant_id, métrica, línea base, meta, horizonte (3/6/12 meses), fecha límite.
- `checkins`: participant_id, semana, respuestas (JSON), adherencia, respuesta_generada, enviado_en.
- `reports`: participant_id, contenido, datos_de_entrada (snapshot), versión_prompt, modelo, estado (borrador / aprobado), aprobado_en.
- `alerts`: participant_id, regla, nivel, origen, estado, creada_en.
- `pilot_feedback`: participant_id, disposición a pagar, comentarios, fecha.

### Catálogo inicial de biomarcadores
Glucosa en ayunas, HbA1c, colesterol total, LDL, HDL, triglicéridos, AST, ALT, GGT, creatinina, BUN, ácido úrico, TSH, vitamina D (25-OH), vitamina B12, hemoglobina, hematocrito, plaquetas, leucocitos, eosinófilos (% y absolutos), PCR ultrasensible y microalbuminuria.

Métricas derivadas: IMC, razón cintura/altura, colesterol no-HDL, relación TG/HDL, criterios de síndrome metabólico (IDF/NCEP-ATP III) y, en MAPA o auto-medición, descenso nocturno de PA y presión de pulso.

## 9. Plan por fases

**Fase 0 — Fundaciones (primero proponer, luego ejecutar)**
Revisar este brief, proponer arquitectura, estructura de carpetas y plan de trabajo, y listar dudas. Esperar confirmación de Felipe antes de escribir código de features.

**Fase 1 — Dominio + datos**
Esquema, migraciones, RLS, catálogo de biomarcadores y módulo de dominio (conversiones, clasificación, tendencias, derivadas, estados de metas, reglas de escalamiento) con tests unitarios.

**Fase 2 — Ingesta de PDFs**
Upload → extracción con Claude → pantalla de revisión y corrección del admin → guardado. Probar con al menos 3 formatos de laboratorio distintos (p. ej. Sura, Dinámica, Colcan) usando fixtures anonimizados.

**Fase 3 — Vista del participante**
Línea de tiempo, mediciones manuales y metas.

**Fase 4 — Interpretación y acompañamiento**
Informe interpretativo con aprobación del admin, check-in semanal con respuesta generada y alertas.

**Fase 5 — Panel del piloto**
Métricas de retención, alertas, check-ins pendientes y registro de disposición a pagar.

**Usuario cero:** Felipe carga sus propios datos (exámenes 2023, 2025 y 2026 + MAPA 2026) al final de la Fase 2 para validar de punta a punta antes de invitar a nadie.

## 10. Criterios de aceptación del MVP

- La extracción de un PDF típico requiere menos de 5 correcciones manuales y el admin puede corregir cualquier campo.
- Ningún informe llega al participante sin aprobación del admin.
- Las reglas de escalamiento tienen tests para cada umbral y funcionan aunque la API del LLM falle.
- Un participante no puede leer datos de otro (test explícito de RLS).
- El check-in semanal se completa en menos de 2 minutos en el celular.
- Se puede exportar y eliminar todo lo de un participante.
- Para los datos de Felipe, el informe generado identifica los mismos hallazgos principales que el análisis manual previo: tendencia descendente de HDL, triglicéridos y transaminasas en ascenso, síndrome metabólico y HTA sistólica con patrón non-dipper.

## 11. Preguntas abiertas (no bloquean el inicio)

- Nombre definitivo y dominio.
- Médico asesor que valide umbrales, rangos óptimos y textos de escalamiento.
- Textos legales finales (consentimiento y aviso de privacidad), idealmente revisados por un abogado.
- Región de alojamiento de los datos y si se requiere registro de base de datos ante la SIC.
- Cómo y cuándo preguntar la disposición a pagar sin sesgar el piloto.

## 12. Cómo trabajar conmigo (instrucciones para Claude Code)

- Empieza por la Fase 0: plan y dudas, sin código de features.
- Antes de decisiones difíciles de revertir (esquema, auth, proveedor), explica opciones y trade-offs brevemente y pregunta.
- Commits pequeños y descriptivos; un README que se mantenga al día con cómo correr el proyecto.
- Código, identificadores y comentarios en inglés; todo el texto de la interfaz y los prompts en español.
- Si algo de este brief choca con buenas prácticas de seguridad o privacidad, prioriza la seguridad y avísame.
