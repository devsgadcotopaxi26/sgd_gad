# SGD GAD Cotopaxi — Contexto del Proyecto para Claude Code

## Descripción general
Sistema de Gestión Documental (SGD) para el **Gobierno Autónomo Descentralizado Provincial de Cotopaxi**, Ecuador. Replica y amplía el sistema Quipux oficial del estado ecuatoriano, incorporando digitalización de fondo documental histórico, firma electrónica BCE, y módulos de archivo conforme a la Regla Técnica Nacional (Acuerdo SGPR-2019-0107).

---

## Stack tecnológico

### Backend
- **Django 5.1.4** + **Django REST Framework 3.15.2**
- **PostgreSQL** (contenedor `sgd-gad`, DB `sgd_gad_cotopaxi`, usuario `postgres`)
- **WeasyPrint 63.1** — generación de PDFs con membrete institucional
- **pdfminer.six + pytesseract + pdf2image** — extracción de texto y OCR para digitalización masiva
- **Celery + Redis** — tareas asíncronas
- **JWT (SimpleJWT)** — autenticación
- **pyhanko** — firma electrónica

### Frontend
- **React + TypeScript + Vite**
- **Tailwind CSS**
- **TanStack Query (react-query)**
- **React Router DOM**
- **ReactQuill** — editor de documentos

### Infraestructura
- **Docker Compose** — 6 servicios: `sgd_backend`, `sgd_frontend`, `sgd_redis`, `sgd_nginx`, `sgd_celery`, `sgd_celery_beat`
- Backend en puerto `8000`, Frontend en `5173`, Nginx en `80/443`
- `.env` en la **raíz** del proyecto (`C:\sgd-gad\.env`), no en `backend/`

---

## Paleta de colores institucional

```
Azul institucional:  #002f6c
Rojo institucional:  #da291c
Dorado:              #ffd166
Verde archivo:       #0f6e56
```

---

## Estructura de apps (backend)

```
backend/apps/
├── archivo/        # Expedientes, series, transferencias, préstamos, copias certificadas, baja documental
├── auditoria/      # Dashboard KPIs, log de auditoría (aud_log), notificaciones
├── configuracion/  # ConfiguracionSistema singleton (cfg_configuracion)
├── documentos/     # Documentos, bandejas, adjuntos, OCR, plantillas PDF, firma
├── organizacion/   # Unidades, organigrama
├── tramites/       # Trámites ciudadanos, tipos, personas
└── usuarios/       # Usuarios, roles, permisos (permisos.py)
```

**IMPORTANTE:** La app `correos` fue eliminada completamente. No referenciarla.

---

## Páginas del frontend (src/pages/)

```
ajustes/AjustesPage.tsx                          # 5 tabs: Institución, Tipos doc, Tipos trámite, SMTP, Series
archivo/ArchivoPage.tsx
archivo/BajaDocumentalPage.tsx
archivo/CicloVitalPage.tsx
archivo/CuadroClasificacionPage.tsx
archivo/DigitalizacionMasivaPage.tsx             # Carga masiva histórica + búsqueda full-text + estado OCR
archivo/PrestamosCopiasCertificadasPage.tsx
auditoria/AuditoriaPage.tsx                      # Log consultable con filtros + panel de detalle
auth/LoginPage.tsx
dashboard/DashboardPage.tsx
documentos/DocumentosPage.tsx                    # Módulo principal tipo Quipux (bandejas)
portal/PortalPage.tsx
reportes/ReportesPage.tsx
tramites/TramitesPage.tsx
tramites/ConfiguracionTramitesPage.tsx
usuarios/OrganigramaPage.tsx
usuarios/PerfilPage.tsx
usuarios/PermisosPage.tsx                        # Asignación de roles + matriz de permisos
usuarios/UsuariosPage.tsx
```

## Componentes UI principales (src/components/ui/)

```
AdjuntosPanel.tsx           # Subida con metadatos digitalización (300ppp, OCR, control calidad)
EditorDocumento.tsx         # Editor ReactQuill para redacción de documentos oficiales
ModalEnviarEmail.tsx        # Envío de PDF por SMTP a externos
ModalFirmaElectronica.tsx   # Firma P12 en navegador (BCE, Security Data, UANATACA)
VincularExpedienteModal.tsx
```

---

## Tablas de base de datos (prefijos por app)

| Prefijo | App |
|---------|-----|
| `doc_` | documentos |
| `tra_` | tramites |
| `arc_` | archivo |
| `aud_` | auditoria |
| `usr_` | usuarios |
| `org_` | organizacion |
| `cfg_` | configuracion |
| `not_` | notificaciones |

### Tabla `aud_log` (IMPORTANTE)
- Creada por trigger PostgreSQL `fn_auditoria`, **NO por Django**
- `LogAuditoria` tiene `managed=False`
- Campos: tabla, registro_id, accion, datos_antes(jsonb), datos_despues(jsonb), campos_cambiados, usuario_id, usuario_email, modulo, ip_address, creado_en
- Índices GIN y btree en accion, modulo, tabla, usuario_id, creado_en

### Tabla `doc_adjunto` (búsqueda full-text)
- Columna `contenido_busqueda tsvector` agregada por migración SQL
- Índice GIN: `idx_doc_adjunto_busqueda`
- Trigger `trg_busqueda_adjunto` actualiza el tsvector automáticamente al cambiar `contenido_texto`
- Búsqueda: `plainto_tsquery('spanish', 'palabras')`

---

## Endpoints API principales (base: /api/v1/)

### Documentos
```
GET/POST  /documentos/                              Lista/crear documentos
GET       /documentos/{id}/pdf/                     Genera PDF con membrete WeasyPrint
POST      /documentos/{id}/cambiar_estado/          {estado: "enviado"}
POST      /documentos/{id}/registrar_firma/         {firma_info: {...}}
POST      /documentos/{id}/enviar_email/            {destinatarios: [], asunto_email, adjuntar_pdf}
GET       /documentos/bandeja/conteos/              No leídos por bandeja
GET       /documentos/bandeja/por_bandeja/          ?bandeja=recibidos
POST      /documentos/bandeja/{id}/marcar_leido/
POST      /documentos/bandeja/{id}/reasignar/
POST      /documentos/bandeja/{id}/archivar/
POST      /documentos/bandeja/{id}/comentar/
GET/POST  /documentos/adjuntos/                     Multipart/form-data
GET       /documentos/adjuntos/buscar/?q=texto      Búsqueda full-text en contenido PDF
POST      /documentos/adjuntos/{id}/control-calidad/
POST      /documentos/digitalizacion-masiva/        Batch hasta 50 PDFs
GET       /documentos/digitalizacion-masiva/        Estado OCR (pendientes, procesados)
GET       /documentos/tipos-documento/
```

### Tramites
```
GET/POST  /tramites/
GET       /tramites/tipos-tramite/
GET       /tramites/personas/?search=
```

### Archivo
```
GET/POST  /archivo/expedientes/
GET       /archivo/expedientes/elegibles/           Expedientes abiertos para vincular
POST      /archivo/expedientes/{id}/cerrar/
POST      /archivo/expedientes/{id}/expurgar/
POST      /archivo/expedientes/{id}/foliar/
GET/POST  /archivo/prestamos/
GET/POST  /archivo/copias-certificadas/
GET/POST  /archivo/series/
GET/POST  /archivo/transferencias/
GET/POST  /archivo/bajas-documentales/
```

### Usuarios
```
GET       /usuarios/
GET/POST  /usuarios/roles/
POST      /usuarios/{id}/asignar_rol/               {rol: id}
POST      /usuarios/{id}/revocar_rol/               {rol_id: id}
POST      /usuarios/{id}/bloquear/                  {motivo: "..."}
POST      /usuarios/{id}/desbloquear/
GET       /auth/permisos/                           Permisos del usuario actual
```

### Auditoria y Configuración
```
GET       /auditoria/dashboard/
GET       /auditoria/logs/?modulo=&accion=&desde=&hasta=&search=
GET       /configuracion/
PATCH     /configuracion/
POST      /configuracion/test-email/                {email: "..."}
```

---

## Bandejas del sistema (igual que Quipux real)

`recibidos`, `en_elaboracion`, `enviados`, `no_enviados`, `tareas_recibidas`, `tareas_enviadas`, `archivados`, `carpetas`, `por_imprimir`

---

## Roles del sistema (permisos.py)

`ADMIN`, `PREFECTO`, `SECRETARIO`, `DIRECTOR`, `ANALISTA`, `ASISTENTE`, `RECEPCION`, `ARCHIVO`, `SOLO_LECTURA`

Módulos: `documentos`, `tramites`, `archivo`, `usuarios`, `organigrama`, `reportes`, `ajustes`

---

## Membrete institucional oficial (hoja 2023-2027)

Archivo: `backend/apps/documentos/plantillas.py` → función `html_documento_oficial(doc)`

**Encabezado:**
- Izquierda: Escudo GAD → URL: `https://cotopaxi.gob.ec/wp-content/uploads/2026/02/Prefectura-de-Cotopaxi-0062d2.svg`
- Derecha: Logo "Prefectura COTOPAXI — Juntos, construimos la nueva historia"
- Línea azul (#002f6c 60%) + roja (#da291c 40%) + segunda línea delgada roja

**Pie de página:**
- Mismas líneas arriba
- `Dir: Calle Tarqui N° 507 y Quito • Telf: (03) 2800 416 - 2800 418 • Telefax: 2800 411`
- `E-mail: documentacion@cotopaxi.gob.ec • www.cotopaxi.gob.ec • Cotopaxi - Ecuador`

**Marca de agua:** Escudo al centro, opacidad 0.04

**Bloque de firma:**
- "Atentamente," con espacio suficiente abajo
- Línea horizontal 220px centrada
- Nombre firmante en negrita mayúsculas
- Cargo del firmante
- Nombre de la unidad
- Si tiene firma BCE: sello verde ✓ con datos del certificado

**Problema actual a resolver:** El logo de la Prefectura (derecha del membrete) no carga en WeasyPrint porque la URL externa falla. Solución recomendada: guardar el logo como archivo estático local en `backend/staticfiles/` y referenciar con ruta absoluta del servidor.

---

## Editor de documentos (EditorDocumento.tsx)

- ReactQuill con `theme="snow"`
- Modal `w-[90vw] max-w-5xl max-h-[92vh]` — NO fullscreen para que el sidebar sea visible
- Plantillas predefinidas en `frontend/src/constants/plantillas.constants.ts`
- Al guardar: si `tipo_documento.requiere_firma === true`, abre automáticamente `ModalFirmaElectronica`
- Vista previa: actualmente muestra simulación HTML — pendiente mostrar PDF real del backend en iframe

---

## OCR y digitalización masiva

- **PDF nativo** → `pdfminer.six` extrae texto directamente
- **PDF escaneado** → `pdf2image` + `tesseract` en español (`spa`)
- **Procesamiento:** hilo background (`threading.Thread`) para no bloquear HTTP
- **Lotes:** máximo 50 archivos por request
- Tesseract está instalado en el contenedor Docker del backend

---

## Firma electrónica

- Funciona en el **navegador** — el P12 nunca sale al servidor
- Librerías: `node-forge` (descifrado P12) + `pdf-lib` (modificación PDF)
- Compatible: BCE, Security Data, UANATACA
- Agrega sello visual en la última página del PDF
- Registra metadata en `Documento.firma_bce_info` (JSONField)

---

## Tareas pendientes (en orden de prioridad)

1. **Logo Prefectura en PDF** — el encabezado derecho del membrete no muestra el logo de la Prefectura en el PDF generado. Guardar como estático local y referenciar en `plantillas.py`

2. **Bloque de firma en vista previa** — la vista previa HTML del editor no tiene el bloque "Atentamente / línea / nombre / cargo / unidad" con el formato correcto

3. **Notificaciones en tiempo real** — polling cada 30s ya existe para conteos de bandeja. Pendiente: notificaciones push cuando llega un documento nuevo (usar `refetchInterval` o Django Channels)

4. **Portal ciudadano** — página `/portal` pública para consultar trámites por número o cédula

5. **Reportes con Excel** — exportar a `.xlsx` usando `openpyxl`. Instalar con `pip install openpyxl --break-system-packages`

6. **Flujo de revisión/aprobación** — estado `en_elaboracion` con pasos configurables antes de `enviado`

---

## Comandos Docker

```bash
# Backend
docker exec -it sgd_backend python manage.py makemigrations <app>
docker exec -it sgd_backend python manage.py migrate
docker-compose restart backend
docker-compose logs backend --tail=20

# Frontend
docker exec -it sgd_frontend npm install <paquete>
docker-compose restart frontend

# Base de datos
docker exec -it sgd-gad psql -U postgres -d sgd_gad_cotopaxi -c "SELECT ..."

# Build (si se modifica Dockerfile)
docker-compose build backend
docker-compose up -d backend
```

---

## Convenciones

- Tablas: prefijo por app (`doc_`, `tra_`, `arc_`, etc.)
- Endpoints: snake_case bajo `/api/v1/`
- Componentes: PascalCase
- Servicios: camelCase con sufijo `Service`
- Colores: siempre paleta institucional (#002f6c, #da291c, #ffd166)
- PDF: siempre WeasyPrint (backend), nunca librerías JS para documentos oficiales
- Fechas en documentos: `dd de MMMM de yyyy` en español
- OCR: idioma `spa` (español Ecuador)
- `LogAuditoria`: `managed=False`, nunca migrar esa tabla
- `ConfiguracionSistema`: singleton, acceder con `ConfiguracionSistema.get()`