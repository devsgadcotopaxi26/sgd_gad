/*
 * Copyright (C) 2025 
 * Authors: Misael Fernández
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
 *
 * Este software incluye componentes desarrollados por la Unión Europea
 * (eu.europa.ec.joinup.sd-dss) bajo la licencia EUPL 1.2.
 * 
 * Ir a https://interoperable-europe.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 * para el texto completo de la licencia.
 */
package ec.gob.firmadigital.libreria.sign.xades;

/**
 * Permite firmar y verificar documentos XML
 *
 * @author Misael Fernández
 */
import ec.gob.firmadigital.libreria.exceptions.CertificadoInvalidoException;
import ec.gob.firmadigital.libreria.sign.SignInfo;
import eu.europa.esig.dss.enumerations.DigestAlgorithm;
import eu.europa.esig.dss.enumerations.SignatureLevel;
import eu.europa.esig.dss.enumerations.SignaturePackaging;
import eu.europa.esig.dss.model.InMemoryDocument;
import eu.europa.esig.dss.model.SignatureValue;
import eu.europa.esig.dss.model.ToBeSigned;
import eu.europa.esig.dss.model.x509.CertificateToken;
import eu.europa.esig.dss.spi.DSSUtils;
import eu.europa.esig.dss.spi.signature.AdvancedSignature;
import eu.europa.esig.dss.spi.validation.CommonCertificateVerifier;
import eu.europa.esig.dss.token.DSSPrivateKeyEntry;
import eu.europa.esig.dss.token.Pkcs12SignatureToken;
import eu.europa.esig.dss.xades.XAdESSignatureParameters;
import eu.europa.esig.dss.xades.reference.CanonicalizationTransform;
import eu.europa.esig.dss.xades.reference.DSSReference;
import eu.europa.esig.dss.xades.reference.DSSTransform;
import eu.europa.esig.dss.xades.reference.EnvelopedSignatureTransform;
import eu.europa.esig.dss.xades.signature.XAdESService;
import eu.europa.esig.dss.model.DSSDocument;
import eu.europa.esig.dss.validation.SignedDocumentValidator;
import java.io.ByteArrayOutputStream;

import java.io.InputStream;
import java.security.KeyStore;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import javax.xml.crypto.dsig.CanonicalizationMethod;

public class XAdESSigner {

    public byte[] sign(byte[] data, KeyStore keyStore, char[] claveFirma) throws Exception {
        // Cargar el archivo XML de la factura
        DSSDocument facturaDocument = new InMemoryDocument(data);
        // Configurar el token de firma con el certificado (.p12)
        // Convertir KeyStore a bytes
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        keyStore.store(baos, claveFirma);
        byte[] keyStoreBytes = baos.toByteArray();
        // Crear el token de firma
        Pkcs12SignatureToken signingToken = new Pkcs12SignatureToken(keyStoreBytes, new KeyStore.PasswordProtection(claveFirma));
        DSSPrivateKeyEntry privateKey = signingToken.getKeys().get(0);
        // Configurar parámetros de firma XAdES según requisitos del SRI Ecuador
        XAdESSignatureParameters parameters = new XAdESSignatureParameters();
        parameters.setSignatureLevel(SignatureLevel.XAdES_BASELINE_B); // Nivel básico requerido por SRI
        parameters.setSignaturePackaging(SignaturePackaging.ENVELOPED); // Firma envolvente para XML
        parameters.setDigestAlgorithm(DigestAlgorithm.SHA256); // Algoritmo requerido por SRI
        // Configuración específica para Ecuador
        parameters.setSigningCertificate(privateKey.getCertificate());
        // Configurar referencia específica al nodo comprobante
        List<DSSReference> references = new ArrayList<>();
        DSSReference comprobanteReference = new DSSReference();
        comprobanteReference.setUri("#comprobante"); // Referencia al ID del nodo
        comprobanteReference.setContents(facturaDocument);
        comprobanteReference.setDigestMethodAlgorithm(parameters.getDigestAlgorithm());
        // Configuración de las transformaciones
        List<DSSTransform> transforms = new ArrayList<>();
        transforms.add(new EnvelopedSignatureTransform());
        transforms.add(new CanonicalizationTransform(CanonicalizationMethod.EXCLUSIVE));
        comprobanteReference.setTransforms(transforms);
        references.add(comprobanteReference);
        parameters.setReferences(references);
        // Configurar CommonCertificateVerifier
        CommonCertificateVerifier commonCertificateVerifier = new CommonCertificateVerifier();
        // Crear servicio XAdES
        XAdESService service = new XAdESService(commonCertificateVerifier);
        service.setTspSource(null); // No usar sellos de tiempo para facturas SRI
        // Obtener datos a firmar
        ToBeSigned dataToSign = service.getDataToSign(facturaDocument, parameters);
        // Firmar los datos
        SignatureValue signatureValue = signingToken.sign(dataToSign, parameters.getDigestAlgorithm(), privateKey);
        // Crear documento firmado
        DSSDocument signedDocument = service.signDocument(facturaDocument, parameters, signatureValue);
        // Retornar el documento firmado como byte array
        try (InputStream inputStream = signedDocument.openStream()) {
            return DSSUtils.toByteArray(inputStream);
        }
    }

    public List<SignInfo> getSignInfo(byte[] data) throws CertificadoInvalidoException {
        DSSDocument signedXml = new InMemoryDocument(data);
        // Validar documento
        SignedDocumentValidator validator = SignedDocumentValidator.fromDocument(signedXml);
        validator.setCertificateVerifier(new CommonCertificateVerifier());
        // Obtener firmas
        List<AdvancedSignature> signatures = validator.getSignatures();
        if (signatures.isEmpty()) {
            throw new IllegalArgumentException("El documento no contiene firmas digitales");
        }
        X509Certificate[] x509Certificates = null;
        Date signingTime = null;
        // Obtener cadena de certificados para esta firma
        for (AdvancedSignature signature : signatures) {
            signingTime = signature.getSigningTime();
            // Obtener el certificado firmante principal
            CertificateToken signingCert = signature.getSigningCertificateToken();
            if (signingCert == null) {
                throw new IllegalStateException("No se pudo obtener el certificado firmante");
            }
            // Obtener todos los certificados asociados a la firma
            List<CertificateToken> allCertificates = new ArrayList<>();
            allCertificates.add(signingCert);
            // Agregar certificados de la fuente de certificados si están disponibles
            if (signature.getCertificateSource() != null) {
                allCertificates.addAll(signature.getCertificateSource().getCertificates());
            }
            // Convertir a array de X509Certificate
            x509Certificates = new X509Certificate[allCertificates.size()];
            for (int i = 0; i < allCertificates.size(); i++) {
                x509Certificates[i] = allCertificates.get(i).getCertificate();
            }
        }
        List<SignInfo> signInfos = new ArrayList<>();
        SignInfo signInfo = new SignInfo(x509Certificates, signingTime);
        signInfos.add(signInfo);
        return signInfos;
    }
}
