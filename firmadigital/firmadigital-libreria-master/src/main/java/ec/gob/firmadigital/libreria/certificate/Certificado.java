/*
 * Copyright (C) 2026
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
 */
package ec.gob.firmadigital.libreria.certificate;

import java.io.IOException;
import java.security.cert.CertificateEncodingException;
import java.security.cert.X509Certificate;

import org.bouncycastle.asn1.ASN1ObjectIdentifier;
import org.bouncycastle.asn1.x500.X500Name;
import org.bouncycastle.cert.jcajce.JcaX509CertificateHolder;

/**
 * Clase generica que representa un certificado
 *
 * @author Misael Fernández
 */
public abstract class Certificado {

    private final X509Certificate certificado;
    private X500Name subjectName;

    public Certificado(X509Certificate certificado) {
        this.certificado = certificado;
    }

    protected void cargarSubjectName() {
        try {
            this.subjectName = new JcaX509CertificateHolder(this.certificado).getSubject();
        } catch (CertificateEncodingException e) {
            throw new RuntimeException(e);
        }

    }

    /**
     * Retorna el valor de la extension, y una cadena vacia si no existe.
     *
     * @param oid
     * @return
     */
    protected String getExtensionField(String oid) {
        try {
            String valor = CertUtils.getExtensionValue(certificado, oid);
            return (valor != null) ? valor : "";
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
    
    /**
     * Retorna el valor de subject alternative name, y una cadena vacia si no existe.
     *
     * @param oid
     * @return
     */
    protected String getSubjectAlternativeName(String oid) {
        try {
            String valor = CertUtils.getExtensionValueSubjectAlternativeNames(certificado, oid);
            return (valor != null) ? valor : "";
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    /**
     * Obtiene el valor de un campo específico del Subject del certificado.
     * <p>
     * Este método busca un campo dentro del nombre del sujeto (subjectName)
     * utilizando su Identificador de Objeto (OID). Para garantizar la seguridad
     * y evitar errores de {@code NullPointerException}, si el campo no se
     * encuentra, devuelve una cadena vacía en lugar de {@code null}.
     *
     * @param oid El Identificador de Objeto (OID) en formato String del campo
     * que se desea extraer (ej. "2.5.4.6" para el codigo del Pais.
     * @return El valor del campo solicitado como un {@code String}. Retorna una
     * cadena vacía ("") si el campo no se encuentra.
     */
    protected String getSubjectField(String oid) {
        ASN1ObjectIdentifier Asn1OID = new ASN1ObjectIdentifier(oid);
        String fieldValue = CertUtils.getSubjectFieldByOID(this.subjectName, Asn1OID);
        return (fieldValue != null) ? fieldValue : "";
    }
}
