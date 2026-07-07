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
package ec.gob.firmadigital.libreria.certificate;

import ec.gob.firmadigital.libreria.exceptions.CertificadoInvalidoException;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.security.KeyStore;
import java.security.KeyStoreException;
import java.security.cert.CertificateParsingException;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;

import javax.swing.JOptionPane;

import org.bouncycastle.asn1.ASN1Encodable;
import org.bouncycastle.asn1.ASN1InputStream;
import org.bouncycastle.asn1.ASN1ObjectIdentifier;
import org.bouncycastle.asn1.ASN1Primitive;
import org.bouncycastle.asn1.ASN1Sequence;
import org.bouncycastle.asn1.ASN1String;
import org.bouncycastle.asn1.DEROctetString;
import org.bouncycastle.asn1.DERTaggedObject;
import org.bouncycastle.asn1.DLTaggedObject;

import ec.gob.firmadigital.libreria.exceptions.RubricaException;
import ec.gob.firmadigital.libreria.keystore.Alias;
import ec.gob.firmadigital.libreria.keystore.KeyStoreUtilities;
import java.util.Set;
import javax.swing.JRootPane;
import org.bouncycastle.asn1.ASN1OctetString;
import org.bouncycastle.asn1.x500.AttributeTypeAndValue;
import org.bouncycastle.asn1.x500.RDN;
import org.bouncycastle.asn1.x500.X500Name;
import org.bouncycastle.asn1.x500.style.IETFUtils;

/**
 * Utilidades para trabajar con Certificados.
 *
 * @author Ricardo Arguello
 */
public class CertUtils {

    public static String getExtensionValueSubjectAlternativeNames(X509Certificate certificate, String oid)
            throws IOException {
        return getSubjectAlternativeName(certificate, oid);
    }

    public static String getSubjectAlternativeName(X509Certificate certificate, String oid) {
        String decoded = null;
        try {
            Collection<List<?>> altNames = certificate.getSubjectAlternativeNames();
            if (altNames == null) {
                return decoded;
            }
            for (List<?> item : altNames) {
                Integer type = (Integer) item.get(0);
                if (type == 0) {
                    // Type OtherName found so return the associated value
                    try {
                        // Value is encoded using ASN.1 so decode it to get the
                        // server's identity
                        ASN1InputStream decoder = new ASN1InputStream((byte[]) item.get(1));
                        Object object = decoder.readObject();
                        ASN1Sequence otherNameSeq = null;
                        if (object != null && object instanceof ASN1Sequence) {
                            otherNameSeq = (ASN1Sequence) object;
                            // Check the object identifier
                            ASN1ObjectIdentifier objectId = (ASN1ObjectIdentifier) otherNameSeq.getObjectAt(0);
                            if (objectId.toString().equals(oid)) {
                                ASN1Encodable objectDetail = ((ASN1Encodable) otherNameSeq.getObjectAt(1));
                                decoded = objectDetail.toASN1Primitive().toString();
                                decoded = decoded.replace("[0]", "")
                                        .replace("[CONTEXT 0]", "");
                                break;
                            }
                        }
                        if (object != null && object instanceof DLTaggedObject) {
                            DLTaggedObject dlTaggedObject = (DLTaggedObject) object;
                            Object obj = dlTaggedObject.getBaseObject();
                            if (obj != null && obj instanceof ASN1Sequence) {
                                otherNameSeq = (ASN1Sequence) obj;
                                // Check the object identifier
                                ASN1ObjectIdentifier objectId = (ASN1ObjectIdentifier) otherNameSeq.getObjectAt(0);
                                if (objectId.toString().equals(oid)) {
                                    DLTaggedObject objectDetail = ((DLTaggedObject) otherNameSeq.getObjectAt(1));
                                    decoded = objectDetail.getBaseObject().toASN1Primitive().toString();
                                    break;
                                }
                            }
                        }
                        if (object != null && object instanceof DERTaggedObject) {
                            DERTaggedObject derTaggedObject = (DERTaggedObject) object;
                            Object obj = derTaggedObject.getBaseObject();
                            if (obj != null && obj instanceof ASN1Sequence) {
                                otherNameSeq = (ASN1Sequence) obj;
                                // Check the object identifier
                                ASN1ObjectIdentifier objectId = (ASN1ObjectIdentifier) otherNameSeq.getObjectAt(0);
                                if (objectId.toString().equals(oid)) {
                                    DERTaggedObject objectDetail = ((DERTaggedObject) otherNameSeq.getObjectAt(1));
                                    decoded = objectDetail.getBaseObject().toASN1Primitive().toString();
                                    break;
                                }
                            }
                        }
                    } catch (UnsupportedEncodingException e) {
                        throw new RuntimeException(e);
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }
                }
            }
        } catch (CertificateParsingException e) {
            System.out.println("Error parsing SubjectAltName in certificate: " + certificate + "\r\nerror:"
                    + e.getLocalizedMessage());
        }

        return decoded;
    }

    public static List<String> getExtensionOIDs(X509Certificate certificate) {
        List<String> oids = new ArrayList<>();
        try {
            Set<String> criticalOIDs = certificate.getCriticalExtensionOIDs();
            Set<String> nonCriticalOIDs = certificate.getNonCriticalExtensionOIDs();

            if (criticalOIDs != null) {
                oids.addAll(criticalOIDs);
            }
            if (nonCriticalOIDs != null) {
                oids.addAll(nonCriticalOIDs);
            }
        } catch (Exception e) {
            // Manejar excepción
        }
        return oids;
    }

    public static boolean hasExtensionMatchingPattern(X509Certificate certificate,
            String prefix,
            String suffix) {
        List<String> extensionOIDs = getExtensionOIDs(certificate);

        for (String oid : extensionOIDs) {
            if (oid.startsWith(prefix) && oid.endsWith(suffix)) {
                return true;
            }
        }
        return false;
    }

    public static String getExtensionValue(X509Certificate certificate, String oid) throws IOException {
        String decoded = null;
        byte[] extensionValue = certificate.getExtensionValue(oid);

        if (extensionValue != null) {
            ASN1Primitive derObject = toDERObject(extensionValue);
            if (derObject instanceof DEROctetString) {
                DEROctetString derOctetString = (DEROctetString) derObject;
                derObject = toDERObject(derOctetString.getOctets());
                if (derObject instanceof ASN1String) {
                    ASN1String s = (ASN1String) derObject;
                    decoded = s.getString();
                }
            }
        }
        return decoded;
    }

    //Se debe implementar esta solución para todas las entidades de certificación, primero deben probar
    public static List<String> getCertificatePolicies(X509Certificate certificate) {
        List<String> policyOIDs = new ArrayList<>();
        try {
            byte[] extensionValue = certificate.getExtensionValue("2.5.29.32");
            if (extensionValue == null) {
                return policyOIDs;
            }

            // Decodificar la estructura ASN.1
            ASN1InputStream asn1Stream = null;
            try {
                // El valor viene envuelto en un OctetString
                ASN1Primitive wrapped = ASN1Primitive.fromByteArray(extensionValue);
                if (wrapped instanceof ASN1OctetString) {
                    ASN1OctetString octetString = (ASN1OctetString) wrapped;
                    ASN1Primitive policies = ASN1Primitive.fromByteArray(octetString.getOctets());

                    if (policies instanceof ASN1Sequence) {
                        ASN1Sequence seq = (ASN1Sequence) policies;
                        for (int i = 0; i < seq.size(); i++) {
                            ASN1Sequence policySeq = (ASN1Sequence) seq.getObjectAt(i);
                            // El primer elemento es el PolicyIdentifier (OID)
                            if (policySeq.size() > 0) {
                                ASN1ObjectIdentifier oid = ASN1ObjectIdentifier.getInstance(policySeq.getObjectAt(0));
                                policyOIDs.add(oid.getId());
                            }
                        }
                    }
                }
            } finally {
                if (asn1Stream != null) {
                    asn1Stream.close();
                }
            }
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
        }
        return policyOIDs;
    }

    public static boolean hasCertificatePoliciesMatchingPattern(X509Certificate certificate,
            String prefix,
            String suffix) {
        List<String> CertificatePoliciesOIDs = getCertificatePolicies(certificate);

        for (String oid : CertificatePoliciesOIDs) {
            if (oid.startsWith(prefix) && oid.endsWith(suffix)) {
                return true;
            }
        }
        return false;
    }

    private static ASN1Primitive toDERObject(byte[] data) throws IOException {
        ByteArrayInputStream inStream = new ByteArrayInputStream(data);
        ASN1InputStream asnInputStream = null;

        try {
            asnInputStream = new ASN1InputStream(inStream);
            return asnInputStream.readObject();
        } finally {
            if (asnInputStream != null) {
                try {
                    asnInputStream.close();
                } catch (IOException ignore) {
                }
            }
        }
    }

    // debug
    public static List<String> getSubjectAlternativeNames(X509Certificate certificate) {
        List<String> identities = new ArrayList<String>();
        try {
            Collection<List<?>> altNames = certificate.getSubjectAlternativeNames();
            if (altNames == null) {
                return Collections.emptyList();
            }
            for (List<?> item : altNames) {
                Integer type = (Integer) item.get(0);
                if (type == 0) {
                    // Type OtherName found so return the associated value
                    try {
                        // Value is encoded using ASN.1 so decode it to get the
                        // server's identity
                        ASN1InputStream decoder = new ASN1InputStream((byte[]) item.get(1));
                        Object object = decoder.readObject();
                        ASN1Sequence otherNameSeq = null;
                        if (object != null && object instanceof ASN1Sequence) {
                            otherNameSeq = (ASN1Sequence) object;
                        } else {
                            continue;
                        }
                        // Check the object identifier
                        ASN1ObjectIdentifier objectId = (ASN1ObjectIdentifier) otherNameSeq.getObjectAt(0);
                        System.out.println("Parsing otherName for subject alternative names: " + objectId.toString());
                        DERTaggedObject objectDetail = ((DERTaggedObject) otherNameSeq.getObjectAt(1));
                        System.out.println("Parsing otherName for subject alternative names: "
                                + objectDetail.getBaseObject().toASN1Primitive().toString());

                        ASN1Primitive derObject = toDERObject(objectDetail.getBaseObject().getEncoded());
                        if (derObject instanceof DEROctetString) {
                            DEROctetString derOctetString = (DEROctetString) derObject;
                            derObject = toDERObject(derOctetString.getOctets());
                            if (derObject instanceof ASN1String) {
                                ASN1String s = (ASN1String) derObject;
                                // decoded = s.getString();
                                System.out.println(s.getString());
                            }
                        }

                        String identity = objectId.toString();
                        identities.add(identity);
                    } catch (UnsupportedEncodingException e) {
                        System.out.println("Error decoding subjectAltName" + e.getLocalizedMessage());
                    } catch (Exception e) {
                        System.out.println("Error decoding subjectAltName" + e.getLocalizedMessage());
                    }
                }
            }
        } catch (CertificateParsingException e) {
            System.out.println("Error parsing SubjectAltName in certificate: " + certificate + "\r\nerror:"
                    + e.getLocalizedMessage());
        }
        return identities;
    }

    public static String seleccionarAlias(KeyStore keyStore, JRootPane jRootPane) throws CertificadoInvalidoException {
        String aliasString = null;
        // Con que certificado firmar?
        List<Alias> signingAliases = KeyStoreUtilities.getSigningAliases(keyStore);

        if (signingAliases.isEmpty()) {
            throw new CertificadoInvalidoException("No se encuentran certificados para firmar\nPuede estar expirado, revocado o no reconocido");
        }

        if (signingAliases.size() == 1) {
            aliasString = signingAliases.get(0).getAlias();
        } else {
            Alias alias = (Alias) JOptionPane.showInputDialog(jRootPane == null ? null : jRootPane, "Escoja...", "Certificado para firmar",
                    JOptionPane.QUESTION_MESSAGE, null, signingAliases.toArray(), signingAliases.get(0));
            if (alias != null) {
                aliasString = alias.getAlias();
            }
        }
        return aliasString;
    }

    public static X509Certificate getCert(KeyStore ks, String alias) throws KeyStoreException, RubricaException {
        if (alias != null) {
            X509Certificate cert = (X509Certificate) ks.getCertificate(alias);
            return cert;
        } else {
            return null;
        }
    }

    /**
     * Método auxiliar para extraer un campo específico del "Subject" de un
     * certificado. Este método es capaz de encontrar campos por su OID y
     * decodificar correctamente valores que estén en formato hexadecimal (ej:
     * #1305...).
     *
     * @param subjectName El objeto X500Name ya parseado, que representa el
     * "Subject" del certificado (X500Name subjectName = new
     * JcaX509CertificateHolder(cert).getSubject()).
     * @param oid El identificador de objeto (OID) del campo que se desea
     * extraer (ej: OID_APELLIDOS para apellidos).
     * @return El valor del campo como String (ya decodificado), o null si el
     * campo no se encuentra en el certificado.
     */
    public static String getSubjectFieldByOID(X500Name subjectName, ASN1ObjectIdentifier oid) {
        // Busca y obtiene todos los Nombres Distinguidos Relativos (RDNs) que coinciden con el OID proporcionado.
        // Un RDN es un componente del "Subject", como "CN=Juan Perez".
        RDN[] rdns = subjectName.getRDNs(oid);

        // Verifica si se encontró el campo. Si el array es nulo o está vacío, significa que el certificado
        // no contiene ese campo, por lo que retornamos null.
        if (rdns == null || rdns.length == 0) {
            return null;
        }
        // Un certificado podría, teóricamente, tener múltiples valores para el mismo campo.
        // En la práctica, para estos campos estándar, solo habrá uno. Tomamos el primero de la lista.
        AttributeTypeAndValue attribute = rdns[0].getFirst();

        // La utilidad IETFUtils de Bouncy Castle se encarga de convertir el valor del atributo a un String legible.
        // Esta es la parte clave, ya que decodifica automáticamente los valores hexadecimales a texto.
        return IETFUtils.valueToString(attribute.getValue());
    }
}
