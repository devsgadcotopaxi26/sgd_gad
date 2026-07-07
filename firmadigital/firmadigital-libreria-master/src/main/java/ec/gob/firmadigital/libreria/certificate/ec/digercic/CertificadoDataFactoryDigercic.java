/*
 * Copyright (C) 2026 
 * Authors: Misael Fernández, DIRECCIÓN GENERAL DE REGISTRO CIVIL, IDENTIFICACIÓN Y CEDULACIÓN
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
package ec.gob.firmadigital.libreria.certificate.ec.digercic;

import ec.gob.firmadigital.libreria.certificate.ec.digercic.ext.*;
//import ec.gob.firmadigital.libreria.certificate.ec.digercic.subj.*;
import ec.gob.firmadigital.libreria.certificate.ec.digercic.cert.*;
import ec.gob.firmadigital.libreria.certificate.ec.subj.CertificadoSubjImpl;
import static ec.gob.firmadigital.libreria.certificate.ec.digercic.CertificadoDigercic.*;
import ec.gob.firmadigital.libreria.certificate.ec.*;
import ec.gob.firmadigital.libreria.certificate.Certificado;
import ec.gob.firmadigital.libreria.certificate.to.DatosUsuario;
import ec.gob.firmadigital.libreria.exceptions.EntidadCertificadoraNoValidaException;
import java.security.cert.X509Certificate;
import static ec.gob.firmadigital.libreria.utils.BouncyCastleUtils.certificateHasPolicy;

/**
 * Permite construir certificados tipo Certificado de la entidad de
 * certificación a partir de certificados X509Certificate.
 *
 * @author Misael Fernández, DIRECCIÓN GENERAL DE REGISTRO CIVIL, IDENTIFICACIÓN
 * Y CEDULACIÓN
 */
public class CertificadoDataFactoryDigercic {

    public static X509Certificate getRootCertificate(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        try {
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCaCertDigercic20212031())) {
                System.out.println("SubCA Digercic");
                return new SubCaCertDigercic20212031();
            }
        } catch (java.security.InvalidKeyException ex) {
            throw new EntidadCertificadoraNoValidaException("Certificado de DIRECCIÓN GENERAL DE REGISTRO CIVIL, IDENTIFICACIÓN sin categorizar!");
        }
        return null;
    }

    public static DatosUsuario getDatosUsuarioDatil(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        DatosUsuario datosUsuario = null;
        Certificado certificadoDigercic = construir(certificado);
        if (certificadoDigercic != null) {
            datosUsuario = new DatosUsuario();
            if (certificadoDigercic instanceof CertificadoExtImplDigercic) {
                if (certificadoDigercic instanceof CertificadoExtPersonaNaturalDigercic certificadoExtPersonaNaturalDigercic) {
                    datosUsuario.setTipoCertificado("Persona Natural (EXT)");
                    datosUsuario.setCedula(certificadoExtPersonaNaturalDigercic.getCedulaPasaporte());
                    datosUsuario.setNombre(ec.gob.firmadigital.libreria.utils.Utils.getCN(certificado));
                    datosUsuario.setApellido("");
                }
            }
            //RESOLUCION-ARCOTEL-2024-0176
//            if (certificadoAlphaTechnologies instanceof CertificadoSubjImpl) {
//                if (certificadoAlphaTechnologies instanceof CertificadoPersonaNatural certificadoPersonaNatural) {
//                    datosUsuario.setCedula(certificadoPersonaNatural.getCedulaPasaporte());
//                    datosUsuario.setNombre(certificadoPersonaNatural.getNombres());
//                    datosUsuario.setApellido(certificadoPersonaNatural.getPrimerApellido());
//                }
//            }
            datosUsuario.setCertificadoDigitalValido(true);
        }
        return datosUsuario;
    }

    private static Certificado construir(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        if (ec.gob.firmadigital.libreria.certificate.CertUtils.hasExtensionMatchingPattern(certificado, "1.3.6.1.4.1", "3.1")) {
            if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_NATURAL)) {
                return new CertificadoExtPersonaNaturalDigercic(certificado);
            } else {
                throw new EntidadCertificadoraNoValidaException("Certificado de DIRECCIÓN GENERAL DE REGISTRO CIVIL, IDENTIFICACIÓN sin categorizar!");
            }
//        } else {//RESOLUCION-ARCOTEL-2024-0176
//            if (certificateHasPolicy(certificado, Subj.OID_TIPO_PERSONA_NATURAL)) {
//                return new CertificadoSubjPersonaNaturalAlphaTechnologies(certificado);
        }
        return null;
    }
}
