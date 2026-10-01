# Cliente objetivo y mensaje

## Por qué cambiamos «longevidad sin humo»

"Sin humo" habla de lo que **no** somos (no somos charlatanes), no de lo que la persona gana. Además
nadie lo busca en Google y, en Colombia, "humo" también se lee como tabaco. La landing anterior abría con
mecánicas de juego (XP, niveles, atributos), que son el *cómo* se sostienen los hábitos, no la razón por la
que alguien llega.

## Quién compra

**Principal: el profesional de 35 a 55 años con un examen alterado.**

- Vive en Bogotá, Medellín, Cali o Barranquilla, trabaja en una empresa o por su cuenta, y tiene EPS más
  medicina prepagada o un chequeo anual por la empresa.
- Le llegó un examen con algo "alto": LDL, triglicéridos, glucosa en el límite, ALT o hígado graso en la
  ecografía, presión limítrofe. La consulta duró 15 minutos y terminó en "baje de peso y haga ejercicio".
- Quiere estar bien para su familia y su trabajo durante décadas. Ha intentado dietas y gimnasio y lo
  dejó a las pocas semanas.
- **Qué busca** en Google: "cómo interpretar exámenes de sangre", "colesterol LDL alto qué hacer",
  "triglicéridos altos", "glucosa en ayunas 110", "prediabetes", "hígado graso qué es".
- **Qué le convence:** entender su resultado sin jerga, saber qué hacer *esta semana*, ver que mejora y
  llegar mejor preparado al médico.
- **Objeciones:** "¿reemplaza a mi médico?", "¿qué hacen con mis datos?", "otra app que voy a abandonar".

**Secundario A: el preventivo.** Tiene de 30 a 45 años, nada le duele, ha oído de longevidad (Attia,
Huberman) y desconfía de los suplementos. Busca "cómo vivir más años", "longevidad", "VO2máx" o
"entrenamiento de fuerza después de los 40".

**Secundario B: el que ya mide todo.** Tiene Garmin o Apple Watch y Strava, y se hace exámenes anuales.
Le falta convertir los datos en decisiones. Quiere sus dispositivos conectados, HRV, VO2máx y tendencias.

**No es para:** emergencias, tratamiento de enfermedades ni quien busca un diagnóstico.

## Mensaje

- **Promesa (H1):** *Entiende tus exámenes y mejora tu salud, un hábito a la vez.*
- **Prueba:** tu próximo examen te dice si funcionó.
- **Mecanismo:** exámenes explicados → partimos de los hábitos que ya tiene → como mucho 1 o 2 sugerencias opcionales (mejorar lo que ya hace antes que agregar) → el reloj registra solo →
  rachas y niveles para sostenerlo (con modo sobrio para quien no quiera juego).
- **Confianza:** evidencia (Life's Essential 8 de la AHA), reglas clínicas fijas para las alertas,
  resumen para el médico, Ley 1581.
- **Orden de la página:** problema → cómo funciona → exámenes → hábitos → camino → para quién es →
  ocho áreas → dispositivos → evidencia → preguntas frecuentes → confianza → llamado final.

## SEO

### Palabras clave por intención

| Intención | Términos | Dónde |
|---|---|---|
| Principal | interpretar exámenes de sangre, entender exámenes de laboratorio | title, H1, H2 de exámenes, primera pregunta frecuente |
| Problema concreto | colesterol LDL alto, triglicéridos altos, glucosa en ayunas, prediabetes, hígado graso | descripción, tarjetas de exámenes, preguntas frecuentes |
| Prevención | longevidad, cómo vivir más años, salud preventiva | sección de evidencia, pregunta frecuente |
| Dispositivos | Strava, Apple Salud, Garmin | sección de dispositivos, pregunta frecuente |

No hemos medido volumen de búsqueda: estas palabras salen del perfil del cliente. Hay que validarlas con
Google Search Console tras 4 a 6 semanas indexados y ajustar.

### Qué quedó implementado

- `title` y `description` con las palabras principales; `canonical` a `/`; `/inicio` con `noindex`.
- Open Graph y Twitter con imagen generada (`/opengraph-image`), para que se vea bien en WhatsApp y LinkedIn.
- `robots.txt` (sin indexar la app, el panel ni las API) y `sitemap.xml`.
- Datos estructurados JSON-LD: `Organization`, `WebSite` y `FAQPage`, con 8 preguntas reales.
- Un solo `h1`, `h2` por sección y `h3` en las tarjetas; `lang="es-CO"`.
- El login, la app y las páginas privadas no se indexan.

### Pendiente (fuera del código)

1. **Dominio propio** (p. ej. `bombadil.co`): un subdominio de `vercel.app` rara vez posiciona. Después,
   cambiar `NEXT_PUBLIC_SITE_URL`.
2. Dar de alta el dominio en **Google Search Console** y enviar el sitemap.
3. **Contenido**: una guía por término (por ejemplo "Triglicéridos altos: qué significan y qué hacer"),
   revisada por el médico asesor. La landing sola no posiciona términos médicos competidos: Google exige
   autoría médica visible (E-E-A-T) en temas de salud.
4. Mostrar quién revisa el contenido clínico (nombre y registro del médico asesor) cuando exista.
