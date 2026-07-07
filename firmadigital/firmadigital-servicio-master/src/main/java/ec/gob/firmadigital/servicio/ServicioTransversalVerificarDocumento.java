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

import static ec.gob.firmadigital.libreria.utils.CheckPDF.checkPDF;
import static ec.gob.firmadigital.libreria.utils.Utils.pdfToDocumento;
import ec.gob.firmadigital.libreria.exceptions.XploitException;
import ec.gob.firmadigital.libreria.exceptions.SignatureVerificationException;
import ec.gob.firmadigital.servicio.exception.TokenExpiradoException;
import ec.gob.firmadigital.servicio.exception.TokenInvalidoException;
import ec.gob.firmadigital.servicio.token.ServicioToken;
import ec.gob.firmadigital.libreria.certificate.to.Documento;
import ec.gob.firmadigital.libreria.sign.SignInfo;
import ec.gob.firmadigital.libreria.sign.Signer;
import ec.gob.firmadigital.libreria.sign.pdf.BasePdfSigner;
import ec.gob.firmadigital.libreria.utils.Json;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import jakarta.ejb.Stateless;
import jakarta.ejb.EJB;
import jakarta.json.JsonObject;
import jakarta.json.JsonReader;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.ArrayList;
import jakarta.validation.constraints.NotNull;
import java.io.StringReader;
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
public class ServicioTransversalVerificarDocumento {

    @EJB
    private ServicioToken servicioToken;

    private static final Logger LOGGER = Logger.getLogger(ec.gob.firmadigital.servicio.ServicioTransversalVerificarDocumento.class.getName());

    /**
     * Busca un Verificar Documento.
     *
     * @param jwt
     * @param base64Documento
     * @param base64
     * @return json
     */
    public String transversalVerificarDocumento(@NotNull String jwt, @NotNull String base64Documento, @NotNull String base64) {
        String retorno = null;
        Documento documento = null;
        String sistemaTransversal = null;

        byte[] byteDocumento = java.util.Base64.getDecoder().decode(base64Documento);
        try {
            // Validar JWT
            servicioToken.parseToken(jwt);

            // Validar JWT y obtener info
            Map<String, Object> parametros = servicioToken.parseToken(jwt);
            sistemaTransversal = (String) parametros.get("sistema");

            String mensajeAnalisisDocumento;
            try (InputStream inputStreamDocumento = new ByteArrayInputStream(byteDocumento); PdfReader pdfReader = new PdfReader(inputStreamDocumento); PdfDocument pdfDocument = new PdfDocument(pdfReader)) {
                mensajeAnalisisDocumento = checkPDF(pdfDocument);
            }
            if (mensajeAnalisisDocumento != null) {
                throw new XploitException(mensajeAnalisisDocumento);
            } else {
                try (InputStream inputStreamDocumento = new ByteArrayInputStream(byteDocumento); PdfReader pdfReader = new PdfReader(inputStreamDocumento)) {
                    Signer signer = new BasePdfSigner();
                    java.util.List<SignInfo> signInfos;
                    signInfos = signer.getSigners(byteDocumento);
                    documento = pdfToDocumento(pdfReader, signInfos);
                }
            }
        } catch (XploitException xe) {
            retorno = "XploitException: " + xe.getMessage();
            LOGGER.log(Level.WARNING, retorno);
            return retorno;
        } catch (TokenInvalidoException ex) {
            retorno = "JWT Inválido";
            return retorno;
        } catch (TokenExpiradoException ex) {
            retorno = "JWT expirado";
            return retorno;
        } catch (java.lang.UnsupportedOperationException uoe) {
            retorno = "No es posible procesar el documento";
        } catch (com.itextpdf.io.exceptions.IOException ioe) {
            retorno = "El archivo no es PDF";
        } catch (SignatureVerificationException sve) {
            retorno = sve.toString();
        } catch (Exception ex) {
            retorno = ex.toString();
        } finally {
            if (documento == null) {
                documento = new Documento(false, false, new ArrayList<>(), retorno);
            } else {
                LOGGER.log(Level.INFO,
                        "Documento verificado desde el sistema {0}, con sistema operativo {1}, documento (SHA-256) {2}",
                        new Object[]{
                            sistemaTransversal,
                            obtenerSO(base64),
                            ec.gob.firmadigital.libreria.utils.FileUtils.calcularHash(byteDocumento, "SHA-256")
                        });
            }
            return Json.generarJsonDocumento(documento);
        }
    }

    private String obtenerSO(String base64) {
        JsonObject jsonObjectBase64;
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
}
