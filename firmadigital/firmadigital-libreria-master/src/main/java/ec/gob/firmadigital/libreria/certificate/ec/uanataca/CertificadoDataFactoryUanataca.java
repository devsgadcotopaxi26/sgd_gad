/*
 * Copyright (C) 2026 
 * Authors: Misael Fernández, UANATACA ECUADOR S.A.
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
package ec.gob.firmadigital.libreria.certificate.ec.uanataca;

import ec.gob.firmadigital.libreria.certificate.ec.uanataca.ext.*;
import ec.gob.firmadigital.libreria.certificate.ec.uanataca.subj.*;
import ec.gob.firmadigital.libreria.certificate.ec.uanataca.cert.*;
import ec.gob.firmadigital.libreria.certificate.ec.subj.CertificadoSubjImpl;
import static ec.gob.firmadigital.libreria.certificate.ec.uanataca.CertificadoUanataca.*;
import ec.gob.firmadigital.libreria.certificate.ec.*;
import ec.gob.firmadigital.libreria.certificate.Certificado;
import ec.gob.firmadigital.libreria.certificate.ec.uanataca.ext.CertificadoExtImplUanataca;
import ec.gob.firmadigital.libreria.certificate.to.DatosUsuario;
import ec.gob.firmadigital.libreria.exceptions.EntidadCertificadoraNoValidaException;
import java.security.cert.X509Certificate;
import static ec.gob.firmadigital.libreria.utils.BouncyCastleUtils.certificateHasPolicy;

/**
 * Permite construir certificados tipo Certificado de la entidad de
 * certificación a partir de certificados X509Certificate.
 *
 * @author Misael Fernández, UANATACA ECUADOR S.A.
 */
public class CertificadoDataFactoryUanataca {

    public static X509Certificate getRootCertificate(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        try {
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCaCertUanataca0120162029())) {
                System.out.println("Uanataca 2016-2029");
                return new SubCaCertUanataca0120162029();
            }
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCaCertUanataca0220162029())) {
                System.out.println("Uanataca 2016-2029");
                return new SubCaCertUanataca0220162029();
            }
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCaCertUanataca0320212034())) {
                System.out.println("Uanataca 2021-2034");
                return new SubCaCertUanataca0320212034();
            }
        } catch (java.security.InvalidKeyException ex) {
            throw new EntidadCertificadoraNoValidaException("Certificado de UANATACA ECUADOR S.A. sin categorizar!");
        }
        return null;
    }

    public static DatosUsuario getDatosUsuarioUanataca(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        DatosUsuario datosUsuario = null;
        Certificado certificadoUanataca = construir(certificado);
        if (certificadoUanataca != null) {
            datosUsuario = new DatosUsuario();
            if (certificadoUanataca instanceof CertificadoExtImplUanataca) {
                if (certificadoUanataca instanceof CertificadoExtPersonaNaturalUanataca certificadoExtPersonaNaturalUanataca) {
                    datosUsuario.setTipoCertificado("Persona Natural (EXT)");
                    datosUsuario.setCedula(certificadoExtPersonaNaturalUanataca.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtPersonaNaturalUanataca.getNombres());
                    datosUsuario.setApellido(certificadoExtPersonaNaturalUanataca.getPrimerApellido() + " "
                            + certificadoExtPersonaNaturalUanataca.getSegundoApellido());
                }
                if (certificadoUanataca instanceof CertificadoExtMiembroEmpresaUanataca certificadoExtMiembroEmpresaUanataca) {
                    datosUsuario.setTipoCertificado("Miembro Empresa (EXT)");
                    datosUsuario.setCedula(certificadoExtMiembroEmpresaUanataca.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtMiembroEmpresaUanataca.getNombres());
                    datosUsuario.setApellido(certificadoExtMiembroEmpresaUanataca.getPrimerApellido() + " "
                            + certificadoExtMiembroEmpresaUanataca.getSegundoApellido());
                    datosUsuario.setCargo(certificadoExtMiembroEmpresaUanataca.getCargo());
                }
                if (certificadoUanataca instanceof CertificadoExtPersonaJuridicaPrivadaUanataca certificadoExtPersonaJuridicaPrivadaUanataca) {
                    datosUsuario.setTipoCertificado("Persona Jurídica Privada (EXT)");
                    datosUsuario.setCedula(certificadoExtPersonaJuridicaPrivadaUanataca.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtPersonaJuridicaPrivadaUanataca.getNombres());
                    datosUsuario.setApellido(certificadoExtPersonaJuridicaPrivadaUanataca.getPrimerApellido() + " "
                            + certificadoExtPersonaJuridicaPrivadaUanataca.getSegundoApellido());
                    datosUsuario.setCargo(datosUsuario.getCargo());
                }
                if (certificadoUanataca instanceof CertificadoExtRepresentanteLegalUanataca certificadoExtRepresentanteLegalUanataca) {
                    datosUsuario.setTipoCertificado("Representante Legal (EXT)");
                    datosUsuario.setCedula(certificadoExtRepresentanteLegalUanataca.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtRepresentanteLegalUanataca.getNombres());
                    datosUsuario.setApellido(certificadoExtRepresentanteLegalUanataca.getPrimerApellido() + " "
                            + certificadoExtRepresentanteLegalUanataca.getSegundoApellido());
                    datosUsuario.setCargo(certificadoExtRepresentanteLegalUanataca.getCargo());
                }
                if (certificadoUanataca instanceof CertificadoExtSelladoTiempoUanataca certificadoExtSelladoTiempoUanataca) {
                    datosUsuario.setTipoCertificado("Sellado de Tiempo (EXT)");
                    datosUsuario.setCommonName(certificadoExtSelladoTiempoUanataca.getCommonName());
                    datosUsuario.setRuc(certificadoExtSelladoTiempoUanataca.getRuc());
                    datosUsuario.setRazonSocial(certificadoExtSelladoTiempoUanataca.getRazonSocial());
                }
            }
//            //RESOLUCION-ARCOTEL-2024-0176
//            if (certificadoUanataca instanceof CertificadoSubjImpl) {
//                if (certificadoUanataca instanceof CertificadoPersonaNatural certificadoPersonaNatural) {
//                    datosUsuario.setTipoCertificado("Persona Natural");
//                    datosUsuario.setCedula(certificadoPersonaNatural.getCedulaPasaporte());
//                    datosUsuario.setNombre(certificadoPersonaNatural.getNombres());
//                    datosUsuario.setApellido(certificadoPersonaNatural.getPrimerApellido());
//                }
//                if (certificadoUanataca instanceof CertificadoPersonaJuridica certificadoPersonaJuridica) {
//                    datosUsuario.setTipoCertificado("Persona Jurídica");
//                    datosUsuario.setRuc(certificadoPersonaJuridica.getRuc());
//                    datosUsuario.setRazonSocial(certificadoPersonaJuridica.getRazonSocial());
//                    datosUsuario.setCargo(certificadoPersonaJuridica.getCargo());
//                }
//                if (certificadoUanataca instanceof CertificadoMiembroEmpresa certificadoMiembroEmpresa) {
//                    datosUsuario.setTipoCertificado("Miembro Empresa");
//                    datosUsuario.setRuc(certificadoMiembroEmpresa.getRuc());
//                    datosUsuario.setRazonSocial(certificadoMiembroEmpresa.getRazonSocial());
//                    datosUsuario.setCargo(certificadoMiembroEmpresa.getCargo());
//                }
//                if (certificadoUanataca instanceof CertificadoRepresentanteLegal certificadoRepresentanteLegal) {
//                    datosUsuario.setTipoCertificado("Representante Legal");
//                    datosUsuario.setRuc(certificadoRepresentanteLegal.getRuc());
//                    datosUsuario.setRazonSocial(certificadoRepresentanteLegal.getRazonSocial());
//                    datosUsuario.setCargo(certificadoRepresentanteLegal.getCargo());
//                }
//                if (certificadoUanataca instanceof CertificadoSelladoTiempo certificadoSelladoTiempo) {
//                    datosUsuario.setTipoCertificado("Sellado de Tiempo");
//                    datosUsuario.setCommonName(certificadoSelladoTiempo.getCommonName());
//                    datosUsuario.setRuc(certificadoSelladoTiempo.getRuc());
//                    datosUsuario.setRazonSocial(certificadoSelladoTiempo.getRazonSocial());
//                }
//            }
            datosUsuario.setCertificadoDigitalValido(true);
        }
        return datosUsuario;
    }

    private static Certificado construir(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        // No se implementa condicionamiento, debido que tienen OID's distintas
        if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_NATURAL_ARCHIVO)) {
            return new CertificadoExtPersonaNaturalUanataca(certificado);
        } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_NATURAL_DSCF)) {
            return new CertificadoExtPersonaNaturalUanataca(certificado);
        } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_JURIDICA_ARCHIVO)) {
            return new CertificadoExtPersonaJuridicaPrivadaUanataca(certificado);
        } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_JURIDICA_DSCF)) {
            return new CertificadoExtPersonaJuridicaPrivadaUanataca(certificado);
        } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_MIEMBRO_EMPRESA_ARCHIVO)) {
            return new CertificadoExtMiembroEmpresaUanataca(certificado);
        } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_MIEMBRO_EMPRESA_DSCF)) {
            return new CertificadoExtMiembroEmpresaUanataca(certificado);
        } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_REPRESENTANTE_EMPRESA_ARCHIVO)) {
            return new CertificadoExtRepresentanteLegalUanataca(certificado);
        } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_REPRESENTANTE_EMPRESA_DSCF)) {
            return new CertificadoExtRepresentanteLegalUanataca(certificado);
        } else if (certificateHasPolicy(certificado, Ext.OID_SELLADO_TIEMPO)) {
            return new CertificadoExtSelladoTiempoUanataca(certificado);
//        } //RESOLUCION-ARCOTEL-2024-0176
//        else if (certificateHasPolicy(certificado, Subj.OID_TIPO_PERSONA_NATURAL_ARCHIVO)) {
//            return new CertificadoSubjPersonaNaturalUanataca(certificado);
//        } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_PERSONA_NATURAL_DSCF)) {
//            return new CertificadoSubjPersonaNaturalUanataca(certificado);
//        } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_PERSONA_JURIDICA_ARCHIVO)) {
//            return new CertificadoSubjPersonaJuridicaUanataca(certificado);
//        } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_PERSONA_JURIDICA_DSCF)) {
//            return new CertificadoSubjPersonaJuridicaUanataca(certificado);
//        } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_MIEMBRO_EMPRESA_ARCHIVO)) {
//            return new CertificadoSubjMiembroEmpresaUanataca(certificado);
//        } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_MIEMBRO_EMPRESA_DSCF)) {
//            return new CertificadoSubjMiembroEmpresaUanataca(certificado);
//        } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_REPRESENTANTE_EMPRESA_ARCHIVO)) {
//            return new CertificadoSubjRepresentanteLegalUanataca(certificado);
//        } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_REPRESENTANTE_EMPRESA_DSCF)) {
//            return new CertificadoSubjRepresentanteLegalUanataca(certificado);
//        } else if (certificateHasPolicy(certificado, Subj.OID_SELLADO_TIEMPO)) {
//            return new CertificadoSubjSelladoTiempoUanataca(certificado);
        }
        return null;
    }
}
