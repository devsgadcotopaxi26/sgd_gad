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

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.security.cert.Certificate;
import java.util.Properties;
import java.util.logging.Logger;

import com.itextpdf.signatures.BouncyCastleDigest;
import com.itextpdf.signatures.IExternalSignature;
import com.itextpdf.signatures.PdfPKCS7;
import com.itextpdf.signatures.PrivateKeySignature;

import ec.gob.firmadigital.libreria.sign.RubricaSigner;
import ec.gob.firmadigital.libreria.sign.pdf.itext.SignerAdapter;
import java.io.InputStream;
import java.security.PrivateKey;
import java.util.logging.Level;

/**
 * PaDES Basic Signer
 */
public class PadesBasicSigner extends BasePdfSigner {

    private final IExternalSignature externalSignature;

    private static final Logger LOGGER = Logger.getLogger(PadesBasicSigner.class.getName());

    public PadesBasicSigner(RubricaSigner signer) {
        this.externalSignature = new SignerAdapter(signer);
    }

    public byte[] sign(InputStream inputStream, PrivateKey privateKey, Certificate[] certificates, Properties properties) throws IOException {
        try {
            // Firmar el documento
            byte[] hash = emptySignature(inputStream, certificates, properties, externalSignature.getDigestAlgorithmName());
            String fieldName = getFieldName();
            ByteArrayOutputStream documentoPorFirmar = getDocumentoPorFirmar();
            byte[] hashSigned = this.signed_hash(hash, privateKey, certificates);
            createSignature(hashSigned, documentoPorFirmar, fieldName, privateKey, certificates);
            return getDocumentoFirmado().toByteArray();
        } catch (GeneralSecurityException e) {
            LOGGER.log(Level.SEVERE, "Error al firmar: {0}", e.getMessage());
            throw new RuntimeException(e);
        }
    }

    private byte[] signed_hash(byte[] hash, PrivateKey privateKey, Certificate[] chain) throws GeneralSecurityException {
        PrivateKeySignature signature = new PrivateKeySignature(privateKey, externalSignature.getDigestAlgorithmName(), null);
        BouncyCastleDigest digest = new BouncyCastleDigest();
        PdfPKCS7 sgn = new PdfPKCS7(null, chain, externalSignature.getDigestAlgorithmName(), null, digest, false);
        byte[] sh = sgn.getAuthenticatedAttributeBytes(hash, com.itextpdf.signatures.PdfSigner.CryptoStandard.CMS, null, null);
        byte[] extSignature = signature.sign(sh);
        sgn.setExternalSignatureValue(extSignature, null, signature.getSignatureAlgorithmName());
        return sgn.getEncodedPKCS7(hash, com.itextpdf.signatures.PdfSigner.CryptoStandard.CMS, null, null, null);
    }
}
