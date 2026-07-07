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
package ec.gob.firmadigital.servicio;

import ec.gob.firmadigital.libreria.certificate.CertEcUtils;
import ec.gob.firmadigital.libreria.certificate.to.Certificado;
import ec.gob.firmadigital.libreria.certificate.to.DatosUsuario;
import ec.gob.firmadigital.libreria.core.Util;
import ec.gob.firmadigital.libreria.exceptions.CertificadoInvalidoException;
import ec.gob.firmadigital.libreria.utils.TiempoUtils;
import ec.gob.firmadigital.libreria.utils.Utils;
import ec.gob.firmadigital.libreria.utils.UtilsCrlOcsp;
import ec.gob.firmadigital.libreria.utils.Json;
import ec.gob.firmadigital.servicio.token.ServicioToken;
import ec.gob.firmadigital.servicio.exception.TokenExpiradoException;
import ec.gob.firmadigital.servicio.exception.TokenInvalidoException;
import ec.gob.firmadigital.servicio.util.Pkcs12;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.IOException;
import java.security.KeyStore;
import java.security.KeyStoreException;
import java.security.cert.X509Certificate;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAccessor;
import java.util.Date;
import jakarta.ejb.EJB;
import jakarta.ejb.Stateless;
import jakarta.json.JsonReader;
import jakarta.validation.constraints.NotNull;
import jakarta.xml.bind.DatatypeConverter;
import java.io.StringReader;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * REST Web Service
 *
 * @author Misael Fernández
 */
@Stateless
public class ServicioTransversalValidarCertificadoDigital {

    @EJB
    private ServicioToken servicioToken;

    private static final Logger LOGGER = Logger.getLogger(ec.gob.firmadigital.servicio.ServicioTransversalValidarCertificadoDigital.class.getName());

    /**
     * Busca un Validar Certificado Digital.
     *
     * @param jwt
     * @param pkcs12
     * @param password
     * @param base64
     * @return json
     */
    public String transversalValidarCertificadoDigital(@NotNull String jwt, @NotNull String pkcs12, @NotNull String password, @NotNull String base64) {
        DatosUsuario datosUsuario = null;
        Certificado certificado = null;
        String retorno = null;
        boolean expirado = true, revocado = true;
        String sistemaTransversal = null;

        try {
            // Validar JWT y obtener info
            servicioToken.parseToken(jwt);

            // Validar JWT y obtener info
            Map<String, Object> parametros = servicioToken.parseToken(jwt);
            sistemaTransversal = (String) parametros.get("sistema");

            // Obtener keyStore
            String decodedPassword = new String(Base64.getDecoder().decode(password));
            KeyStore keyStore = Pkcs12.getKeyStore(pkcs12, decodedPassword);
            String alias = Pkcs12.getAlias(keyStore);

            X509Certificate x509Certificate = (X509Certificate) keyStore.getCertificate(alias);
            DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ISO_OFFSET_DATE_TIME;
            TemporalAccessor accessor = dateTimeFormatter.parse(TiempoUtils.getFechaHoraServidor(null, base64));
            Date fechaHoraISO = Date.from(Instant.from(accessor));
            //Validad certificado revocado
            Date fechaRevocado = UtilsCrlOcsp.validarFechaRevocado(x509Certificate, null);
            if (fechaRevocado != null && fechaRevocado.compareTo(fechaHoraISO) <= 0) {
                retorno = "Certificado revocado: " + fechaRevocado;
                revocado = true;
            } else {
                revocado = false;
            }
            if (fechaHoraISO.compareTo(x509Certificate.getNotBefore()) <= 0 || fechaHoraISO.compareTo(x509Certificate.getNotAfter()) >= 0) {
                retorno = "Certificado expirado";
                expirado = true;
            } else {
                expirado = false;
            }
            datosUsuario = CertEcUtils.getDatosUsuarios(x509Certificate);
            certificado = new Certificado(
                    x509Certificate.getSerialNumber().toString(),
                    Util.getCN(x509Certificate),
                    CertEcUtils.getNombreCA(x509Certificate),
                    Utils.dateToCalendar(x509Certificate.getNotBefore()),
                    Utils.dateToCalendar(x509Certificate.getNotAfter()),
                    null,
                    Utils.dateToCalendar(fechaRevocado),
                    expirado,
                    datosUsuario);
            certificado.setKeyUsages(Utils.validacionKeyUsages(x509Certificate));
        } catch (TokenInvalidoException ex) {
            retorno = "JWT Inválido";
            return retorno;
        } catch (TokenExpiradoException ex) {
            retorno = "JWT expirado";
            return retorno;
        } catch (KeyStoreException kse) {
            if (kse.getCause().toString().contains("Invalid keystore format")) {
                retorno = "Certificado digital es inválido.";
            }
            if (kse.getCause().toString().contains("keystore password was incorrect")) {
                retorno = "La contraseña es inválida.";
            }
        } catch (CertificadoInvalidoException | IOException ex) {
            retorno = "Excepción no conocida: " + ex;
            ex.printStackTrace();
        } finally {
            JsonObject jsonObject = new JsonObject();
            boolean certificateValidate = true;
            if (certificado != null) {
                //TODO reparar al verificar un certificado no encontrado
                if (revocado || certificado.getCertificateValidated() || !certificado.getDatosUsuario().isCertificadoDigitalValido()) {
                    certificateValidate = false;
                } else {
                    certificateValidate = true;
                }
                jsonObject.addProperty("validarCertificado", certificateValidate);
                jsonObject.addProperty("error", retorno);
                String jsonCertificado = Json.generarJsonCertificadoTransversal(certificado);
                JsonParser jsonParser = new JsonParser();
                jsonObject.add("certificado", (JsonArray) jsonParser.parse(jsonCertificado));
                LOGGER.log(Level.INFO, "Certificado validado {0}, desde el sistema {1}, con sistema operativo {2}", new Object[]{hashMD5(datosUsuario.getCedula()), sistemaTransversal, obtenerSO(base64)});
            } else {
                jsonObject.addProperty("validarCertificado", false);
                jsonObject.addProperty("error", retorno);
                jsonObject.add("certificado", null);
            }
            JsonArray jsonArray = new JsonArray();
            jsonArray.add(jsonObject);
            return jsonArray.toString();
        }
    }

    private String obtenerSO(String base64) {
        jakarta.json.JsonObject jsonObjectBase64;
        String toString = new String(Base64.getDecoder().decode(base64));
        JsonReader jsonReader = jakarta.json.Json.createReader(new StringReader(toString));
        try {
            jsonObjectBase64 = jsonReader.readObject();
            if (jsonReader != null) {
                jsonReader.close();
            }
        } catch (Throwable throwable) {
            if (jsonReader != null)
        try {
                jsonReader.close();
            } catch (Throwable throwable1) {
                throwable.addSuppressed(throwable1);
            }
            throw throwable;
        }
        return jsonObjectBase64.getString("sistemaOperativo");
    }

    private String hashMD5(String texto) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            md.update(texto.getBytes("UTF-8"));
            byte[] digest = md.digest();
            return DatatypeConverter.printHexBinary(digest).toLowerCase();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
