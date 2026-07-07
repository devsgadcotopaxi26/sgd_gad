/*
 * Copyright (C) 2026
 * Authors: Misael Fernández, APPFIRMAS S.A.
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
package ec.gob.firmadigital.libreria.certificate.ec.appfirmas;

import ec.gob.firmadigital.libreria.certificate.ec.appfirmas.subj.*;
import ec.gob.firmadigital.libreria.certificate.ec.appfirmas.cert.*;
import ec.gob.firmadigital.libreria.certificate.ec.subj.CertificadoSubjImpl;
import static ec.gob.firmadigital.libreria.certificate.ec.appfirmas.CertificadoAppFirmas.*;
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
 * @author Misael Fernández, APPFIRMAS S.A.
 */
public class CertificadoDataFactoryAppFirmas {

    public static X509Certificate getRootCertificate(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        try {
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCaCertAppFirmas20252050())) {
                System.out.println("AppFirmasSubCaCert2025-2050");
                return new SubCaCertAppFirmas20252050();
            }
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCaCertAppFirmas20262036())) {
                System.out.println("AppFirmasSubCaCert2026-2036");
                return new SubCaCertAppFirmas20262036();
            }
        } catch (java.security.InvalidKeyException ex) {
            throw new EntidadCertificadoraNoValidaException("Certificado de APPFIRMAS S.A. sin categorizar!");
        }
        return null;
    }

    public static DatosUsuario getDatosUsuarioAppFirmas(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        DatosUsuario datosUsuario = null;
        Certificado certificadoAppFirmas = construir(certificado);
        if (certificadoAppFirmas != null) {
            datosUsuario = new DatosUsuario();
            //RESOLUCION-ARCOTEL-2024-0176
            if (certificadoAppFirmas instanceof CertificadoSubjImpl) {
                if (certificadoAppFirmas instanceof CertificadoPersonaNatural certificadoPersonaNatural) {
                    datosUsuario.setTipoCertificado("Persona Natural");
                    datosUsuario.setCedula(certificadoPersonaNatural.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoPersonaNatural.getNombres());
                    datosUsuario.setApellido(certificadoPersonaNatural.getPrimerApellido());
                }
                if (certificadoAppFirmas instanceof CertificadoMiembroEmpresa certificadoMiembroEmpresa) {
                    datosUsuario.setTipoCertificado("Miembro Empresa");
                    datosUsuario.setRuc(certificadoMiembroEmpresa.getRuc());
                    datosUsuario.setRazonSocial(certificadoMiembroEmpresa.getRazonSocial());
                    datosUsuario.setCargo(certificadoMiembroEmpresa.getCargo());
                }
                if (certificadoAppFirmas instanceof CertificadoRepresentanteLegal certificadoRepresentanteLegal) {
                    datosUsuario.setTipoCertificado("Representante Legal");
                    datosUsuario.setRuc(certificadoRepresentanteLegal.getRuc());
                    datosUsuario.setRazonSocial(certificadoRepresentanteLegal.getRazonSocial());
                    datosUsuario.setCargo(certificadoRepresentanteLegal.getCargo());
                }
            }
            datosUsuario.setCertificadoDigitalValido(true);
        }
        return datosUsuario;
    }

    private static Certificado construir(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        if (certificateHasPolicy(certificado, Subj.OID_TIPO_PERSONA_NATURAL)) {
            return new CertificadoSubjPersonaNaturalAppFirmas(certificado);
        } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_MIEMBRO_EMPRESA)) {
            return new CertificadoSubjSelloElectronicoAppFirmas(certificado);
        } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_REPRESENTANTE_LEGAL)) {
            return new CertificadoSubjRepresentanteLegalAppFirmas(certificado);
        }
        return null;
    }
}
