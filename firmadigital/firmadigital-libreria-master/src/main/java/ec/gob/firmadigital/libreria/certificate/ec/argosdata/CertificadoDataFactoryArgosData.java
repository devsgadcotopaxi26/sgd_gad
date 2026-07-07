/*
 * Copyright (C) 2026
 * Authors: Misael Fernández, ARGOSDATA CERTIFICACIÓN DE INFORMACIÓN Y SERVICIOS RELACIONADOS S.A.S.
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
package ec.gob.firmadigital.libreria.certificate.ec.argosdata;

import ec.gob.firmadigital.libreria.certificate.ec.argosdata.ext.*;
import ec.gob.firmadigital.libreria.certificate.ec.argosdata.subj.*;
import ec.gob.firmadigital.libreria.certificate.ec.argosdata.cert.*;
import ec.gob.firmadigital.libreria.certificate.ec.subj.CertificadoSubjImpl;
import static ec.gob.firmadigital.libreria.certificate.ec.argosdata.CertificadoArgosData.*;
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
 * @author Misael Fernández, ARGOSDATA CERTIFICACIÓN DE INFORMACIÓN Y SERVICIOS
 * RELACIONADOS S.A.S.
 */
public class CertificadoDataFactoryArgosData {

    public static X509Certificate getRootCertificate(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        try {
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCaCertArgosData20242032())) {
                System.out.println("SubCA ArgosData 2024-2032");
                return new SubCaCertArgosData20242032();
            }
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCaCertArgosData20262036())) {
                System.out.println("SubCA ArgosData 2026-2036");
                return new SubCaCertArgosData20262036();
            }
        } catch (java.security.InvalidKeyException ex) {
            throw new EntidadCertificadoraNoValidaException("Certificado de ARGOSDATA CERTIFICACIÓN DE INFORMACIÓN Y SERVICIOS RELACIONADOS S.A.S. sin categorizar!");
        }
        return null;
    }

    public static DatosUsuario getDatosUsuarioArgosData(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        DatosUsuario datosUsuario = null;
        Certificado certificadoArgosData = construir(certificado);
        if (certificadoArgosData != null) {
            datosUsuario = new DatosUsuario();
            if (certificadoArgosData instanceof CertificadoExtImplArgosData) {
                if (certificadoArgosData instanceof CertificadoExtPersonaNaturalArgosData certificadoPersonaNatural) {
                    datosUsuario.setTipoCertificado("Persona Natural (EXT)");
                    datosUsuario.setCedula(certificadoPersonaNatural.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoPersonaNatural.getNombres());
                    datosUsuario.setApellido(certificadoPersonaNatural.getPrimerApellido() + " "
                            + certificadoPersonaNatural.getSegundoApellido());
                }
                if (certificadoArgosData instanceof CertificadoExtRepresentanteLegalArgosData certificadoRepresentanteLegal) {
                    datosUsuario.setTipoCertificado("Representante Legal (EXT)");
                    datosUsuario.setCedula(certificadoRepresentanteLegal.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoRepresentanteLegal.getNombres());
                    datosUsuario.setApellido(certificadoRepresentanteLegal.getPrimerApellido() + " "
                            + certificadoRepresentanteLegal.getSegundoApellido());
                    datosUsuario.setRuc(certificadoRepresentanteLegal.getRuc());
                    datosUsuario.setRazonSocial(certificadoRepresentanteLegal.getRazonSocial());
                    datosUsuario.setCargo(certificadoRepresentanteLegal.getCargo());
                }
            }
//            //RESOLUCION-ARCOTEL-2024-0176
//            if (certificadoArgosData instanceof CertificadoSubjImpl) {
//                if (certificadoArgosData instanceof CertificadoPersonaNatural certificadoPersonaNatural) {
//                    datosUsuario.setTipoCertificado("Persona Natural");
//                    datosUsuario.setCedula(certificadoPersonaNatural.getCedulaPasaporte());
//                    datosUsuario.setNombre(certificadoPersonaNatural.getNombres());
//                    datosUsuario.setApellido(certificadoPersonaNatural.getPrimerApellido());
//                }
//                if (certificadoArgosData instanceof CertificadoRepresentanteLegal certificadoRepresentanteLegal) {
//                    datosUsuario.setTipoCertificado("Representante Legal");
//                    datosUsuario.setRuc(certificadoRepresentanteLegal.getRuc());
//                    datosUsuario.setRazonSocial(certificadoRepresentanteLegal.getRazonSocial());
//                    datosUsuario.setCargo(certificadoRepresentanteLegal.getCargo());
//                }
//            }
            datosUsuario.setCertificadoDigitalValido(true);
        }
        return datosUsuario;
    }

    private static Certificado construir(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        if (ec.gob.firmadigital.libreria.certificate.CertUtils.hasExtensionMatchingPattern(certificado, "1.3.6.1.4.1", "3.1")) {
            if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_NATURAL)) {
                return new CertificadoExtPersonaNaturalArgosData(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_REPRESENTANTE_LEGAL)) {
                return new CertificadoExtRepresentanteLegalArgosData(certificado);
            }
//        } else {//RESOLUCION-ARCOTEL-2024-0176
//            if (certificateHasPolicy(certificado, Subj.OID_TIPO_PERSONA_NATURAL)) {
//                return new CertificadoSubjPersonaNaturalArgosData(certificado);
//            } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_REPRESENTANTE_LEGAL)) {
//                return new CertificadoSubjRepresentanteLegalArgosData(certificado);
//            }
        }
        return null;
    }
}
