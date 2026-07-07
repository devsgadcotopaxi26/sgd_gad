/*
 * Copyright (C) 2021 
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
package ec.gob.firmadigital.libreria.sign.pdf;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.util.Date;
import java.util.GregorianCalendar;
import java.util.Properties;
import java.util.logging.Logger;

import com.itextpdf.kernel.geom.Rectangle;
import com.itextpdf.kernel.pdf.PdfDictionary;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfName;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.StampingProperties;
import com.itextpdf.signatures.IExternalSignatureContainer;
import com.itextpdf.signatures.PdfSignatureAppearance;
import com.itextpdf.signatures.SignatureUtil;

import ec.gob.firmadigital.libreria.certificate.CertEcUtils;
import ec.gob.firmadigital.libreria.certificate.to.DatosUsuario;
import ec.gob.firmadigital.libreria.exceptions.EntidadCertificadoraNoValidaException;
import ec.gob.firmadigital.libreria.exceptions.InvalidFormatException;
import ec.gob.firmadigital.libreria.sign.SignInfo;
import ec.gob.firmadigital.libreria.sign.Signer;
import ec.gob.firmadigital.libreria.sign.pdf.appearance.CustomAppearance;
import ec.gob.firmadigital.libreria.sign.pdf.appearance.Information1Appearance;
import ec.gob.firmadigital.libreria.sign.pdf.appearance.Information2Appearance;
import ec.gob.firmadigital.libreria.sign.pdf.appearance.QrAppereance;
import ec.gob.firmadigital.libreria.utils.PropertiesUtils;
import ec.gob.firmadigital.libreria.utils.Utils;
import java.io.ByteArrayInputStream;
import java.security.GeneralSecurityException;
import java.security.PrivateKey;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;

public class BasePdfSigner implements Signer {

    private static final Logger LOGGER = Logger.getLogger(BasePdfSigner.class.getName());

    public static final String SIGNING_REASON = "signingReason";
    public static final String SIGNING_LOCATION = "signingLocation";
    public static final String SIGN_TIME = "signTime";
    public static final String SIGNATURE_PAGE = "signingPage";
    public static final String LAST_PAGE = "page";
    public static final String FONT_SIZE = "font";
    public static final String TYPE_SIG = "typeSignature";
    public static final String INFO_QR = "infoQR";

    private static String fieldName;
    private static ByteArrayOutputStream baos;
    private static ByteArrayOutputStream baosSign;

    public String getFieldName() {
        return fieldName;
    }

    public ByteArrayOutputStream getDocumentoPorFirmar() {
        return baos;
    }

    public ByteArrayOutputStream getDocumentoFirmado() {
        return baosSign;
    }

    /**
     * @param is
     * @param properties
     * @param algorithm
     * @param certChain
     * @return
     * @throws java.io.IOException
     */
    public byte[] emptySignature(InputStream is, Certificate[] certChain, Properties properties, String algorithm)
            throws IOException, com.itextpdf.kernel.exceptions.BadPasswordException {
        try (PdfReader pdfReader = new PdfReader(is) {
            @Override
            public boolean hasRebuiltXref() {
                return false;
            }
        }; ByteArrayOutputStream os = new ByteArrayOutputStream()) {
            baos = os;
            StampingProperties stampingProperties = new StampingProperties();
            //TODO Edison Lomas Almeida: La línea siguiente genera error PdfException: Append mode requires a document without errors, even if recovery is possible.
            stampingProperties.useAppendMode();
            com.itextpdf.signatures.PdfSigner pdfSigner = new com.itextpdf.signatures.PdfSigner(pdfReader, baos,
                    stampingProperties);
            X509Certificate x509Certificate = (X509Certificate) certChain[0];
            Properties extraParams = properties != null ? properties : new Properties();
            // Motivo de la firma
            String reason = extraParams.getProperty(SIGNING_REASON);
            // Lugar de realizacion de la firma
            String location = extraParams.getProperty(SIGNING_LOCATION);
            // Fecha y hora de la firma, en formato ISO-8601
            String signTime = extraParams.getProperty(SIGN_TIME);
            // Tamaño letra
            float fontSize = 3;
            try {
                if (extraParams.getProperty(FONT_SIZE) == null) {
                    fontSize = 3;
                } else {
                    fontSize = Float.parseFloat(extraParams.getProperty(FONT_SIZE).trim());
                }
            } catch (NumberFormatException e) {
                LOGGER.log(Level.WARNING, "Se ha indicado un tama\u00f1o de letra invalida (''{0}''), se usara el tama\u00f1o por defecto: {1} {2}", new Object[]{extraParams.getProperty(FONT_SIZE), fontSize, e});
            }
            // Tipo de firma (Información, QR)
            String typeSig = extraParams.getProperty(TYPE_SIG);
            if (typeSig != null && (typeSig.equals("QR") && extraParams.getProperty(FONT_SIZE) == null)) {
                fontSize = 4.5f;
            }
            String infoQR = "";
            if (extraParams.getProperty(INFO_QR) == null) {
                infoQR = "";
            } else {
                infoQR = extraParams.getProperty(INFO_QR, "").trim();
            }
            // Pagina donde situar la firma visible
            int page = 0;
            try {
                if (extraParams.getProperty(LAST_PAGE) == null) {
                    page = 0;
                } else {
                    page = Integer.parseInt(extraParams.getProperty(LAST_PAGE).trim());
                }
            } catch (NumberFormatException e) {
                LOGGER.log(Level.WARNING, "Se ha indicado un numero de pagina invalido (''{0}''), se usara la ultima pagina: {1}", new Object[]{extraParams.getProperty(LAST_PAGE), e});
            }
            if (page == 0 || page < 0 || page > pdfSigner.getDocument().getNumberOfPages()) {
                page = pdfSigner.getDocument().getNumberOfPages();
            }
            Rectangle signaturePositionOnPage = RectanguloUtil.getPositionOnPage(extraParams);
            if (typeSig != null) {
                PdfSignatureAppearance signatureAppearance = pdfSigner.getSignatureAppearance();
                signatureAppearance.setPageRect(signaturePositionOnPage).setPageNumber(page);

                if (signaturePositionOnPage != null) {
                    DatosUsuario datosUsuario = null;
                    try {
                        datosUsuario = CertEcUtils.getDatosUsuarios(x509Certificate);
                    } catch (EntidadCertificadoraNoValidaException ex) {
                        Logger.getLogger(BasePdfSigner.class.getName()).log(Level.SEVERE, null, ex);
                    }
                    String nombreFirmante = "";
                    if (datosUsuario.getCedula() != null) {
                        nombreFirmante = datosUsuario.getNombre() + " " + datosUsuario.getApellido();
                    } else { // sello electrónico y sellado de tiempo
                        nombreFirmante = nombreFirmante + datosUsuario.getRazonSocial();
                    }
                    nombreFirmante = nombreFirmante.toUpperCase();
                    String informacionCertificado = x509Certificate.getSubjectDN().getName();
                    PdfDocument pdfDocument = pdfSigner.getDocument();
                    CustomAppearance customAppearance;
                    switch (typeSig) {
                        case "QR" -> {
                            customAppearance = new QrAppereance(nombreFirmante, reason, location, signTime, infoQR);
                        }
                        case "information1" -> {
                            customAppearance = new Information1Appearance(nombreFirmante, reason, location, signTime);
                        }
                        case "information2" -> {
                            customAppearance = new Information2Appearance(nombreFirmante, informacionCertificado, reason,
                                    location, signTime);
                        }
                        default -> {
                            throw new RuntimeException("typeSign unknown");
                        }
                    }
                    customAppearance.createCustomAppearance(signatureAppearance, page, pdfDocument,
                            signaturePositionOnPage);
                }
                // Razon de firma
                if (reason != null) {
                    signatureAppearance.setReason(reason);
                }
                // Localización en donde se produce la firma
                if (location != null) {
                    signatureAppearance.setLocation(location);
                }
                signatureAppearance.setSignatureCreator(PropertiesUtils.getConfig().getProperty("version") + " (FirmaEC)");
                signatureAppearance.setCertificate(certChain[0]);
            }

            // Fecha y hora de la firma
            if (signTime != null) {
                Date date = Utils.getSignTime(signTime);
                GregorianCalendar calendar = new GregorianCalendar();
                calendar.setTime(date);
                pdfSigner.setSignDate(calendar);
            }

            byte[] hash = null;
            try {
                /*
             * ExternalBlankSignatureContainer constructor will create the PdfDictionary for
             * the signature information and will insert the /Filter and /SubFilter values
             * into this dictionary. It will leave just a blank placeholder for the
             * signature that is to be inserted later.
                 */
                PreSignatureContainer external = new PreSignatureContainer(PdfName.Adobe_PPKLite,
                        PdfName.Adbe_pkcs7_detached, algorithm);
                // Sign the document using an external container.
                // 8192 is the size of the empty signature placeholder.
                pdfSigner.signExternalContainer(external, 8192 * 2);
                hash = external.getHash();
            } catch (IOException | GeneralSecurityException e) {
                e.printStackTrace();
            }
            fieldName = pdfSigner.getFieldName();
            return hash;
        }
    }

    public void createSignature(byte[] hashSigned, ByteArrayOutputStream baos, String fieldName, PrivateKey pk, Certificate[] chain)
            throws IOException, GeneralSecurityException {
        try (InputStream is = new ByteArrayInputStream(baos.toByteArray()); PdfReader reader = new PdfReader(is)) {
            baosSign = new ByteArrayOutputStream();
            com.itextpdf.signatures.PdfSigner signer = new com.itextpdf.signatures.PdfSigner(reader, baosSign, new StampingProperties());
            IExternalSignatureContainer external = new MyExternalSignatureContainer(hashSigned, pk, chain);
            // Signs a PDF where space was already reserved. The field must cover the whole
            // document.
            com.itextpdf.signatures.PdfSigner.signDeferred(signer.getDocument(), fieldName, baosSign, external);
        }
    }

    class MyExternalSignatureContainer implements IExternalSignatureContainer {

        protected byte[] hashSigned;
        protected PrivateKey pk;
        protected Certificate[] chain;

        public MyExternalSignatureContainer(byte[] hashSigned, PrivateKey pk, Certificate[] chain) {
            this.hashSigned = hashSigned;
            this.pk = pk;
            this.chain = chain;
        }

        @Override
        public byte[] sign(InputStream is) throws GeneralSecurityException {
            return hashSigned;
        }

        @Override
        public void modifySigningDictionary(PdfDictionary signDic) {
        }
    }

    @Override
    public List<SignInfo> getSigners(byte[] sign) throws InvalidFormatException, IOException {
        PdfReader pdfReader;
        try {
            try (InputStream is = new ByteArrayInputStream(sign);) {
                pdfReader = new PdfReader(is);
            }
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "No se ha podido leer el PDF: {0}", e);
            throw new InvalidFormatException("No se ha podido leer el PDF", e);
        }
        SignatureUtil signatureUtil;
        try {
            PdfDocument pdfDocument = new PdfDocument(pdfReader);
            signatureUtil = new com.itextpdf.signatures.SignatureUtil(pdfDocument);
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "No se ha podido obtener la informacion de los firmantes del PDF, se devolvera un arbol vacio: {0}", e);
            throw new InvalidFormatException("No se ha podido obtener la informacion de los firmantes del PDF", e);
        }

        @SuppressWarnings("unchecked")
        List<String> names = signatureUtil.getSignatureNames();
        List<SignInfo> signInfos = new ArrayList<>();
        for (String signatureName : names) {
            com.itextpdf.signatures.PdfPKCS7 pdfPKCS7;
            try {
                pdfPKCS7 = signatureUtil.readSignatureData(signatureName);
            } catch (Exception e) {
                e.printStackTrace();
                LOGGER.log(Level.SEVERE, "El PDF contiene una firma corrupta o con un formato desconocido ({0}), se continua con las siguientes si las hubiese: {1}", new Object[]{signatureName, e});
                continue;
            }
            Certificate[] signCertificateChain = pdfPKCS7.getSignCertificateChain();
            X509Certificate[] certChain = new X509Certificate[signCertificateChain.length];
            for (int i = 0; i < certChain.length; i++) {
                certChain[i] = (X509Certificate) signCertificateChain[i];
            }
            SignInfo signInfo = new SignInfo(certChain, pdfPKCS7.getSignDate().getTime());
            signInfos.add(signInfo);
        }
        return signInfos;
    }
}
