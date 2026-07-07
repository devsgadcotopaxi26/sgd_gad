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

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.StampingProperties;
import com.itextpdf.signatures.BouncyCastleDigest;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.security.cert.Certificate;
import java.util.Properties;
import java.util.logging.Logger;

import com.itextpdf.signatures.CrlClientOnline;
import com.itextpdf.signatures.ICrlClient;
import com.itextpdf.signatures.IExternalSignature;
import com.itextpdf.signatures.IOcspClient;
import com.itextpdf.signatures.ITSAClient;
import com.itextpdf.signatures.LtvVerification;
import com.itextpdf.signatures.OCSPVerifier;
import com.itextpdf.signatures.OcspClientBouncyCastle;
import com.itextpdf.signatures.PdfPKCS7;
import com.itextpdf.signatures.PrivateKeySignature;
import com.itextpdf.signatures.TSAClientBouncyCastle;
import ec.gob.firmadigital.libreria.sign.RubricaSigner;
import ec.gob.firmadigital.libreria.sign.pdf.itext.SignerAdapter;
import ec.gob.firmadigital.libreria.utils.PropertiesTsa;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.security.PrivateKey;
import java.util.logging.Level;

/**
 * PAdES-LTV
 */
public class PadesLtvSigner extends BasePdfSigner {

    private final IExternalSignature externalSignature;

    private static final Logger LOGGER = Logger.getLogger(PadesLtvSigner.class.getName());

    public PadesLtvSigner(RubricaSigner signer) {
        this.externalSignature = new SignerAdapter(signer);
    }

    public byte[] sign(InputStream inputStream, PrivateKey privateKey, Certificate[] certificates, Properties properties) throws IOException {
        try {
            // Firmar el documento
            byte[] hash = emptySignature(inputStream, certificates, properties, externalSignature.getDigestAlgorithmName());
            ByteArrayOutputStream documentoPorFirmar = getDocumentoPorFirmar();
            byte[] hashSigned = this.signed_hash(hash, privateKey, certificates);
            createSignature(hashSigned, documentoPorFirmar, getFieldName(), privateKey, certificates);
            return signLtv(getDocumentoFirmado().toByteArray());
        } catch (GeneralSecurityException e) {
            LOGGER.log(Level.SEVERE, "Error al firmar: {0}", e.getMessage());
            throw new RuntimeException(e);
        }
    }

    private byte[] signed_hash(byte[] hash, PrivateKey pk, Certificate[] chain) throws GeneralSecurityException {
        PrivateKeySignature signature = new PrivateKeySignature(pk, externalSignature.getDigestAlgorithmName(), null);
        BouncyCastleDigest digest = new BouncyCastleDigest();
        PdfPKCS7 sgn = new PdfPKCS7(null, chain, externalSignature.getDigestAlgorithmName(), null, digest, false);
        byte[] sh = sgn.getAuthenticatedAttributeBytes(hash, com.itextpdf.signatures.PdfSigner.CryptoStandard.CMS, null, null);
        byte[] extSignature = signature.sign(sh);
        sgn.setExternalSignatureValue(extSignature, null, signature.getSignatureAlgorithmName());
        // Create TSAClient with optional authentication
        PropertiesTsa propertiesTsa = new PropertiesTsa();
        ITSAClient tsaClient = new TSAClientBouncyCastle(propertiesTsa.getTsaUrl(), propertiesTsa.getTsaUsername(), propertiesTsa.getTsaPassword());
        ///////////
        return sgn.getEncodedPKCS7(hash, com.itextpdf.signatures.PdfSigner.CryptoStandard.CMS, tsaClient, null, null);
    }

    private byte[] signLtv(byte[] signed) {
        ByteArrayInputStream bis = new ByteArrayInputStream(signed);

        ICrlClient crlClient = new CrlClientOnline();
        OCSPVerifier ocspVerifier = new OCSPVerifier(null, null);
        IOcspClient ocspClient = new OcspClientBouncyCastle(ocspVerifier);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        PropertiesTsa propertiesTsa = new PropertiesTsa();
        ITSAClient tsaClient = new TSAClientBouncyCastle(propertiesTsa.getTsaUrl(), propertiesTsa.getTsaUsername(), propertiesTsa.getTsaPassword());

        ltvEnable(bis, baos, getFieldName(), ocspClient, crlClient, tsaClient);
        return baos.toByteArray();
    }

    private void ltvEnable(ByteArrayInputStream signedPdfInput, ByteArrayOutputStream baos,
            String name, IOcspClient ocspClient, ICrlClient crlClient, ITSAClient tsc) {
        try (PdfReader pdfReader = new PdfReader(signedPdfInput)) {
            PdfDocument document = new PdfDocument(pdfReader, new PdfWriter(baos),
                    new StampingProperties().useAppendMode());

            LtvVerification ltvVerification = new LtvVerification(document, "BC");
            crlClient = null;
            ltvVerification.addVerification(name, ocspClient, crlClient, LtvVerification.CertificateOption.WHOLE_CHAIN,
                    LtvVerification.Level.OCSP, LtvVerification.CertificateInclusion.YES);

            ltvVerification.merge();
            document.close();
        } catch (IOException | GeneralSecurityException e) {
            LOGGER.severe("Error while making signature ltv enabled");
            throw new RuntimeException(e);
        }
    }
}
