# Guion de entrevistas con usuarios

La evaluación anterior usó perfiles simulados (personas interesadas en desempeño y longevidad). Sirvió para
priorizar, pero no reemplaza hablar con gente real. Este guion valida lo que se implementó a partir de esa
evaluación y busca lo que se nos escapó.

## Formato

- 5 a 8 personas, 30 minutos cada una, por videollamada con pantalla compartida.
- Mezcla: 2–3 "optimizadores" (miden todo, usan reloj, leen a Attia), 2–3 personas ocupadas con algún
  marcador alterado (LDL, glucosa, presión) y 1–2 personas que no usan apps de salud.
- Graba (con permiso) y toma notas en la plantilla del final. No ayudes mientras usan la app: pregunta
  "¿qué esperabas que pasara?".

## 1. Contexto (5 min)

1. ¿Qué haces hoy por tu salud a largo plazo? ¿Qué mides y con qué?
2. ¿Cuándo fue tu último examen de sangre? ¿Qué hiciste con el resultado?
3. ¿Has usado apps de hábitos o de salud? ¿Por qué las dejaste?

## 2. Tareas con la app (15 min)

Pide que piensen en voz alta. Mide tiempo y si lo logran sin ayuda.

| # | Tarea | Qué observar |
|---|-------|--------------|
| 1 | Desde la landing, entiende qué es Bombadil y entra. | ¿Lo explica con sus palabras en una frase? |
| 2 | Arma tu plan de hábitos. | ¿Las 8 preguntas se sienten rápidas? ¿Los hábitos propuestos le parecen suyos? |
| 3 | Marca un hábito de hoy y luego la versión mínima de otro. | ¿Entiende la versión mínima? ¿El +XP motiva o distrae? |
| 4 | Activa los recordatorios y cambia la hora de un hábito. | ¿Encuentra dónde (Mis datos / El camino)? ¿La hora por defecto tiene sentido? |
| 5 | Sube un examen (PDF de prueba) y explica qué significa tu resultado más importante. | ¿Confía en la explicación? ¿Busca la fuente? |
| 6 | Encuentra tu puntaje "Esencial 8" y di qué te falta para completarlo. | ¿Le dice algo útil o es otro número más? |
| 7 | Prepara lo que le llevarías a tu médico. | ¿Encuentra "Para tu médico"? ¿Lo imprimiría tal cual? |
| 8 | Comparte tu racha con alguien. | ¿Le preocupa la privacidad? ¿A quién se lo mandaría? |
| 9 | (Optimizadores) Conecta Strava o Apple Salud. | ¿Dónde se traba? ¿Qué dato echa de menos (HRV, sueño profundo, VO2máx…)? |

## 3. Lo que implementamos tras la evaluación simulada (5 min)

Pregunta por cada uno: "¿Lo usarías? ¿Qué cambiarías?" y pide una nota de 1 a 5.

- Recordatorios (notificación o correo) y "nunca falles dos veces".
- Modo sobrio (sin experiencia ni niveles).
- El cofre semanal que da un escudo para la racha.
- Puntaje Esencial 8 de la AHA.
- Resumen imprimible para el médico.
- Enlace para un acompañante.
- Check-in más corto cuando el reloj ya trae los datos.
- Registro de proteína, HRV y fases de sueño.

## 4. Cierre (5 min)

1. Si mañana desapareciera Bombadil, ¿qué extrañarías? ¿Nada es una respuesta válida?
2. ¿Qué quitarías?
3. ¿Qué le falta para que lo recomiendes a un amigo?
4. ¿Cuánto pagarías al mes? (Pregunta abierta, luego ancla: COP 20.000 / 50.000 / 100.000.)

## Plantilla de notas

```
Persona: (perfil, edad, reloj sí/no)
Tareas: 1 ✓/✗ (tiempo) · 2 … · 9
Citas textuales:
Notas 1–5: recordatorios _ · sobrio _ · cofre _ · LE8 _ · médico _ · acompañante _ · check-in _ · proteína/HRV _
Extrañaría:
Quitaría:
Le falta:
Disposición a pagar:
```

## Cómo decidir después

- Una función se queda si al menos la mitad la puntúa con 4 o más, o si una persona de cada perfil la
  menciona espontáneamente al final.
- Una tarea en la que fallan 2 o más personas es un problema de diseño, no del usuario: arréglalo antes de
  sumar nada nuevo.
- Lo que nadie menciona ni usa en 2 semanas de piloto se quita (menos código, menos pantallas).
