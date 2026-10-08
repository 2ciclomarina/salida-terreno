'use strict';
/* =========================================================
   SALIDA A TERRENO – app-guias.js  (ARCHIVO NUEVO)
   Guías de la salida: recorrido, paso a paso, equipos, hoja de ruta,
   rúbrica de terreno y fichas de aprendizaje entre pares.
   Se carga DESPUÉS de app-imagenes.js, en index.html y en docente.html.
   No modifica ninguna otra función: agrega la pestaña «Guía» junto a «Pendientes»
   (estudiantes), el cuadro de nota final junto al avance y la pestaña «Guías» (docentes).
   ========================================================= */
(function () {
  const MODO = document.body.dataset.modo;

  /* ---------- Contenido original (tomado de la guía del curso); el docente puede editarlo ---------- */
  const DEF = {"recorrido":[{"r":"Salida","n":"Escuela"},{"r":"1","n":"Playa Blanca"},{"r":"2","n":"Casa Poli"},{"r":"3","n":"Casa Piedra"},{"r":"4","n":"Playa Necochea"},{"r":"Regreso","n":"Escuela"}],"pasos":[{"c":"Antes de salir","q":"Lea la guía. Con su equipo, lean su hoja de ruta (G4), prueben el instrumento y hagan una prueba piloto. Si su equipo enseña, prepare la presentación con QR (G6). Revise la rúbrica (G5). Cargue su teléfono y pruebe la aplicación.","w":"Individual y equipo"},{"c":"Al llegar a cada hito","q":"Tome agua y respire. Escuche la presentación del lugar. Observe 5 minutos en silencio y anote tres cosas que ve.","w":"Individual"},{"c":"Toma de datos · 15 min","q":"Aplique el instrumento con su equipo. Cada integrante completa su ficha del hito en su propio teléfono, con el mismo criterio. Después comparen y anoten el valor acordado.","w":"Individual y equipo"},{"c":"Mini-clase · 12 min","q":"Escanee el código QR del equipo anfitrión, escuche y complete la ficha del tema que se expone (G7). Si su equipo es el anfitrión, comparta su presentación digital con un QR, sin papeles ni carteles: usted no completa su propia ficha.","w":"Individual o equipo anfitrión"},{"c":"Aplicación · 15 min","q":"Responda en su teléfono las alternativas y las preguntas de desarrollo del hito.","w":"Individual"},{"c":"Recorrido y fotografías","q":"Inicie el recorrido desde su teléfono al salir del hito anterior y termínelo al llegar. Tome las fotografías pedidas, en orden y sin pisar la vegetación.","w":"Individual"},{"c":"Caminata","q":"Camine al siguiente hito. En el trayecto cuente a un compañero de otro equipo un hallazgo, un dato y una pregunta.","w":"Individual"},{"c":"Cierre","q":"Presente la cápsula de 90 segundos de su equipo: una fotografía, un dato y una acción de cuidado. Responda el ejercicio integrador de la aplicación.","w":"Equipo e individual"},{"c":"Después · 1 a 2 semanas","q":"Con su equipo, contraste lo recolectado con su informe de investigación, entregue el informe final y expóngalo. Tiene su propia guía y nota (Guía del informe final).","w":"Equipo"}],"equipos":[{"id":"e1","nombre":"Equipo 1 · Fauna y hábitat","color":"verde","ensena":"Hito 1 · Playa Blanca","conceptos":"hábitat · perturbación · distancia de huida · fauna silvestre · principios No Deje Rastro","objetivo":"Evaluar el impacto de las actividades físicas en espacios naturales sobre el hábitat y la fauna silvestre, proponiendo acciones de concientización para reducir los efectos negativos.","tipo":"Enfoque cuantitativo · Alcance descriptivo · Diseño no experimental transeccional. Cuantitativo, porque recoge conteos de animales y conductas y porcentajes de respuestas. Descriptivo, porque busca especificar cómo son las conductas de la fauna y las alteraciones del hábitat (Hernández-Sampieri y Mendoza, 2018). No experimental, porque no se manipula la presencia humana: se observa lo que ocurre. Transeccional, porque los datos se toman durante la salida.","tema":"Impacto de las actividades físicas recreativas en el hábitat y la fauna silvestre.","hipotesis":"Si las personas practican actividad física de forma responsable (respetan los caminos, bajan el ruido y aplican No Deje Rastro), disminuyen los impactos sobre el hábitat y la fauna.","mide":"Registro de fauna (grupo, cantidad, conducta, distancia), lista de verificación de No Deje Rastro del grupo y fotografías de alteraciones del hábitat.","instr":"Ficha de observación de fauna, lista de verificación No Deje Rastro y cámara del teléfono. (La encuesta de Formularios Google ya aplicada se usa después, para comparar.)","ruta":[{"m":"Antes (Escuela)","q":"Arma la ficha de fauna y la lista de los 7 principios. Acuerda una distancia mínima de observación. Repasa con Ciencias las aves y otros animales comunes de la costa del Biobío.","e":"Ficha y lista impresas o en el teléfono."},{"m":"Hito 1 · Playa Blanca · equipo anfitrión","q":"Observa durante 10 minutos desde lejos: anota qué animales ve, cuántos y qué hacen; anota si se alejan. Fotografía sin acercarse. Da la mini-clase de 8 minutos: “Distancia de huida y respeto a la fauna”.","e":"Ficha del hito 1, 2 fotografías, mini-clase."},{"m":"Hito 2 · Casa Poli","q":"Repite los 10 minutos de observación. Marca en la lista de No Deje Rastro cómo se comportó el grupo. Anota si hay cambios en los animales cuando el grupo llega o conversa.","e":"Ficha del hito 2 y lista marcada."},{"m":"Hito 3 · Casa Piedra","q":"Observa el hábitat: refugios, nidos a la vista, plantas que usan los animales. Fotografía señales de presencia humana (huellas, basura, caminos paralelos).","e":"Ficha del hito 3 y 2 fotografías."},{"m":"Hito 4 · Playa Necochea","q":"Última observación de 10 minutos. Revisa su tabla: ¿en qué punto vio más y menos fauna? Anota una posible razón, sin afirmarla como cierta.","e":"Ficha del hito 4 y tabla resumen."},{"m":"En ruta (caminata)","q":"Anota animales vistos durante el trayecto. Recuerda al grupo mantener la distancia y el volumen bajo.","e":"Anotaciones breves."},{"m":"Cierre","q":"Cápsula de 90 segundos: un hallazgo con fotografía y una acción concreta de cuidado.","e":"Cápsula presentada."},{"m":"Después","q":"Pasa los datos a una tabla y a un gráfico de barras. Responde la pregunta y la hipótesis. Prepara una cápsula o afiche de concientización.","e":"Informe breve y producto de difusión."}]},{"id":"e2","nombre":"Equipo 2 · Vegetación","color":"azul","ensena":"Hito 3 · Casa Piedra","conceptos":"cobertura vegetal · pisoteo · senderos múltiples · biodiversidad · desarrollo sostenible","objetivo":"Evaluar el impacto de las actividades físicas realizadas dentro y fuera de los senderos sobre la vegetación y el entorno natural, formulando estrategias para reducir el daño.","tipo":"Enfoque mixto · Alcance descriptivo-correlacional · Diseño no experimental transeccional. Mixto, porque combina mediciones (categorías de cobertura, plantas aplastadas) con opiniones de visitantes y fotografías. Descriptivo, porque caracteriza el daño; correlacional, porque relaciona dos variables: nivel de tránsito y estado de la vegetación. No es exploratorio, porque el tema ya tiene estudios (los equipos citan a Marion y Leung). No experimental, porque no se daña la vegetación a propósito.","tema":"Daño a la vegetación por actividades fuera de sendero o juegos físicos.","hipotesis":"Si las personas transitan o juegan fuera de los senderos, aumenta el daño sobre la vegetación y el suelo; y la señalética, los códigos QR y la educación pueden reducirlo.","mide":"Ficha de observación estructurada que compara un sector de alto tránsito con uno de bajo tránsito; encuesta breve a visitantes que acepten responder; fotografías.","instr":"Ficha de observación (plantas aplastadas, ramas rotas, suelo desnudo, cobertura: poca, media o mucha), cinta o cuerda de 1 metro, encuesta de 12 preguntas validada, cámara.","ruta":[{"m":"Antes (Escuela)","q":"Practica en el patio las 3 categorías de cobertura (poca, media, mucha). Hace una prueba piloto de la encuesta con 3 a 5 compañeros. Escribe en su metodología el nombre exacto del lugar (hoy está como [escribir el nombre del lugar]).","e":"Ficha final, encuesta corregida, lugar definido."},{"m":"Hito 1 · Playa Blanca","q":"Observa la vegetación junto a la arena. Mide con la cinta extendida en el borde, sin pisar las plantas. Anota si hay huellas sobre la vegetación.","e":"Ficha del hito 1 y fotografía."},{"m":"Hito 2 · Casa Poli","q":"Completa la ficha en el borde del camino o sendero. Compara con el hito 1 en una tabla.","e":"Ficha del hito 2."},{"m":"Hito 3 · Casa Piedra · equipo anfitrión","q":"Compara un sector de alto tránsito con uno de bajo tránsito usando la misma ficha. Fotografía ambos. Da la mini-clase: “Cómo se ve el pisoteo en las plantas”.","e":"Ficha doble, 2 fotografías, mini-clase."},{"m":"Hito 4 · Playa Necochea","q":"Completa la ficha. Aplica la encuesta a un máximo de 5 personas adultas que acepten, siempre con un docente cerca y sin pedir datos personales.","e":"Ficha y encuestas aplicadas."},{"m":"En ruta (caminata)","q":"Fotografía, con ubicación del teléfono, los lugares donde otras personas salen del sendero. Su equipo no sale del sendero.","e":"Fotografías con ubicación."},{"m":"Cierre","q":"Cápsula de 90 segundos: lo más dañado y lo mejor conservado que vio, con una fotografía de cada uno.","e":"Cápsula presentada."},{"m":"Después","q":"Pasa la ficha a una planilla; hace gráficos de barras o tablas de porcentaje. Diseña señalética o un código QR con mensaje de cuidado.","e":"Informe breve y señalética o QR."}]},{"id":"e3","nombre":"Equipo 3 · Suelo","color":"cafe","ensena":"Hito 4 · Playa Necochea","conceptos":"compactación · infiltración · escorrentía · erosión · pendiente","objetivo":"Analizar el impacto de la práctica del trekking en la compactación y erosión del suelo en senderos naturales, y proponer medidas de prevención y educación ambiental.","tipo":"Enfoque cuantitativo · Alcance descriptivo (con comparación) · Diseño no experimental, con dos mediciones de encuesta. Cuantitativo, porque mide centímetros con la prueba del palito, cuenta personas y calcula porcentajes. Descriptivo, porque identifica evidencias de compactación y erosión y compara sendero y costado sin intervenir. La encuesta inicial y final mide el conocimiento en dos momentos (longitudinal breve), sin manipular variables.","tema":"Impacto del trekking en la compactación y erosión del suelo.","hipotesis":"El tránsito frecuente de excursionistas aumenta la compactación y la erosión del suelo, sobre todo con pendiente y lluvia; las medidas de educación y señalización pueden disminuir el daño.","mide":"Ficha de suelo en el sendero y a su costado, conteo de personas dentro y fuera del sendero, registro fotográfico y encuesta inicial y final.","instr":"Ficha de suelo, prueba del palito (cuánto entra un palito de brocheta en el sendero y a su costado), huincha o pasos para el ancho, cámara, encuesta inicial y final.","ruta":[{"m":"Antes (Escuela)","q":"Aplica la encuesta inicial al curso. Practica la prueba del palito en el patio, con el mismo largo y la misma fuerza. Prepara la ficha.","e":"Encuesta inicial aplicada y ficha lista."},{"m":"Hito 1 · Playa Blanca","q":"Describe el suelo: ¿suelto o firme?, ¿huellas?, ¿restos de vegetación? Fotografía.","e":"Ficha del hito 1."},{"m":"Hito 2 · Casa Poli","q":"En el sendero: prueba del palito (3 repeticiones), surcos, raíces expuestas y ancho del sendero. Repite 1 metro al costado, solo en un lugar ya intervenido.","e":"Ficha del hito 2 y fotografías."},{"m":"Hito 3 · Casa Piedra","q":"Compara alto y bajo tránsito. Cuenta durante 10 minutos cuántas personas van por el sendero y cuántas fuera de él.","e":"Ficha y conteo."},{"m":"Hito 4 · Playa Necochea · equipo anfitrión","q":"Busca evidencias de erosión: surcos, desprendimientos, agua que corre. Da la mini-clase: “Compactación y erosión: cuál es la diferencia”.","e":"Ficha, 2 fotografías, mini-clase."},{"m":"En ruta (caminata)","q":"Con la ruta y las alturas de la aplicación, identifica tramos con más pendiente y anota si ahí hay más desgaste.","e":"Tabla “pendiente y desgaste”."},{"m":"Cierre","q":"Aplica la encuesta final al curso. Cápsula de 90 segundos con una evidencia.","e":"Encuesta final y cápsula."},{"m":"Después","q":"Compara encuesta inicial y final con porcentajes (planilla). Elabora el afiche informativo sobre conservación de senderos.","e":"Informe breve y afiche."}]},{"id":"e4","nombre":"Equipo 4 · Senderismo y medio ambiente","color":"morado","ensena":"Caminata entre hitos y cierre","conceptos":"impacto ambiental · siete principios · residuos orgánicos e inorgánicos · georreferenciación · turismo responsable","objetivo":"Analizar cómo la práctica del senderismo afecta al medio ambiente, identificando sus impactos negativos y positivos, para proponer estrategias que disminuyan el daño.","tipo":"Enfoque cuantitativo · Alcance descriptivo · Diseño no experimental transeccional. Cuantitativo, porque usa conteos del mapa de impactos, kilómetros y porcentajes del cuestionario. Descriptivo, porque caracteriza los impactos y las conductas de las personas que hacen senderismo. No experimental y transeccional, porque no se manipulan variables y se observa en un solo período: la salida.","tema":"Cómo afecta el senderismo al medio ambiente.","hipotesis":"Sin planificación, educación ambiental y respeto por las normas, aumentan los impactos (suelo, vegetación, fauna, residuos); con mínimo impacto y conciencia ambiental, disminuyen.","mide":"Uso de la aplicación del recorrido (kilómetros, ruta con alturas, calorías aproximadas), lista de No Deje Rastro, residuos con fotografía y ubicación, y un “mapa de impactos” por hito.","instr":"Aplicación del recorrido, “mapa de impactos” (tabla con suelo, vegetación, fauna, residuos y ruido), bolsa y guantes para residuos, cuestionario de cierre.","ruta":[{"m":"Antes (Escuela)","q":"Completa en su metodología la población y la muestra (hoy están como [indicar] y [cantidad]). Explica al curso cómo funciona la aplicación del recorrido. Acuerda la regla “basura cero”.","e":"Metodología completa y “mapa de impactos” impreso o digital."},{"m":"Hito 1 · Playa Blanca","q":"Completa el mapa de impactos (✓ si observó cada tipo). Fotografía residuos con ubicación; los clasifica en orgánicos e inorgánicos.","e":"Mapa del hito 1."},{"m":"Hito 2 · Casa Poli","q":"Completa el mapa de impactos y registra los residuos.","e":"Mapa del hito 2."},{"m":"Hito 3 · Casa Piedra","q":"Completa el mapa de impactos. Revisa si existe señalética y si es clara.","e":"Mapa del hito 3."},{"m":"Hito 4 · Playa Necochea","q":"Completa el mapa de impactos. Junta todos los mapas en un solo cuadro.","e":"Mapa del hito 4 y cuadro resumen."},{"m":"En ruta (caminata) · equipo anfitrión","q":"Da una mini-clase de 5 minutos en una parada segura: “Planificar, usar la aplicación y No Deje Rastro”. Cuida el ritmo, las pausas de hidratación y la bolsa de residuos.","e":"Mini-clase y registro de residuos."},{"m":"Cierre · equipo anfitrión","q":"Presenta kilómetros, alturas y el mapa de impactos del día. Aplica el cuestionario de cierre.","e":"Presentación y cuestionario."},{"m":"Después","q":"Organiza los datos en tablas y gráficos. Escribe las estrategias de solución y prepara un afiche o código QR con los 7 principios.","e":"Informe breve y afiche o QR."}]},{"id":"e5","nombre":"Equipo 5 · Contaminación acústica","color":"magenta","ensena":"Hito 2 · Casa Poli","conceptos":"nivel de presión sonora dB(A) · ruido ambiental · DS 38/2011 · vocalización · conducta de huida","objetivo":"Analizar el impacto de la contaminación acústica generada por actividades deportivas masivas sobre el bienestar de las personas y el comportamiento de la fauna nativa.","tipo":"Enfoque cuantitativo · Alcance correlacional · Diseño no experimental, con mediciones repetidas el mismo día (A, B y C). Cuantitativo, porque usa dB(A), conteo de vocalizaciones y huidas, y una escala de 1 a 5. Correlacional, porque busca la relación entre el nivel de ruido, la molestia y la conducta de las aves. No experimental, porque en un diseño experimental se manipula la variable y no se debe provocar ruido para molestar a la fauna.","tema":"Efecto del ruido de las actividades físicas sobre la percepción de las personas y la conducta de las aves.","hipotesis":"Los niveles altos de ruido aumentan la molestia de las personas y disminuyen la vocalización de las aves, con más conductas de huida.","mide":"Mediciones de ruido con la aplicación del teléfono, conteo de vocalizaciones y huidas de aves, y encuesta de molestia (escala de 1 a 5).","instr":"Aplicación sonómetro (siempre el mismo teléfono, a la misma altura), ficha de registro (hora, dB, aves, reacciones) y encuesta Likert. Ajuste: el lugar de estudio ya está definido: los cuatro hitos de Coliumo.","ruta":[{"m":"Antes (Escuela)","q":"Prueba la aplicación (mismo teléfono y altura). Hace la prueba piloto con 3 a 5 compañeros. Define los tres momentos: A (grupo en silencio, antes de llegar), B (grupo presente, conversando normal), C (después de que el grupo se va).","e":"Ficha de registro y plan de momentos A, B y C."},{"m":"Hito 1 · Playa Blanca","q":"Mide 1 minuto en cada momento (A, B, C) y anota el valor. Cuenta cantos y huidas de aves durante 10 minutos. Está prohibido hacer ruido a propósito. Solo se mide lo natural.","e":"Ficha del hito 1."},{"m":"Hito 2 · Casa Poli · equipo anfitrión","q":"Repite las mediciones. Da la mini-clase: “Qué es un decibel, qué dice el DS 38/2011 y cómo medir bien con el teléfono”.","e":"Ficha del hito 2 y mini-clase."},{"m":"Hito 3 · Casa Piedra","q":"Repite las mediciones. Aplica la encuesta de molestia a compañeros y adultos que acepten.","e":"Ficha del hito 3 y encuestas."},{"m":"Hito 4 · Playa Necochea","q":"Repite las mediciones y completa la muestra de encuestas de su metodología (30 personas en total).","e":"Ficha del hito 4 y encuestas."},{"m":"En ruta (caminata)","q":"Anota las fuentes de ruido que oye (mar, viento, voces, vehículos) sin medirlas en movimiento.","e":"Lista de fuentes de ruido."},{"m":"Cierre","q":"Presenta un gráfico de barras simple con el ruido promedio de los momentos A y B por hito, y una conclusión provisoria.","e":"Gráfico y conclusión provisoria."},{"m":"Después","q":"Calcula promedios, máximos y mínimos por punto y los compara con la referencia indicada por el docente. Escribe estrategias tecnológicas para disminuir el ruido.","e":"Informe breve y propuesta."}]}],"rubT":[{"id":"H1","dim":"Habilidades","nom":"Registro de datos","L":"Cada integrante completa en su teléfono las 4 fichas de hito: cada una con hora, lugar y valor o conteo en todos sus campos.","M":"Cada integrante tiene completas 2 o 3 fichas.","N":"Cada integrante tiene completas 0 o 1 ficha.","v":"Fichas en los teléfonos del equipo"},{"id":"H2","dim":"Habilidades","nom":"Comparación e interpretación","L":"Compara 3 o más hitos con datos de sus fichas y propone 1 causa probable apoyada en un dato.","M":"Compara 2 hitos, o propone una causa sin dato.","N":"No compara hitos.","v":"Fichas y explicación oral o escrita"},{"id":"H3","dim":"Habilidades","nom":"Explicación a los pares (mini-clase)","L":"Cumple las 6 condiciones: (1) ideas en orden; (2) muestra 1 evidencia del lugar; (3) dura de 6 a 10 minutos; (4) hablan todos los integrantes; (5) responde al menos 1 pregunta; (6) comparte una presentación digital por QR, sin material impreso.","M":"Cumple 4 o 5 condiciones.","N":"Cumple 0 a 3 condiciones.","v":"Lista de cotejo del docente con cronómetro"},{"id":"C1","dim":"Contenidos","nom":"Conceptos clave del tema","L":"Usa bien 4 o 5 de los 5 conceptos clave de su equipo (cuadro G3).","M":"Usa bien 2 o 3 conceptos.","N":"Usa bien 0 o 1 concepto.","v":"Mini-clase, fichas y respuestas"},{"id":"C2","dim":"Contenidos","nom":"Relación con las asignaturas","L":"Relaciona su tema con 2 o más asignaturas (Educación Física, Ciencias, Educación Ciudadana, Geografía) con 1 ejemplo para cada una.","M":"Lo relaciona con 1 asignatura.","N":"No lo relaciona con ninguna.","v":"Cierre y respuestas"},{"id":"C3","dim":"Contenidos","nom":"Hipótesis","L":"Dice si los datos apoyan o no su hipótesis y da 2 razones que usan datos de sus fichas.","M":"Lo dice con 1 razón, o las razones no usan datos.","N":"No lo dice.","v":"Cierre e informe"},{"id":"P1","dim":"Procedimientos","nom":"Uso del instrumento","L":"Cada integrante usa la misma ficha digital en su propio teléfono y el mismo criterio de medición (mismo tiempo y mismo punto) en los 4 hitos.","M":"Algún integrante cambia el criterio en 1 hito.","N":"Algún integrante cambia el criterio en 2 o más hitos, o no usa la ficha.","v":"Fichas en los teléfonos y observación del docente"},{"id":"P2","dim":"Procedimientos","nom":"Evidencias del equipo","L":"Reúne 2 o más evidencias (fotografías o registros) por hito, en los 4 hitos: 8 o más en total.","M":"4 a 7 evidencias en total.","N":"0 a 3 evidencias en total.","v":"Fichas y fotografías de la aplicación"},{"id":"P3","dim":"Procedimientos","nom":"Puesta en común","L":"En los 4 hitos, los integrantes comparan sus registros y anotan en su ficha el valor acordado del equipo (o la razón de la diferencia).","M":"Lo hacen en 2 o 3 hitos.","N":"Lo hacen en 0 o 1 hito.","v":"Campo “valor acordado” de la ficha"},{"id":"A1","dim":"Actitudes","nom":"Cuidado del entorno","L":"0 conductas de daño durante toda la salida.","M":"1 conducta de daño, corregida cuando se avisa.","N":"2 o más conductas, o no corrige.","v":"Lista de conductas del docente"},{"id":"A2","dim":"Actitudes","nom":"Seguridad","L":"0 recordatorios de normas de seguridad.","M":"1 recordatorio.","N":"2 o más recordatorios.","v":"Lista de recordatorios del docente"},{"id":"A3","dim":"Actitudes","nom":"Respeto y colaboración","L":"0 interrupciones a quien habla y todos los integrantes hablan al menos 1 vez en el cierre.","M":"1 a 3 interrupciones.","N":"4 o más interrupciones, o alguien no habla nunca.","v":"Conteo del docente en la mini-clase y el cierre"}],"fichas":[{"id":"f1","tema":"Fauna y hábitat","hito":"Hito 1 · Playa Blanca","expone":"e1","q":[{"s":"ANTES de escuchar (2 minutos)","t":"Mi predicción","a":"¿Cómo cree que la presencia de personas cambia lo que hacen las aves y otros animales de la playa?","k":"txt"},{"s":"MIENTRAS escucha (durante la mini-clase)","t":"La idea central, con mis palabras","a":"En máximo 2 líneas. No copie las palabras del equipo.","k":"txt"},{"s":"MIENTRAS escucha (durante la mini-clase)","t":"La evidencia del lugar que la sostiene","a":"Qué se vio o midió y dónde. Por ejemplo: Un conteo de animales, una conducta (huida, descanso, alimentación) o una alteración del hábitat, con hora y lugar.","k":"txt"},{"s":"MIENTRAS escucha (durante la mini-clase)","t":"Un concepto nuevo y su definición simple","a":"Elija uno: hábitat · perturbación · distancia de huida · fauna silvestre · principios No Deje Rastro.","k":"txt"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Lo que no calza con lo que yo pensaba","a":"Compare con su predicción (1). Complete: “Yo pensaba que... pero ahora entiendo que... porque...”.","k":"txt"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Conexión con mi propio tema","a":"Cómo refuerza, cambia o completa lo que investigó mi equipo. Dé una razón con “porque”.","k":"txt"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Mi pregunta de profundidad","a":"Una pregunta que no se responda con sí o no: empiece con “¿Por qué...?”, “¿Cómo...?” o “¿Qué pasaría si...?”.","k":"txt"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Transferencia: otro lugar de Chile","a":"¿Qué otra playa, humedal o parque de Chile tiene fauna sensible a las personas? ¿Qué sería distinto allí y por qué?","k":"txt"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Fuerza de la evidencia","a":"Marque: 1 = solo una opinión · 2 = un dato · 3 = varios datos que se pueden repetir. Justifique en una línea.","k":"esc"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Mi autoevaluación","a":"Marque: 1 = puedo repetirlo · 2 = puedo explicarlo · 3 = puedo enseñarlo a otra persona. Escriba 1 acción para subir un nivel.","k":"esc"}]},{"id":"f2","tema":"Contaminación acústica","hito":"Hito 2 · Casa Poli","expone":"e5","q":[{"s":"ANTES de escuchar (2 minutos)","t":"Mi predicción","a":"¿Qué nivel de ruido cree que se mide antes, durante y después del paso del grupo, y cómo cree que reaccionan las aves?","k":"txt"},{"s":"MIENTRAS escucha (durante la mini-clase)","t":"La idea central, con mis palabras","a":"En máximo 2 líneas. No copie las palabras del equipo.","k":"txt"},{"s":"MIENTRAS escucha (durante la mini-clase)","t":"La evidencia del lugar que la sostiene","a":"Qué se vio o midió y dónde. Por ejemplo: Un valor en dB(A) del teléfono o un conteo de cantos o huidas, con el momento (A, B o C) y el lugar.","k":"txt"},{"s":"MIENTRAS escucha (durante la mini-clase)","t":"Un concepto nuevo y su definición simple","a":"Elija uno: nivel de presión sonora dB(A) · ruido ambiental · DS 38/2011 · vocalización · conducta de huida.","k":"txt"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Lo que no calza con lo que yo pensaba","a":"Compare con su predicción (1). Complete: “Yo pensaba que... pero ahora entiendo que... porque...”.","k":"txt"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Conexión con mi propio tema","a":"Cómo refuerza, cambia o completa lo que investigó mi equipo. Dé una razón con “porque”.","k":"txt"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Mi pregunta de profundidad","a":"Una pregunta que no se responda con sí o no: empiece con “¿Por qué...?”, “¿Cómo...?” o “¿Qué pasaría si...?”.","k":"txt"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Transferencia: otro lugar de Chile","a":"¿En qué otro lugar natural de Chile el ruido de los visitantes podría molestar a la fauna o a las personas? ¿Qué norma o medida usaría?","k":"txt"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Fuerza de la evidencia","a":"Marque: 1 = solo una opinión · 2 = un dato · 3 = varios datos que se pueden repetir. Justifique en una línea.","k":"esc"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Mi autoevaluación","a":"Marque: 1 = puedo repetirlo · 2 = puedo explicarlo · 3 = puedo enseñarlo a otra persona. Escriba 1 acción para subir un nivel.","k":"esc"}]},{"id":"f3","tema":"Vegetación","hito":"Hito 3 · Casa Piedra","expone":"e2","q":[{"s":"ANTES de escuchar (2 minutos)","t":"Mi predicción","a":"¿Qué diferencia cree que hay entre la vegetación de un sector de mucho tránsito y la de uno de poco tránsito?","k":"txt"},{"s":"MIENTRAS escucha (durante la mini-clase)","t":"La idea central, con mis palabras","a":"En máximo 2 líneas. No copie las palabras del equipo.","k":"txt"},{"s":"MIENTRAS escucha (durante la mini-clase)","t":"La evidencia del lugar que la sostiene","a":"Qué se vio o midió y dónde. Por ejemplo: Una fotografía o dato de cobertura vegetal, plantas aplastadas o senderos múltiples, con el sector y el lugar.","k":"txt"},{"s":"MIENTRAS escucha (durante la mini-clase)","t":"Un concepto nuevo y su definición simple","a":"Elija uno: cobertura vegetal · pisoteo · senderos múltiples · biodiversidad · desarrollo sostenible.","k":"txt"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Lo que no calza con lo que yo pensaba","a":"Compare con su predicción (1). Complete: “Yo pensaba que... pero ahora entiendo que... porque...”.","k":"txt"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Conexión con mi propio tema","a":"Cómo refuerza, cambia o completa lo que investigó mi equipo. Dé una razón con “porque”.","k":"txt"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Mi pregunta de profundidad","a":"Una pregunta que no se responda con sí o no: empiece con “¿Por qué...?”, “¿Cómo...?” o “¿Qué pasaría si...?”.","k":"txt"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Transferencia: otro lugar de Chile","a":"¿Qué otro sendero o parque de Chile tendría el mismo problema de pisoteo? ¿Qué medida funcionaría allí y por qué?","k":"txt"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Fuerza de la evidencia","a":"Marque: 1 = solo una opinión · 2 = un dato · 3 = varios datos que se pueden repetir. Justifique en una línea.","k":"esc"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Mi autoevaluación","a":"Marque: 1 = puedo repetirlo · 2 = puedo explicarlo · 3 = puedo enseñarlo a otra persona. Escriba 1 acción para subir un nivel.","k":"esc"}]},{"id":"f4","tema":"Suelo","hito":"Hito 4 · Playa Necochea","expone":"e3","q":[{"s":"ANTES de escuchar (2 minutos)","t":"Mi predicción","a":"¿Cómo cree que se ve y se siente un suelo compactado o erosionado, y qué cree que causa ese desgaste?","k":"txt"},{"s":"MIENTRAS escucha (durante la mini-clase)","t":"La idea central, con mis palabras","a":"En máximo 2 líneas. No copie las palabras del equipo.","k":"txt"},{"s":"MIENTRAS escucha (durante la mini-clase)","t":"La evidencia del lugar que la sostiene","a":"Qué se vio o midió y dónde. Por ejemplo: Una medición de la prueba del palito, un surco, una raíz a la vista o un suelo duro, con el lugar y la pendiente.","k":"txt"},{"s":"MIENTRAS escucha (durante la mini-clase)","t":"Un concepto nuevo y su definición simple","a":"Elija uno: compactación · infiltración · escorrentía · erosión · pendiente.","k":"txt"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Lo que no calza con lo que yo pensaba","a":"Compare con su predicción (1). Complete: “Yo pensaba que... pero ahora entiendo que... porque...”.","k":"txt"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Conexión con mi propio tema","a":"Cómo refuerza, cambia o completa lo que investigó mi equipo. Dé una razón con “porque”.","k":"txt"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Mi pregunta de profundidad","a":"Una pregunta que no se responda con sí o no: empiece con “¿Por qué...?”, “¿Cómo...?” o “¿Qué pasaría si...?”.","k":"txt"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Transferencia: otro lugar de Chile","a":"¿En qué otro sendero de Chile (cerro, cordillera o costa) esperaría más erosión? ¿Qué influiría más: el tránsito, la pendiente o la lluvia?","k":"txt"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Fuerza de la evidencia","a":"Marque: 1 = solo una opinión · 2 = un dato · 3 = varios datos que se pueden repetir. Justifique en una línea.","k":"esc"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Mi autoevaluación","a":"Marque: 1 = puedo repetirlo · 2 = puedo explicarlo · 3 = puedo enseñarlo a otra persona. Escriba 1 acción para subir un nivel.","k":"esc"}]},{"id":"f5","tema":"Senderismo y medio ambiente","hito":"Caminata entre hitos y cierre","expone":"e4","q":[{"s":"ANTES de escuchar (2 minutos)","t":"Mi predicción","a":"¿Qué impactos cree que deja una caminata de un curso completo en un sendero, y cuáles podrían ser positivos?","k":"txt"},{"s":"MIENTRAS escucha (durante la mini-clase)","t":"La idea central, con mis palabras","a":"En máximo 2 líneas. No copie las palabras del equipo.","k":"txt"},{"s":"MIENTRAS escucha (durante la mini-clase)","t":"La evidencia del lugar que la sostiene","a":"Qué se vio o midió y dónde. Por ejemplo: Un punto del mapa de impactos, un dato de kilómetros o un resultado del cuestionario, con el lugar.","k":"txt"},{"s":"MIENTRAS escucha (durante la mini-clase)","t":"Un concepto nuevo y su definición simple","a":"Elija uno: impacto ambiental · siete principios · residuos orgánicos e inorgánicos · georreferenciación · turismo responsable.","k":"txt"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Lo que no calza con lo que yo pensaba","a":"Compare con su predicción (1). Complete: “Yo pensaba que... pero ahora entiendo que... porque...”.","k":"txt"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Conexión con mi propio tema","a":"Cómo refuerza, cambia o completa lo que investigó mi equipo. Dé una razón con “porque”.","k":"txt"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Mi pregunta de profundidad","a":"Una pregunta que no se responda con sí o no: empiece con “¿Por qué...?”, “¿Cómo...?” o “¿Qué pasaría si...?”.","k":"txt"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Transferencia: otro lugar de Chile","a":"¿En qué otra ruta o parque de Chile aplicaría los siete principios? ¿Cuál sería el más difícil de cumplir y por qué?","k":"txt"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Fuerza de la evidencia","a":"Marque: 1 = solo una opinión · 2 = un dato · 3 = varios datos que se pueden repetir. Justifique en una línea.","k":"esc"},{"s":"DESPUÉS de escuchar (3 minutos)","t":"Mi autoevaluación","a":"Marque: 1 = puedo repetirlo · 2 = puedo explicarlo · 3 = puedo enseñarlo a otra persona. Escriba 1 acción para subir un nivel.","k":"esc"}]}],"rubP":[{"id":"H","dim":"Habilidades","nom":"Analizar y transferir","L":"En las 4 fichas, las preguntas 5, 6 y 8 tienen una razón con “porque”.","M":"En 2 o 3 fichas.","N":"En 0 o 1 ficha."},{"id":"C","dim":"Contenidos","nom":"Comprender la idea","L":"En las 4 fichas, la idea central (2) es correcta y usa 1 concepto clave del equipo que expone, bien usado.","M":"En 2 o 3 fichas.","N":"En 0 o 1 ficha."},{"id":"P","dim":"Procedimientos","nom":"Registrar con evidencia","L":"Entrega las 4 fichas completas y en las 4 la pregunta 3 dice qué se vio y dónde.","M":"Entrega 3 o 4 fichas, o la pregunta 3 cumple en 2 o 3 fichas.","N":"Entrega 0, 1 o 2 fichas."},{"id":"A","dim":"Actitudes","nom":"Aprender con otros","L":"En las 4 fichas, la pregunta 7 es abierta y la 10 incluye una acción concreta.","M":"En 2 o 3 fichas.","N":"En 0 o 1 ficha."}]};
  const COMUN_TEL = 'En su teléfono (cada integrante): inicie el recorrido de cada hito, tome las fotografías pedidas y responda las alternativas y el desarrollo. Complete la ficha de pares del tema que se expone; en su propio tema no la completa, porque está exponiendo.';
  const DIMD = {
    Habilidades: 'lo que el equipo sabe hacer: registrar, comparar, interpretar y explicar',
    Contenidos: 'lo que el equipo sabe de su tema',
    Procedimientos: 'cómo trabajó el equipo',
    Actitudes: 'cómo se comportó el equipo'
  };
  const COL = {
    verde: ['#dcfce7', '#16a34a', 'Verde'], azul: ['#dbeafe', '#2563eb', 'Azul'], cafe: ['#f3e8dc', '#92400e', 'Café'],
    morado: ['#ede9fe', '#7c3aed', 'Morado'], magenta: ['#fce7f3', '#db2777', 'Magenta']
  };
  const colDe = k => COL[k] || ['#f1f5f9', '#475569', k || ''];
  const SECC = ['recorrido', 'pasos', 'equipos', 'rubT', 'fichas', 'rubP'];

  const LS = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* sin espacio: se sigue sin guardar */ } },
    del(k) { try { localStorage.removeItem(k); } catch (_) {} }
  };
  const fmt1 = n => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
  // Escala 1,0 a 7,0 con 60 % de exigencia (14,4 de 24 puntos = 4,0; 4,8 de 8 puntos = 4,0)
  const notaDe = (p, max) => { const ex = max * 0.6; return p < ex ? 1 + 3 * p / ex : 4 + 3 * (p - ex) / (max - ex); };
  const rutK = r => String(r || '').replace(/[^0-9kK]/g, '').toUpperCase();
  const ocultoModal = () => $('#modal').classList.contains('hidden');

  // Estilos propios (acordeones y selección de escala)
  const st = document.createElement('style');
  st.textContent = 'details.gd>summary{list-style:none}details.gd>summary::-webkit-details-marker{display:none}' +
    'details.gd[open]>summary>.gchev{transform:rotate(180deg)}.gchev{transition:transform .15s}' +
    '@keyframes gpulso{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.65)}50%{box-shadow:0 0 0 8px rgba(245,158,11,0)}}.gpulso{animation:gpulso 1.6s infinite}' +
    '.gesc.sel{background:#0f766e;color:#fff;border-color:#0f766e}' +
    '.gcel.sel{background:#e0e7ff !important;box-shadow:inset 0 0 0 3px #4f46e5;font-weight:600;color:#1e1b4b}' +
    '.gcel.sel::before{content:"✔ Marcado";display:block;font-size:10px;color:#4338ca;font-weight:800;margin-bottom:2px}' +
    '.gcel[data-accion]{cursor:pointer}.gcel[data-accion]:hover{background:#f1f5f9}' +
    '.gtab td,.gtab th{vertical-align:top}';
  document.head.appendChild(st);

  const ABIERTOS = new Set();
  document.addEventListener('toggle', e => {
    const d = e.target;
    if (d && d.matches && d.matches('details.gd') && d.dataset.gd) { if (d.open) ABIERTOS.add(d.dataset.gd); else ABIERTOS.delete(d.dataset.gd); }
  }, true);

  function det(id, ic, titulo, cuerpo, chip) {
    return '<details class="gd rounded-2xl border border-slate-200 bg-white/95 shadow-sm overflow-hidden" data-gd="' + id + '"' + (ABIERTOS.has(id) ? ' open' : '') + '>' +
      '<summary class="flex items-center gap-2 px-3 py-3 cursor-pointer select-none font-bold"><span class="text-xl">' + ic + '</span>' +
      '<span class="flex-1 leading-tight">' + titulo + '</span>' + (chip || '') + '<span class="gchev text-slate-400">▾</span></summary>' +
      '<div class="px-3 pb-3 pt-1 space-y-2">' + cuerpo + '</div></details>';
  }
  const chip = (t, c) => '<span class="text-[11px] font-semibold rounded-full px-2 py-0.5 ' + (c || 'bg-slate-100 text-slate-600') + '">' + t + '</span>';
  const NUM = (fichas, f) => fichas.findIndex(x => x.id === f.id) + 1;

  /* ---------- Piezas de contenido que usan estudiantes y docentes ---------- */
  function htmlRecorrido(r) {
    return '<div class="flex items-stretch gap-1 overflow-x-auto pb-1">' + r.map((p, i) => {
      const hito = /^\d+$/.test(p.r);
      return '<div class="shrink-0 min-w-[84px] text-center rounded-xl px-2 py-2 ' + (hito ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700') + '">' +
        '<div class="text-[11px] opacity-80">' + (hito ? 'Hito ' + esc(p.r) : esc(p.r)) + '</div><div class="text-sm font-bold leading-tight">' + esc(p.n) + '</div></div>' +
        (i < r.length - 1 ? '<div class="self-center text-slate-400">➜</div>' : '');
    }).join('') + '</div>';
  }
  function htmlPasos(ps) {
    return ps.map((p, i) => '<div class="flex gap-2 rounded-xl border p-2">' +
      '<span class="h-7 w-7 shrink-0 rounded-full bg-teal-700 text-white text-sm font-bold flex items-center justify-center">' + (i + 1) + '</span>' +
      '<div class="min-w-0"><div class="text-xs font-semibold text-teal-800">' + esc(p.c) + ' <span class="font-normal text-slate-500">· ' + esc(p.w) + '</span></div>' +
      '<div class="text-sm">' + esc(p.q) + '</div></div></div>').join('');
  }
  function htmlEquipo(e, propio) {
    const c = colDe(e.color);
    return '<div class="rounded-xl p-3 space-y-1 text-sm" style="background:' + c[0] + ';border-left:6px solid ' + c[1] + '">' +
      '<div class="flex flex-wrap items-center gap-2"><b>' + esc(e.nombre) + '</b>' + chip('Color ' + esc(c[2].toLowerCase()), 'bg-white/80 text-slate-700') +
      (propio ? chip('⭐ Su equipo', 'bg-amber-300 text-slate-900') : '') + '</div>' +
      '<div class="text-xs text-slate-600">🎤 Enseña en: <b>' + esc(e.ensena) + '</b></div>' +
      '<div><b>Objetivo:</b> ' + esc(e.objetivo) + '</div>' +
      '<div><b>Tipo de investigación:</b> ' + esc(e.tipo) + '</div></div>';
  }
  function htmlHoja(e) {
    const c = colDe(e.color);
    const fila = (t, v) => v ? '<div class="text-sm"><b>' + t + ':</b> ' + esc(v) + '</div>' : '';
    return '<div class="rounded-xl p-3 space-y-2" style="background:' + c[0] + ';border-left:6px solid ' + c[1] + '">' +
      '<div class="font-bold">' + esc(e.nombre) + ' <span class="text-xs font-normal text-slate-600">· Color ' + esc(c[2].toLowerCase()) + ' · Enseña en: ' + esc(e.ensena) + '</span></div>' +
      fila('Tema', e.tema) + fila('Objetivo general', e.objetivo) + fila('Hipótesis', e.hipotesis) + fila('Tipo de investigación', e.tipo) +
      fila('Qué observa y mide', e.mide) + fila('Instrumentos', e.instr) + fila('Conceptos clave que debe usar', e.conceptos) + '</div>' +
      '<div class="text-sm font-bold pt-1">Qué hace el equipo, momento a momento</div>' +
      (e.ruta || []).map(r => '<div class="rounded-xl border bg-white p-2 text-sm"><div class="font-semibold" style="color:' + c[1] + '">' + esc(r.m) + '</div>' +
        '<div>' + esc(r.q) + '</div><div class="text-xs text-slate-500 mt-1">📎 Evidencia: ' + esc(r.e) + '</div></div>').join('') +
      '<p class="text-xs text-slate-600 bg-slate-50 rounded-xl p-2">' + esc(COMUN_TEL) + '</p>';
  }
  /* ---------- Rúbrica en formato tabla (indicador × niveles de logro) ---------- */
  const NIV = [[2, 'Logrado', '2 pts', '#dcfce7', '#166534'], [1, 'Medianamente logrado', '1 pt', '#fef3c7', '#92400e'], [0, 'No observado', '0 pts', '#ffe4e6', '#9f1239']];
  // o.sel(id) → nivel marcado (2, 1, 0 o undefined) · o.edit → las celdas se pueden pinchar (docente)
  function tablaRub(rub, o) {
    o = o || {};
    let dim = '';
    let h = '<div class="overflow-x-auto rounded-xl border border-slate-300 bg-white"><table class="gtab w-full border-collapse text-xs" style="min-width:640px"><thead><tr>' +
      '<th class="text-left p-2 bg-slate-800 text-white" style="width:22%">Indicador</th>' +
      NIV.map(n => '<th class="p-2 text-center border-l" style="background:' + n[3] + ';color:' + n[4] + ';width:26%">' + n[1] + '<br><span class="font-normal">' + n[2] + '</span></th>').join('') +
      '</tr></thead><tbody>';
    rub.forEach(r => {
      if (r.dim !== dim) {
        dim = r.dim;
        h += '<tr><td colspan="4" class="p-2 bg-slate-100 font-extrabold uppercase tracking-wide text-teal-800">' + esc(dim) +
          (DIMD[dim] ? ' <span class="normal-case font-normal text-slate-500">· ' + esc(DIMD[dim]) + '</span>' : '') + '</td></tr>';
      }
      const v = o.sel ? o.sel(r.id) : undefined;
      h += '<tr><td class="p-2 border-t font-bold">' + esc(r.id) + ' · ' + esc(r.nom) +
        (r.v ? '<div class="font-normal text-[10px] text-slate-500 mt-1">🔎 ' + esc(r.v) + '</div>' : '') + '</td>' +
        NIV.map(n => {
          const tx = n[0] === 2 ? r.L : n[0] === 1 ? r.M : r.N;
          const cl = 'gcel p-2 border-t border-l' + (v === n[0] ? ' sel' : '');
          return o.edit
            ? '<td class="' + cl + '" data-accion="g-nivel" data-attr="' + o.attr + '" data-id="' + esc(r.id) + '" data-n="' + n[0] + '"' + (o.rut ? ' data-r="' + esc(o.rut) + '"' : '') + ' role="button" tabindex="0">' + esc(tx) + '</td>'
            : '<td class="' + cl + '">' + esc(tx) + '</td>';
        }).join('') + '</tr>';
    });
    return h + '</tbody></table></div>';
  }
  function htmlRubT(rub, sel, pie) {
    const max = rub.length * 2;
    return (pie || '') + tablaRub(rub, { sel: sel }) +
      '<p class="text-xs text-slate-600 pt-1">Total máximo: ' + max + ' puntos. Escala de 1,0 a 7,0 con 60 % de exigencia: ' + fmt1(max * 0.6) + ' de ' + max + ' puntos corresponden a la nota 4,0. Se cuentan hechos, no opiniones.</p>';
  }
  function htmlRubP(rub, sel, pie) {
    const max = rub.length * 2;
    return (pie || '') + '<p class="text-sm">Se aplica a las fichas que usted completa (no a la de su propio equipo).</p>' + tablaRub(rub, { sel: sel }) +
      '<p class="text-xs text-slate-600">Total máximo: ' + max + ' puntos. ' + fmt1(max * 0.6) + ' puntos equivalen a la nota 4,0.</p>';
  }

  /* ---------- Nota de la salida: 40 % aplicación + 40 % terreno + 20 % fichas (se suman porcentajes de logro) ---------- */
  function combinar(comps) {
    const ap = comps.filter(c => c.aplica);
    const w = ap.reduce((t, c) => t + c.w, 0);
    const frac = w ? ap.reduce((t, c) => t + c.w * (c.max ? Math.min(1, c.pts / c.max) : 0), 0) / w : 0;
    return { frac: frac, completo: ap.length > 0 && ap.every(c => c.ok), nota: notaDe(frac, 1), ap: ap };
  }
  const ptsDe = (niv, rub) => rub.reduce((t, r) => t + (Number((niv || {})[r.id]) || 0), 0);
  const pct = c => c.max ? Math.round(100 * Math.min(1, c.pts / c.max)) : 0;

  /* =========================================================
     ESTUDIANTES
     ========================================================= */
  function iniciarAlumno() {
    if (typeof renderEstudiante !== 'function' || typeof renderTabsEst !== 'function' || typeof renderContenidoEst !== 'function') return;
    const G = { rut: '', cont: {}, estf: {}, equipo: '', fichas: {}, vc: '', cargada: false, html: '', pend: false, ev: { T: [], P: null } };
    const cont = s => (G.cont && G.cont[s] && G.cont[s].length ? G.cont[s] : DEF[s]);
    const lsKey = f => 'gf:' + G.rut + ':' + f;
    const equipos = () => cont('equipos'), fichasL = () => cont('fichas');
    const equipoPor = id => equipos().find(e => e.id === id);
    const esPropia = f => !!G.equipo && f.expone === G.equipo;
    const estF = id => G.estf[id] || 'pend';
    const enviada = id => !!(G.fichas[id] && G.fichas[id].e === 'enviada');
    const ACC_WR = ['guardarFichaPar'];
    if (typeof ACC_ESCRITURA !== 'undefined') ACC_WR.forEach(a => ACC_ESCRITURA.add(a));

    const asegurarSeccion = () => $('#guias-est');
    const hayActivas = () => !!G.equipo && fichasL().some(f => !esPropia(f) && estF(f.id) === 'abierta' && !enviada(f.id));

    function chipFicha(f) {
      if (enviada(f.id)) return chip('✅ Enviada', 'bg-emerald-100 text-emerald-800');
      const e = estF(f.id);
      if (e === 'abierta' && !G.equipo) return chip('⏳ Espere su equipo', 'bg-slate-100 text-slate-600');
      if (e === 'abierta') return chip('✏️ Complete ahora', 'bg-amber-300 text-slate-900 gpulso');
      if (e === 'cerrada') return chip('⛔ Cerrada', 'bg-rose-100 text-rose-800');
      return chip('🔒 Aún no habilitada', 'bg-slate-100 text-slate-600');
    }

    function htmlFormFicha(f) {
      const est = estF(f.id), edit = est === 'abierta' && !!G.equipo, F = G.fichas[f.id] || { d: {} };
      const exp = equipoPor(f.expone);
      let h = '';
      if (est === 'abierta' && !G.equipo) h += '<div class="rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-sm p-2">⏳ El docente habilitó esta ficha, pero aún no le asigna un equipo. Avísele: así sabrá si esta ficha le corresponde o si su equipo expone este tema.</div>';
      else if (edit) h += '<div class="rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm p-2">✅ El docente habilitó esta ficha. Escuche a <b>' + esc(exp ? exp.nombre : 'el equipo que expone') + '</b> y complétela mientras expone. Se guarda sola; al terminar pinche «Enviar ficha».</div>';
      else if (est === 'cerrada') h += '<div class="rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-sm p-2">⛔ El docente cerró esta ficha: ya no se pueden hacer cambios.' + (enviada(f.id) ? ' Su ficha quedó enviada.' : '') + '</div>';
      else h += '<div class="rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-sm p-2">🔒 Esta ficha todavía no está habilitada. No la complete antes: se activará cuando el docente la habilite en <b>' + esc(f.hito) + '</b> y recibirá un aviso.</div>';
      h += '<p class="text-xs text-slate-500">Complete esta ficha mientras escucha al equipo que expone.</p>';
      let sec = '';
      f.q.forEach((q, i) => {
        const k = 'q' + (i + 1), v = (F.d || {})[k], dis = edit ? '' : ' disabled';
        if (q.s !== sec) { sec = q.s; h += '<div class="text-xs font-extrabold tracking-wide text-teal-800 bg-teal-50 rounded-lg px-2 py-1 mt-2">' + esc(q.s) + '</div>'; }
        h += '<div class="space-y-1"><div class="text-sm font-semibold">' + (i + 1) + '. ' + esc(q.t) + '</div><div class="text-xs text-slate-500">' + esc(q.a) + '</div>';
        if (q.k === 'esc') {
          const n = v && typeof v === 'object' ? Number(v.n) || 0 : 0, t = v && typeof v === 'object' ? v.t || '' : '';
          h += '<div class="flex gap-2">' + [1, 2, 3].map(x => '<label class="gesc' + (n === x ? ' sel' : '') + ' flex-1 text-center rounded-xl border px-2 py-2 text-sm font-bold bg-white"><input type="radio" class="sr-only" name="gf-' + f.id + '-' + k + '" data-gf="' + f.id + '" data-q="' + k + '" data-esc="n" value="' + x + '"' + (n === x ? ' checked' : '') + dis + '>' + x + '</label>').join('') + '</div>' +
            '<textarea rows="2" data-gf="' + f.id + '" data-q="' + k + '" data-esc="t" placeholder="Justifique en una línea…" class="w-full border rounded-xl px-3 py-2 text-sm disabled:bg-slate-100"' + dis + '>' + esc(t) + '</textarea>';
        } else {
          h += '<textarea rows="3" data-gf="' + f.id + '" data-q="' + k + '" class="w-full border rounded-xl px-3 py-2 text-sm disabled:bg-slate-100"' + dis + '>' + esc(typeof v === 'string' ? v : '') + '</textarea>';
        }
        h += '</div>';
      });
      if (edit) h += '<div class="flex flex-wrap items-center gap-2 pt-2"><button data-accion="g-guardar-ficha" data-f="' + f.id + '" class="px-4 py-2 rounded-xl bg-slate-100 font-semibold text-sm">💾 Guardar</button>' +
        '<button data-accion="g-enviar-ficha" data-f="' + f.id + '" class="px-4 py-2 rounded-xl bg-teal-700 text-white font-bold text-sm">📤 Enviar ficha</button>' +
        '<span id="gf-st-' + f.id + '" class="text-xs text-slate-500"></span></div>';
      return h;
    }

    /* ----- Nota y avance ----- */
    function calcular() {
      const acts = ((S.datos && S.datos.actividades) || []).filter(a => !a.formativa);
      let pa = 0, ma = 0, hechas = 0, evald = 0;
      acts.forEach(a => {
        const m = Number(a.puntaje_max) || 0; ma += m;
        let r = null; try { r = respuestaDe(a); } catch (_) { r = null; }
        if (r) { hechas++; if (r.estado === 'evaluada') { evald++; pa += Math.min(m, Math.max(0, Number(r.puntaje_final) || 0)); } }
      });
      const rubT = cont('rubT'), rubP = cont('rubP'), eT = (G.ev && G.ev.T) || [], eP = G.ev && G.ev.P;
      const pt = eT.length ? eT.reduce((t, x) => t + ptsDe(x.niv, rubT), 0) / eT.length : 0;
      const mias = fichasL().filter(f => !esPropia(f));
      const comps = [
        { k: 'A', nom: 'Preguntas de la aplicación', w: 40, pts: pa, max: ma, aplica: acts.length > 0 && ma > 0, ok: acts.length > 0 && evald === acts.length, hechas: hechas, total: acts.length },
        { k: 'T', nom: 'Rúbrica de terreno (su equipo)', w: 40, pts: pt, max: rubT.length * 2, aplica: true, ok: eT.length > 0 },
        { k: 'P', nom: 'Fichas de aprendizaje entre pares', w: 20, pts: eP ? ptsDe(eP.niv, rubP) : 0, max: rubP.length * 2, aplica: true, ok: !!eP }
      ];
      const r = combinar(comps);
      r.comps = comps; r.A = comps[0]; r.T = comps[1]; r.P = comps[2];
      r.completo = r.completo && G.cargada;
      r.fEnv = mias.filter(f => enviada(f.id)).length; r.fTot = mias.length;
      return r;
    }
    function htmlAvance(c) {
      const acts = ((S.datos && S.datos.actividades) || []).filter(a => !a.formativa);
      const grupos = [];
      grupos.push(acts.map(a => { let r = null; try { r = respuestaDe(a); } catch (_) {} return !!r; }));
      if (G.cargada) {
        grupos.push(fichasL().filter(f => !esPropia(f)).map(f => enviada(f.id)));
        grupos.push([c.T.ok, c.P.ok]);
      }
      const g = grupos.filter(x => x.length);
      const todos = [].concat.apply([], g), hechas = todos.filter(Boolean).length;
      const bar = g.map(x => '<div class="flex gap-1" style="flex:' + x.length + ' 1 0%">' + x.map(v => v
        ? '<div class="h-4 flex-1 rounded-md" style="background:#39ff14;box-shadow:0 0 8px #39ff14"></div>'
        : '<div class="h-4 flex-1 rounded-md" style="background:#ef4444"></div>').join('') + '</div>').join('<div style="width:6px"></div>');
      const ok = v => v ? '✓' : '⏳';
      const det = '<div class="text-[11px] mt-1 opacity-95">📝 Preguntas ' + c.A.hechas + '/' + c.A.total +
        (G.cargada ? ' · 📘 Fichas ' + c.fEnv + '/' + c.fTot + ' · 📊 Terreno ' + ok(c.T.ok) + ' · 📋 Evaluación de fichas ' + ok(c.P.ok) : '') + '</div>';
      const box = c.completo
        ? '<button type="button" data-accion="g-ir-guia" class="shrink-0 rounded-2xl px-3 py-2 text-center" style="background:#fde047;color:#1e293b;box-shadow:0 0 0 3px rgba(253,224,71,.55),0 0 14px rgba(253,224,71,.8)"><div class="text-[10px] font-extrabold uppercase tracking-wide">Nota final</div><div class="text-3xl font-extrabold leading-none">' + fmt1(c.nota) + '</div></button>'
        : '<button type="button" data-accion="g-ir-guia" class="shrink-0 rounded-2xl px-3 py-2 text-center" style="background:rgba(255,255,255,.2);border:2px dashed rgba(255,255,255,.7);color:inherit"><div class="text-[10px] font-extrabold uppercase tracking-wide">Nota final</div><div class="text-xl font-extrabold leading-none">—</div><div class="text-[10px] mt-0.5">pendiente</div></button>';
      return '<div id="g-avance" class="flex items-stretch gap-3"><div class="flex-1 min-w-0"><div class="flex" style="min-height:16px">' + bar + '</div>' +
        '<div class="flex justify-between text-[11px] mt-1.5 font-semibold"><span><span style="color:#39ff14">●</span> Realizadas: ' + hechas + '</span><span><span style="color:#ff6b6b">●</span> Pendientes: ' + (todos.length - hechas) + '</span></div>' + det + '</div>' + box + '</div>';
    }
    function pintarAvance() {
      const info = $('#est-info');
      if (!info) return;
      const h = htmlAvance(calcular());
      const ex = $('#g-avance');
      if (ex) { ex.outerHTML = h; return; }
      const seg = info.querySelector('.h-4.flex-1'), fila = seg && seg.closest('div.flex.gap-1');
      const raiz = fila && fila.parentElement;
      if (raiz && raiz !== info && info.contains(raiz)) { raiz.outerHTML = h; return; }
      const barra = info.querySelector('.rounded-full.overflow-hidden');
      if (barra) { barra.outerHTML = h; return; }
      (info.firstElementChild || info).insertAdjacentHTML('beforeend', '<div class="mt-3">' + h + '</div>');
    }
    function htmlNota(c) {
      const fila = x => '<tr class="border-t"><td class="p-2">' + esc(x.nom) + '</td><td class="p-2 text-center">' + x.w + ' %</td>' +
        '<td class="p-2 text-center">' + (x.aplica ? (x.ok || x.pts ? fmt1(x.pts) + ' / ' + x.max + ' (' + pct(x) + ' %)' : '— / ' + x.max) : 'No aplica') + '</td>' +
        '<td class="p-2 text-center">' + (!x.aplica ? '—' : x.ok ? '✅ Evaluado' : '⏳ Pendiente') + '</td></tr>';
      const coment = [];
      ((G.ev && G.ev.T) || []).forEach(x => { if (x.obs) coment.push('📊 Terreno: ' + x.obs); });
      if (G.ev && G.ev.P && G.ev.P.obs) coment.push('📋 Fichas: ' + G.ev.P.obs);
      return '<div class="rounded-2xl p-3 space-y-2" style="' + (c.completo ? 'background:#fef9c3;border:2px solid #facc15' : 'background:#f8fafc;border:2px dashed #cbd5e1') + '">' +
        '<div class="overflow-x-auto"><table class="w-full text-xs border-collapse" style="min-width:420px"><thead><tr class="bg-slate-800 text-white"><th class="p-2 text-left">Parte</th><th class="p-2">Peso</th><th class="p-2">Puntaje</th><th class="p-2">Estado</th></tr></thead><tbody>' + c.comps.map(fila).join('') + '</tbody></table></div>' +
        (c.completo
          ? '<div class="text-center"><div class="text-xs font-bold uppercase tracking-wide text-slate-600">Su nota final de la salida a terreno</div><div class="text-5xl font-extrabold">' + fmt1(c.nota) + '</div><div class="text-xs text-slate-600">Logro total: ' + Math.round(c.frac * 100) + ' % · escala de 1,0 a 7,0 con 60 % de exigencia</div></div>'
          : '<p class="text-sm text-slate-700">⏳ Su nota final aparecerá aquí cuando estén evaluadas las tres partes. Faltan: <b>' + (c.ap.filter(x => !x.ok).map(x => x.nom).join(', ') || '—') + '</b>.</p>') +
        '<p class="text-[11px] text-slate-500">Las tres partes se juntan en una sola nota: no se suman notas, se suman los porcentajes de logro (40 % aplicación, 40 % terreno, 20 % fichas).</p>' +
        (coment.length ? '<div class="text-xs rounded-xl bg-white p-2 space-y-1"><b>Comentarios de los docentes</b>' + coment.map(t => '<div>' + esc(t) + '</div>').join('') + '</div>' : '') + '</div>';
    }

    function htmlTodo() {
      const fl = fichasL(), eqs = equipos(), mi = equipoPor(G.equipo), c = calcular();
      const mias = fl.filter(f => !esPropia(f));
      const activas = mias.filter(f => !!G.equipo && estF(f.id) === 'abierta' && !enviada(f.id));
      const rubT = cont('rubT'), rubP = cont('rubP'), eT = (G.ev && G.ev.T) || [], eP = G.ev && G.ev.P;
      const selT = id => { const v = eT.map(x => x.niv[id]).filter(n => n !== undefined && n !== null && n !== ''); return v.length ? Math.round(v.reduce((a, b) => a + Number(b), 0) / v.length) : undefined; };
      const selP = id => eP && eP.niv[id] !== undefined ? Number(eP.niv[id]) : undefined;
      let h = '<div class="flex items-center gap-2 px-1 pt-1"><span class="text-xl">📘</span><h2 class="font-extrabold text-lg">Guía de la salida</h2></div>';
      if (activas.length) h += '<div class="rounded-2xl bg-amber-100 border-2 border-amber-400 p-3 gpulso space-y-1"><div class="font-extrabold">🔔 Ya puede completar su ficha</div>' +
        activas.map(f => '<button data-accion="g-abrir-ficha" data-f="' + f.id + '" class="block w-full text-left rounded-xl bg-white px-3 py-2 text-sm font-semibold">📝 Ficha ' + NUM(fl, f) + ' · ' + esc(f.tema) + ' <span class="font-normal text-slate-500">(' + esc(f.hito) + ')</span> ➜</button>').join('') + '</div>';
      h += det('rec', '🗺️', 'El recorrido de la salida', htmlRecorrido(cont('recorrido')));
      h += det('pasos', '🧭', 'Paso a paso: ¿qué hará usted?', htmlPasos(cont('pasos')));
      h += det('equipos', '👥', 'Los equipos: objetivo y tipo de investigación', eqs.map(e => htmlEquipo(e, e.id === G.equipo)).join(''), mi ? chip('Su equipo: ' + esc(colDe(mi.color)[2]), 'bg-amber-200 text-slate-900') : '');
      h += det('hoja', '🧾', 'Hoja de ruta de su equipo',
        mi ? htmlHoja(mi) : '<div class="rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-sm p-3">⏳ El docente aún no le asigna un equipo. Cuando lo haga, aquí aparecerá la hoja de ruta de su equipo.</div>',
        mi ? chip(esc(colDe(mi.color)[2]), 'bg-white text-slate-700 border') : '');
      h += det('rubt', '📊', 'Rúbrica de terreno (la evalúan los docentes)',
        htmlRubT(rubT, selT, eT.length ? '<div class="rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-sm p-2">✔ Su equipo ya fue evaluado: <b>' + fmt1(c.T.pts) + ' / ' + c.T.max + '</b> puntos. Los niveles marcados aparecen con borde azul.</div>' : '<div class="rounded-xl bg-slate-50 border text-slate-600 text-xs p-2">Aún no evalúan a su equipo. Cuando lo hagan, el nivel logrado en cada indicador quedará marcado.</div>'),
        eT.length ? chip('Evaluada', 'bg-emerald-100 text-emerald-800') : '');
      h += '<div class="px-1 pt-2"><div class="font-extrabold">📝 Fichas de aprendizaje entre pares</div>' +
        '<p class="text-xs text-slate-600">Usted completa ' + (G.equipo ? mias.length : fl.length - 1) + ' fichas, una en cada visita, cuando el docente la habilite. ' +
        (G.equipo ? 'La ficha del tema que expone su equipo no le corresponde.' : 'Cuando el docente le asigne un equipo, sabrá cuál ficha no le corresponde.') + '</p></div>';
      if (!G.equipo) h += '<div class="rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-sm p-2">⏳ Aún no tiene equipo asignado: no podrá completar fichas hasta que el docente se lo asigne.</div>';
      fl.forEach(f => {
        const exp = equipoPor(f.expone);
        if (esPropia(f)) {
          h += '<div class="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-100 px-3 py-3 text-sm text-slate-600 flex items-start gap-2"><span class="text-xl">🚫</span><span class="flex-1"><b>Ficha ' + NUM(fl, f) + ' · ' + esc(f.tema) + '</b> · ' + esc(f.hito) + '<br>Su equipo expone este tema, por eso <b>no la completa</b>.</span>' + chip('No aplica', 'bg-slate-300 text-slate-700') + '</div>';
        } else {
          h += det(f.id, '📝', 'Ficha ' + NUM(fl, f) + ' · ' + esc(f.tema) + '<span class="block text-xs font-normal text-slate-500">' + esc(f.hito) + (exp ? ' · Expone ' + esc(exp.nombre.split(' · ')[0]) : '') + '</span>', htmlFormFicha(f), chipFicha(f));
        }
      });
      h += det('rubp', '📋', 'Rúbrica de las fichas de aprendizaje entre pares',
        htmlRubP(rubP, selP, eP ? '<div class="rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-sm p-2">✔ Sus fichas ya fueron evaluadas: <b>' + fmt1(c.P.pts) + ' / ' + c.P.max + '</b> puntos. Los niveles marcados aparecen con borde azul.</div>' : ''),
        eP ? chip('Evaluada', 'bg-emerald-100 text-emerald-800') : '');
      h += det('nota', '🏁', 'Mi nota de la salida', htmlNota(c), c.completo ? chip('Nota ' + fmt1(c.nota), 'bg-yellow-300 text-slate-900') : chip('Pendiente', 'bg-slate-100 text-slate-600'));
      return h;
    }

    function dibujar(forzar) {
      const s = asegurarSeccion();
      if (!s) return;
      const a = document.activeElement;
      if (!forzar && a && s.contains(a) && /^(TEXTAREA|INPUT)$/.test(a.tagName)) { G.pend = true; return; }
      G.pend = false;
      const h = htmlTodo();
      if (h === G.html && s.innerHTML) return;
      G.html = h; s.innerHTML = h;
    }
    document.addEventListener('focusout', () => { if (G.pend) setTimeout(() => dibujar(), 400); });

    function guardarLocal() { LS.set('guias:' + G.rut, { cont: G.cont, vc: G.vc, estf: G.estf, equipo: G.equipo, ev: G.ev }); }
    function fusionar(srv) {
      const r = {};
      Object.keys(srv || {}).forEach(f => { r[f] = { d: srv[f].d || {}, e: srv[f].e || '' }; });
      fichasL().concat(DEF.fichas).forEach(f => {
        const l = LS.get(lsKey(f.id));
        if (l && l.dirty) r[f.id] = { d: l.d || {}, e: (r[f.id] && r[f.id].e) || l.e || '', dirty: true };
      });
      return r;
    }
    function aplicar(r, previo) {
      const prev = previo ? Object.assign({}, G.estf) : null;
      if (r.cont) G.cont = r.cont;
      G.vc = r.vc || G.vc; G.estf = r.estf || {}; G.equipo = r.equipo || '';
      if (r.fichas) G.fichas = fusionar(r.fichas);
      if (r.ev) G.ev = r.ev;
      G.cargada = true; guardarLocal();
      if (prev) avisarCambios(prev);
      dibujar(); refrescarPantalla();
    }
    function avisarCambios(prev) {
      const fl = fichasL();
      const nuevas = !G.equipo ? [] : fl.filter(f => !esPropia(f) && G.estf[f.id] === 'abierta' && prev[f.id] !== 'abierta' && !enviada(f.id));
      const cerradas = fl.filter(f => !esPropia(f) && G.estf[f.id] === 'cerrada' && prev[f.id] === 'abierta');
      if (nuevas.length) {
        try { if (navigator.vibrate) navigator.vibrate([250, 120, 250]); } catch (_) {}
        if (ocultoModal()) {
          const f = nuevas[0], exp = equipoPor(f.expone);
          modal('<div class="space-y-3 pt-2 text-center"><div class="text-5xl">🔔</div><h3 class="text-xl font-extrabold">¡Ya puede completar su ficha!</h3>' +
            '<ul class="text-sm text-left space-y-1">' + nuevas.map(x => '<li>📝 <b>Ficha ' + NUM(fl, x) + ' · ' + esc(x.tema) + '</b> — ' + esc(x.hito) + '</li>').join('') + '</ul>' +
            '<p class="text-sm text-slate-600">Escuche a <b>' + esc(exp ? exp.nombre : 'el equipo que expone') + '</b> y responda las 10 preguntas mientras expone. Su respuesta se guarda sola. Al terminar, pinche «Enviar ficha».</p>' +
            '<button data-accion="g-abrir-ficha" data-f="' + f.id + '" class="w-full bg-teal-700 text-white font-bold py-3 rounded-xl">Abrir la ficha</button></div>');
        } else aviso('🔔 El docente habilitó la ficha: ' + nuevas.map(x => x.tema).join(', '));
      }
      if (cerradas.length) {
        cerradas.forEach(f => { const F = G.fichas[f.id]; if (F && F.dirty) { F.dirty = false; LS.del(lsKey(f.id)); } });
        aviso('⛔ El docente cerró la ficha: ' + cerradas.map(x => x.tema).join(', '), 'error');
      }
    }

    let cargando_ = false;
    async function refrescar(completo) {
      if (!S.token || !S.usuario || cargando_) return;
      cargando_ = true;
      try {
        const total = completo || !G.cargada;
        const r = await api('getGuias', total ? {} : { liviano: true, vc: G.vc });
        aplicar(r, G.cargada && !total);
      } catch (_) { /* sin señal: se siguen mostrando las guías guardadas en el teléfono */ }
      finally { cargando_ = false; }
    }

    // Guardado de fichas (borrador automático y envío)
    const timers = {};
    const programar = f => { clearTimeout(timers[f]); timers[f] = setTimeout(() => guardarFicha(f, false, true), 4000); };
    const marcar = (f, t) => { const e = $('#gf-st-' + f); if (e) e.textContent = t; };
    async function guardarFicha(fid, enviar, silencioso) {
      clearTimeout(timers[fid]);
      const F = G.fichas[fid] = G.fichas[fid] || { d: {}, e: '' };
      if (!F.dirty && !enviar) { if (!silencioso) marcar(fid, '✔ Todo guardado'); return true; }
      try {
        if (!silencioso) cargando(true, enviar ? 'Enviando su ficha…' : 'Guardando…');
        const r = await api('guardarFichaPar', { ficha: fid, datos: F.d, enviar: !!enviar });
        F.e = r.estado; F.dirty = false; LS.del(lsKey(fid));
        marcar(fid, enviar ? '✅ Enviada' : '✔ Guardado ' + new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }));
        if (enviar) { aviso('Ficha enviada. ¡Gracias!'); dibujar(true); }
        return true;
      } catch (e) {
        if (e.codigo === 'NO_APLICA' || e.codigo === 'SIN_EQUIPO') { F.dirty = false; LS.del(lsKey(fid)); aviso(e.message, 'error'); await refrescar(true); return false; }
        if (e.codigo === 'FICHA_CERRADA') { F.dirty = false; LS.del(lsKey(fid)); aviso(e.message, 'error'); await refrescar(false); return false; }
        marcar(fid, '📵 Sin conexión: guardado en su teléfono');
        if (!silencioso) aviso('No se pudo enviar: ' + e.message + ' Su respuesta quedó guardada en el teléfono.', 'error');
        return false;
      } finally { if (!silencioso) cargando(false); }
    }
    function faltantes(f) {
      const d = (G.fichas[f.id] || {}).d || {}, falta = [];
      f.q.forEach((q, i) => {
        const v = d['q' + (i + 1)];
        if (q.k === 'esc') { if (!(v && Number(v.n) > 0 && String(v.t || '').trim())) falta.push(i + 1); }
        else if (!String(v || '').trim()) falta.push(i + 1);
      });
      return falta;
    }
    function sincronizarPendientes() {
      fichasL().forEach(f => { const F = G.fichas[f.id]; if (F && F.dirty && estF(f.id) === 'abierta') guardarFicha(f.id, false, true); });
    }

    // Lo que escribe el estudiante
    function alEscribir(e) {
      const t = e.target;
      if (!t || !t.dataset || !t.dataset.gf) return;
      const fid = t.dataset.gf, q = t.dataset.q;
      const F = G.fichas[fid] = G.fichas[fid] || { d: {}, e: '' };
      if (t.dataset.esc) {
        const o = (F.d[q] && typeof F.d[q] === 'object') ? F.d[q] : { n: 0, t: '' };
        if (t.dataset.esc === 'n') {
          o.n = Number(t.value) || 0;
          const g = t.closest('.gesc') && t.closest('.gesc').parentElement;
          if (g) g.querySelectorAll('.gesc').forEach(l => l.classList.toggle('sel', l.contains(t)));
        } else o.t = t.value;
        F.d[q] = o;
      } else F.d[q] = t.value;
      F.dirty = true;
      LS.set(lsKey(fid), { d: F.d, e: F.e, dirty: true, ts: Date.now() });
      marcar(fid, '✏️ Sin guardar…');
      programar(fid);
    }
    document.addEventListener('input', alEscribir);
    document.addEventListener('change', alEscribir);
    document.addEventListener('focusout', e => { const t = e.target; if (t && t.dataset && t.dataset.gf) guardarFicha(t.dataset.gf, false, true); });

    document.addEventListener('click', async e => {
      const b = e.target.closest('[data-accion]');
      if (!b || b.dataset.accion.indexOf('g-') !== 0) return;
      const a = b.dataset.accion, f = b.dataset.f;
      try {
        if (a === 'g-guardar-ficha') { const ok = await guardarFicha(f, false, false); if (ok) aviso('Ficha guardada.'); }
        else if (a === 'g-enviar-ficha') {
          const fi = fichasL().find(x => x.id === f), falta = fi ? faltantes(fi) : [];
          if (falta.length) return aviso('Faltan por responder las preguntas: ' + falta.join(', ') + '. En las preguntas 9 y 10 marque 1, 2 o 3 y escriba la justificación.', 'error');
          await guardarFicha(f, true, false);
        } else if (a === 'g-ir-guia') {
          ABIERTOS.add('nota'); S.tab = 'guia'; renderContenidoEst();
          setTimeout(() => { const d = document.querySelector('details.gd[data-gd="nota"]'); if (d) { d.open = true; try { d.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {} } }, 150);
        } else if (a === 'g-abrir-ficha') {
          if (S.tab !== 'guia') { S.tab = 'guia'; renderContenidoEst(); }
          if (!ocultoModal()) cerrarModal();
          ABIERTOS.add(f); dibujar(true);
          const d = document.querySelector('details.gd[data-gd="' + f + '"]');
          if (d) { d.open = true; setTimeout(() => { try { d.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) {} }, 120); }
        }
      } catch (err) { cargando(false); aviso(err.message, 'error'); }
    });

    function montar() {
      const rut = S.usuario && S.usuario.key;
      if (!rut) return;
      if (G.rut !== rut) {
        Object.assign(G, { rut: rut, cont: {}, estf: {}, equipo: '', fichas: {}, vc: '', cargada: false, html: '', ev: { T: [], P: null } });
        const l = LS.get('guias:' + rut);
        if (l) { G.cont = l.cont || {}; G.vc = l.vc || ''; G.estf = l.estf || {}; G.equipo = l.equipo || ''; G.ev = l.ev || { T: [], P: null }; G.fichas = fusionar({}); }
        if (l && S.tab !== 'guia') setTimeout(() => refrescar(true), 2500);   // ya hay copia guardada: no compite con la carga principal
        else setTimeout(() => refrescar(true), S.tab === 'guia' ? 0 : 1200);
      }
      dibujar();
    }
    // Pestaña «Guía» (junto a «Pendientes») y cuadro de nota final junto al avance
    function refrescarPantalla() {
      try { if (typeof renderTabsEst === 'function') renderTabsEst(); } catch (_) {}
      try { pintarAvance(); } catch (e) { console.error(e); }
    }
    const datosListos = () => !!(S.datos && Array.isArray(S.datos.actividades));
    // Orden pedido: Guía, Todas, Realizadas, Pendientes, (Recorridos), Mapa
    const RANGO = t => ({ guia: 0, todas: 1, realizadas: 2, pendientes: 3, recorridos: 4 })[t] !== undefined ? ({ guia: 0, todas: 1, realizadas: 2, pendientes: 3, recorridos: 4 })[t] : (/mapa/i.test(t) ? 6 : 5);
    const _renderTabsGuias = renderTabsEst;
    renderTabsEst = function () {
      if (!datosListos()) return;   // los datos aún no llegaron (p. ej. recién firmada la carta): se dibuja cuando lleguen
      _renderTabsGuias();
      try {
        const nav = $('#est-tabs');
        if (!nav) return;
        nav.querySelectorAll('[data-tab="guia"]').forEach(x => x.remove());
        const html = '<button data-accion="tab-est" data-tab="guia" class="py-2 rounded-xl flex flex-col items-center leading-tight ' + (S.tab === 'guia' ? 'tab-activa' : '') + '"><span class="text-lg">📘</span><span>Guía' + (hayActivas() ? ' 🔔' : '') + '</span></button>';
        nav.insertAdjacentHTML('afterbegin', html);
        const bs = Array.prototype.slice.call(nav.children);
        bs.map((b, i) => ({ b: b, i: i, r: RANGO(b.dataset.tab || '') })).sort((x, y) => x.r - y.r || x.i - y.i).forEach(x => nav.appendChild(x.b));
        const n = nav.children.length;
        nav.className = 'grid ' + (n >= 6 ? 'grid-cols-6' : n === 5 ? 'grid-cols-5' : 'grid-cols-4') + ' gap-1 bg-white/95 rounded-2xl shadow p-1 text-xs font-semibold';
        if (n >= 6) nav.querySelectorAll('button').forEach(b => { b.style.fontSize = '10px'; });
      } catch (e) { console.error(e); }
    };
    const _renderContenidoGuias = renderContenidoEst;
    renderContenidoEst = function () {
      if (S.tab !== 'guia') return _renderContenidoGuias();
      try { renderTabsEst(); } catch (e) { console.error(e); }
      if (typeof detenerMapa === 'function') detenerMapa();
      const box = $('#est-contenido');
      if (!box) return;
      const ex = $('#guias-est');
      if (!ex || !box.contains(ex)) { box.innerHTML = '<section id="guias-est" class="space-y-2"></section>'; G.html = ''; }
      montar();
    };
    const _renderEstGuias = renderEstudiante;
    renderEstudiante = function () { _renderEstGuias(); try { montar(); refrescarPantalla(); } catch (e) { console.error(e); } };

    // Revisión periódica (el estado de las fichas cambia cuando el docente las habilita o las cierra)
    let ultimo = Date.now();
    setInterval(() => {
      const p = $('#pantalla-estudiante');
      if (document.hidden || !navigator.onLine || !S.token || !p || p.classList.contains('hidden')) return;
      // en la pestaña Guía cada 25 s; en las demás cada 60 s (menos tráfico y más rapidez en el resto de la app)
      if (Date.now() - ultimo < (S.tab === 'guia' ? 24000 : 59000)) return;
      ultimo = Date.now();
      refrescar(false);
    }, 5000);
    document.addEventListener('visibilitychange', () => { const p = $('#pantalla-estudiante'); if (!document.hidden && S.token && G.rut && p && !p.classList.contains('hidden')) refrescar(false); });
    window.addEventListener('online', () => { sincronizarPendientes(); refrescar(false); });
  }

  /* =========================================================
     DOCENTES
     ========================================================= */
  function iniciarDocente() {
    if (typeof renderDocente !== 'function' || typeof TABS_DOC === 'undefined') return;
    let GD = null, GD_IA = {};
    const gsub = () => S.gsub || 'fichas';
    const cont = s => (GD && GD.cont[s] && GD.cont[s].length ? GD.cont[s] : DEF[s]);
    const equipos = () => cont('equipos'), fichasL = () => cont('fichas');
    const nomEq = id => { const e = equipos().find(x => x.id === id); return e ? e.nombre : 'Sin equipo'; };
    const activos = () => (S.panel.estudiantes || []).filter(e => String(e.activo).toLowerCase() !== 'no');
    const miAsig = e => GD.asig[rutK(e.rut)] || '';
    if (typeof ACC_ESCRITURA !== 'undefined') ['guardarGuia', 'restaurarGuia', 'asignarEquipos', 'estadoFicha', 'marcarFormativa'].forEach(a => ACC_ESCRITURA.add(a));

    if (!TABS_DOC.some(t => t[0] === 'guias')) {
      const i = TABS_DOC.findIndex(t => t[0] === 'recorridos');
      TABS_DOC.splice(i < 0 ? TABS_DOC.length : i, 0, ['guias', '📘 Guías']);
    }

    // Nombre del docente que ingresa (arriba y en el saludo)
    function cabeceraDoc() {
      const yo = S.panel && S.panel.yo;
      if (!yo) return;
      const n = yo.nombre || 'Docente';
      const a = $('#doc-sub'), b = $('#doc-bienv');
      if (a) a.textContent = n + ' · Salida a Terreno';
      if (b) b.textContent = 'Bienvenido(a), ' + n;
    }
    const _rdGuias = renderDocente;
    renderDocente = function () {
      if (S.tabDoc !== 'guias') { _rdGuias(); try { cabeceraDoc(); } catch (_) {} return; }
      const titular = typeof esTitular === 'function' ? esTitular() : true;
      const ocultas = titular ? [] : ['estudiantes', 'ayudantes', 'ajustes'];
      $('#doc-tabs').innerHTML = TABS_DOC.filter(t => ocultas.indexOf(t[0]) < 0).map(([k, t]) =>
        '<button data-accion="tab-doc" data-tab="' + k + '" class="px-3 py-2 rounded-xl whitespace-nowrap ' + (S.tabDoc === k ? 'tab-activa' : '') + '">' + t + '</button>').join('');
      if (typeof detenerMapa === 'function') detenerMapa();
      cabeceraDoc();
      vistaGuias();
    };

    async function cargarGD() { GD = await api('getGuiasDoc', {}); GD.dT = {}; GD.dP = {}; }
    async function vistaGuias() {
      const box = $('#doc-contenido');
      if (!GD) {
        box.innerHTML = '<div class="bg-white/90 rounded-2xl p-8 text-center text-slate-500">Cargando las guías…</div>';
        try { await cargarGD(); } catch (e) { box.innerHTML = '<div class="bg-rose-50 text-rose-800 rounded-2xl p-4 text-sm">No se pudieron cargar las guías: ' + esc(e.message) + '. ¿Pegó el archivo Guias.gs y publicó una nueva versión de Apps Script?</div>'; return; }
        if (S.tabDoc !== 'guias') return;
      }
      pintar();
    }
    function pintar() {
      if (S.tabDoc !== 'guias' || !GD) return;
      const y = window.scrollY;
      const subs = [['fichas', '▶️ Habilitar fichas'], ['equipos', '👥 Equipos'], ['rubt', '📊 Rúbrica de terreno'], ['rubp', '📋 Evaluar fichas'], ['formativas', '🧪 Formativas'], ['notas', '🏁 Notas'], ['contenido', '✏️ Contenido']];
      const titular = typeof esTitular === 'function' ? esTitular() : true;
      const banner = titular ? '' : '<div class="rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-sm p-3 mb-3">🤝 Ingresó como ayudante: <b>' + esc(GD.yo.nombre) + '</b>.</div>';
      $('#doc-contenido').innerHTML = banner +
        '<div class="flex gap-1 overflow-x-auto bg-white/95 rounded-2xl shadow p-1 text-sm font-semibold mb-3">' + subs.map(([k, t]) =>
          '<button data-accion="g-sub" data-s="' + k + '" class="px-3 py-2 rounded-xl whitespace-nowrap ' + (gsub() === k ? 'tab-activa' : '') + '">' + t + '</button>').join('') +
        '<button data-accion="g-refrescar" class="ml-auto px-3 py-2 rounded-xl whitespace-nowrap bg-slate-100" title="Traer lo último guardado por estudiantes y otros docentes">🔄 Actualizar</button></div>' +
        '<div id="g-cuerpo">' + ({ fichas: pFichas, equipos: pEquipos, rubt: pRubT, rubp: pRubP, formativas: pFormativas, notas: pNotas, contenido: pContenido }[gsub()] || pFichas)() + '</div>';
      window.scrollTo(0, y);
    }

    /* ----- Habilitar / cerrar fichas ----- */
    function pFichas() {
      const fl = fichasL(), est = activos();
      const sinEq = est.filter(s => !miAsig(s)).length;
      return (sinEq ? '<div class="rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-sm p-3 mb-3">⚠️ <b>' + sinEq + '</b> estudiantes no tienen equipo. Mientras no se los asigne en «Equipos», no podrán completar ninguna ficha.</div>' : '') +
        '<div class="rounded-2xl bg-white/95 shadow p-4 text-sm space-y-1"><b>Cómo funciona</b>' +
        '<p>Cada ficha queda <b>bloqueada</b> hasta que usted la habilite, así nadie la completa antes. Al habilitarla, los estudiantes reciben un aviso en su teléfono. Con «Cerrar» ya no se puede escribir más (lo enviado queda guardado).</p></div>' +
        '<div class="space-y-3 mt-3">' + fl.map(f => {
          const e = GD.estf[f.id] || 'pend', exp = equipos().find(x => x.id === f.expone);
          const deben = est.filter(s => miAsig(s) !== f.expone);
          let env = 0, bor = 0;
          deben.forEach(s => { const x = (GD.fp[rutK(s.rut)] || {})[f.id]; if (x === 'enviada') env++; else if (x === 'borrador') bor++; });
          const c = colDe(exp && exp.color);
          const estado = e === 'abierta' ? chip('✏️ Habilitada', 'bg-emerald-100 text-emerald-800') : e === 'cerrada' ? chip('⛔ Cerrada', 'bg-rose-100 text-rose-800') : chip('🔒 No habilitada', 'bg-slate-100 text-slate-600');
          return '<div class="bg-white/95 rounded-2xl shadow p-4 space-y-2" style="border-left:6px solid ' + c[1] + '">' +
            '<div class="flex flex-wrap items-center gap-2"><b class="flex-1 min-w-0">Ficha ' + NUM(fl, f) + ' · ' + esc(f.tema) + '</b>' + estado + '</div>' +
            '<div class="text-xs text-slate-500">' + esc(f.hito) + ' · Expone: ' + esc(exp ? exp.nombre : '') + '</div>' +
            '<div class="text-xs">📤 Enviadas: <b>' + env + '</b> de ' + deben.length + ' · ✏️ Borradores: <b>' + bor + '</b></div>' +
            '<div class="flex flex-wrap gap-2">' +
            (e !== 'abierta' ? '<button data-accion="g-estado" data-f="' + f.id + '" data-e="abierta" class="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm">▶️ Habilitar</button>' : '') +
            (e === 'abierta' ? '<button data-accion="g-estado" data-f="' + f.id + '" data-e="cerrada" class="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-sm">⏹ Cerrar</button>' : '') +
            (e !== 'pend' ? '<button data-accion="g-estado" data-f="' + f.id + '" data-e="pend" class="px-3 py-2 rounded-xl bg-slate-100 text-sm font-semibold">↩️ Volver a bloquear</button>' : '') + '</div></div>';
        }).join('') + '</div>' +
        '<div class="mt-3"><button data-accion="g-estado-todas" class="px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-semibold">⏹ Cerrar todas las fichas habilitadas</button></div>';
    }

    /* ----- Equipos y estudiantes ----- */
    function pEquipos() {
      const F = GD.fEq = GD.fEq || { curso: '', q: '' };
      const lista = activos(), cursos = Array.from(new Set(lista.map(e => e.curso).filter(Boolean))).sort();
      const vis = lista.filter(e => (!F.curso || e.curso === F.curso) && (!F.q || String(e.nombre).toLowerCase().indexOf(F.q.toLowerCase()) >= 0));
      const cnt = {}; lista.forEach(e => { const a = miAsig(e) || '-'; cnt[a] = (cnt[a] || 0) + 1; });
      const opts = sel => '<option value="">Sin equipo</option>' + equipos().map(e => '<option value="' + e.id + '"' + (sel === e.id ? ' selected' : '') + '>' + esc(e.nombre) + '</option>').join('');
      return '<div class="rounded-2xl bg-white/95 shadow p-4 text-sm"><b>Equipos.</b> Indique a qué equipo pertenece cada estudiante: cada uno verá la hoja de ruta de su equipo y no completará la ficha del tema que su equipo expone. Se guarda al elegir.</div>' +
        '<div class="flex flex-wrap gap-2 mt-3">' + equipos().map(e => { const c = colDe(e.color); return '<span class="text-xs rounded-full px-3 py-1 font-semibold" style="background:' + c[0] + ';color:#1e293b;border:1px solid ' + c[1] + '">' + esc(e.nombre.split(' · ')[0]) + ': ' + (cnt[e.id] || 0) + '</span>'; }).join('') +
        '<span class="text-xs rounded-full px-3 py-1 font-semibold bg-amber-100 text-amber-900">Sin equipo: ' + (cnt['-'] || 0) + '</span></div>' +
        '<div class="flex flex-wrap gap-2 mt-3"><select data-gfiltro="curso" class="border rounded-xl px-3 py-2 text-sm"><option value="">Todos los cursos</option>' + cursos.map(c => '<option' + (F.curso === c ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select>' +
        '<input data-gfiltro="q" value="' + esc(F.q) + '" placeholder="Buscar por nombre" class="border rounded-xl px-3 py-2 text-sm flex-1 min-w-[140px]"></div>' +
        '<div class="flex flex-wrap items-center gap-2 mt-3 bg-white/95 rounded-2xl shadow p-3 text-sm"><span>Asignar a los <b>' + vis.length + '</b> estudiantes que se ven:</span>' +
        '<select id="g-masivo" class="border rounded-xl px-2 py-2">' + opts('') + '</select><button data-accion="g-masivo" class="px-3 py-2 rounded-xl bg-slate-800 text-white font-semibold">Aplicar</button></div>' +
        '<div class="bg-white/95 rounded-2xl shadow mt-3 divide-y">' + (vis.map(e => '<div class="flex items-center gap-2 p-3"><div class="flex-1 min-w-0"><div class="font-semibold text-sm truncate">' + esc(e.nombre) + '</div><div class="text-xs text-slate-400">' + esc(e.curso) + '</div></div>' +
          '<select data-gasig="' + esc(rutK(e.rut)) + '" class="border rounded-xl px-2 py-2 text-sm max-w-[48%]">' + opts(miAsig(e)) + '</select></div>').join('') || '<div class="p-6 text-center text-slate-500 text-sm">No hay estudiantes para mostrar. Cargue la nómina en «Estudiantes».</div>') + '</div>';
    }
    async function asignar(cambios) {
      const r = await api('asignarEquipos', { cambios: cambios });
      GD.asig = r.asig || GD.asig;
    }

    /* ----- Rúbrica de terreno (G5) ----- */
    const tmr = {};
    const estadoGuardado = (id, t, mal) => { const e = $('#' + id); if (e) { e.textContent = t; e.className = 'text-xs ' + (mal ? 'text-rose-600' : 'text-emerald-700'); } };
    function pRubT() {
      const eq = GD.eq || equipos()[0].id, rub = cont('rubT'), max = rub.length * 2;
      const mio = (GD.evalT[eq] || {})[GD.yo.id];
      if (!GD.dT[eq]) GD.dT[eq] = { niv: Object.assign({}, mio && mio.niv), obs: (mio && mio.obs) || '' };
      const d = GD.dT[eq];
      let h = '<div class="flex gap-2 overflow-x-auto pb-1">' + equipos().map(e => { const c = colDe(e.color), on = e.id === eq; return '<button data-accion="g-eq" data-e="' + e.id + '" class="shrink-0 px-3 py-2 rounded-xl text-sm font-bold" style="background:' + (on ? c[1] : c[0]) + ';color:' + (on ? '#fff' : '#1e293b') + ';border:2px solid ' + c[1] + '">' + esc(e.nombre.split(' · ')[0]) + '</button>'; }).join('') + '</div>' +
        '<div class="rounded-2xl bg-white/95 shadow p-3 mt-2 text-sm"><b>' + esc(nomEq(eq)) + '</b> · Evalúa: <b>' + esc(GD.yo.nombre) + '</b><br><span class="text-xs text-slate-500">Pinche la celda del nivel logrado en cada indicador: queda marcada con borde azul. El puntaje se guarda solo y puede cambiarlo cuando quiera.</span></div>' +
        '<div class="flex flex-wrap items-center gap-2 mt-2"><button data-accion="g-iat" data-e="' + eq + '" class="px-3 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold">🤖 Sugerir evaluación con IA</button><span class="text-xs text-slate-500">La IA revisa lo que el equipo envió en la aplicación y solo propone: usted decide.</span></div><div id="g-iat-box" class="mt-2"></div>' +
        '<div class="mt-2">' + tablaRub(rub, { edit: true, attr: 'gt', sel: id => d.niv[id] }) + '</div>';
      h += '<div class="bg-white/95 rounded-2xl shadow p-3 mt-3 space-y-2"><textarea data-gtobs rows="3" placeholder="Retroalimentación breve (solo sobre el trabajo evaluado)" class="w-full border rounded-xl px-3 py-2 text-sm">' + esc(d.obs) + '</textarea>' +
        '<div id="g-tot" class="text-sm"></div><div id="g-ev-otros" class="text-xs text-slate-600"></div><span id="g-gt-st" class="text-xs"></span></div>';
      setTimeout(totalesT, 0);
      return h;
    }
    function totalesT() {
      const eq = GD.eq || equipos()[0].id, rub = cont('rubT'), max = rub.length * 2, d = GD.dT[eq];
      if (!d || !$('#g-tot')) return;
      const marc = Object.keys(d.niv).filter(k => rub.some(r => r.id === k)).length;
      const pts = rub.reduce((s, r) => s + (d.niv[r.id] || 0), 0);
      $('#g-tot').innerHTML = 'Mi evaluación: <b>' + pts + ' / ' + max + '</b> puntos · nota <b>' + fmt1(notaDe(pts, max)) + '</b> <span class="text-xs text-slate-500">(' + marc + ' de ' + rub.length + ' indicadores marcados)</span>';
      const otros = Object.keys(GD.evalT[eq] || {}).filter(k => k !== GD.yo.id).map(k => GD.evalT[eq][k]);
      const todos = otros.map(o => o.pts).concat([pts]);
      const prom = todos.reduce((a, b) => a + b, 0) / todos.length;
      $('#g-ev-otros').innerHTML = (otros.length ? 'Otros docentes: ' + otros.map(o => esc(o.nom) + ' <b>' + o.pts + '/' + max + '</b>').join(' · ') + '<br>' : '') +
        '<b>Puntaje del equipo' + (todos.length > 1 ? ' (promedio de ' + todos.length + ' docentes)' : '') + ': ' + fmt1(prom) + ' / ' + max + ' · nota ' + fmt1(notaDe(prom, max)) + '</b>' +
        (todos.length > 1 && Math.max.apply(null, todos) - Math.min.apply(null, todos) > 4 ? '<br>⚠️ Hay diferencias grandes entre evaluadores: revisen juntos la evidencia.' : '');
    }
    function guardarT(eq) {
      clearTimeout(tmr.t);
      const d = GD.dT[eq];
      estadoGuardado('g-gt-st', 'Guardando…');
      api('guardarEvalTerreno', { equipo: eq, niv: d.niv, obs: d.obs }).then(r => {
        GD.evalT[eq] = GD.evalT[eq] || {};
        GD.evalT[eq][GD.yo.id] = { niv: Object.assign({}, d.niv), pts: r.pts, obs: d.obs, nom: GD.yo.nombre, t: Date.now() };
        estadoGuardado('g-gt-st', '✓ Guardado automáticamente'); totalesT();
      }).catch(e => estadoGuardado('g-gt-st', '⚠ No se guardó: ' + e.message + ' (vuelva a marcar para reintentar)', true));
    }

    /* ----- Evaluar fichas de aprendizaje entre pares (G7) ----- */
    function infoP(e) {
      const k = rutK(e.rut), a = miAsig(e), fp = GD.fp[k] || {};
      const aplic = fichasL().filter(f => a !== f.expone);
      const env = aplic.filter(f => fp[f.id] === 'enviada').length, bor = aplic.filter(f => fp[f.id] === 'borrador').length;
      return { k: k, e: e, a: a, env: env, bor: bor, deben: aplic.length, ev: GD.evalP[k], lista: aplic.length > 0 && env >= aplic.length };
    }
    function pRubP() {
      const F = GD.fP = GD.fP || { q: '', f: 'todos' }, max = cont('rubP').length * 2;
      const todos = activos().map(infoP);
      const FIL = [['todos', 'Todos', () => true], ['listos', '✅ Completaron las fichas', x => x.lista], ['algunos', '✏️ Entregaron alguna', x => x.env > 0 && !x.lista], ['sin', '⏳ Sin evaluar', x => !x.ev], ['eval', '📋 Evaluados', x => !!x.ev]];
      const fil = FIL.find(x => x[0] === (F.f || 'todos')) || FIL[0];
      const q = (F.q || '').toLowerCase();
      const prio = x => x.lista && !x.ev ? 0 : x.lista ? 1 : x.env > 0 ? 2 : 3;
      const vis = todos.filter(x => fil[2](x) && (!q || String(x.e.nombre).toLowerCase().indexOf(q) >= 0))
        .sort((a, b) => prio(a) - prio(b) || String(a.e.nombre).localeCompare(String(b.e.nombre), 'es'));
      GD.navP = vis.map(x => x.k);
      return '<div class="rounded-2xl bg-white/95 shadow p-4 text-sm"><b>Evaluar las fichas (' + max + ' puntos).</b> Pinche a un estudiante para leer sus fichas y marcar la rúbrica; dentro puede pasar al siguiente. Primero aparecen quienes ya completaron todo y aún no tienen evaluación. El puntaje se guarda solo.</div>' +
        '<div class="flex gap-2 overflow-x-auto pb-1 mt-3">' + FIL.map(x => '<button data-accion="g-filtro-p" data-f="' + x[0] + '" class="shrink-0 px-3 py-2 rounded-xl text-sm font-semibold ' + (fil[0] === x[0] ? 'tab-activa' : 'bg-white shadow') + '">' + x[1] + ' (' + todos.filter(x[2]).length + ')</button>').join('') + '</div>' +
        '<input data-gfiltro="qp" value="' + esc(F.q) + '" placeholder="Buscar por nombre" class="border rounded-xl px-3 py-2 text-sm w-full mt-2">' +
        '<div class="bg-white/95 rounded-2xl shadow mt-3 divide-y">' + (vis.map(x => {
          const c = x.a ? colDe((equipos().find(y => y.id === x.a) || {}).color)[1] : '#cbd5e1';
          return '<button data-accion="g-eval-pares" data-r="' + esc(x.k) + '" class="w-full text-left flex items-center gap-2 p-3"><span class="h-3 w-3 rounded-full shrink-0" style="background:' + c + '"></span>' +
            '<span class="flex-1 min-w-0"><span class="font-semibold text-sm block truncate">' + esc(x.e.nombre) + '</span><span class="text-xs text-slate-400">' + esc(x.e.curso) + (x.a ? '' : ' · sin equipo') + '</span></span>' +
            chip('Fichas ' + x.env + '/' + x.deben, x.lista ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600') +
            (x.ev ? chip(x.ev.pts + '/' + max + ' · ' + fmt1(notaDe(x.ev.pts, max)), 'bg-indigo-100 text-indigo-800') : chip('Sin evaluar', 'bg-amber-100 text-amber-800')) + '<span class="text-slate-400">›</span></button>';
        }).join('') || '<div class="p-6 text-center text-slate-500 text-sm">No hay estudiantes en esta lista.</div>') + '</div>';
    }
    function htmlRespFicha(f, reg) {
      const d = (reg && reg.d) || {};
      let h = '', sec = '';
      f.q.forEach((q, i) => {
        const v = d['q' + (i + 1)];
        const txt = v && typeof v === 'object' ? 'Nivel ' + (v.n || '–') + ' · ' + (v.t || '') : (v || '');
        h += '<div class="text-sm"><div class="font-semibold text-slate-700">' + (i + 1) + '. ' + esc(q.t) + '</div><div class="rounded-lg bg-slate-50 p-2 whitespace-pre-line ' + (txt ? '' : 'text-slate-400') + '">' + (txt ? esc(txt) : 'Sin respuesta') + '</div></div>';
      });
      return h;
    }
    async function abrirEvalPares(k) {
      const est = activos().find(e => rutK(e.rut) === k) || { nombre: k, curso: '' };
      cargando(true, 'Cargando las fichas…');
      let r;
      try { r = await api('getFichasDe', { rut: k }); } finally { cargando(false); }
      const fl = fichasL(), rub = cont('rubP'), max = rub.length * 2, mio = GD.evalP[k];
      GD.dP[k] = { niv: Object.assign({}, mio && mio.niv), obs: (mio && mio.obs) || '' };
      const d = GD.dP[k], nav = GD.navP || [], i = nav.indexOf(k);
      const nom = x => { const e = activos().find(y => rutK(y.rut) === x); return e ? e.nombre : x; };
      const navH = i >= 0 ? '<div class="flex items-center gap-2 text-xs">' +
        (i > 0 ? '<button data-accion="g-nav-p" data-r="' + esc(nav[i - 1]) + '" class="px-3 py-2 rounded-xl bg-slate-100 font-semibold">◀ ' + esc(nom(nav[i - 1]).split(' ')[0]) + '</button>' : '<span></span>') +
        '<span class="flex-1 text-center text-slate-500">' + (i + 1) + ' de ' + nav.length + '</span>' +
        (i < nav.length - 1 ? '<button data-accion="g-nav-p" data-r="' + esc(nav[i + 1]) + '" class="px-3 py-2 rounded-xl bg-slate-100 font-semibold">' + esc(nom(nav[i + 1]).split(' ')[0]) + ' ▶</button>' : '<span></span>') + '</div>' : '';
      modal('<div class="space-y-3 pt-2">' + navH + '<div><div class="font-extrabold text-lg">' + esc(est.nombre) + '</div><div class="text-xs text-slate-500">' + esc(est.curso) + ' · ' + esc(nomEq(GD.asig[k])) + '</div></div>' +
        '<div class="space-y-2">' + fl.map(f => {
          const reg = r.fichas[f.id], propia = GD.asig[k] === f.expone;
          const ch = propia ? chip('🚫 No aplica', 'bg-slate-200 text-slate-700') : reg ? (reg.e === 'enviada' ? chip('✅ Enviada', 'bg-emerald-100 text-emerald-800') : chip('✏️ Borrador', 'bg-amber-100 text-amber-800')) : chip('No entregada', 'bg-rose-100 text-rose-800');
          return '<details class="rounded-xl border"' + (!propia && reg && reg.e === 'enviada' && f === fl.find(g => GD.asig[k] !== g.expone && r.fichas[g.id]) ? ' open' : '') + '><summary class="flex items-center gap-2 p-2 cursor-pointer text-sm font-semibold"><span class="flex-1">Ficha ' + NUM(fl, f) + ' · ' + esc(f.tema) + '</span>' + ch + '</summary><div class="p-2 space-y-2">' + (propia ? '<p class="text-sm text-slate-500">No corresponde: su equipo expone este tema.</p>' : htmlRespFicha(f, reg)) + '</div></details>';
        }).join('') + '</div>' +
        '<div class="rounded-xl border-2 border-indigo-200 p-2 space-y-2"><div class="font-bold text-sm">📋 Rúbrica de las fichas <span class="text-xs font-normal text-slate-500">· pinche la celda del nivel logrado</span></div>' +
        '<div class="flex flex-wrap items-center gap-2"><button data-accion="g-ia" data-r="' + esc(k) + '" class="px-3 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold">🤖 Sugerir evaluación con IA</button><span class="text-xs text-slate-500">La IA solo propone: usted decide si la usa o cambia las celdas.</span></div><div id="g-ia-box"></div>' +
        '<div id="g-rubp-tabla">' + tablaRub(rub, { edit: true, attr: 'gp', rut: k, dims: false, sel: id => d.niv[id] }) + '</div>' +
        '<textarea data-gpobs data-r="' + esc(k) + '" rows="2" placeholder="Retroalimentación breve (solo sobre su trabajo)" class="w-full border rounded-xl px-3 py-2 text-sm">' + esc(d.obs) + '</textarea>' +
        '<div id="g-ptot" class="text-sm font-bold"></div><span id="g-gp-st" class="text-xs"></span></div>' + navH + '</div>');
      totalesP(k);
    }
    // IA: propone niveles y un comentario; el docente puede usarlos tal cual o modificarlos
    async function sugerirIA(k) {
      const rub = cont('rubP'), fl = fichasL();
      cargando(true, 'La IA está revisando las fichas…');
      let r;
      try {
        r = await api('sugerirEvalPares', {
          rut: k,
          rub: rub.map(x => ({ id: x.id, nom: x.nom, L: x.L, M: x.M, N: x.N })),
          fichas: fl.map(f => ({ id: f.id, tema: f.tema, expone: f.expone, q: f.q.map(q => ({ t: q.t })) }))
        });
      } finally { cargando(false); }
      GD_IA[k] = r;
      const bx = $('#g-ia-box'); if (!bx) return;
      const et = { 2: 'Logrado · 2', 1: 'Medianamente logrado · 1', 0: 'No observado · 0' }, col = { 2: 'bg-emerald-100 text-emerald-800', 1: 'bg-amber-100 text-amber-800', 0: 'bg-rose-100 text-rose-800' };
      const pts = rub.reduce((t, x) => t + (r.niv[x.id] || 0), 0);
      bx.innerHTML = '<div class="rounded-xl border-2 border-violet-300 bg-violet-50 p-2 space-y-2 text-sm"><div class="font-bold">🤖 Sugerencia de la IA: ' + pts + ' / ' + rub.length * 2 + ' puntos</div>' +
        rub.map(x => '<div class="flex gap-2 items-start"><span class="shrink-0 text-xs font-semibold rounded-full px-2 py-0.5 ' + (col[r.niv[x.id]] || 'bg-slate-100') + '">' + esc(x.id) + ' · ' + (r.niv[x.id] !== undefined ? et[r.niv[x.id]] : 'sin dato') + '</span><span class="text-xs text-slate-700">' + esc(r.razones[x.id] || '') + '</span></div>').join('') +
        (r.obs ? '<div class="text-xs rounded-lg bg-white p-2"><b>Comentario propuesto:</b> ' + esc(r.obs) + '</div>' : '') +
        '<div class="flex flex-wrap gap-2"><button data-accion="g-ia-usar" data-r="' + esc(k) + '" class="px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold">✅ Usar esta sugerencia</button><button data-accion="g-ia-cerrar" class="px-3 py-2 rounded-xl bg-white border text-sm font-semibold">Descartar</button></div>' +
        '<div class="text-[11px] text-slate-500">Al usarla se marcan las celdas y se guarda; después puede cambiar cualquier celda o el comentario.</div></div>';
    }
    function usarIA(k) {
      const r = GD_IA[k], d = GD.dP[k];
      if (!r || !d) return;
      Object.keys(r.niv).forEach(id => {
        d.niv[id] = r.niv[id];
        document.querySelectorAll('#g-rubp-tabla td.gcel[data-id="' + id + '"]').forEach(c => c.classList.toggle('sel', Number(c.dataset.n) === r.niv[id]));
      });
      if (r.obs) { d.obs = r.obs; const t = document.querySelector('[data-gpobs]'); if (t) t.value = r.obs; }
      totalesP(k); guardarP(k);
      const bx = $('#g-ia-box'); if (bx) bx.innerHTML = '<div class="rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs p-2">✅ Se aplicó la sugerencia de la IA. Revise las celdas y cambie lo que estime necesario: cada cambio se guarda solo.</div>';
    }
    async function sugerirIAT(eq) {
      const rub = cont('rubT'), E = equipos().find(x => x.id === eq) || {};
      cargando(true, 'La IA está revisando el trabajo del equipo…');
      let r;
      try {
        r = await api('sugerirEvalTerreno', {
          equipo: eq, rub: rub.map(x => ({ id: x.id, nom: x.nom, L: x.L, M: x.M, N: x.N, v: x.v })),
          equipoInfo: { nombre: E.nombre, tema: E.tema, objetivo: E.objetivo, hipotesis: E.hipotesis, conceptos: E.conceptos }
        });
      } finally { cargando(false); }
      GD_IA['T' + eq] = r;
      const bx = $('#g-iat-box'); if (!bx) return;
      const et = { 2: 'Logrado · 2', 1: 'Medianamente logrado · 1', 0: 'No observado · 0' }, col = { 2: 'bg-emerald-100 text-emerald-800', 1: 'bg-amber-100 text-amber-800', 0: 'bg-rose-100 text-rose-800' };
      bx.innerHTML = '<div class="rounded-xl border-2 border-violet-300 bg-violet-50 p-2 space-y-2 text-sm"><div class="font-bold">🤖 Sugerencia de la IA (' + Object.keys(r.niv).length + ' de ' + rub.length + ' indicadores)</div>' +
        rub.map(x => '<div class="flex gap-2 items-start"><span class="shrink-0 text-xs font-semibold rounded-full px-2 py-0.5 ' + (r.niv[x.id] !== undefined ? col[r.niv[x.id]] : 'bg-slate-100 text-slate-600') + '">' + esc(x.id) + ' · ' + (r.niv[x.id] !== undefined ? et[r.niv[x.id]] : 'evalúe usted') + '</span><span class="text-xs text-slate-700">' + esc(r.razones[x.id] || '') + '</span></div>').join('') +
        (r.obs ? '<div class="text-xs rounded-lg bg-white p-2"><b>Comentario propuesto:</b> ' + esc(r.obs) + '</div>' : '') +
        '<div class="text-[11px] text-slate-600">Los indicadores «evalúe usted» dependen de lo que solo el docente observó en el terreno (tiempos, quién habló, etc.) o no tienen evidencia en la aplicación.</div>' +
        '<div class="flex flex-wrap gap-2"><button data-accion="g-iat-usar" data-e="' + eq + '" class="px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold">✅ Usar esta sugerencia</button><button data-accion="g-iat-cerrar" class="px-3 py-2 rounded-xl bg-white border text-sm font-semibold">Descartar</button></div>' +
        '<div class="text-[11px] text-slate-500">Al usarla se marcan solo los indicadores propuestos y se guarda; después puede cambiar cualquier celda.</div></div>';
    }
    function usarIAT(eq) {
      const r = GD_IA['T' + eq], d = GD.dT[eq];
      if (!r || !d) return;
      Object.keys(r.niv).forEach(id => {
        d.niv[id] = r.niv[id];
        document.querySelectorAll('#g-cuerpo td.gcel[data-attr="gt"][data-id="' + id + '"]').forEach(c => c.classList.toggle('sel', Number(c.dataset.n) === r.niv[id]));
      });
      if (r.obs && !d.obs) { d.obs = r.obs; const t = document.querySelector('[data-gtobs]'); if (t) t.value = r.obs; }
      totalesT(); guardarT(eq);
      const bx = $('#g-iat-box'); if (bx) bx.innerHTML = '<div class="rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs p-2">✅ Se aplicó la sugerencia de la IA. Complete los indicadores que faltan y cambie lo que estime necesario: cada cambio se guarda solo.</div>';
    }
    function totalesP(k) {
      const rub = cont('rubP'), max = rub.length * 2, d = GD.dP[k], e = $('#g-ptot');
      if (!d || !e) return;
      const pts = rub.reduce((s, r) => s + (d.niv[r.id] || 0), 0);
      e.textContent = 'Total: ' + pts + ' / ' + max + ' puntos · nota ' + fmt1(notaDe(pts, max));
    }
    function guardarP(k) {
      clearTimeout(tmr['p' + k]);
      const d = GD.dP[k];
      estadoGuardado('g-gp-st', 'Guardando…');
      api('guardarEvalPares', { rut: k, niv: d.niv, obs: d.obs }).then(r => {
        GD.evalP[k] = { niv: Object.assign({}, d.niv), pts: r.pts, obs: d.obs, nom: GD.yo.nombre, t: Date.now() };
        estadoGuardado('g-gp-st', '✓ Guardado automáticamente');
        if (gsub() === 'rubp') pintar();
      }).catch(e => estadoGuardado('g-gp-st', '⚠ No se guardó: ' + e.message, true));
    }

    /* ----- Notas de la salida (40 % aplicación · 40 % terreno · 20 % fichas) ----- */
    function mapaResp() {
      const m = {};
      (S.panel.respuestas || []).forEach(r => {
        const k = rutK(r.rut); if (!k) return;
        const o = m[k] = m[k] || {};
        if (!o[r.actividad_id] || (r.estado === 'evaluada' && o[r.actividad_id].estado !== 'evaluada')) o[r.actividad_id] = r;
      });
      return m;
    }
    function notaDoc(e, mapa) {
      const k = rutK(e.rut), acts = (S.panel.actividades || []).filter(a => !a.formativa), rs = mapa[k] || {};
      let pa = 0, ma = 0, ev = 0;
      acts.forEach(a => {
        const m = Number(a.puntaje_max) || 0; ma += m;
        const r = rs[a.id];
        if (r && r.estado === 'evaluada') { ev++; pa += Math.min(m, Math.max(0, Number(r.puntaje_final) || 0)); }
      });
      const rubT = cont('rubT'), rubP = cont('rubP'), eq = miAsig(e), et = eq ? GD.evalT[eq] || {} : {};
      const tt = Object.keys(et).map(x => et[x]), eP = GD.evalP[k];
      const pt = tt.length ? tt.reduce((t, x) => t + ptsDe(x.niv, rubT), 0) / tt.length : 0;
      const comps = [
        { k: 'A', w: 40, pts: pa, max: ma, aplica: acts.length > 0 && ma > 0, ok: acts.length > 0 && ev === acts.length },
        { k: 'T', w: 40, pts: pt, max: rubT.length * 2, aplica: true, ok: tt.length > 0 },
        { k: 'P', w: 20, pts: eP ? ptsDe(eP.niv, rubP) : 0, max: rubP.length * 2, aplica: true, ok: !!eP }];
      const r = combinar(comps); r.comps = comps; r.A = comps[0]; r.T = comps[1]; r.P = comps[2];
      return r;
    }
    function filasNotas() {
      const mapa = mapaResp(), F = GD.fN = GD.fN || { curso: '', q: '' }, q = (F.q || '').toLowerCase();
      return activos().filter(e => (!F.curso || e.curso === F.curso) && (!q || String(e.nombre).toLowerCase().indexOf(q) >= 0))
        .map(e => ({ e: e, k: rutK(e.rut), n: notaDoc(e, mapa) })).sort((a, b) => String(a.e.curso).localeCompare(String(b.e.curso), 'es') || String(a.e.nombre).localeCompare(String(b.e.nombre), 'es'));
    }
    function pFormativas() {
      const acts = S.panel.actividades || [], pts = S.panel.puntos || [];
      const nomP = id => { const p = pts.find(x => x.id === id); return p ? p.nombre : ''; };
      const fila = a => {
        const f = !!a.formativa, h = a.punto_id ? nomP(a.punto_id) || 'Con hito' : 'Sin hito';
        return '<div class="flex items-center gap-2 p-3 rounded-xl border ' + (f ? 'bg-violet-50 border-violet-300' : 'bg-white border-slate-200') + '">' +
          '<div class="flex-1 min-w-0"><div class="font-bold text-sm truncate">' + esc(a.titulo || 'Sin título') + '</div>' +
          '<div class="text-[11px] text-slate-500">' + esc(a.tipo || '') + ' · ' + esc(h) + '</div></div>' +
          '<span class="text-[11px] font-bold px-2 py-1 rounded-lg ' + (f ? 'bg-violet-200 text-violet-900' : 'bg-emerald-100 text-emerald-800') + '">' + (f ? '🧪 Formativa' : 'Cuenta para la nota') + '</span>' +
          '<button data-accion="g-form" data-id="' + esc(a.id) + '" data-v="' + (f ? '0' : '1') + '" class="px-3 py-2 rounded-xl text-xs font-bold ' + (f ? 'bg-slate-200 text-slate-800' : 'bg-violet-700 text-white') + '">' + (f ? 'Hacer evaluada' : 'Hacer formativa') + '</button></div>';
      };
      return '<div class="bg-white/95 rounded-2xl shadow p-4"><h3 class="font-extrabold text-lg">🧪 Actividades formativas</h3>' +
        '<p class="text-sm text-slate-600 mb-3">Sirven para practicar: <b>no cuentan</b> en el avance, la nota ni los informes, y <b>no se asocian a hitos</b>. Si la vuelve a hacer evaluada, se recupera su hito anterior.</p>' +
        '<div class="grid gap-2">' + (acts.length ? acts.map(fila).join('') : '<div class="text-sm text-slate-500">Aún no hay actividades.</div>') + '</div></div>';
    }
    function pNotas() {
      const F = GD.fN = GD.fN || { curso: '', q: '' };
      const cursos = Array.from(new Set(activos().map(e => e.curso).filter(Boolean))).sort();
      const filas = filasNotas(), comp = filas.filter(x => x.n.completo);
      const prom = comp.length ? comp.reduce((t, x) => t + x.n.nota, 0) / comp.length : 0;
      const celda = c => !c.aplica ? '<span class="text-slate-400">n/a</span>' : (c.ok ? '✅ ' : '⏳ ') + fmt1(c.pts) + '/' + c.max;
      return '<div class="rounded-2xl bg-white/95 shadow p-4 text-sm"><b>Nota de la salida a terreno.</b> 40 % preguntas de la aplicación + 40 % rúbrica de terreno + 20 % fichas entre pares (se suman porcentajes de logro; escala de 1,0 a 7,0 con 60 % de exigencia). La nota final solo aparece cuando las tres partes están evaluadas; el estudiante la ve en su pantalla en ese momento.</div>' +
        '<div class="grid grid-cols-3 gap-2 mt-3 text-center text-xs"><div class="rounded-xl bg-white shadow p-2"><div class="text-lg font-extrabold">' + filas.length + '</div>Estudiantes</div><div class="rounded-xl bg-white shadow p-2"><div class="text-lg font-extrabold">' + comp.length + '</div>Con nota final</div><div class="rounded-xl bg-white shadow p-2"><div class="text-lg font-extrabold">' + (comp.length ? fmt1(prom) : '—') + '</div>Promedio</div></div>' +
        '<div class="flex flex-wrap gap-2 mt-3"><select data-gfiltro="ncurso" class="border rounded-xl px-3 py-2 text-sm"><option value="">Todos los cursos</option>' + cursos.map(c => '<option' + (F.curso === c ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select>' +
        '<input data-gfiltro="nq" value="' + esc(F.q) + '" placeholder="Buscar por nombre" class="border rounded-xl px-3 py-2 text-sm flex-1 min-w-[140px]"><button data-accion="g-csv" class="px-3 py-2 rounded-xl bg-slate-800 text-white text-sm font-semibold">⬇️ Descargar CSV</button></div>' +
        '<div class="bg-white/95 rounded-2xl shadow mt-3 overflow-x-auto"><table class="w-full text-xs border-collapse" style="min-width:560px"><thead><tr class="bg-slate-800 text-white"><th class="p-2 text-left">Estudiante</th><th class="p-2">Preguntas</th><th class="p-2">Terreno</th><th class="p-2">Fichas</th><th class="p-2">Nota final</th></tr></thead><tbody>' +
        (filas.map(x => '<tr class="border-t cursor-pointer hover:bg-slate-50" data-accion="g-eval-pares" data-r="' + esc(x.k) + '"><td class="p-2"><b>' + esc(x.e.nombre) + '</b><div class="text-slate-400">' + esc(x.e.curso) + ' · ' + esc(miAsig(x.e) ? nomEq(miAsig(x.e)).split(' · ')[0] : 'sin equipo') + '</div></td>' +
          '<td class="p-2 text-center">' + celda(x.n.A) + '</td><td class="p-2 text-center">' + celda(x.n.T) + '</td><td class="p-2 text-center">' + celda(x.n.P) + '</td>' +
          '<td class="p-2 text-center font-extrabold text-base">' + (x.n.completo ? fmt1(x.n.nota) : '<span class="text-xs font-normal text-slate-400">pendiente</span>') + '</td></tr>').join('') || '<tr><td colspan="5" class="p-6 text-center text-slate-500">No hay estudiantes.</td></tr>') + '</tbody></table></div>';
    }
    function descargarCSV() {
      const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      const fila = ['Estudiante', 'RUT', 'Curso', 'Equipo', 'Preguntas (pts)', 'Preguntas máx.', 'Terreno (pts)', 'Terreno máx.', 'Fichas (pts)', 'Fichas máx.', 'Logro total %', 'Nota final'];
      const lin = [fila.map(q).join(';')];
      filasNotas().forEach(x => {
        const n = x.n;
        lin.push([x.e.nombre, x.e.rut, x.e.curso, miAsig(x.e) ? nomEq(miAsig(x.e)) : '', fmt1(n.A.pts), n.A.max, fmt1(n.T.pts), n.T.max, fmt1(n.P.pts), n.P.max, Math.round(n.frac * 100), n.completo ? fmt1(n.nota) : 'pendiente'].map(q).join(';'));
      });
      const blob = new Blob(['﻿' + lin.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'notas-salida-terreno.csv';
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }

    /* ----- Contenido editable ----- */
    function pContenido() {
      const fila = (sec, ic, t, extra) => '<div class="bg-white/95 rounded-2xl shadow p-3 space-y-2"><div class="flex flex-wrap items-center gap-2"><b class="flex-1 min-w-0">' + ic + ' ' + t + '</b>' +
        (GD.cont[sec] ? chip('Editado', 'bg-indigo-100 text-indigo-800') : chip('Original', 'bg-slate-100 text-slate-600')) + '</div>' + (extra || '') +
        '<div class="flex flex-wrap gap-2">' + (extra ? '' : '<button data-accion="g-editar" data-s="' + sec + '" class="px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-semibold">✏️ Editar</button>') +
        (GD.cont[sec] ? '<button data-accion="g-restaurar" data-s="' + sec + '" class="px-3 py-2 rounded-xl bg-slate-100 text-sm font-semibold">↩️ Volver al original</button>' : '') + '</div></div>';
      const lista = (sec, arr, nom) => '<div class="space-y-1">' + arr.map(x => '<div class="flex items-center gap-2 text-sm"><span class="flex-1 min-w-0 truncate">' + esc(nom(x)) + '</span><button data-accion="g-editar" data-s="' + sec + '" data-id="' + esc(x.id) + '" class="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold">✏️ Editar</button></div>').join('') + '</div>';
      return '<div class="rounded-2xl bg-white/95 shadow p-4 text-sm">Todo lo que ve el estudiante se puede cambiar. Lo que edite reemplaza el texto original para todos; «Volver al original» lo restaura.</div><div class="space-y-3 mt-3">' +
        fila('recorrido', '🗺️', 'El recorrido de la salida') + fila('pasos', '🧭', 'Paso a paso (G1)') +
        fila('equipos', '👥', 'Equipos: objetivo, tipo de investigación y hoja de ruta', lista('equipos', equipos(), e => e.nombre)) +
        fila('rubT', '📊', 'Rúbrica de terreno (G5)') +
        fila('fichas', '📝', 'Fichas de aprendizaje entre pares (G7)', lista('fichas', fichasL(), f => 'Ficha ' + NUM(fichasL(), f) + ' · ' + f.tema)) +
        fila('rubP', '📋', 'Rúbrica de las fichas (G7)') + '</div>';
    }
    function lineas(txt, n) {
      return txt.split('\n').map(l => l.trim()).filter(Boolean).map((l, i) => {
        const c = l.split('|').map(x => x.trim());
        if (c.length < n) throw new Error('Línea ' + (i + 1) + ': faltan columnas (se necesitan ' + n + ' separadas por « | »).');
        return c.slice(0, n - 1).concat([c.slice(n - 1).join(' | ')]);
      });
    }
    const FMT = {
      recorrido: {
        t: 'El recorrido de la salida', n: 2, ayuda: 'Una parada por línea: «Rótulo | Nombre». El rótulo es un número (hito 1, 2…) o una palabra (Salida, Regreso).',
        ser: a => a.map(p => p.r + ' | ' + p.n).join('\n'), par: t => lineas(t, 2).map(c => ({ r: c[0], n: c[1] }))
      },
      pasos: {
        t: 'Paso a paso (G1)', n: 3, ayuda: 'Un paso por línea: «Cuándo | Qué hace | Quién». El número del paso se pone solo.',
        ser: a => a.map(p => p.c + ' | ' + p.q + ' | ' + p.w).join('\n'), par: t => lineas(t, 3).map(c => ({ c: c[0], q: c[1], w: c[2] }))
      },
      rubT: {
        t: 'Rúbrica de terreno (G5)', n: 7, ayuda: 'Un indicador por línea: «ID | Dimensión | Indicador | Logrado (2 pts) | Medianamente logrado (1 pt) | No observado (0 pts) | Se verifica con». El ID es una letra y un número (H1, C2…). Dimensiones: Habilidades, Contenidos, Procedimientos, Actitudes.',
        ser: a => a.map(r => [r.id, r.dim, r.nom, r.L, r.M, r.N, r.v].join(' | ')).join('\n'),
        par: t => { const r = lineas(t, 7).map(c => ({ id: c[0].toUpperCase(), dim: c[1], nom: c[2], L: c[3], M: c[4], N: c[5], v: c[6] })); r.forEach(x => { if (!/^[A-Z][0-9]$/.test(x.id)) throw new Error('El ID «' + x.id + '» no es válido: use una letra y un número, por ejemplo H1.'); }); return r; }
      },
      rubP: {
        t: 'Rúbrica de las fichas (G7)', n: 6, ayuda: 'Un indicador por línea: «ID | Dimensión | Indicador | Logrado (2 pts) | Medianamente logrado (1 pt) | No observado (0 pts)». El ID es una sola letra (H, C, P, A).',
        ser: a => a.map(r => [r.id, r.dim, r.nom, r.L, r.M, r.N].join(' | ')).join('\n'),
        par: t => { const r = lineas(t, 6).map(c => ({ id: c[0].toUpperCase(), dim: c[1], nom: c[2], L: c[3], M: c[4], N: c[5] })); r.forEach(x => { if (!/^[A-Z]$/.test(x.id)) throw new Error('El ID «' + x.id + '» no es válido: use una sola letra.'); }); return r; }
      }
    };
    async function guardarSeccion(sec, datos) {
      cargando(true, 'Guardando…');
      try { await api('guardarGuia', { seccion: sec, datos: datos }); GD.cont[sec] = datos; } finally { cargando(false); }
      cerrarModal(); pintar(); aviso('Guardado. Los estudiantes lo verán al actualizar.');
    }
    function editarLineas(sec) {
      const f = FMT[sec];
      modal('<form id="g-f-lin" class="space-y-3 pt-2"><h3 class="text-lg font-extrabold">✏️ ' + esc(f.t) + '</h3><p class="text-xs text-slate-600">' + esc(f.ayuda) + '</p>' +
        '<textarea name="t" rows="14" class="w-full border rounded-xl px-3 py-2 text-sm font-mono">' + esc(f.ser(cont(sec))) + '</textarea>' +
        '<button class="w-full bg-teal-700 text-white font-bold py-3 rounded-xl">Guardar</button></form>');
      $('#g-f-lin').addEventListener('submit', async ev => {
        ev.preventDefault();
        try { const d = f.par(ev.target.elements.t.value); if (!d.length) throw new Error('Escriba al menos una línea.'); await guardarSeccion(sec, d); }
        catch (e) { aviso(e.message, 'error'); }
      });
    }
    function editarEquipo(id) {
      const e = equipos().find(x => x.id === id);
      if (!e) return;
      const inp = (k, t, r) => '<label class="block text-sm font-medium">' + t + (r ? '<textarea name="' + k + '" rows="' + r + '" class="mt-1 w-full border rounded-xl px-3 py-2 text-sm">' + esc(e[k] || '') + '</textarea>' : '<input name="' + k + '" value="' + esc(e[k] || '') + '" class="mt-1 w-full border rounded-xl px-3 py-2 text-sm">') + '</label>';
      modal('<form id="g-f-eq" class="space-y-3 pt-2"><h3 class="text-lg font-extrabold">✏️ ' + esc(e.nombre) + '</h3>' +
        inp('nombre', 'Nombre del equipo') +
        '<label class="block text-sm font-medium">Color<select name="color" class="mt-1 w-full border rounded-xl px-3 py-2 text-sm">' + Object.keys(COL).map(k => '<option value="' + k + '"' + (e.color === k ? ' selected' : '') + '>' + COL[k][2] + '</option>').join('') + '</select></label>' +
        inp('ensena', 'Enseña en') + inp('tema', 'Tema', 2) + inp('objetivo', 'Objetivo general', 3) + inp('tipo', 'Tipo de investigación', 5) + inp('hipotesis', 'Hipótesis', 3) +
        inp('mide', 'Qué observa y mide', 3) + inp('instr', 'Instrumentos', 3) + inp('conceptos', 'Conceptos clave', 2) +
        '<label class="block text-sm font-medium">Hoja de ruta <span class="text-xs font-normal text-slate-500">(una fila por línea: «Momento | Qué hace el equipo | Evidencia»)</span><textarea name="ruta" rows="10" class="mt-1 w-full border rounded-xl px-3 py-2 text-xs font-mono">' + esc((e.ruta || []).map(r => r.m + ' | ' + r.q + ' | ' + r.e).join('\n')) + '</textarea></label>' +
        '<button class="w-full bg-teal-700 text-white font-bold py-3 rounded-xl">Guardar equipo</button></form>');
      $('#g-f-eq').addEventListener('submit', async ev => {
        ev.preventDefault();
        try {
          const f = ev.target, n = Object.assign({}, e, { ruta: lineas(f.elements.ruta.value, 3).map(c => ({ m: c[0], q: c[1], e: c[2] })) });
          ['nombre', 'color', 'ensena', 'tema', 'objetivo', 'tipo', 'hipotesis', 'mide', 'instr', 'conceptos'].forEach(k => { n[k] = f.elements[k].value.trim(); });
          if (!n.nombre) throw new Error('Escriba el nombre del equipo.');
          await guardarSeccion('equipos', equipos().map(x => x.id === id ? n : x));
        } catch (er) { aviso(er.message, 'error'); }
      });
    }
    function editarFicha(id) {
      const f = fichasL().find(x => x.id === id);
      if (!f) return;
      modal('<form id="g-f-fi" class="space-y-3 pt-2"><h3 class="text-lg font-extrabold">✏️ Ficha ' + NUM(fichasL(), f) + '</h3>' +
        '<label class="block text-sm font-medium">Tema<input name="tema" value="' + esc(f.tema) + '" class="mt-1 w-full border rounded-xl px-3 py-2 text-sm"></label>' +
        '<label class="block text-sm font-medium">Se completa en<input name="hito" value="' + esc(f.hito) + '" class="mt-1 w-full border rounded-xl px-3 py-2 text-sm"></label>' +
        '<label class="block text-sm font-medium">Equipo que expone<select name="expone" class="mt-1 w-full border rounded-xl px-3 py-2 text-sm">' + equipos().map(e => '<option value="' + e.id + '"' + (f.expone === e.id ? ' selected' : '') + '>' + esc(e.nombre) + '</option>').join('') + '</select></label>' +
        '<label class="block text-sm font-medium">Preguntas <span class="text-xs font-normal text-slate-500">(una por línea, hasta 10: «Sección | Pregunta | Ayuda | tipo». Tipo: <b>txt</b> = texto, <b>esc</b> = escala 1 a 3 con justificación)</span><textarea name="q" rows="14" class="mt-1 w-full border rounded-xl px-3 py-2 text-xs font-mono">' + esc(f.q.map(q => [q.s, q.t, q.a, q.k].join(' | ')).join('\n')) + '</textarea></label>' +
        '<button class="w-full bg-teal-700 text-white font-bold py-3 rounded-xl">Guardar ficha</button></form>');
      $('#g-f-fi').addEventListener('submit', async ev => {
        ev.preventDefault();
        try {
          const fm = ev.target, q = lineas(fm.elements.q.value, 4).map(c => ({ s: c[0], t: c[1], a: c[2], k: c[3].toLowerCase() === 'esc' ? 'esc' : 'txt' }));
          if (!q.length || q.length > 10) throw new Error('La ficha debe tener entre 1 y 10 preguntas.');
          const n = Object.assign({}, f, { tema: fm.elements.tema.value.trim(), hito: fm.elements.hito.value.trim(), expone: fm.elements.expone.value, q: q });
          if (!n.tema) throw new Error('Escriba el tema.');
          await guardarSeccion('fichas', fichasL().map(x => x.id === id ? n : x));
        } catch (er) { aviso(er.message, 'error'); }
      });
    }

    /* ----- Eventos ----- */
    document.addEventListener('click', async e => {
      const b = e.target.closest('[data-accion]');
      if (!b || b.dataset.accion.indexOf('g-') !== 0 || !GD) return;
      const a = b.dataset.accion;
      try {
        if (a === 'g-sub') { S.gsub = b.dataset.s; pintar(); }
        else if (a === 'g-form') {
          const act = (S.panel.actividades || []).find(x => x.id === b.dataset.id);
          if (!act) return;
          const v = b.dataset.v === '1';
          cargando(true, 'Guardando…');
          try { const r = await api('marcarFormativa', { id: act.id, valor: v }); act.formativa = v; act.punto_id = (r && r.punto_id) || ''; } finally { cargando(false); }
          pintar(); aviso(v ? 'Actividad formativa: no cuenta para la nota.' : 'La actividad vuelve a contar para la nota.');
        }
        else if (a === 'g-eq') { GD.eq = b.dataset.e; pintar(); }
        else if (a === 'g-estado') {
          const r = await api('estadoFicha', { ficha: b.dataset.f, estado: b.dataset.e });
          GD.estf = r.estf; pintar();
          aviso(b.dataset.e === 'abierta' ? 'Ficha habilitada: los estudiantes recibirán el aviso.' : b.dataset.e === 'cerrada' ? 'Ficha cerrada.' : 'Ficha bloqueada.');
        } else if (a === 'g-estado-todas') {
          const ab = Object.keys(GD.estf).filter(f => GD.estf[f] === 'abierta');
          if (!ab.length) return aviso('No hay fichas habilitadas.');
          const r = await api('estadoFicha', { fichas: ab, estado: 'cerrada' });
          GD.estf = r.estf; pintar(); aviso('Fichas cerradas.');
        } else if (a === 'g-masivo') {
          const v = $('#g-masivo').value, F = GD.fEq || {};
          const vis = activos().filter(s => (!F.curso || s.curso === F.curso) && (!F.q || String(s.nombre).toLowerCase().indexOf(F.q.toLowerCase()) >= 0));
          if (!vis.length) return;
          const c = {}; vis.forEach(s => { c[rutK(s.rut)] = v; });
          cargando(true, 'Guardando equipos…');
          try { await asignar(c); } finally { cargando(false); }
          pintar(); aviso('Equipos guardados.');
        } else if (a === 'g-editar') {
          const s = b.dataset.s;
          if (s === 'equipos') editarEquipo(b.dataset.id); else if (s === 'fichas') editarFicha(b.dataset.id); else editarLineas(s);
        } else if (a === 'g-restaurar') {
          if (!confirm('¿Volver al texto original? Se perderán los cambios que hizo en esta parte.')) return;
          cargando(true, 'Restaurando…');
          try { await api('restaurarGuia', { seccion: b.dataset.s }); delete GD.cont[b.dataset.s]; } finally { cargando(false); }
          pintar(); aviso('Texto original restaurado.');
        } else if (a === 'g-eval-pares' || a === 'g-nav-p') await abrirEvalPares(b.dataset.r);
        else if (a === 'g-filtro-p') { (GD.fP = GD.fP || {}).f = b.dataset.f; pintar(); }
        else if (a === 'g-csv') descargarCSV();
        else if (a === 'g-refrescar') {
          cargando(true, 'Actualizando…');
          try { const eq = GD.eq, fp = GD.fP, fe = GD.fEq, fn = GD.fN; await cargarGD(); GD.eq = eq; GD.fP = fp; GD.fEq = fe; GD.fN = fn; } finally { cargando(false); }
          pintar(); aviso('Información actualizada.');
        } else if (a === 'g-iat') await sugerirIAT(b.dataset.e);
        else if (a === 'g-iat-usar') usarIAT(b.dataset.e);
        else if (a === 'g-iat-cerrar') { const bx = $('#g-iat-box'); if (bx) bx.innerHTML = ''; }
        else if (a === 'g-ia') await sugerirIA(b.dataset.r);
        else if (a === 'g-ia-usar') usarIA(b.dataset.r);
        else if (a === 'g-ia-cerrar') { const bx = $('#g-ia-box'); if (bx) bx.innerHTML = ''; }
        else if (a === 'g-nivel') {
          const id = b.dataset.id, n = Number(b.dataset.n);
          b.parentElement.querySelectorAll('.gcel').forEach(c => c.classList.toggle('sel', c === b));
          if (b.dataset.attr === 'gt') {
            const eq = GD.eq || equipos()[0].id;
            GD.dT[eq].niv[id] = n; totalesT();
            clearTimeout(tmr.t); estadoGuardado('g-gt-st', 'Guardando…'); tmr.t = setTimeout(() => guardarT(eq), 600);
          } else {
            const k = b.dataset.r; GD.dP[k].niv[id] = n; totalesP(k);
            clearTimeout(tmr['p' + k]); estadoGuardado('g-gp-st', 'Guardando…'); tmr['p' + k] = setTimeout(() => guardarP(k), 600);
          }
        }
      } catch (err) { cargando(false); aviso(err.message, 'error'); }
    });
    document.addEventListener('change', async e => {
      const t = e.target;
      if (!t || !t.dataset || !GD) return;
      try {
        if (t.dataset.gasig !== undefined) {
          const k = t.dataset.gasig, v = t.value, antes = GD.asig[k] || '';
          if (v) GD.asig[k] = v; else delete GD.asig[k];
          try { await asignar({ [k]: v }); pintar(); }
          catch (er) { if (antes) GD.asig[k] = antes; else delete GD.asig[k]; pintar(); throw er; }
        } else if (t.dataset.gfiltro === 'curso') { (GD.fEq = GD.fEq || {}).curso = t.value; pintar(); }
        else if (t.dataset.gfiltro === 'ncurso') { (GD.fN = GD.fN || {}).curso = t.value; pintar(); }
        else if (t.dataset.gt) {
          const eq = GD.eq || equipos()[0].id;
          GD.dT[eq].niv[t.dataset.gt] = Number(t.value); totalesT();
          clearTimeout(tmr.t); estadoGuardado('g-gt-st', 'Guardando…'); tmr.t = setTimeout(() => guardarT(eq), 600);
        } else if (t.dataset.gp) {
          const k = t.dataset.r; GD.dP[k].niv[t.dataset.gp] = Number(t.value); totalesP(k);
          clearTimeout(tmr['p' + k]); estadoGuardado('g-gp-st', 'Guardando…'); tmr['p' + k] = setTimeout(() => guardarP(k), 600);
        }
      } catch (err) { aviso(err.message, 'error'); }
    });
    /* ----- Actividades formativas: fuera de informes y notas ----- */
    if (typeof calcularEstudiantes === 'function') {
      const _calcEst = calcularEstudiantes;
      calcularEstudiantes = function () {
        const P = S.panel;
        if (!P || !Array.isArray(P.actividades) || !P.actividades.some(a => a.formativa)) return _calcEst.apply(this, arguments);
        const a0 = P.actividades, r0 = P.respuestas;
        const ids = {}; a0.forEach(a => { if (a.formativa) ids[a.id] = 1; });
        P.actividades = a0.filter(a => !a.formativa);
        P.respuestas = (r0 || []).filter(r => !ids[r.actividad_id]);
        try { return _calcEst.apply(this, arguments); } finally { P.actividades = a0; P.respuestas = r0; }
      };
    }

    /* ----- Casilla "formativa" en el formulario de actividades ----- */
    let apiOk = false;
    try {
      const _api = api;
      api = function (acc, datos) {
        if (acc === 'guardarActividad' && datos && datos.actividad) {
          const c = document.getElementById('g-form-chk');
          if (c) { datos.actividad.formativa = c.checked; if (c.checked) { datos.actividad.punto_id = ''; datos.actividad.requiere_gps = 'no'; } }
        }
        return _api.apply(this, arguments);
      };
      apiOk = true;
    } catch (_) { apiOk = false; }
    function inyectarForm() {
      if (!apiOk) return;
      document.querySelectorAll('form').forEach(fm => {
        if (!fm.elements || !fm.elements.titulo || !fm.elements.punto_id || fm.querySelector('#g-form-chk')) return;
        const id = fm.elements.id && fm.elements.id.value;
        const tit = fm.elements.titulo.value;
        const act = (S.panel && S.panel.actividades || []).find(a => (id && a.id === id) || (!id && tit && a.titulo === tit));
        const sel = fm.elements.punto_id, cont = sel.closest('label') || sel.parentElement;
        const w = document.createElement('label');
        w.className = 'flex items-start gap-2 p-3 rounded-xl bg-violet-50 border border-violet-300 text-sm mb-2';
        w.innerHTML = '<input type="checkbox" id="g-form-chk" class="mt-1"><span><b>🧪 Actividad formativa</b><br><span class="text-xs text-slate-600">Sirve para practicar. No cuenta para la nota ni el avance y no se asocia a un hito.</span></span>';
        cont.parentNode.insertBefore(w, cont);
        const chk = w.querySelector('input');
        const aplicar = () => { cont.style.opacity = chk.checked ? '.4' : ''; sel.disabled = chk.checked; if (chk.checked) sel.value = ''; };
        chk.checked = !!(act && act.formativa);
        chk.addEventListener('change', aplicar);
        aplicar();
      });
    }
    try { new MutationObserver(() => inyectarForm()).observe(document.body, { childList: true, subtree: true }); } catch (_) {}

    document.addEventListener('keydown', e => {
      const t = e.target;
      if ((e.key === 'Enter' || e.key === ' ') && t && t.classList && t.classList.contains('gcel') && t.dataset.accion) { e.preventDefault(); t.click(); }
    });
    document.addEventListener('input', e => {
      const t = e.target;
      if (!t || !t.dataset || !GD) return;
      if (t.dataset.gfiltro === 'q' || t.dataset.gfiltro === 'qp' || t.dataset.gfiltro === 'nq') {
        const pos = t.selectionStart, nom = t.dataset.gfiltro;
        if (nom === 'q') (GD.fEq = GD.fEq || {}).q = t.value; else if (nom === 'nq') (GD.fN = GD.fN || {}).q = t.value; else (GD.fP = GD.fP || {}).q = t.value;
        pintar();
        const n = document.querySelector('[data-gfiltro="' + nom + '"]');
        if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) {} }
      } else if (t.dataset.gtobs !== undefined) {
        const eq = GD.eq || equipos()[0].id; GD.dT[eq].obs = t.value;
        clearTimeout(tmr.t); estadoGuardado('g-gt-st', 'Guardando…'); tmr.t = setTimeout(() => guardarT(eq), 1200);
      } else if (t.dataset.gpobs !== undefined) {
        const k = t.dataset.r; GD.dP[k].obs = t.value;
        clearTimeout(tmr['p' + k]); estadoGuardado('g-gp-st', 'Guardando…'); tmr['p' + k] = setTimeout(() => guardarP(k), 1200);
      }
    });
  }

  if (MODO === 'alumno') iniciarAlumno(); else if (MODO === 'docente') iniciarDocente();
})();
