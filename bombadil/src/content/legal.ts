/**
 * BORRADOR — pendiente de revisión por abogado (Ley 1581 de 2012, Decreto 1377 de 2013).
 * Cambiar el texto exige subir CONSENT_VERSION: el hash del texto se guarda con cada aceptación.
 */
import { createHash } from "node:crypto";

export const OPERATOR = {
  name: "Felipe Garzón (operador del piloto Bombadil)",
  email: "felipegarzonc@gmail.com",
  city: "Bogotá, Colombia",
};

export const CONSENT_VERSION = "2026-10-v5";

export const CONSENT_SECTIONS: Array<{ title: string; body: string }> = [
  {
    title: "Qué es Bombadil",
    body:
      "Bombadil es un piloto de acompañamiento de hábitos de longevidad, con fines de bienestar y educación. No es un servicio médico, no diagnostica, no prescribe ni ajusta medicamentos y no reemplaza a tu médico.",
  },
  {
    title: "Qué datos tratamos",
    body:
      "Datos de identificación y contacto (nombre, correo), datos básicos (fecha de nacimiento, sexo, estatura) y datos de salud, que son datos sensibles: resultados de exámenes de laboratorio, informes de imágenes diagnósticas (resonancias, ecografías, radiografías, tomografías), mediciones (peso, cintura, presión arterial, frecuencia cardiaca, sueño, ejercicio), respuestas a los check-ins semanales, tus respuestas sobre tu estilo de vida (actividad, sueño, alimentación, alcohol, estrés), tus hábitos y su registro diario, tus metas y, si decides conectarlos, los datos de tus dispositivos y apps (Strava, Apple Salud y, a través de ellos, relojes como Garmin): actividades, pasos, sueño, frecuencia cardiaca en reposo, peso, VO2max y presión arterial.",
  },
  {
    title: "Para qué los usamos",
    body:
      "Para organizar tu línea de tiempo de exámenes y mediciones, calcular tendencias y metas, generar informes y respuestas de acompañamiento, diseñar y ajustar tu plan de hábitos, marcar automáticamente los hábitos que tus dispositivos registran, detectar valores que ameriten consultar a un médico, y evaluar los resultados del piloto (retención, cambios de hábitos y disposición a pagar) de forma agregada.",
  },
  {
    title: "Inteligencia artificial y encargados",
    body:
      "Usamos la API de Anthropic (Claude) para transcribir tus exámenes y redactar textos. Antes de enviar el texto de un examen se enmascaran tus datos identificativos (nombre, documento, teléfono, correo). Tus datos se almacenan en Supabase (base de datos cifrada en reposo y en tránsito). Si conectas Strava o Apple Salud, solo leemos los datos que autorizas allí, guardamos el permiso de acceso en un lugar al que solo llega nuestro servidor, y puedes desconectarlos cuando quieras desde Dispositivos. Estos proveedores actúan como encargados del tratamiento y pueden estar fuera de Colombia (transferencia internacional).",
  },
  {
    title: "Análisis automático",
    body:
      "La transcripción de tus exámenes, la explicación de tus informes de imágenes y los informes interpretativos se generan y publican de forma automática, sin revisión humana previa. Solo se guardan los valores que el sistema reconoce con certeza; las alertas de salud se calculan con reglas fijas, no con inteligencia artificial. El operador del piloto puede revisar y corregir tus datos después, y cada acceso suyo queda registrado.",
  },
  {
    title: "Alertas",
    body:
      "Si registras una presión arterial en rango de crisis o reportas síntomas de alarma, la aplicación te mostrará de inmediato una indicación de acudir a urgencias y avisará al operador. Estas reglas no sustituyen tu criterio ni la atención médica: ante una emergencia llama al 123.",
  },
  {
    title: "Tus derechos",
    body:
      "Puedes conocer, actualizar, rectificar y suprimir tus datos, revocar esta autorización y solicitar prueba de ella en cualquier momento. Desde la sección «Mis datos» puedes descargar toda tu información y eliminar tu cuenta y todos tus datos. También puedes escribir al correo del operador. Puedes presentar quejas ante la Superintendencia de Industria y Comercio.",
  },
  {
    title: "Carácter facultativo",
    body:
      "Responder preguntas sobre datos sensibles es facultativo. Si no autorizas su tratamiento no podrás participar en el piloto, pero no tendrá ninguna otra consecuencia.",
  },
];

export const CONSENT_DECLARATION =
  "Autorizo de manera previa, expresa e informada el tratamiento de mis datos personales, incluidos mis datos sensibles de salud, para las finalidades descritas, y la transferencia a los encargados mencionados.";

export function consentText(): string {
  return [CONSENT_VERSION, ...CONSENT_SECTIONS.map((s) => `${s.title}\n${s.body}`), CONSENT_DECLARATION].join("\n\n");
}

export function consentHash(): string {
  return createHash("sha256").update(consentText()).digest("hex");
}

export const PRIVACY_NOTICE: Array<{ title: string; body: string }> = [
  { title: "Responsable", body: `${OPERATOR.name}. Contacto: ${OPERATOR.email}. ${OPERATOR.city}.` },
  {
    title: "Tratamiento y finalidad",
    body:
      "Recolectamos, almacenamos, usamos y analizamos datos personales y de salud de los participantes del piloto para ofrecer acompañamiento de hábitos basado en evidencia y evaluar el piloto. No vendemos ni compartimos tus datos con fines comerciales.",
  },
  {
    title: "Datos sensibles",
    body: "Los datos de salud son sensibles. Su tratamiento requiere tu autorización explícita y no estás obligado a darla.",
  },
  {
    title: "Seguridad",
    body:
      "Cifrado en tránsito (HTTPS) y en reposo; exámenes en almacenamiento privado con enlaces temporales; control de acceso por usuario; registro de accesos del operador.",
  },
  {
    title: "Derechos del titular",
    body:
      "Conocer, actualizar, rectificar y suprimir tus datos; revocar la autorización; solicitar prueba de la autorización; ser informado sobre el uso de tus datos; y presentar quejas ante la SIC. Puedes ejercerlos desde «Mis datos» o escribiendo al correo del responsable. Atendemos consultas en máximo 10 días hábiles y reclamos en máximo 15 días hábiles.",
  },
  {
    title: "Política completa",
    body: "Este aviso resume la política de tratamiento de datos del piloto. La política completa está disponible a solicitud en el correo del responsable.",
  },
];
