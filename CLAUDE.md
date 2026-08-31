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
portal/PortalPage.tsx                            # Portal ciudadano (consulta trámites)
reportes/ReportesPage.tsx
tramites/TramitesPage.tsx
tramites/ConfiguracionTramitesPage.tsx
usuarios/OrganigramaPage.tsx
usuarios/PerfilPage.tsx
usuarios/UsuariosPage.tsx                        # Asignación/revocación de roles + filtro por rol (antes en PermisosPage.tsx, eliminada por duplicidad)
```

## Componentes UI principales (src/components/ui/)

```
AdjuntosPanel.tsx           # Subida con metadatos digitalización (300ppp, OCR, control calidad)
EditorDocumento.tsx         # Editor ReactQuill; vista previa muestra PDF real WeasyPrint en iframe
GlassCard.tsx               # Tarjeta con efecto glassmorphism (reutilizable)
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
POST      /documentos/{id}/anular/                  {motivo: "..."}
POST      /documentos/{id}/registrar_firma/         {firma_info: {...}}
POST      /documentos/{id}/enviar/                  Envía el documento a destinatarios
POST      /documentos/{id}/reasignar_a/             {usuario_id, unidad_id} — asigna DE
POST      /documentos/{id}/recuperar/               Recupera doc enviado (ventana 10 min)
POST      /documentos/{id}/enviar_email/            {destinatarios: [], asunto_email, adjuntar_pdf}
POST      /documentos/{id}/nueva_version/           {cuerpo, comentario}
GET       /documentos/bandeja/conteos/              No leídos por bandeja (incluye reasignados)
GET       /documentos/bandeja/por_bandeja/          ?bandeja=recibidos|reasignados|...
POST      /documentos/bandeja/{id}/marcar_leido/
POST      /documentos/bandeja/{id}/reasignar/
POST      /documentos/bandeja/{id}/archivar/
POST      /documentos/bandeja/{id}/comentar/
POST      /documentos/bandeja/{id}/nueva_tarea/
POST      /documentos/bandeja/{id}/agregar_imprimir/
POST      /documentos/bandeja/{id}/marcar_impreso/
GET/POST  /documentos/adjuntos/                     Multipart/form-data
GET       /documentos/adjuntos/buscar/?q=texto      Búsqueda full-text en contenido PDF
POST      /documentos/adjuntos/{id}/control-calidad/
GET       /documentos/adjuntos/{id}/descargar/
POST      /documentos/digitalizacion-masiva/        Batch hasta 50 PDFs
GET       /documentos/digitalizacion-masiva/        Estado OCR (pendientes, procesados)
GET       /documentos/tipos/                        Lista tipos de documento
GET/POST  /documentos/listas-distribucion/
GET       /documentos/listas-distribucion/buscar/?q=
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

## Bandejas del sistema

`recibidos`, `en_elaboracion`, `enviados`, `no_enviados`, `reasignados` *(virtual)*, `tareas_recibidas`, `tareas_enviadas`, `archivados`, `carpetas`, `por_imprimir`

**Bandeja `reasignados` es virtual:** los items NO tienen `bandeja='reasignados'` en BD. Físicamente están en `bandeja='en_elaboracion'` con `accion_tomada='reasignado'`. El endpoint `por_bandeja` y el de `conteos` la manejan como caso especial. La bandeja `en_elaboracion` excluye los `accion_tomada='reasignado'`.

---

## Roles del sistema (permisos.py)

| Código | Nombre visible | Descripción |
|--------|---------------|-------------|
| `USUARIO` | Usuario | Crea y gestiona documentos; sin menús de módulos extra |
| `ASISTENTE_ARCHIVO` | Asistente de Archivo | Documentos + trámites de ventanilla (crear/editar/reasignar/resolver) + solo consulta de trámites por email/web |
| `GESTOR_DOCUMENTAL` | Gestor Documental | Todo lo de `ASISTENTE_ARCHIVO`, más manejo pleno de los 3 canales de trámites (ventanilla/email/web) y operación normal del módulo archivo (expedientes, transferencias, baja documental, préstamos, copias, digitalización masiva). No administra usuarios ni ajustes |
| `RESPONSABLE_ARCHIVO` | Responsable de Archivo | Todo lo de `GESTOR_DOCUMENTAL`, más administración de archivo (incl. eliminar), organigrama y reportes. Solo lectura de usuarios (`usuarios: ['ver']`) — **no** crea/edita/elimina/bloquea usuarios ni asigna/revoca roles |
| `ADMIN_GENERAL` | Administrador General | Acceso completo a todos los módulos incluyendo usuarios, roles y ajustes |

**IMPORTANTE:** El código `ADMIN` no existe; tampoco existen `ADMIN_ARCHIVO` (renombrado a `RESPONSABLE_ARCHIVO` en `usuarios/0004_actualizar_catalogo_roles`) ni `ARCHIVO` (renombrado a `ASISTENTE_ARCHIVO` en `usuarios/0005_renombrar_archivo_asistente_archivo`, misma fila de `usr_rol`, mismas asignaciones `UsuarioRol`). Cualquier comparación de roles debe usar los 5 códigos de la tabla. El superusuario Django hereda automáticamente `ADMIN_GENERAL`. `mis_permisos().es_admin` / `UsuarioResumenSerializer.is_admin` son **exclusivos de `ADMIN_GENERAL`** (o superusuario) — `RESPONSABLE_ARCHIVO` es una autoridad funcional de archivo, no un administrador general, y por diseño no debe recibir el bypass total de permisos que otorga `es_admin`/`esAdmin` en el frontend.

El módulo `tramites` de `PERMISOS_ROL` tiene una estructura especial `canal -> acciones` (canales: `ventanilla`, `email`, `web`), porque el acceso depende del canal de ingreso del trámite. `get_permisos_usuario()` la aplana a una lista única en `permisos['tramites']` (compatibilidad con el resto del sistema) y expone además el detalle por canal en `permisos['tramites_canales']`, sin aplicarlo todavía como enforcement — queda preparado para autorización por canal en el backend.

Módulos: `documentos`, `tramites` (por canal), `archivo`, `usuarios`, `organigrama`, `reportes`, `ajustes`

---

## Membrete institucional oficial (WeasyPrint)

Archivo: `backend/apps/documentos/plantillas.py` → función `html_documento_oficial(doc)`

**Encabezado (CSS Running Elements):**
- `.page-header { position: running(page-header); width: 210mm; }` — se repite en todas las páginas
- Izquierda: Escudo GAD (archivo local `backend/apps/documentos/logos/`)
- Derecha: Logo "Prefectura COTOPAXI — Juntos, construimos la nueva historia"
- Líneas separadoras: `height: 2pt`, ROJA (flex:1) | gap 3pt | AZUL (flex:1)
- `@page { margin: 44mm 0 24mm 0 }` — 44mm top para que el contenido no tape el header

**Pie de página:**
- `.page-footer { position: running(page-footer); width: 210mm; padding: 0 10mm 3mm; }`
- Mismas líneas separadoras con más margen
- `Dir: Calle Tarqui N° 507 y Quito • Telf: (03) 2800 416 - 2800 418 • Telefax: 2800 411`
- `E-mail: documentacion@cotopaxi.gob.ec • www.cotopaxi.gob.ec • Cotopaxi - Ecuador`

**Marca de agua:** Escudo al centro, opacidad 0.04

**Bloque de firma:**
- "Atentamente," con espacio suficiente abajo
- Línea horizontal 220px centrada
- Nombre firmante en negrita mayúsculas
- Cargo del firmante + nombre de la unidad
- Si tiene firma BCE: sello verde ✓ con datos del certificado

**NOTA:** Los logos se referencian con rutas absolutas del sistema de archivos (no URLs externas), porque WeasyPrint no puede cargar recursos externos en el contenedor Docker.

---

## Editor de documentos (EditorDocumento.tsx)

- ReactQuill con `theme="snow"`
- Modal `w-[90vw] max-w-5xl max-h-[92vh]` — NO fullscreen para que el sidebar sea visible
- Plantillas predefinidas en `frontend/src/constants/plantillas.constants.ts`
- Al guardar: si `tipo_documento.requiere_firma === true`, abre automáticamente `ModalFirmaElectronica`
- **Vista previa:** si el documento ya fue guardado → muestra PDF real de WeasyPrint en `<iframe>` (blob URL). Si es borrador nuevo → simulación HTML con marca de agua `marca_agua_quipux.png`

---

## Flujo "Designado para Elaborar" (DE)

Cuando el creador elige un DE distinto a sí mismo y hace clic en "Aceptar y Reasignar":
- El creador: su item de bandeja queda en `en_elaboracion` con `accion_tomada='reasignado'` → aparece en su bandeja **Reasignados**
- El DE: recibe un item en su bandeja **En elaboración** para editar y enviar el documento
- En el panel de detalle se muestra "Firmará / Enviará: [nombre] — [cargo]" cuando el DE es distinto al creador
- `Documento.remitente` (FK a Usuario) = el DE designado para firmar/enviar

---

## Recuperar documento

- Botón **"Recuperar (N min)"** en naranja en el panel de detalle
- Visible solo en bandejas **Enviados** y **Reasignados** mientras haya minutos restantes en la ventana
- Ventana de 10 minutos desde el último `SeguimientoDocumento` con `etapa='enviado'` o `etapa='reasignado'`
- Al recuperar: elimina el doc de todas las bandejas de destinatarios, devuelve al creador en **En elaboración**, cambia `estado='borrador'`, registra `etapa='recuperado'` en seguimiento
- `BandejaSerializer.minutos_para_recuperar` calcula el tiempo restante; valor negativo o `null` = ventana expirada

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

## Estado actual del proyecto (julio 2026)

### ✅ Implementado y funcional

| Módulo | Estado |
|--------|--------|
| Autenticación JWT + roles | ✅ Completo |
| Módulo Documentos (bandejas, envío, seguimiento) | ✅ Completo |
| Bandeja virtual "Reasignados" | ✅ Completo |
| Flujo DE (Designado para Elaborar) | ✅ Completo |
| Recuperar documento (ventana 10 min) | ✅ Completo |
| Vista previa PDF real en EditorDocumento | ✅ Completo |
| Membrete WeasyPrint (cabecera + pie + marca de agua) | ✅ Completo |
| Firma electrónica P12 en navegador (BCE) | ✅ Completo |
| Envío por email SMTP (externos) | ✅ Completo |
| OCR y digitalización masiva | ✅ Completo |
| Búsqueda full-text en adjuntos PDF | ✅ Completo |
| Módulo Archivo (expedientes, préstamos, copias, baja) | ✅ Completo |
| Módulo Trámites ciudadanos | ✅ Completo |
| Módulo Auditoría (log + dashboard KPIs) | ✅ Completo |
| Panel admin ve bandejas de otros usuarios | ✅ Completo |
| Búsqueda en bandeja de otro usuario (admin) | ✅ Completo |
| Quipux Histórico con filtro de búsqueda | ✅ Completo |
| Listas de distribución (importadas desde Quipux) | ✅ Completo |
| Organigrama | ✅ Completo |
| Ajustes del sistema (SMTP, tipos doc, series) | ✅ Completo |

### ⏳ Pendiente

1. **Logo derecho del membrete en PDF** — el logo "Prefectura COTOPAXI" del lado derecho del encabezado no carga correctamente en WeasyPrint. Debe guardarse como archivo estático local en `backend/apps/documentos/logos/` y referenciarse con ruta absoluta (igual que el escudo izquierdo).

2. **Reportes con Excel** — exportar a `.xlsx` con `openpyxl` (instalar con `pip install openpyxl --break-system-packages` en el Dockerfile). La página de reportes existe pero solo muestra datos en pantalla.

3. **Notificaciones push en tiempo real** — el polling de conteos de bandeja está (30s). Falta notificación visual/sonora cuando llega un documento nuevo (candidato: Django Channels + WebSocket, o Server-Sent Events).

4. **Portal ciudadano funcional** — la página `/portal` existe. Pendiente: búsqueda pública de trámites por número de trámite o cédula del ciudadano, sin login.

5. **Flujo de revisión/aprobación configurable** — el estado `en_elaboracion` actualmente va directo a `enviado`. Falta un paso intermedio de revisión por un superior antes del envío, configurable por tipo de documento.

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
- Roles: comparar siempre con los 5 códigos vigentes (`USUARIO`, `ASISTENTE_ARCHIVO`, `GESTOR_DOCUMENTAL`, `RESPONSABLE_ARCHIVO`, `ADMIN_GENERAL`), nunca con el antiguo `'ADMIN'`, ni con `'ADMIN_ARCHIVO'` (renombrado a `RESPONSABLE_ARCHIVO`), ni con `'ARCHIVO'` (renombrado a `ASISTENTE_ARCHIVO`)
- WeasyPrint: los recursos (imágenes, fuentes) deben ser rutas absolutas del sistema de archivos, no URLs externas
