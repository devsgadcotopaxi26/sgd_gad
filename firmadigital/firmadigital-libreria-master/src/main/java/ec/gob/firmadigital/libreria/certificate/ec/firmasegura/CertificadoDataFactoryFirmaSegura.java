/*
 * Copyright (C) 2026
 * Authors: Misael Fernández, FIRMASEGURA S.A.S.
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
package ec.gob.firmadigital.libreria.certificate.ec.firmasegura;

import ec.gob.firmadigital.libreria.certificate.ec.firmasegura.ext.*;
import ec.gob.firmadigital.libreria.certificate.ec.firmasegura.subj.*;
import ec.gob.firmadigital.libreria.certificate.ec.firmasegura.cert.*;
import ec.gob.firmadigital.libreria.certificate.ec.subj.CertificadoSubjImpl;
import static ec.gob.firmadigital.libreria.certificate.ec.firmasegura.CertificadoFirmaSegura.*;
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
 * @author Misael Fernández, FIRMASEGURA S.A.S.
 */
public class CertificadoDataFactoryFirmaSegura {

    public static X509Certificate getRootCertificate(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        try {
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCaCertFirmaSegura20232043())) {
                System.out.println("FirmaSeguraSubCaCert2023-2043");
                return new SubCaCertFirmaSegura20232043();
            }
        } catch (java.security.InvalidKeyException ex) {
            throw new EntidadCertificadoraNoValidaException("Tipo Certificado de FIRMASEGURA S.A.S. sin categorizar!");
        }
        return null;
    }

    public static DatosUsuario getDatosUsuarioFirmaSegura(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        DatosUsuario datosUsuario = null;
        Certificado certificadoFirmaSegura = construir(certificado);
        if (certificadoFirmaSegura != null) {
            datosUsuario = new DatosUsuario();
            if (certificadoFirmaSegura instanceof CertificadoExtImplFirmaSegura) {
                if (certificadoFirmaSegura instanceof CertificadoExtPersonaNaturalFirmaSegura certificadoExtPersonaNaturalFirmaSegura) {
                    datosUsuario.setTipoCertificado("Persona Natural (EXT)");
                    datosUsuario.setCedula(certificadoExtPersonaNaturalFirmaSegura.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtPersonaNaturalFirmaSegura.getNombres());
                    datosUsuario.setApellido(certificadoExtPersonaNaturalFirmaSegura.getPrimerApellido() + " "
                            + certificadoExtPersonaNaturalFirmaSegura.getSegundoApellido());
                }
                if (certificadoFirmaSegura instanceof CertificadoExtRepresentanteLegalFirmaSegura certificadoExtRepresentanteLegalFirmaSegura) {
                    datosUsuario.setTipoCertificado("Representante Legal (EXT)");
                    datosUsuario.setCedula(certificadoExtRepresentanteLegalFirmaSegura.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtRepresentanteLegalFirmaSegura.getNombres());
                    datosUsuario.setApellido(certificadoExtRepresentanteLegalFirmaSegura.getPrimerApellido() + " "
                            + certificadoExtRepresentanteLegalFirmaSegura.getSegundoApellido());
                    datosUsuario.setRuc(certificadoExtRepresentanteLegalFirmaSegura.getRuc());
                    datosUsuario.setRazonSocial(certificadoExtRepresentanteLegalFirmaSegura.getRazonSocial());
                    datosUsuario.setCargo(certificadoExtRepresentanteLegalFirmaSegura.getCargo());
                }
            }
            //RESOLUCION-ARCOTEL-2024-0176
            if (certificadoFirmaSegura instanceof CertificadoSubjImpl) {
                if (certificadoFirmaSegura instanceof CertificadoPersonaNatural certificadoPersonaNatural) {
                    datosUsuario.setTipoCertificado("Persona Natural");
                    datosUsuario.setCedula(certificadoPersonaNatural.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoPersonaNatural.getNombres());
                    datosUsuario.setApellido(certificadoPersonaNatural.getPrimerApellido());
                    datosUsuario.setRuc(certificadoPersonaNatural.getRuc());
                }
                if (certificadoFirmaSegura instanceof CertificadoMiembroEmpresa certificadoMiembroEmpresa) {
                    datosUsuario.setTipoCertificado("Miembro Empresa");
                    datosUsuario.setRuc(certificadoMiembroEmpresa.getRuc());
                    datosUsuario.setRazonSocial(certificadoMiembroEmpresa.getRazonSocial());
                    datosUsuario.setCargo(certificadoMiembroEmpresa.getCargo());
                }
                if (certificadoFirmaSegura instanceof CertificadoRepresentanteLegal certificadoRepresentanteLegal) {
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
        if (ec.gob.firmadigital.libreria.certificate.CertUtils.hasExtensionMatchingPattern(certificado, "1.3.6.1.4.1", "3.1")) {
            if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_NATURAL)) {
                return new CertificadoExtPersonaNaturalFirmaSegura(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_REPRESENTANTE_LEGAL)) {
                return new CertificadoExtRepresentanteLegalFirmaSegura(certificado);
            }
        } else {//RESOLUCION-ARCOTEL-2024-0176
            if (certificateHasPolicy(certificado, Subj.OID_TIPO_PERSONA_NATURAL)) {
                return new CertificadoSubjPersonaNaturalFirmaSegura(certificado);
            } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_PERSONA_NATURAL_DSCF)) {
                return new CertificadoSubjPersonaNaturalFirmaSegura(certificado);
            } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_REPRESENTANTE_LEGAL)) {
                return new CertificadoSubjRepresentanteLegalFirmaSegura(certificado);
            } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_REPRESENTANTE_LEGAL_DSCF)) {
                return new CertificadoSubjRepresentanteLegalFirmaSegura(certificado);
            } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_MIEMBRO_EMPRESA)) {
                return new CertificadoSubjMiembroEmpresaFirmaSegura(certificado);
            } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_MIEMBRO_EMPRESA_DSCF)) {
                return new CertificadoSubjMiembroEmpresaFirmaSegura(certificado);
            }
        }
        return null;
    }
}
