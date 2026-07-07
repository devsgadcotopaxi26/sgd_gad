/*
 * Copyright (C) 2026
 * Authors: Misael Fernández, DARKCAM S.A.
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
package ec.gob.firmadigital.libreria.certificate.ec.darkcam;

import ec.gob.firmadigital.libreria.certificate.ec.darkcam.subj.*;
import ec.gob.firmadigital.libreria.certificate.ec.darkcam.cert.*;
import ec.gob.firmadigital.libreria.certificate.ec.subj.CertificadoSubjImpl;
import static ec.gob.firmadigital.libreria.certificate.ec.darkcam.CertificadoDarkcam.*;
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
 * @author Misael Fernández, DARKCAM S.A.
 */
public class CertificadoDataFactoryDarkcam {

    public static X509Certificate getRootCertificate(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        try {
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCaShortCertDarkcam20262036())) {
                System.out.println("DarkcamSubCaShortCert2026-2036");
                return new SubCaShortCertDarkcam20262036();
            }
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCaCertDarkcam20262036())) {
                System.out.println("DarkcamSubCaCert2026-2036");
                return new SubCaCertDarkcam20262036();
            }
        } catch (java.security.InvalidKeyException ex) {
            throw new EntidadCertificadoraNoValidaException("Certificado de DARKCAM S.A. sin categorizar!");
        }
        return null;
    }

    public static DatosUsuario getDatosUsuarioDarkcam(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        DatosUsuario datosUsuario = null;
        Certificado certificadoDarkcam = construir(certificado);
        if (certificadoDarkcam != null) {
            datosUsuario = new DatosUsuario();
            //RESOLUCION-ARCOTEL-2024-0176
            if (certificadoDarkcam instanceof CertificadoSubjImpl) {
                if (certificadoDarkcam instanceof CertificadoPersonaNatural certificadoPersonaNatural) {
                    datosUsuario.setTipoCertificado("Persona Natural");
                    datosUsuario.setCedula(certificadoPersonaNatural.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoPersonaNatural.getNombres());
                    datosUsuario.setApellido(certificadoPersonaNatural.getPrimerApellido());
                }
                if (certificadoDarkcam instanceof CertificadoMiembroEmpresa certificadoMiembroEmpresa) {
                    datosUsuario.setTipoCertificado("Miembro Empresa");
                    datosUsuario.setRuc(certificadoMiembroEmpresa.getRuc());
                    datosUsuario.setRazonSocial(certificadoMiembroEmpresa.getRazonSocial());
                    datosUsuario.setCargo(certificadoMiembroEmpresa.getCargo());
                }
                if (certificadoDarkcam instanceof CertificadoRepresentanteLegal certificadoRepresentanteLegal) {
                    datosUsuario.setTipoCertificado("Representante Legal");
                    datosUsuario.setRuc(certificadoRepresentanteLegal.getRuc());
                    datosUsuario.setRazonSocial(certificadoRepresentanteLegal.getRazonSocial());
                    datosUsuario.setCargo(certificadoRepresentanteLegal.getCargo());
                }
                if (certificadoDarkcam instanceof CertificadoSelloElectronico certificadoSelloElectronico) {
                    datosUsuario.setTipoCertificado("Sellado Electrónico");
                    datosUsuario.setCommonName(certificadoSelloElectronico.getCommonName());
                    datosUsuario.setRuc(certificadoSelloElectronico.getRuc());
                    datosUsuario.setRazonSocial(certificadoSelloElectronico.getRazonSocial());
                }
            }
            datosUsuario.setCertificadoDigitalValido(true);
        }
        return datosUsuario;
    }

    private static Certificado construir(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        // Persona Natural (con o sin RUC - se diferencian por presencia del campo Organization Identifier 2.5.4.97)
        if (certificateHasPolicy(certificado, Subj.OID_TIPO_PERSONA_NATURAL)) {
            return new CertificadoSubjPersonaNaturalDarkcam(certificado);
        } // Miembro de Empresa
        else if (certificateHasPolicy(certificado, Subj.OID_TIPO_MIEMBRO_EMPRESA)) {
            return new CertificadoSubjMiembroEmpresaDarkcam(certificado);
        } // Representante Legal
        else if (certificateHasPolicy(certificado, Subj.OID_TIPO_REPRESENTANTE_LEGAL)) {
            return new CertificadoSubjRepresentanteLegalDarkcam(certificado);
        } // Sello Electrónico
        else if (certificateHasPolicy(certificado, Subj.OID_TIPO_SELLO_ELECTRONICO)) {
            return new CertificadoSubjSelloElectronicoDarkcam(certificado);
        }
        return null;
    }
}
