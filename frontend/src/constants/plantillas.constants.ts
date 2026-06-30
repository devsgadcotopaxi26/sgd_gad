// src/constants/plantillas.constants.ts

export const PLANTILLAS_TEXTO: Record<string, string> = {
  OFI: `<p>Señor/a<br>
[NOMBRE DEL DESTINATARIO]<br>
[CARGO]<br>
[INSTITUCIÓN]<br>
Presente.-</p>
<p>De mi consideración:</p>
<p>En atención al [referencia o motivo], me permito comunicar a usted lo siguiente:</p>
<p>[Desarrolle el contenido del oficio en este párrafo. Sea claro, preciso y formal.]</p>
<p>En virtud de lo expuesto, solicito respetuosamente [acción requerida al destinatario].</p>
<p>Con sentimientos de distinguida consideración.</p>`,

  MEM: `<p>Para: [NOMBRE Y CARGO DEL DESTINATARIO]<br>
De: [NOMBRE Y CARGO DEL REMITENTE]<br>
Asunto: [ASUNTO DEL MEMORANDO]<br>
Fecha: [FECHA]</p>
<p>Por medio del presente, me permito comunicar a usted lo siguiente:</p>
<p>[Desarrolle el contenido del memorando. Los memorandos son comunicaciones internas, use un tono formal pero directo.]</p>`,

  CIR: `<p>A los señores:<br>
[DESTINATARIOS — Directores, Jefes Departamentales, etc.]</p>
<p>Por medio de la presente circular, se comunica a todo el personal lo siguiente:</p>
<p>[Desarrolle el contenido de la circular.]</p>
<p>Lo que comunico para conocimiento y cumplimiento obligatorio.</p>`,

  RES: `<p>CONSIDERANDO:</p>
<p>Que, [primer considerando — base legal o antecedente];</p>
<p>Que, [segundo considerando — motivación];</p>
<p>En uso de las atribuciones conferidas por [base legal aplicable];</p>
<p>RESUELVE:</p>
<p>Art. 1.- [Primer artículo resolutivo]</p>
<p>Art. 2.- [Segundo artículo resolutivo si aplica]</p>`,
  
  INF: `<p>ANTECEDENTES:</p>
<p>[Describa brevemente el contexto que origina este informe.]</p>
<p>ANÁLISIS:</p>
<p>[Desarrolle el análisis técnico o administrativo del tema.]</p>
<p>CONCLUSIONES:</p>
<ol><li>[Primera conclusión]</li></ol>
<p>RECOMENDACIONES:</p>
<ol><li>[Primera recomendación]</li></ol>`,

  CON: `<p>Se convoca a los señores:<br>
[LISTA DE CONVOCADOS]</p>
<p>A la reunión que se llevará a cabo el día [FECHA] a las [HORA], en [LUGAR].</p>
<p>ORDEN DEL DÍA:</p>
<ol><li>Constatación del quórum reglamentario</li>
<li>[Segundo punto del orden del día]</li></ol>`,

  CER: `<p>El suscrito [CARGO DEL FUNCIONARIO] del Gobierno Autónomo Descentralizado Provincial de Cotopaxi,</p>
<p>CERTIFICA:</p>
<p>Que, [contenido de la certificación].</p>
<p>Es fiel copia de su original que reposa en los archivos de esta institución.</p>`,

  ACT: `<p>En la ciudad de Latacunga, provincia de Cotopaxi, el día [FECHA], siendo las [HORA], en las instalaciones de [LUGAR], se reúnen los siguientes participantes:</p>
<p>PARTICIPANTES:<br>- [NOMBRE, CARGO]</p>
<p>DESARROLLO:<br>PUNTO 1: [Desarrollo del primer punto del orden del día]</p>
<p>ACUERDOS Y RESOLUCIONES:<br>1. [Primer acuerdo]</p>`
};