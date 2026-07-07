/*
 * Copyright (C) 2020 
 * Authors: Ricardo Arguello, Misael Fernández
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.*
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
package ec.gob.firmadigital.libreria.utils;

import ec.gob.firmadigital.libreria.exceptions.CRLValidationException;
import ec.gob.firmadigital.libreria.exceptions.CertificadoInvalidoException;
import ec.gob.firmadigital.libreria.exceptions.ConexionValidarCRLException;
import ec.gob.firmadigital.libreria.certificate.CertEcUtils;
import ec.gob.firmadigital.libreria.certificate.CrlUtils;
import ec.gob.firmadigital.libreria.certificate.ValidationResult;
import ec.gob.firmadigital.libreria.exceptions.RubricaException;
import ec.gob.firmadigital.libreria.exceptions.ConexionApiException;
import ec.gob.firmadigital.libreria.exceptions.ConexionException;
import ec.gob.firmadigital.libreria.exceptions.EntidadCertificadoraNoValidaException;

import ec.gob.firmadigital.libreria.ocsp.ValidadorOCSP;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.math.BigInteger;
import java.net.HttpURLConnection;
import java.net.SocketException;
import java.net.URL;
import java.net.URLEncoder;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.security.cert.X509Certificate;
import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Utilidades para CRL y OCSP
 *
 * @author jdc
 */
public class UtilsCrlOcsp {

    private static final int TIME_OUT = 5000; //set timeout to 5 seconds
    private static final Logger LOGGER = Logger.getLogger(UtilsCrlOcsp.class.getName());

    public UtilsCrlOcsp() {
    }

    /**
     * Valida primero por OCSP, si falla lo hace por CRL
     *
     * @param cert
     * @param apiUrl
     * @return X509Certificate
     * @throws IOException
     * @throws RubricaException si hay un error de conexion con el CRL bota
     * esto, si es por OCSP y falla la conexion intenta por CRL
     * @throws ec.gob.firmadigital.libreria.exceptions.CRLValidationException
     * @throws
     * ec.gob.firmadigital.libreria.exceptions.EntidadCertificadoraNoValidaException
     * @throws
     * ec.gob.firmadigital.libreria.exceptions.ConexionValidarCRLException
     */
    public static String validarCertificado(X509Certificate cert, String apiUrl) throws EntidadCertificadoraNoValidaException, IOException, RubricaException, ConexionValidarCRLException, CRLValidationException {
        String fechaRevocado = null;

        // PASO 1: Intentar validacion por proxy CRL (soporta CRLs particionados)
        try {
            fechaRevocado = validarCertificadoProxy(cert);
            if (fechaRevocado != null && !fechaRevocado.contains("errorRed")) {
                return fechaRevocado;
            }
            // Si el proxy devolvio null (no revocado), retornar null
            if (fechaRevocado == null) {
                return null;
            }
        } catch (Exception ex) {
            LOGGER.log(Level.WARNING, "Fallo la validacion por proxy CRL, intentando por API legacy: {0}", ex.getMessage());
        }

        // PASO 2: Fallback a API legacy (serial number contra tabla batch)
        try {
            BigInteger serial = cert.getSerialNumber();
            fechaRevocado = validarCrlServidorAPI(serial, apiUrl);
        } catch (UnknownHostException | SocketException | ConexionApiException ex) {
            System.out.println("Fallo la validacion por el servicio del API");
            LOGGER.log(Level.SEVERE, "SocketException: ", ex.getCause());
            fechaRevocado = "errorRed";
        } finally {
            return fechaRevocado;
        }
    }

    public static Date fechaString_Date(String fecha) {
        DateFormat formato = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        Date date = null;
        if (fecha != null) {
            try {
                date = (Date) formato.parse(fecha);
            } catch (ParseException ex) {
                LOGGER.log(Level.SEVERE, fecha, ex);
            }
        }
        return date;
    }

    public static Date validarFechaRevocado(X509Certificate cert, String apiUrl) throws CertificadoInvalidoException, IOException, ConexionException {
        Date fechaRevocado = null;
        try {
            String revocado = validarCertificado(cert, apiUrl);
            if (revocado != null && revocado.contains("errorRed")) {
                throw new ConexionException("Problemas en la red, no es posible conectarse");
            } else {
                fechaRevocado = fechaString_Date(revocado);
            }
        } catch (RubricaException | ConexionValidarCRLException | CRLValidationException | EntidadCertificadoraNoValidaException ex) {
            LOGGER.log(Level.SEVERE, null, ex);
//            throw new ConexionFirmadorApiException("Fallo la validacion por el servicio del API");
        }
        return fechaRevocado;
    }

    public static Date validarOCSPDate(X509Certificate cert) throws IOException, RubricaException, EntidadCertificadoraNoValidaException {
        List<String> ocspUrls = CertificateUtils.getAuthorityInformationAccess(cert);
        ocspUrls.forEach((ocsp) -> {
            System.out.println("OCSP=" + ocsp);
        });

        X509Certificate certRoot = CertEcUtils.getRootCertificate(cert);

        Date fechaRevocado = null;
        try {
            fechaRevocado = fechaString_Date(ValidadorOCSP.ValidarOCSP(cert, certRoot, ocspUrls.get(0)));
        } catch (RubricaException ex) {
            LOGGER.log(Level.SEVERE, null, ex);
        }
        return fechaRevocado;
    }

    public static String validarOCSP(X509Certificate cert) throws IOException, RubricaException, EntidadCertificadoraNoValidaException {
        List<String> ocspUrls = CertificateUtils.getAuthorityInformationAccess(cert);
        ocspUrls.forEach((ocsp) -> {
            System.out.println("OCSP=" + ocsp);
        });

        X509Certificate certRoot = CertEcUtils.getRootCertificate(cert);
        return ValidadorOCSP.ValidarOCSP(cert, certRoot, ocspUrls.get(0));
    }

    public static String validarCRL(X509Certificate cert) throws IOException, EntidadCertificadoraNoValidaException, RubricaException, ConexionValidarCRLException, CRLValidationException {
        X509Certificate root = CertEcUtils.getRootCertificate(cert);
        CrlUtils crlUtils = new CrlUtils();
        String urlCrl = obtenerUrlCRL(CertificateUtils.getCrlDistributionPoints(cert));
        ValidationResult result = CrlUtils.verifyCertificateCRLs(cert, root.getPublicKey(), Arrays.asList(urlCrl));
        if (result == result.CANNOT_DOWNLOAD_CRL) {
            throw new ConexionValidarCRLException("No se puede validar contra la lista de revocación:" + urlCrl);
        }
        // Si el certificado no es valido lanzamos exception
        if (!result.isValid()) {
            throw new CRLValidationException("Certificado Inválido");
        }
        return crlUtils.getRevocationDate();
    }

    private static String validarCrlServidorAPI(BigInteger serial, String apiUrl) throws IOException, ConexionApiException {
        String certificado_revocado_url = apiUrl == null ? PropertiesUtils.getConfig().getProperty("certificado_revocado_url") : apiUrl;
        if (!certificado_revocado_url.isEmpty()) {
            URL url = new URL(certificado_revocado_url + "/" + serial);
            HttpURLConnection urlConnection = (HttpURLConnection) url.openConnection();
            int responseCode = urlConnection.getResponseCode();

            if (responseCode >= 300 && responseCode < 400) {
                urlConnection = (HttpURLConnection) new URL(urlConnection.getHeaderField("Location")).openConnection();
                urlConnection.setConnectTimeout(TIME_OUT);
                responseCode = urlConnection.getResponseCode();
            }
            if (responseCode >= 400) {
                LOGGER.log(Level.SEVERE, "{0}/{1}: Response Code: {2}", new Object[]{certificado_revocado_url, serial, responseCode});
                throw new ConexionApiException("No se pudo conectar API. " + certificado_revocado_url + " Response Code: " + responseCode);
            }

            try (InputStream is = urlConnection.getInputStream()) {
                InputStreamReader reader = new InputStreamReader(is);
                BufferedReader in = new BufferedReader(reader);
                return in.readLine();
            }
        } else {
            return null;
        }
    }

    private static String obtenerUrlCRL(List<String> urls) {
        for (String url : urls) {
            if (url.toLowerCase().contains("crl")) {
                return url;
            }
        }
        return null;
    }

    /**
     * Valida un certificado usando el proxy CRL del servidor de FirmaEC. Extrae
     * las URLs de CRL Distribution Point y OCSP del certificado y las envia al
     * proxy para validacion en tiempo real.
     *
     * Soporta CRLs particionados: cada certificado puede tener una URL de CRL
     * diferente y el proxy la descarga individualmente.
     *
     * @param cert Certificado a validar
     * @return fecha de revocacion si esta revocado, null si no esta revocado
     * @throws IOException si hay error de red
     */
    private static String validarCertificadoProxy(X509Certificate cert) throws IOException {
        BigInteger serial = cert.getSerialNumber();

        // Extraer CRL Distribution Points del certificado
        String crlUrl = null;
        try {
            List<String> crlUrls = CertificateUtils.getCrlDistributionPoints(cert);
            if (crlUrls != null && !crlUrls.isEmpty()) {
                // Preferir URL que contenga "crl" en su path
                crlUrl = obtenerUrlCRL(crlUrls);
                if (crlUrl == null) {
                    crlUrl = crlUrls.get(0);
                }
            }
        } catch (Exception e) {
            LOGGER.log(Level.WARNING, "No se pudo extraer CRL Distribution Points: {0}", e.getMessage());
        }

        // Extraer OCSP URL del certificado (opcional)
        String ocspUrl = null;
        try {
            List<String> ocspUrls = CertificateUtils.getAuthorityInformationAccess(cert);
            if (ocspUrls != null && !ocspUrls.isEmpty()) {
                for (String url : ocspUrls) {
                    if (url.toLowerCase().contains("ocsp")) {
                        ocspUrl = url;
                        break;
                    }
                }
            }
        } catch (Exception e) {
            // Algunos certificados no tienen AIA, es normal
            LOGGER.log(Level.FINE, "No se pudo extraer OCSP URL: {0}", e.getMessage());
        }

        // Si no tenemos CRL ni OCSP, no podemos usar el proxy
        if (crlUrl == null && ocspUrl == null) {
            LOGGER.log(Level.WARNING, "Certificado sin CRL Distribution Point ni OCSP URL");
            throw new IOException("No se encontraron puntos de distribucion CRL ni OCSP en el certificado");
        }

        // Codificar certificado en Base64 para OCSP en el proxy
        String certBase64 = null;
        try {
            certBase64 = java.util.Base64.getEncoder().encodeToString(cert.getEncoded());
        } catch (Exception e) {
            LOGGER.log(Level.WARNING, "No se pudo codificar el certificado en Base64: {0}", e.getMessage());
        }

        // Llamar al proxy
        return llamarProxyCrl(crlUrl, ocspUrl, serial.toString(), certBase64);
    }

    /**
     * Realiza la llamada HTTP POST al proxy CRL de FirmaEC.
     *
     * @param crlUrl URL del CRL (puede ser null)
     * @param ocspUrl URL del OCSP (puede ser null)
     * @param serial Serial number del certificado
     * @return fecha de revocacion si esta revocado, null si no, "errorRed" si
     * hay error de red
     * @throws IOException si hay error de conexion
     */
    private static String llamarProxyCrl(String crlUrl, String ocspUrl, String serial, String certBase64) throws IOException {
        String proxyUrl = PropertiesUtils.getConfig().getProperty("certificado_revocado_proxy_url");
        if (proxyUrl == null || proxyUrl.isEmpty()) {
            throw new IOException("No se ha configurado la propiedad certificado_revocado_proxy_url");
        }

        // Construir body del POST
        StringBuilder body = new StringBuilder();
        body.append("serial=").append(URLEncoder.encode(serial, StandardCharsets.UTF_8.name()));
        if (crlUrl != null) {
            body.append("&crlUrl=").append(URLEncoder.encode(crlUrl, StandardCharsets.UTF_8.name()));
        }
        if (ocspUrl != null) {
            body.append("&ocspUrl=").append(URLEncoder.encode(ocspUrl, StandardCharsets.UTF_8.name()));
        }
        if (certBase64 != null) {
            body.append("&certBase64=").append(URLEncoder.encode(certBase64, StandardCharsets.UTF_8.name()));
        }

        URL url = new URL(proxyUrl);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setConnectTimeout(TIME_OUT);
        conn.setReadTimeout(15000);
        conn.setDoOutput(true);
        conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");

        try (OutputStream os = conn.getOutputStream()) {
            os.write(body.toString().getBytes(StandardCharsets.UTF_8));
        }

        int responseCode = conn.getResponseCode();

        // Manejar redirects
        if (responseCode >= 300 && responseCode < 400) {
            String location = conn.getHeaderField("Location");
            conn = (HttpURLConnection) new URL(location).openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(TIME_OUT);
            conn.setReadTimeout(15000);
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.toString().getBytes(StandardCharsets.UTF_8));
            }
            responseCode = conn.getResponseCode();
        }

        if (responseCode >= 400) {
            LOGGER.log(Level.SEVERE, "Proxy CRL respondio con codigo {0}", responseCode);
            throw new IOException("Error en proxy CRL. Response Code: " + responseCode);
        }

        // Leer respuesta JSON
        String responseStr;
        try (InputStream is = conn.getInputStream(); BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            responseStr = sb.toString();
        }

        // Parsear respuesta JSON
        try {
            JsonObject json = JsonParser.parseString(responseStr).getAsJsonObject();

            // Verificar si hubo error
            if (json.has("error") && !json.get("error").isJsonNull()) {
                String error = json.get("error").getAsString();
                LOGGER.log(Level.WARNING, "Proxy CRL retorno error: {0}", error);
                throw new IOException("Error del proxy CRL: " + error);
            }

            // Verificar si esta revocado
            boolean revocado = json.has("revocado") && json.get("revocado").getAsBoolean();
            if (revocado && json.has("fechaRevocacion") && !json.get("fechaRevocacion").isJsonNull()) {
                return json.get("fechaRevocacion").getAsString();
            }

            return null; // No revocado

        } catch (Exception e) {
            if (e instanceof IOException) {
                throw (IOException) e;
            }
            LOGGER.log(Level.SEVERE, "Error parseando respuesta del proxy CRL: {0}", responseStr);
            throw new IOException("Error parseando respuesta del proxy CRL", e);
        }
    }
}
