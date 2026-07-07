/*
 * Copyright (C) 2021 
 * Authors: Ricardo Arguello
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
package ec.gob.firmadigital.libreria.sign.pdf;

import com.itextpdf.signatures.BouncyCastleDigest;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.security.cert.Certificate;
import java.util.Properties;
import java.util.logging.Logger;

import com.itextpdf.signatures.IExternalSignature;
import com.itextpdf.signatures.ITSAClient;
import com.itextpdf.signatures.PdfPKCS7;
import com.itextpdf.signatures.PrivateKeySignature;
import com.itextpdf.signatures.TSAClientBouncyCastle;

import ec.gob.firmadigital.libreria.sign.RubricaSigner;
import ec.gob.firmadigital.libreria.sign.pdf.itext.SignerAdapter;
import ec.gob.firmadigital.libreria.utils.BouncyCastleUtils;
import ec.gob.firmadigital.libreria.utils.PropertiesUtils;
import java.io.InputStream;
import java.security.PrivateKey;
import java.util.logging.Level;

/**
 * PAdES Enhanced - PAdES-BES
 */
public class PadesEnhancedSigner extends BasePdfSigner {

    private final IExternalSignature externalSignature;

    private static final Logger LOGGER = Logger.getLogger(PadesEnhancedSigner.class.getName());

    public PadesEnhancedSigner(RubricaSigner signer) {
        this.externalSignature = new SignerAdapter(signer);
    }

    public byte[] sign(InputStream inputStream, PrivateKey privateKey, Certificate[] certificates, Properties properties) throws IOException {
        BouncyCastleUtils.initializeBouncyCastle();
        try {
            // Firmar el documento
            byte[] hash = emptySignature(inputStream, certificates, properties, externalSignature.getDigestAlgorithmName());
            String fieldName = getFieldName();
            ByteArrayOutputStream documentoPorFirmar = getDocumentoPorFirmar();
            byte[] hashSigned = this.signed_hash(hash, privateKey, certificates, properties.getProperty("identificacion"));
            createSignature(hashSigned, documentoPorFirmar, fieldName, privateKey, certificates);
            return getDocumentoFirmado().toByteArray();
        } catch (GeneralSecurityException e) {
            LOGGER.log(Level.SEVERE, "Error al firmar: {0}", e.getMessage());
            throw new RuntimeException(e);
        }
    }

    private byte[] signed_hash(byte[] hash, PrivateKey pk, Certificate[] chain, String identificacion) throws GeneralSecurityException {
        PrivateKeySignature signature = new PrivateKeySignature(pk, externalSignature.getDigestAlgorithmName(), null);
        BouncyCastleDigest digest = new BouncyCastleDigest();
        PdfPKCS7 sgn = new PdfPKCS7(null, chain, externalSignature.getDigestAlgorithmName(), null, digest, false);
        byte[] sh = sgn.getAuthenticatedAttributeBytes(hash, com.itextpdf.signatures.PdfSigner.CryptoStandard.CMS, null, null);
        byte[] extSignature = signature.sign(sh);
        sgn.setExternalSignatureValue(extSignature, null, signature.getSignatureAlgorithmName());
        ITSAClient tsaClient = null;
        if (identificacion != null && !identificacion.isEmpty()) {
            tsaClient = new TSAClientBouncyCastle(PropertiesUtils.getConfig().getProperty("tsa_url"), identificacion, identificacion);
        }//
            try {
//                throw new GeneralSecurityException("Error de autenticación TSA: Las credenciales proporcionadas son incorrectas. Verifique usuario y contraseña.");
//                throw new IOException("Server returned HTTP response code: 401 for URL: https://tsa.uanatacaec.com/tsa/timestamp");
                return sgn.getEncodedPKCS7(hash, com.itextpdf.signatures.PdfSigner.CryptoStandard.CMS, tsaClient, null, null);
            } catch (Exception e) {
                // Atrapar errores HTTP específicos
                String errorMessage = e.getMessage();
                String causeMessage = e.getCause() != null ? e.getCause().getMessage() : "";
                String fullMessage = errorMessage + " " + causeMessage;

                // Buscar códigos de error HTTP en el mensaje
                if (fullMessage.contains("HTTP response code: 401")) {
                    LOGGER.log(Level.SEVERE, "Error de autenticación TSA (401): Credenciales incorrectas o usuario no autorizado. URL: {0}",
                            PropertiesUtils.getConfig().getProperty("tsa_url"));
                    throw new GeneralSecurityException("Error de autenticación TSA (sello de tiempo): Las credenciales proporcionadas son incorrectas. Verifique usuario y contraseña.", e);

                } else if (fullMessage.contains("HTTP response code: 409")) {
                    LOGGER.log(Level.SEVERE, "Error de conflicto TSA (409): Posiblemente el hash ya fue sellado anteriormente o hay duplicación. URL: {0}",
                            PropertiesUtils.getConfig().getProperty("tsa_url"));
                    throw new GeneralSecurityException("Error de conflicto TSA (sello de tiempo): No se puede obtener el sello de tiempo debido a un conflicto. El hash podría estar duplicado.", e);

                } else if (fullMessage.contains("HTTP response code:")) {
                    // Atrapar cualquier otro código HTTP
                    String httpCode = extractHttpCode(fullMessage);
                    LOGGER.log(Level.SEVERE, "Error HTTP {0} del servidor TSA: {1}", new Object[]{httpCode, fullMessage});
                    throw new GeneralSecurityException(String.format("Error del servidor TSA (sello de tiempo) (HTTP %s): No se pudo obtener el sello de tiempo. URL: %s",
                            httpCode, PropertiesUtils.getConfig().getProperty("tsa_url")), e);

                } else {
                    // Otros errores no HTTP
                    LOGGER.log(Level.SEVERE, "Error al obtener sello de tiempo TSA: {0}", e.getMessage());
                    throw new GeneralSecurityException("Error al obtener TSA (sello de tiempo): " + e.getMessage(), e);
                }
            }
//        } else {
//            // No hay identificación, firmar sin TSA
//            LOGGER.log(Level.WARNING, "No se proporcionó identificación, se firmará sin sello de tiempo TSA");
//            return sgn.getEncodedPKCS7(hash, com.itextpdf.signatures.PdfSigner.CryptoStandard.CMS, null, null, null);
//        }
    }

    // Método auxiliar para extraer el código HTTP del mensaje de error
    private String extractHttpCode(String message) {
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("HTTP response code: (\\d+)");
        java.util.regex.Matcher matcher = pattern.matcher(message);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return "desconocido";
    }
}
