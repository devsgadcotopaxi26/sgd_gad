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
package ec.gob.firmadigital.servicio.crl;

import ec.gob.firmadigital.libreria.certificate.CertEcUtils;
import ec.gob.firmadigital.libreria.ocsp.ValidadorOCSP;
import ec.gob.firmadigital.libreria.utils.HttpClient;

import com.google.gson.JsonObject;
import java.math.BigInteger;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.net.InetAddress;
import java.net.URL;
import java.net.URLEncoder;
import java.net.UnknownHostException;
import java.security.cert.CRLException;
import java.security.cert.CertificateException;
import java.security.cert.CertificateFactory;
import java.security.cert.X509CRL;
import java.security.cert.X509CRLEntry;
import java.security.cert.X509Certificate;
import java.util.Base64;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.sql.Timestamp;
import java.sql.SQLException;
import java.util.Date;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.Resource;
import jakarta.ejb.EJB;
import jakarta.ejb.EJBException;
import jakarta.ejb.Lock;
import jakarta.ejb.LockType;
import jakarta.ejb.Singleton;
import jakarta.ejb.Startup;

/**
 * Servicio proxy para validar revocacion de certificados via CRL/OCSP.
 *
 * Este servicio permite a clientes que no tienen acceso directo a los
 * servidores de las CAs (por restricciones de firewall) validar si un
 * certificado esta revocado. El proxy descarga el CRL desde los servidores del
 * gobierno y cachea los resultados en base de datos.
 *
 * Soporta CRLs particionados: cada certificado puede apuntar a una URL de CRL
 * diferente, y el proxy descarga solo el CRL necesario.
 *
 * @author FirmaEC
 */
@Singleton
@Startup
@Lock(LockType.READ)
public class ServicioProxyCrl {

    @Resource(lookup = "java:/FirmaDigitalDS")
    private DataSource ds;

    @EJB
    private ServicioConsultaCrl servicioConsultaCrl;

    private static final Logger LOGGER = Logger.getLogger(ServicioProxyCrl.class.getName());

    /**
     * Propiedad de sistema con los dominios permitidos para descargar CRLs. Se
     * configura en standalone.xml de WildFly.
     */
    private static final String DOMINIOS_PERMITIDOS_PROPERTY = "crl.dominios.permitidos";

    /**
     * Locks por URL para evitar descargas concurrentes del mismo CRL.
     */
    private final ConcurrentHashMap<String, ReentrantLock> urlLocks = new ConcurrentHashMap<>();

    /**
     * Patron para validar serial numbers (solo digitos).
     */
    private static final Pattern SERIAL_PATTERN = Pattern.compile("\\d{1,2000}");

    @PostConstruct
    public void init() {
        LOGGER.info("Inicializando ServicioProxyCrl...");
        crearTablasSiNoExisten();
        LOGGER.info("ServicioProxyCrl inicializado correctamente");
    }

    /**
     * Metodo principal: verifica si un certificado esta revocado.
     *
     * Waterfall de validacion: 1. OCSP (si ocspUrl y certBase64 disponibles) -
     * rapido, tiempo real 2. CRL proxy (si crlUrl disponible) - descarga CRL,
     * cache en BD 3. Fallback: tabla crl legacy (alimentada por batch cada 5
     * min)
     *
     * @param crlUrl URL del CRL Distribution Point del certificado
     * @param ocspUrl URL del OCSP Responder del certificado
     * @param serialStr Serial number del certificado
     * @param certBase64 Certificado X.509 codificado en Base64 (necesario para
     * OCSP)
     * @return JSON con resultado de la validacion
     */
    public String verificarRevocacion(String crlUrl, String ocspUrl, String serialStr, String certBase64) {
        // Validar serial
        if (serialStr == null || serialStr.trim().isEmpty()) {
            return errorJson("El parametro serial es obligatorio");
        }

        Matcher matcher = SERIAL_PATTERN.matcher(serialStr.trim());
        if (!matcher.matches()) {
            return errorJson("El serial number no es valido");
        }

        BigInteger serial;
        try {
            serial = new BigInteger(serialStr.trim());
        } catch (NumberFormatException e) {
            return errorJson("El serial number no es valido");
        }

        // PASO 1: Intentar validacion por OCSP (mas rapido, tiempo real)
        if (ocspUrl != null && !ocspUrl.trim().isEmpty()
                && certBase64 != null && !certBase64.trim().isEmpty()) {
            String errorUrl = validarUrl(ocspUrl.trim());
            if (errorUrl == null) {
                try {
                    String resultado = validarPorOcsp(certBase64.trim(), ocspUrl.trim());
                    if (resultado != null) {
                        return resultado;
                    }
                } catch (Exception e) {
                    LOGGER.log(Level.WARNING, "Error en OCSP para URL {0}: {1}",
                            new Object[]{ocspUrl, e.getMessage()});
                    // Continuar al paso 2 (CRL)
                }
            }
        }

        // PASO 2: Intentar validacion por CRL proxy
        if (crlUrl != null && !crlUrl.trim().isEmpty()) {
            String errorUrl = validarUrl(crlUrl.trim());
            if (errorUrl != null) {
                return errorJson(errorUrl);
            }

            try {
                String resultado = consultarCrlProxy(crlUrl.trim(), serial);
                if (resultado != null) {
                    return resultado;
                }
            } catch (Exception e) {
                LOGGER.log(Level.WARNING, "Error en CRL proxy para URL {0}: {1}",
                        new Object[]{crlUrl, e.getMessage()});
                // Continuar al fallback
            }
        }

        // PASO 3: Fallback a tabla crl legacy (batch cada 5 min)
        try {
            String fechaRevocado = servicioConsultaCrl.fechaRevocado(serial);
            if (fechaRevocado != null) {
                return resultJson(true, fechaRevocado, "CRL_LEGACY");
            }
        } catch (Exception e) {
            LOGGER.log(Level.WARNING, "Error consultando CRL legacy: {0}", e.getMessage());
        }

        // No se encontro en ninguna fuente
        return resultJson(false, null, "NO_ENCONTRADO");
    }

    /**
     * Valida un certificado por OCSP.
     *
     * @param certBase64 Certificado en Base64
     * @param ocspUrl URL del OCSP Responder
     * @return JSON con resultado, o null si OCSP no pudo determinar el estado
     */
    private String validarPorOcsp(String certBase64, String ocspUrl) {
        try {
            // Decodificar certificado
            byte[] certBytes = Base64.getDecoder().decode(certBase64);
            CertificateFactory cf = CertificateFactory.getInstance("X.509");
            X509Certificate cert = (X509Certificate) cf.generateCertificate(
                    new ByteArrayInputStream(certBytes));

            // Obtener certificado del emisor (root/intermediate)
            X509Certificate rootCert = CertEcUtils.getRootCertificate(cert);
            if (rootCert == null) {
                LOGGER.log(Level.WARNING, "No se pudo obtener el certificado root para OCSP");
                return null;
            }

            // Consultar OCSP
//            LOGGER.log(Level.INFO, "Consultando OCSP en {0}", ocspUrl);
            String resultado = ValidadorOCSP.ValidarOCSP(cert, rootCert, ocspUrl);

            if (resultado == null || resultado.equals("unknownStatus")) {
                LOGGER.log(Level.WARNING, "OCSP retorno estado desconocido para {0}", ocspUrl);
                return null; // Caer al siguiente paso del waterfall
            }

            // Si llegamos aqui, OCSP devolvio una fecha de revocacion
            LOGGER.log(Level.INFO, "OCSP confirma revocacion: {0}", resultado);
            return resultJson(true, resultado, "OCSP");

        } catch (Exception e) {
            LOGGER.log(Level.WARNING, "Error en validacion OCSP: {0}", e.getMessage());
            return null; // Caer al siguiente paso del waterfall
        }
    }

    /**
     * Consulta el cache proxy en BD. Si el CRL no esta cacheado o expiro, lo
     * descarga y almacena.
     */
    private String consultarCrlProxy(String crlUrl, BigInteger serial) throws Exception {
        // Verificar si tenemos metadata vigente para este CRL
        CrlMetadataInfo metadata = obtenerMetadata(crlUrl);

        if (metadata != null && metadata.nextUpdate != null) {
            // El CRL esta en cache y no ha expirado
            if (new Date().before(metadata.nextUpdate)) {
                LOGGER.log(Level.FINE, "CRL cache vigente para {0}", crlUrl);
                String fecha = buscarEnCrlProxy(serial, crlUrl);
                if (fecha != null) {
                    return resultJson(true, fecha, "CRL_PROXY_CACHE");
                }
                return resultJson(false, null, "CRL_PROXY_CACHE");
            }
        }

        // CRL no esta en cache o expiro: descargar
        LOGGER.log(Level.INFO, "Descargando CRL desde {0}", crlUrl);
        descargarYAlmacenarCrl(crlUrl);

        // Buscar el serial en los datos recien descargados
        String fecha = buscarEnCrlProxy(serial, crlUrl);
        if (fecha != null) {
            return resultJson(true, fecha, "CRL_PROXY");
        }
        return resultJson(false, null, "CRL_PROXY");
    }

    /**
     * Descarga un CRL, lo parsea y almacena las entradas en crl_proxy. Usa lock
     * por URL para evitar descargas concurrentes del mismo CRL.
     */
    private void descargarYAlmacenarCrl(String crlUrl) throws Exception {
        ReentrantLock lock = urlLocks.computeIfAbsent(crlUrl, k -> new ReentrantLock());
        lock.lock();
        try {
            // Double-check: otro thread pudo haber descargado mientras esperabamos
            CrlMetadataInfo metadata = obtenerMetadata(crlUrl);
            if (metadata != null && metadata.nextUpdate != null && new Date().before(metadata.nextUpdate)) {
                LOGGER.log(Level.FINE, "CRL ya fue descargado por otro thread: {0}", crlUrl);
                return;
            }

            // Codificar la URL antes de descargar
            String encodedUrl = codificarUrlCrl(crlUrl);

            // Descargar CRL con URL codificada
            HttpClient http = new HttpClient();
            byte[] content = http.download(encodedUrl);  // Usar URL codificada

            // Parsear CRL
            CertificateFactory cf = CertificateFactory.getInstance("X.509");
            X509CRL crl = (X509CRL) cf.generateCRL(new ByteArrayInputStream(content));

            // Obtener nextUpdate del CRL
            Date nextUpdate = crl.getNextUpdate();

            // Insertar entradas en crl_proxy
            int count = insertarEntradasCrlProxy(crl, crlUrl);

            // Actualizar metadata
            actualizarMetadata(crlUrl, nextUpdate, count);

            LOGGER.log(Level.INFO, "CRL descargado y almacenado: {0} ({1} entradas, nextUpdate: {2})",
                    new Object[]{crlUrl, count, nextUpdate});

        } catch (IOException e) {
            LOGGER.log(Level.SEVERE, "Error descargando CRL de {0}: {1}",
                    new Object[]{crlUrl, e.getMessage()});
            throw e;
        } catch (CertificateException | CRLException e) {
            LOGGER.log(Level.SEVERE, "Error parseando CRL de {0}: {1}",
                    new Object[]{crlUrl, e.getMessage()});
            throw e;
        } finally {
            lock.unlock();
            // Limpiar lock si no hay mas threads esperando
            urlLocks.remove(crlUrl, lock);
        }
    }

    /**
     * Codifica la URL del CRL, especialmente los parámetros de consulta.
     * Mantiene la estructura de la URL pero codifica los valores de los
     * parámetros.
     */
    private String codificarUrlCrl(String crlUrl) {
        try {
            URL url = new URL(crlUrl);

            // Si no tiene query string, devolver la URL original
            if (url.getQuery() == null || url.getQuery().isEmpty()) {
                return crlUrl;
            }

            // Parsear y codificar cada parámetro
            StringBuilder encodedQuery = new StringBuilder();
            String[] params = url.getQuery().split("&");

            for (int i = 0; i < params.length; i++) {
                String[] keyValue = params[i].split("=", 2);
                if (keyValue.length == 2) {
                    if (i > 0) {
                        encodedQuery.append("&");
                    }
                    encodedQuery.append(keyValue[0])
                            .append("=")
                            .append(URLEncoder.encode(keyValue[1], StandardCharsets.UTF_8.name()));
                } else if (keyValue.length == 1) {
                    if (i > 0) {
                        encodedQuery.append("&");
                    }
                    encodedQuery.append(keyValue[0]);
                }
            }

            // Reconstruir URL codificada
            String encodedUrl = new URL(url.getProtocol(), url.getHost(), url.getPort(),
                    url.getPath() + "?" + encodedQuery.toString()).toString();
            return encodedUrl;

        } catch (Exception e) {
            LOGGER.log(Level.WARNING, "Error al codificar URL, usando original: {0}", e.getMessage());
            return crlUrl;
        }
    }

    /**
     * Inserta las entradas de un CRL en la tabla crl_proxy.
     */
    private int insertarEntradasCrlProxy(X509CRL crl, String crlUrl) throws SQLException {
        if (crl.getRevokedCertificates() == null) {
            return 0;
        }

        try (Connection conn = ds.getConnection(); PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO crl_proxy (serial, crl_url, fecharevocacion, razonrevocacion) "
                + "VALUES (?, ?, ?, ?) "
                + "ON CONFLICT (serial, crl_url) "
                + "DO UPDATE SET fecharevocacion = EXCLUDED.fecharevocacion, "
                + "razonrevocacion = EXCLUDED.razonrevocacion")) {

            int count = 0;
            for (X509CRLEntry entry : crl.getRevokedCertificates()) {
                BigInteger serial = entry.getSerialNumber();
                Date fechaRevocacion = entry.getRevocationDate();
                String razonRevocacion = entry.getRevocationReason() == null
                        ? "" : entry.getRevocationReason().toString();
                LocalDateTime ldt = LocalDateTime.ofInstant(
                        fechaRevocacion.toInstant(), ZoneId.systemDefault());

                Matcher m = SERIAL_PATTERN.matcher(serial.toString());
                if (m.matches()) {
                    ps.setString(1, serial.toString());
                    ps.setString(2, crlUrl);
                    ps.setObject(3, ldt);
                    ps.setString(4, razonRevocacion);
                    ps.addBatch();
                    count++;
                }
            }

            ps.executeBatch();
            return count;
        }
    }

    /**
     * Busca un serial number en la tabla crl_proxy para una URL de CRL
     * especifica.
     */
    private String buscarEnCrlProxy(BigInteger serial, String crlUrl) {
        try (Connection conn = ds.getConnection(); PreparedStatement ps = conn.prepareStatement(
                "SELECT fecharevocacion FROM crl_proxy WHERE serial = ? AND crl_url = ?")) {
            ps.setString(1, serial.toString());
            ps.setString(2, crlUrl);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getString("fecharevocacion");
                }
            }
        } catch (SQLException e) {
            LOGGER.log(Level.SEVERE, "Error consultando crl_proxy: {0}", e.getMessage());
        }
        return null;
    }

    /**
     * Obtiene la metadata de un CRL cacheado.
     */
    private CrlMetadataInfo obtenerMetadata(String crlUrl) {
        try (Connection conn = ds.getConnection(); PreparedStatement ps = conn.prepareStatement(
                "SELECT next_update, downloaded_at, entries_count FROM crl_metadata WHERE crl_url = ?")) {
            ps.setString(1, crlUrl);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    CrlMetadataInfo info = new CrlMetadataInfo();
                    Timestamp ts = rs.getTimestamp("next_update");
                    info.nextUpdate = ts != null ? new Date(ts.getTime()) : null;
                    info.downloadedAt = new Date(rs.getTimestamp("downloaded_at").getTime());
                    info.entriesCount = rs.getInt("entries_count");
                    return info;
                }
            }
        } catch (SQLException e) {
            LOGGER.log(Level.SEVERE, "Error consultando crl_metadata: {0}", e.getMessage());
        }
        return null;
    }

    /**
     * Actualiza la metadata de un CRL descargado.
     */
    private void actualizarMetadata(String crlUrl, Date nextUpdate, int count) {
        try (Connection conn = ds.getConnection(); PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO crl_metadata (crl_url, next_update, downloaded_at, entries_count) "
                + "VALUES (?, ?, CURRENT_TIMESTAMP, ?) "
                + "ON CONFLICT (crl_url) "
                + "DO UPDATE SET next_update = EXCLUDED.next_update, "
                + "downloaded_at = CURRENT_TIMESTAMP, entries_count = EXCLUDED.entries_count")) {
            ps.setString(1, crlUrl);
            if (nextUpdate != null) {
                ps.setTimestamp(2, new Timestamp(nextUpdate.getTime()));
            } else {
                ps.setNull(2, java.sql.Types.TIMESTAMP);
            }
            ps.setInt(3, count);
            ps.executeUpdate();
        } catch (SQLException e) {
            LOGGER.log(Level.SEVERE, "Error actualizando crl_metadata: {0}", e.getMessage());
        }
    }

    /**
     * Valida una URL contra la whitelist de dominios permitidos. Permite HTTP y
     * HTTPS. Bloquea IPs privadas y dominios no autorizados.
     *
     * @return null si la URL es valida, mensaje de error si no
     */
    private String validarUrl(String urlStr) {
        URL url;
        try {
            url = new URL(urlStr);
        } catch (Exception e) {
            return "URL no valida: " + urlStr;
        }

        // Solo HTTP y HTTPS
        String protocol = url.getProtocol().toLowerCase();
        if (!"http".equals(protocol) && !"https".equals(protocol)) {
            return "Protocolo no permitido: " + protocol + ". Solo se permite HTTP y HTTPS";
        }

        String host = url.getHost().toLowerCase();

        // Bloquear IPs privadas
        try {
            InetAddress addr = InetAddress.getByName(host);
            if (addr.isLoopbackAddress() || addr.isSiteLocalAddress()
                    || addr.isLinkLocalAddress() || addr.isAnyLocalAddress()) {
                return "No se permite acceder a direcciones privadas o locales";
            }
        } catch (UnknownHostException e) {
            // Si no se puede resolver, dejamos que la whitelist decida
        }

        // Verificar whitelist de dominios
        String dominiosStr = System.getProperty(DOMINIOS_PERMITIDOS_PROPERTY);
        if (dominiosStr == null || dominiosStr.trim().isEmpty()) {
            LOGGER.log(Level.WARNING,
                    "No se ha configurado la propiedad {0}. Se permite el acceso sin restriccion de dominio.",
                    DOMINIOS_PERMITIDOS_PROPERTY);
            return null; // Sin whitelist configurada, permitir todo
        }

        Set<String> dominiosPermitidos = new HashSet<>();
        for (String dominio : dominiosStr.split(",")) {
            String d = dominio.trim().toLowerCase();
            if (!d.isEmpty()) {
                dominiosPermitidos.add(d);
            }
        }

        // Verificar si el host esta en la whitelist
        for (String dominio : dominiosPermitidos) {
            if (host.equals(dominio) || host.endsWith("." + dominio)) {
                return null; // URL permitida
            }
        }

        return "Dominio no permitido: " + host
                + ". Configure la propiedad " + DOMINIOS_PERMITIDOS_PROPERTY + " en standalone.xml";
    }

    /**
     * Crea las tablas crl_proxy y crl_metadata si no existen.
     */
    private void crearTablasSiNoExisten() {
        LOGGER.info("Creando tablas crl_proxy y crl_metadata si no existen...");

        try (Connection conn = ds.getConnection(); Statement st = conn.createStatement()) {
            st.executeUpdate("CREATE TABLE IF NOT EXISTS crl_proxy ("
                    + "serial VARCHAR(2000) NOT NULL, "
                    + "crl_url VARCHAR(2000) NOT NULL, "
                    + "fecharevocacion VARCHAR(2000) NULL, "
                    + "razonrevocacion VARCHAR(2000) NULL, "
                    + "CONSTRAINT pk_crl_proxy PRIMARY KEY (serial, crl_url))");

            st.executeUpdate("CREATE TABLE IF NOT EXISTS crl_metadata ("
                    + "crl_url VARCHAR(2000) NOT NULL, "
                    + "next_update TIMESTAMP NULL, "
                    + "downloaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "
                    + "entries_count INTEGER DEFAULT 0, "
                    + "CONSTRAINT pk_crl_metadata PRIMARY KEY (crl_url))");

            LOGGER.info("Tablas crl_proxy y crl_metadata verificadas/creadas");
        } catch (SQLException e) {
            LOGGER.log(Level.SEVERE, "Error al crear tablas crl_proxy/crl_metadata", e);
            throw new EJBException(e);
        }
    }

    /**
     * Genera JSON de resultado exitoso.
     */
    private String resultJson(boolean revocado, String fechaRevocacion, String fuente) {
        JsonObject json = new JsonObject();
        json.addProperty("revocado", revocado);
        json.addProperty("fechaRevocacion", fechaRevocacion);
        json.addProperty("fuente", fuente);
        json.addProperty("error", (String) null);
        return json.toString();
    }

    /**
     * Genera JSON de error.
     */
    private String errorJson(String message) {
        JsonObject json = new JsonObject();
        json.addProperty("revocado", false);
        json.addProperty("fechaRevocacion", (String) null);
        json.addProperty("fuente", (String) null);
        json.addProperty("error", message);
        return json.toString();
    }

    /**
     * Clase interna para metadata de CRL.
     */
    private static class CrlMetadataInfo {

        Date nextUpdate;
        Date downloadedAt;
        int entriesCount;
    }
}
