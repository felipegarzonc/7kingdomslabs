# Gamificación de Bombadil

Capa de juego tipo RPG sobre los hábitos. Todo se calcula a partir de lo que la persona ya hizo
(`src/domain/game.ts`, con tests): no hay tablas nuevas y las reglas pueden cambiar aplicándose a todo el
historial.

## Qué ve la persona

- **Personaje**: nivel, título (Aprendiz del bosque → Leyenda de la longevidad) y barra de experiencia hacia el
  siguiente nivel. Cada nivel cuesta un poco más que el anterior (`50·(n−1)·n` XP acumulados).
- **Atributos** por pilar: Resistencia, Fuerza, Descanso, Nutrición, Calma, Vínculos, Templanza y Sabiduría
  (exámenes, mediciones, revisiones). Muestran *dónde* está invirtiendo, no solo cuánto.
- **Racha con escudos**: días seguidos con al menos un hábito (vale la versión mínima). Cada 7 días seguidos se
  gana un escudo (máximo 2) que cubre automáticamente un día fallado.
- **Anillo del día**: hábitos de hoy hechos / activos.
- **Misiones semanales**: cumplir la meta semanal de 1–2 hábitos, aparecer 5 de 7 días, hacer la revisión.
  Se renuevan cada lunes.
- **Misiones épicas**: las metas a 3/6/12 meses con barra de avance y marca de “dónde deberías ir”.
- **Insignias**: hitos de constancia, autoconocimiento y automatización, con progreso visible cuando están
  bloqueadas.
- **Celebración inmediata**: “+XP” al volver a la pantalla y tarjeta de nivel o insignia nueva.

## Principios y evidencia

| Táctica | Por qué | Cómo la aplicamos |
|---|---|---|
| Hábitos diminutos y anclados | Fogg (Tiny Habits); intenciones de implementación (Gollwitzer & Sheeran, 2006) | La versión mínima da XP y mantiene la racha |
| Rachas | Duolingo: la racha es su mayor motor de retención; aversión a la pérdida (Kahneman & Tversky) | Racha visible en Hoy |
| Rachas indulgentes | Romper una racha larga provoca abandono (“what-the-hell effect”, Polivy & Herman) | Escudos ganados, no comprados; “nunca falles dos veces” |
| Barras de progreso | Efecto de gradiente de meta: el esfuerzo sube al acercarse a la meta (Kivetz et al., 2006) | XP al siguiente nivel, misiones, metas |
| Nuevo comienzo | Fresh start effect (Dai, Milkman & Riis, 2014) | Misiones que se renuevan cada lunes |
| Retroalimentación inmediata | El refuerzo inmediato consolida la conducta (Skinner; Lally et al., 2010 sobre automatización) | Toast de XP y tarjeta de nivel |
| Identidad | “Soy alguien que…” sostiene hábitos (Clear, *Atomic Habits*) | Títulos de personaje |
| Competencia y autonomía | Teoría de la autodeterminación (Deci & Ryan) | Atributos por pilar, metas propias, sin castigos |

## Lo que evitamos a propósito

- **Premiar resultados clínicos** (un LDL “bueno” no da puntos): el juego premia conductas; los resultados
  dependen también de genética y medicación, y premiarlos invita a sesgar los datos.
- **Más es mejor**: cada pilar da como máximo 20 XP por día, para no incentivar sobreentrenar ni registrar de más.
- **Tablas de posiciones**: comparar salud con otros desmotiva a quien más lo necesita.
- **Recompensas de pago o aleatorias** (cofres, monedas): el efecto de sobrejustificación puede desplazar la
  motivación intrínseca (Deci, Koestner & Ryan, 1999).
