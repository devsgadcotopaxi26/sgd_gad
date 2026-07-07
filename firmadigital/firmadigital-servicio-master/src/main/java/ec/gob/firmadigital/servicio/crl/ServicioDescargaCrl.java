/*
 * Firma Digital: Servicio
 *
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

import ec.gob.firmadigital.libreria.crl.ServicioCRL;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.cert.CertificateFactory;
import java.security.cert.X509CRL;
import java.security.cert.X509CRLEntry;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.logging.Level;
import java.util.logging.Logger;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.Resource;
import jakarta.ejb.EJBException;
import jakarta.ejb.Schedule;
import jakarta.ejb.Singleton;
import jakarta.ejb.Startup;
import javax.sql.DataSource;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLParameters;

/**
 * Servicio para cargar los CRLs de las CAs soportadas en una tabla.
 *
 * @author Ricardo Arguello, Misael Fernández
 */
@Singleton
//GRANJA DE SERVIDORES EN PRODUCCION - COMENTAR EVITAR DESCARGA CRL
@Startup
//GRANJA DE SERVIDORES EN PRODUCCION - COMENTAR EVITAR DESCARGA CRL
public class ServicioDescargaCrl {

    private static final Logger LOGGER = Logger.getLogger(ServicioDescargaCrl.class.getName());

    @Resource(lookup = "java:/FirmaDigitalDS")
    private DataSource ds;

    // HttpClient seguro compartido para todas las descargas
    private HttpClient httpClient;

    /**
     * Inicializa un HttpClient seguro
     */
    private void inicializarHttpClient() {
        try {
            // Usar SSLContext por defecto del sistema (SEGURO)
            SSLContext sslContext = SSLContext.getDefault();

            // Configurar parámetros SSL
            SSLParameters sslParams = new SSLParameters();
            // Forzar TLS 1.2 o superior (seguro)
            sslParams.setProtocols(new String[]{"TLSv1.2", "TLSv1.3"});
            // Usar el hostname verifier por defecto (SEGURO)

            // Construir HttpClient con configuración óptima
            httpClient = HttpClient.newBuilder()
                    .version(HttpClient.Version.HTTP_1_1)
                    .sslContext(sslContext)
                    .sslParameters(sslParams)
                    .connectTimeout(Duration.ofSeconds(30))
                    .followRedirects(HttpClient.Redirect.NORMAL)
                    .build();

            LOGGER.info("HttpClient inicializado correctamente con SSLContext por defecto");
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Error al inicializar HttpClient, usando configuración por defecto", e);
            // Fallback a HttpClient por defecto
            httpClient = HttpClient.newHttpClient();
        }
    }

    //GRANJA DE SERVIDORES EN PRODUCCION - COMENTAR EVITAR DESCARGA CRL
    @PostConstruct
    public void init() {
        inicializarHttpClient();
        crearTablaSiNoExiste();
        importarCrls();
    }

    //10 segundos
    //@Schedule(hour = "*", minute = "*", second = "*/10", persistent = false)
    //5 minutos
    @Schedule(hour = "*", minute = "*/5", persistent = false)
    //1 hora
    //@Schedule(minute = "0", hour = "*", persistent = false)
    //GRANJA DE SERVIDORES EN PRODUCCION - COMENTAR EVITAR DESCARGA CRL
    public void importarCrls() {
        // Ejecutar en un hilo separado para no bloquear el hilo principal de EJB
        Thread crlThread = new Thread(() -> {
            try {
                LOGGER.info("Iniciando el proceso de descarga de CRL (hilo: " + Thread.currentThread().getName() + ")");
                descargarYProcesarCRLs();
                LOGGER.info("Proceso de descarga de CRL completado exitosamente");
            } catch (Exception e) {
                LOGGER.log(Level.SEVERE, "Error en proceso de descarga de CRL", e);
            }
        });
        crlThread.setDaemon(true);
        crlThread.setName("CRL-Download-Thread");
        crlThread.start();
    }

    /**
     * Método principal para descargar y procesar todos los CRLs
     */
    private void descargarYProcesarCRLs() {
        LOGGER.info("Descargando CRL de ALPHATECHNOLOGIES...");
        X509CRL alphaTechnologiesCrl1 = downloadCrl(ServicioCRL.ALPHATECHNOLOGIES_CA1_CRL);
        X509CRL alphaTechnologiesCrl2 = downloadCrl(ServicioCRL.ALPHATECHNOLOGIES_CA2_CRL);

        LOGGER.info("Descargando CRL de ANFAC...");
        X509CRL anfAcCrl1 = downloadCrl(ServicioCRL.ANFAC_CRL1);
        X509CRL anfAcCrl2 = downloadCrl(ServicioCRL.ANFAC_CRL2);

        LOGGER.info("Descargando CRL de APPFIRMAS...");
        X509CRL appFirmasCrl1 = downloadCrl(ServicioCRL.APP_FIRMAS_CRL1);
        X509CRL appFirmasCrl2 = downloadCrl(ServicioCRL.APP_FIRMAS_CRL2);

        LOGGER.info("Descargando CRL de ARGOSDATA...");
        X509CRL argosDataCrl = downloadCrl(ServicioCRL.ARGOSDATA_CRL);

        LOGGER.info("Descargando CRL de BCE...");
        X509CRL bceCrl = downloadCrl(ServicioCRL.BCE_CRL);

        LOGGER.info("Descargando CRL de CJ...");
        X509CRL cjCrl = downloadCrl(ServicioCRL.CJ_CRL);

        LOGGER.info("Descargando CRL de CORPNEWBEST...");
        X509CRL corpNewBestCrl1 = downloadCrl(ServicioCRL.CORPNEWBEST_CRL1);
        X509CRL corpNewBestCrl2 = downloadCrl(ServicioCRL.CORPNEWBEST_CRL2);
        X509CRL corpNewBestCrl3 = downloadCrl(ServicioCRL.CORPNEWBEST_CRL3);

        LOGGER.info("Descargando CRL de DARKCAM...");
        X509CRL darkCamRootCrl = downloadCrl(ServicioCRL.DARKCAM_ROOT_CRL);
        X509CRL darkCamSubCACrl = downloadCrl(ServicioCRL.DARKCAM_SUBCA_CRL);
        X509CRL darkCamSubCAShortCrl = downloadCrl(ServicioCRL.DARKCAM_SUBCA_SHORT_CRL);

        LOGGER.info("Descargando CRL de DATIL...");
        X509CRL datilCrl = downloadCrl(ServicioCRL.DATIL_CRL);

        LOGGER.info("Descargando CRL de DIGERCIC...");
        X509CRL digercicCrl = downloadCrl(ServicioCRL.DIGERCIC_CRL);

        LOGGER.info("Descargando CRL de FIRMA SEGURA...");
        X509CRL firmaSeguraCrl = downloadCrl(ServicioCRL.FIRMASEGURA_CRL);

        LOGGER.info("Descargando CRL de LAZZATE...");
        X509CRL lazzateCrl = downloadCrl(ServicioCRL.LAZZATE_CRL);
        X509CRL lazzateCa1Crl = downloadCrl(ServicioCRL.LAZZATECA1_CRL);
        X509CRL lazzateCa2Crl = downloadCrl(ServicioCRL.LAZZATECA2_CRL);
        X509CRL lazzateCaWeGoCrl = downloadCrl(ServicioCRL.LAZZATE_WE_GO_CRL);

        LOGGER.info("Descargando CRL de LETMI...");
        X509CRL letmi1Crl = downloadCrl(ServicioCRL.LETMI1_CRL);
        X509CRL letmi2Crl = downloadCrl(ServicioCRL.LETMI2_CRL);

        LOGGER.info("Descargando CRL de PRIMECORELAT...");
        X509CRL primeCoreLatCACrl1 = downloadCrl(ServicioCRL.PRIMECORELAT_CA1_CRL);
        X509CRL primeCoreLatCACrl2 = downloadCrl(ServicioCRL.PRIMECORELAT_CA2_CRL);

        LOGGER.info("Descargando CRL de Security Data...");
        X509CRL sdCrl1 = downloadCrl(ServicioCRL.SD_CRL1);
        X509CRL sdCrl2 = downloadCrl(ServicioCRL.SD_CRL2);
        X509CRL sdCrl3 = downloadCrl(ServicioCRL.SD_CRL3);
        X509CRL sdCrl4 = downloadCrl(ServicioCRL.SD_CRL4);
        X509CRL sdCrl5 = downloadCrl(ServicioCRL.SD_CRL5);

        LOGGER.info("Descargando CRL de UANATACA...");
        X509CRL uanatacaCrl1 = downloadCrl(ServicioCRL.UANATACA_CRL1);
        X509CRL uanatacaCrl2 = downloadCrl(ServicioCRL.UANATACA_CRL2);

        // Procesar e insertar en base de datos
        procesarEnBaseDeDatos(
                alphaTechnologiesCrl1, alphaTechnologiesCrl2,
                anfAcCrl1, anfAcCrl2,
                appFirmasCrl1, appFirmasCrl2,
                argosDataCrl,
                bceCrl,
                cjCrl,
                corpNewBestCrl1, corpNewBestCrl2, corpNewBestCrl3,
                darkCamRootCrl, darkCamSubCACrl, darkCamSubCAShortCrl,
                datilCrl,
                digercicCrl,
                firmaSeguraCrl,
                lazzateCrl, lazzateCa1Crl, lazzateCa2Crl, lazzateCaWeGoCrl,
                letmi1Crl, letmi2Crl,
                primeCoreLatCACrl1, primeCoreLatCACrl2,
                sdCrl1, sdCrl2, sdCrl3, sdCrl4, sdCrl5,
                uanatacaCrl1, uanatacaCrl2
        );
    }

    /**
     * Procesa todos los CRLs y los inserta en la base de datos
     */
    private void procesarEnBaseDeDatos(X509CRL... crls) {
        try (Connection conn = ds.getConnection(); PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO crl (serial, fecharevocacion, razonrevocacion, entidadcertificadora) VALUES (?,?,?,?) "
                + "ON CONFLICT (serial) "
                + "DO UPDATE SET fecharevocacion = EXCLUDED.fecharevocacion, "
                + "razonrevocacion = EXCLUDED.razonrevocacion, "
                + "entidadcertificadora = EXCLUDED.entidadcertificadora")) {

            // Array con los IDs de entidades certificadoras
            int[] entidadIds = {
                1, 1, // ALPHA TECHNOLOGIES CIA. LTDA.
                2, 2, // ANFAC AUTORIDAD DE CERTIFICACION ECUADOR C.A.
                3, 3, // APPFIRMAS S.A.
                4, // ARGOSDATA CERTIFICACIÓN DE INFORMACIÓN Y SERVICIOS RELACIONADOS
                5, // BANCO CENTRAL DEL ECUADOR
                6, // CONSEJO DE LA JUDICATURA
                7, 7, 7, // CORPNEWBEST CIA. LTDA.
                8, 8, 8, // DARKCAM S.A.
                9, // DATILMEDIA S.A.
                10, // DIRECCIÓN GENERAL DE REGISTRO CIVIL, IDENTIFICACIÓN Y CEDULACIÓN
                11, // FIRMASEGURA S.A.S.
                12, 12, 12, 12, // LAZZATE CIA. LTDA.
                13, 13, // LETMI ECUADOR S.A.
                14, 14, // PRIMECORELAT S.A.S. B.I.C.
                15, 15, 15, 15, 15, // SECURITY DATA SEGURIDAD EN DATOS Y FIRMA DIGITAL S.A.
                16, 16 // UANATACA S.A.
            };

            int contador = 0;
            for (int i = 0; i < crls.length; i++) {
                X509CRL crl = crls[i];
                if (crl != null && i < entidadIds.length) {
                    contador += insertarCrl(crl, entidadIds[i], ps);
                }
            }

            LOGGER.log(Level.INFO, "Total registros procesados: {0}", contador);

        } catch (SQLException e) {
            LOGGER.log(Level.SEVERE, "Error al insertar/actualizar certificados revocados", e);
            throw new EJBException(e);
        }
    }

    /**
     * Inserta los certificados revocados de un CRL en la base de datos
     */
    private int insertarCrl(X509CRL crl, int entidadCertificadora, PreparedStatement ps) throws SQLException {
        if (crl.getRevokedCertificates() == null) {
            return 0;
        }

        int count = 0;
        for (X509CRLEntry cert : crl.getRevokedCertificates()) {
            BigInteger serial = cert.getSerialNumber();
            Date fechaRevocacion = cert.getRevocationDate();
            String razonRevocacion = cert.getRevocationReason() == null ? "" : cert.getRevocationReason().toString();
            LocalDateTime ldt = LocalDateTime.ofInstant(fechaRevocacion.toInstant(), ZoneId.systemDefault());

            //https://www.ipa.go.jp/security/rfc/RFC3280-04EN.html#41202
            Pattern pattern = Pattern.compile("\\d{1,2000}");
            Matcher matcher = pattern.matcher(serial.toString());
            if (matcher.matches()) {
                ps.setString(1, serial.toString());
                ps.setObject(2, ldt);
                ps.setString(3, razonRevocacion);
                ps.setInt(4, entidadCertificadora);
                ps.addBatch();
                count++;

                // Ejecutar batch cada 1000 registros para optimizar memoria
                if (count % 1000 == 0) {
                    ps.executeBatch();
                }
            } else {
                LOGGER.log(Level.WARNING, "Serial number inválido: {0} para entidad {1}",
                        new Object[]{serial.toString(), entidadCertificadora});
            }
        }

        // Ejecutar batch restante
        int[] result = ps.executeBatch();
        return result.length;
    }

    /**
     * Descarga un CRL de forma segura con manejo de errores
     */
    private X509CRL downloadCrl(String url) {
        int connectTimeout = 5;
        int maxRetries = 0;
        int retryCount = 0;
        if (url == null || url.isEmpty()) {
            LOGGER.warning("URL de CRL vacía o nula");
            return null;
        }
        while (retryCount <= maxRetries) {
            try {
                if (retryCount > 0) {
                    LOGGER.info("Reintentando descarga de CRL (" + retryCount + "/" + maxRetries + "): " + url);
                    Thread.sleep(1000); // Espera 1 segundo antes de reintentar
                }
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .timeout(Duration.ofSeconds(connectTimeout))
                        .header("User-Agent", "FirmaDigital-Service/1.0")
                        .GET()
                        .build();
                HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
                if (response.statusCode() == 200) {
                    byte[] content = response.body();
                    if (content == null || content.length == 0) {
                        LOGGER.warning("CRL vacío descargado de " + url);
                        return null;
                    }
                    CertificateFactory cf = CertificateFactory.getInstance("X.509");
                    X509CRL crl = (X509CRL) cf.generateCRL(new ByteArrayInputStream(content));
                    LOGGER.log(Level.INFO, "CRL descargado: {0} ({1} bytes)",
                            new Object[]{url, content.length});
                    return crl;
                }
                LOGGER.log(Level.WARNING, "HTTP {0} al descargar CRL de {1}",
                        new Object[]{response.statusCode(), url});
                return null;
            } catch (InterruptedException e) {
                LOGGER.log(Level.WARNING, "Descarga interrumpida: {0}", url);
                Thread.currentThread().interrupt();
                return null;
            } catch (IOException e) {
                retryCount++;
                // Obtener mensaje de error seguro
                String errorMsg = (e.getMessage() != null) ? e.getMessage() : e.getClass().getSimpleName();

                if (retryCount <= maxRetries) {
                    LOGGER.log(Level.INFO, "Error ({0}) al descargar {1}, reintentando...",
                            new Object[]{errorMsg, url});
                } else {
                    LOGGER.log(Level.WARNING, "No se pudo descargar CRL de {0}: {1}",
                            new Object[]{url, errorMsg});
                    return null;
                }
            } catch (Exception e) {
                LOGGER.log(Level.SEVERE, "Error crítico descargando CRL de " + url, e);
                return null;
            }
        }
        return null;
    }

    /**
     * Crea la tabla CRL si no existe
     */
    private void crearTablaSiNoExiste() {
        LOGGER.info("Verificando/Creando tabla CRL...");

        try (Connection conn = ds.getConnection(); Statement st = conn.createStatement()) {

            st.executeUpdate("CREATE TABLE IF NOT EXISTS crl ("
                    + "serial VARCHAR(2000) NOT NULL, "
                    + "fecharevocacion TIMESTAMP NULL, "
                    + "razonrevocacion VARCHAR(2000) NULL, "
                    + "entidadcertificadora INTEGER NULL, "
                    + "CONSTRAINT pk_serial PRIMARY KEY (serial))");

            // Crear índices para mejorar rendimiento
            st.executeUpdate("CREATE INDEX IF NOT EXISTS idx_entidadcertificadora ON crl(entidadcertificadora)");
            st.executeUpdate("CREATE INDEX IF NOT EXISTS idx_fecharevocacion ON crl(fecharevocacion)");

            LOGGER.info("Tabla CRL verificada/creada exitosamente");
        } catch (SQLException e) {
            LOGGER.log(Level.SEVERE, "Error al crear/verificar tabla CRL", e);
            throw new EJBException(e);
        }
    }
}
