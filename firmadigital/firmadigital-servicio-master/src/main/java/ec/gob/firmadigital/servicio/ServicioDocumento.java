/*
 * Firma Digital: Servicio
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
package ec.gob.firmadigital.servicio;

import static ec.gob.firmadigital.servicio.token.TokenTimeout.DEFAULT_TIMEOUT;
import ec.gob.firmadigital.servicio.model.Documento;
import ec.gob.firmadigital.servicio.token.ServicioToken;
import ec.gob.firmadigital.servicio.exception.TokenExpiradoException;
import ec.gob.firmadigital.servicio.exception.TokenInvalidoException;
import ec.gob.firmadigital.servicio.token.TokenTimeout;
import ec.gob.firmadigital.servicio.exception.Base64InvalidoException;
import ec.gob.firmadigital.servicio.util.FileUtil;
import ec.gob.firmadigital.libreria.exceptions.CertificadoInvalidoException;
import ec.gob.firmadigital.libreria.exceptions.DocumentoException;
import ec.gob.firmadigital.libreria.sign.SignInfo;
import ec.gob.firmadigital.libreria.sign.Signer;
import ec.gob.firmadigital.libreria.sign.pdf.BasePdfSigner;
import ec.gob.firmadigital.libreria.sign.xades.XAdESSigner;
import ec.gob.firmadigital.libreria.utils.Utils;
import ec.gob.firmadigital.servicio.exception.ServicioSistemaTransversalException;
import ec.gob.firmadigital.servicio.exception.ProblemaDocumentoException;
import ec.gob.firmadigital.libreria.exceptions.ConexionException;
import ec.gob.firmadigital.libreria.exceptions.EntidadCertificadoraNoValidaException;
import com.itextpdf.kernel.pdf.PdfReader;
import java.io.IOException;
import java.net.URL;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import jakarta.ejb.EJB;
import jakarta.ejb.Stateless;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.validation.constraints.NotNull;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.StringReader;
import jakarta.json.Json;
import jakarta.json.JsonObject;
import jakarta.json.JsonReader;
import java.security.cert.CertificateParsingException;
import java.util.Collections;
import java.util.Objects;

/**
 * Servicio para almacenar, actualizar y obtener documentos desde los sistemas
 * transversales y la aplicación en firmadigital-api
 *
 * @author Ricardo Arguello
 */
@Stateless
public class ServicioDocumento {

    @EJB
    private ServicioToken servicioToken;

    @EJB
    private ServicioSistemaTransversal servicioSistemaTransversal;

    @EJB
    private ServicioLog servicioLog;

    @PersistenceContext
    private EntityManager em;

    private static final Logger LOGGER = Logger.getLogger(ServicioDocumento.class.getName());

    /**
     * Crea documentos en el sistema, para ser firmados por un cliente.
     *
     * @param cedula
     * @param nombreSistema
     * @param archivos
     * @return
     * @throws ec.gob.firmadigital.servicio.exception.Base64InvalidoException
     * @throws
     * ec.gob.firmadigital.servicio.exception.ServicioSistemaTransversalException
     */
    public String crearDocumentos(@NotNull String cedula, @NotNull String nombreSistema,
            @NotNull Map<String, String> archivos) throws Base64InvalidoException, ServicioSistemaTransversalException {
        // Validación de parámetros con mensajes descriptivos
        Objects.requireNonNull(cedula, "La cédula no puede ser nula");
        Objects.requireNonNull(nombreSistema, "El nombre del sistema no puede ser nulo");
        Objects.requireNonNull(archivos, "El mapa de archivos no puede ser nulo");
        // Verificación temprana del sistema
        try {
            servicioSistemaTransversal.buscarSistema(nombreSistema);
        } catch (ServicioSistemaTransversalException e) {
            throw new ServicioSistemaTransversalException("El sistema '" + nombreSistema + "' no está registrado");
        }
        // Pre-allocación de lista con tamaño estimado
        List<String> ids = new ArrayList<>(archivos.size());
        // Procesamiento eficiente de archivos
        for (Map.Entry<String, String> entry : archivos.entrySet()) {
            String nombre = entry.getKey();
            String archivoBase64 = entry.getValue();
            try {
                // Creación y persistencia del documento
                Documento documento = new Documento();
                documento.setCedula(cedula);
                documento.setNombre(nombre);
                documento.setFecha(new Date());
                documento.setSistema(nombreSistema);
                // Decodificación directa sin variable intermedia
                documento.setArchivo(decodificarBase64(archivoBase64));
                em.persist(documento);
                // Uso de referencia al ID inmediatamente
                ids.add(documento.getId().toString());
            } catch (IllegalArgumentException e) {
                // Manejo específico de error en Base64
                throw new Base64InvalidoException("Error al decodificar el archivo '" + nombre + "': " + e.getMessage());
            }
        }
        Map<String, Object> parametros = new HashMap<>();
        parametros.put("cedula", cedula);
        parametros.put("sistema", nombreSistema);
        parametros.put("ids", String.join(",", ids));
//                Map<String, Object> parametros = Map.of( // Map inmutable JDK 9+
//                "cedula", cedula,
//                "sistema", nombreSistema,
//                "ids", String.join(",", ids));
        // Expiracion del Token
        Date expiracion = TokenTimeout.addMinutes(new Date(), DEFAULT_TIMEOUT);
        // Retorna el Token
        return servicioToken.generarToken(parametros, expiracion);
    }

    /**
     * Obtiene un documento mediante un token.
     *
     * @param token
     * @return
     * @throws TokenInvalidoException
     * @throws TokenExpiradoException
     */
    public Map<Long, String> obtenerDocumentos(String token)
            throws TokenInvalidoException, TokenExpiradoException {
        // Validación de token con Objects.requireNonNull
        Objects.requireNonNull(token, "El token no puede ser nulo");
        // Parseo del token
        final Map<String, Object> parametros = servicioToken.parseToken(token);
        final String ids = Objects.requireNonNull((String) parametros.get("ids"), "El campo 'ids' no puede ser nulo");
        LOGGER.log(Level.FINE, "ids={0}", ids);
        // Uso de HashMap con tamaño inicial estimado
        final int estimatedSize = ids.split(",").length;
        final Map<Long, String> archivos = new HashMap<>(estimatedSize);
        // Procesamiento con stream para mejor manejo de memoria
        convertirEnList(ids).stream()
                .map(Long::parseLong)
                .forEach(primaryKey -> {
                    // Bloque try para manejo seguro de recursos
                    try {
                        Documento documento = em.find(Documento.class, primaryKey);
                        if (documento != null) {
                            // Codificación directa sin variable intermedia
                            archivos.put(primaryKey, codificarBase64(documento.getArchivo()));
                            // Limpieza explícita del documento (si es necesario)
                            documento = null; // Si el objeto Documento tiene este método
                        }
                    } catch (NumberFormatException e) {
                        LOGGER.log(Level.WARNING, "ID inválido: {0}", primaryKey);
                    }
                });
        return Collections.unmodifiableMap(archivos); // Prevenir modificaciones posteriores
    }

    /**
     *
     * @param token
     * @param archivos
     * @param cedulaJson
     * @param base64
     * @return
     * @throws ec.gob.firmadigital.servicio.exception.TokenInvalidoException
     * @throws ec.gob.firmadigital.servicio.CedulaInvalidaException
     * @throws ec.gob.firmadigital.servicio.exception.TokenExpiradoException
     * @throws ec.gob.firmadigital.servicio.exception.Base64InvalidoException
     * @throws ec.gob.firmadigital.servicio.CertificadoRevocadoException
     * @throws ec.gob.firmadigital.servicio.DocumentoNoExisteException
     * @throws
     * ec.gob.firmadigital.servicio.exception.ServicioSistemaTransversalException
     * @throws ec.gob.firmadigital.servicio.exception.ProblemaDocumentoException
     */
    public int actualizarDocumentos(String token, Map<Long, String> archivos, String cedulaJson, String base64)
            throws TokenInvalidoException, CedulaInvalidaException, TokenExpiradoException, Base64InvalidoException,
            CertificadoRevocadoException, DocumentoNoExisteException, ServicioSistemaTransversalException, ProblemaDocumentoException {
        // Validación inicial con manejo de recursos eficiente
        final Map<String, Object> parametros = servicioToken.parseToken(token);
        final String ids = Objects.requireNonNull((String) parametros.get("ids"));
        final String cedulaToken = Objects.requireNonNull((String) parametros.get("cedula"));
        final String nombreSistema = Objects.requireNonNull((String) parametros.get("sistema"));
        LOGGER.log(Level.INFO, "ids={0}", ids);
        LOGGER.log(Level.INFO, "cedulaToken={0}", FileUtil.hashMD5(cedulaToken));
        LOGGER.log(Level.INFO, "cedulaJson={0}", FileUtil.hashMD5(cedulaJson));
        if (!cedulaToken.equals(cedulaJson)) {
            throw new CedulaInvalidaException("La cedula " + cedulaJson + " es incorrecta");
        }
        // Procesamiento de documentos con manejo explícito de recursos
        final URL url = servicioSistemaTransversal.buscarUrlSistema(nombreSistema);
        final List<String> idList = convertirEnList(ids);
        if (idList.size() != archivos.size()) {
            throw new IllegalArgumentException(String.format(
                    "El token contiene %d archivos por procesar pero se enviaron solo %d archivos!",
                    idList.size(), archivos.size()));
        }
        int documentosFirmados = 0;
        // Procesamiento de cada documento con try-with-resources
        for (String id : idList) {
            final Long primaryKey = Long.valueOf(id);
            final String archivoBase64 = Objects.requireNonNull(archivos.get(primaryKey),
                    () -> "El token contiene una lista de archivos distinta a los archivos solicitados para actualizar: " + ids);
            // Manejo transaccional del documento
            Documento documento = em.find(Documento.class, primaryKey);
            if (documento == null) {
                LOGGER.log(Level.WARNING, "El documento {0} no existe en la base de datos", primaryKey);
                throw new DocumentoNoExisteException("El documento " + primaryKey + " no existe en la base de datos");
            }
            try {
                // Procesamiento del documento con liberación explícita de recursos
                byte[] byteDocumento = java.util.Base64.getDecoder().decode(archivoBase64);
                processDocument(byteDocumento, documento, nombreSistema, url, cedulaToken, base64);
                documentosFirmados++;
            } finally {
                // Limpieza garantizada del documento
                em.remove(documento);
                documento = null; // Ayuda al GC
            }
        }
        return documentosFirmados;
    }

    // Método auxiliar para procesamiento de documentos
    private void processDocument(byte[] byteDocumento, Documento documento, String nombreSistema,
            URL url, String cedulaToken, String base64)
            throws ProblemaDocumentoException {
        String mimeTypeRest = FileUtil.getMimeType(byteDocumento);
        ec.gob.firmadigital.libreria.certificate.to.Documento documentoTo = null;
        String datosFirmante = "";
        try {
            if (mimeTypeRest.contains("pdf")) {
                try (InputStream is = new ByteArrayInputStream(byteDocumento); PdfReader pdfReader = new PdfReader(is)) {
                    Signer signer = new BasePdfSigner();
                    List<SignInfo> signInfos = signer.getSigners(byteDocumento);
                    documentoTo = Utils.pdfToDocumento(pdfReader, signInfos);
                    var certificado = documentoTo.getCertificados().get(documentoTo.getCertificados().size() - 1);
                    datosFirmante = certificado.getDatosUsuario().getNombre() + certificado.getDatosUsuario().getApellido();
                } catch (Exception ex) {
                    LOGGER.log(Level.SEVERE, ex.getMessage());
                }
            } else if (mimeTypeRest.contains("xml")) {
                try {
                    XAdESSigner xAdESSigner = new XAdESSigner();
                    List<SignInfo> signInfos;
                    signInfos = xAdESSigner.getSignInfo(byteDocumento);
                    documentoTo = Utils.x509CertificateToDocumento(signInfos);
                } catch (CertificateParsingException ex) {
                    LOGGER.log(Level.SEVERE, ex.getMessage());
                }
            }
            // Almacenamiento con manejo eficiente de recursos
            String apiKeyRest = servicioSistemaTransversal.buscarApiKeyRest(nombreSistema);
            String archivoBase64 = Base64.getEncoder().encodeToString(byteDocumento);
            if (apiKeyRest != null) {
                servicioSistemaTransversal.almacenarDocumentoREST(
                        documentoTo, documento.getCedula(), documento.getNombre(), archivoBase64, url, apiKeyRest);
            } else {
                servicioSistemaTransversal.almacenarDocumento(
                        documentoTo, documento.getCedula(), documento.getNombre(), archivoBase64, datosFirmante, url);
            }
            // Logging eficiente
            LOGGER.log(Level.INFO,
                    "Documento enviado al sistema {0}, firmado por {1}, sistema operativo {2}, documento (SHA-256) {3}",
                    new Object[]{
                        nombreSistema,
                        FileUtil.hashMD5(cedulaToken),
                        obtenerSO(base64),
                        ec.gob.firmadigital.libreria.utils.FileUtils.calcularHash(byteDocumento, "SHA-256")
                    });
            servicioLog.info("ServicioDocumento::actualizarDocumentos",
                    "Documento enviado al sistema " + nombreSistema
                    + ", firmado por " + FileUtil.hashMD5(cedulaToken)
                    + ", sistema operativo " + obtenerSO(base64)
                    + ", documento (SHA-256) " + ec.gob.firmadigital.libreria.utils.FileUtils.calcularHash(byteDocumento, "SHA-256"));
        } catch (SistemaTransversalException | ServicioSistemaTransversalException e) {
            String mensajeError = "No se pudo enviar el documento al sistema " + nombreSistema + "\nCausa: " + e.getLocalizedMessage();
            servicioLog.error("ServicioDocumento::processDocument", mensajeError);
            LOGGER.log(Level.SEVERE, mensajeError);
            throw new ProblemaDocumentoException("Error en la verificación de firma", e);
        } catch (DocumentoException | ConexionException | ProblemaDocumentoException | IOException e) {
            LOGGER.log(Level.SEVERE, "Error al procesar documento", e);
            throw new ProblemaDocumentoException("Error al procesar documento", e);
        } catch (CertificadoInvalidoException | EntidadCertificadoraNoValidaException ex) {
            LOGGER.log(Level.SEVERE, "Error en la verificación de firma", ex.getMessage());
            throw new ProblemaDocumentoException("Error en la verificación de firma", ex);
        } finally {
            // Limpieza explícita de datos pesados
            if (documentoTo != null) {
                documentoTo = null;
            }
        }
    }

    /**
     * Convierte una cadena de texto con una lista separada por comas de ints en
     * una List.
     *
     * @param ids
     * @return
     */
    private List<String> convertirEnList(String ids) {
        if (ids == null || ids.trim().isEmpty()) {
            return Collections.emptyList();
        }

        // Elimina espacios y divide eficientemente
        return Arrays.stream(ids.split("\\s*,\\s*"))
                .filter(s -> !s.isEmpty())
                .toList(); // JDK 16+ (lista inmutable)
    }

    private byte[] decodificarBase64(String base64) throws Base64InvalidoException {
        if (base64 == null || base64.trim().isEmpty()) {
            throw new Base64InvalidoException("La cadena Base64 no puede estar vacía");
        }
        try {
            byte[] decoded = Base64.getDecoder().decode(base64);
            if (decoded.length == 0) {
                throw new Base64InvalidoException("El contenido decodificado está vacío");
            }
            return decoded;
        } catch (IllegalArgumentException e) {
            throw new Base64InvalidoException("Formato Base64 inválido: " + e.getMessage());
        }
    }

    private String codificarBase64(byte[] datos) {
        if (datos == null || datos.length == 0) {
            return "";
        }
        return Base64.getEncoder().encodeToString(datos);
    }

    private String obtenerSO(String base64) {
        String toString = new String(Base64.getDecoder().decode(base64));
        JsonObject jsonObjectBase64;
        try (JsonReader jsonReader = Json.createReader(new StringReader(toString))) {
            jsonObjectBase64 = jsonReader.readObject();
        }
        return jsonObjectBase64.getString("sistemaOperativo");
    }
}
