/*
 * Copyright (C) 2026 
 * Authors: Misael Fernández, ECLIPSOFT S.A.
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
package ec.gob.firmadigital.libreria.certificate.ec.eclipsoft;

import ec.gob.firmadigital.libreria.certificate.ec.eclipsoft.ext.*;
//import ec.gob.firmadigital.libreria.certificate.ec.eclipsoft.subj.*;
//import ec.gob.firmadigital.libreria.certificate.ec.eclipsoft.cert.*;
import ec.gob.firmadigital.libreria.certificate.ec.uanataca.cert.*;
import ec.gob.firmadigital.libreria.certificate.ec.subj.CertificadoSubjImpl;
import static ec.gob.firmadigital.libreria.certificate.ec.eclipsoft.CertificadoEclipsoft.*;
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
 * @author Misael Fernández, ECLIPSOFT S.A.
 */
public class CertificadoDataFactoryEclipsoft {

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
            throw new EntidadCertificadoraNoValidaException("Certificado del ECLIPSOFT S.A. sin categorizar!");
        }
        return null;
    }
    
    public static DatosUsuario getDatosUsuarioEclipsoft(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        DatosUsuario datosUsuario = null;
        Certificado certificadoEclipsoft = construir(certificado);
        if (certificadoEclipsoft != null) {
            datosUsuario = new DatosUsuario();
            if (certificadoEclipsoft instanceof CertificadoExtImplEcplipsoft) {
                if (certificadoEclipsoft instanceof CertificadoExtPersonalNaturalEclipsoft certificadoExtPersonalNaturalEclipsoft) {
                    datosUsuario.setTipoCertificado("Persona Natural (EXT)");
                    datosUsuario.setCedula(certificadoExtPersonalNaturalEclipsoft.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtPersonalNaturalEclipsoft.getNombres());
                    datosUsuario.setApellido(certificadoExtPersonalNaturalEclipsoft.getPrimerApellido() + " "
                            + certificadoExtPersonalNaturalEclipsoft.getSegundoApellido());
                }
                if (certificadoEclipsoft instanceof CertificadoExtMiembroEmpresaEclipsoft certificadoExtMiembroEmpresaEclipsoft) {
                    datosUsuario.setTipoCertificado("Miembro Empresa (EXT)");
                    datosUsuario.setCedula(certificadoExtMiembroEmpresaEclipsoft.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtMiembroEmpresaEclipsoft.getNombres());
                    datosUsuario.setApellido(certificadoExtMiembroEmpresaEclipsoft.getPrimerApellido() + " "
                            + certificadoExtMiembroEmpresaEclipsoft.getSegundoApellido());
                    datosUsuario.setRuc(certificadoExtMiembroEmpresaEclipsoft.getRuc());
                    datosUsuario.setRazonSocial(certificadoExtMiembroEmpresaEclipsoft.getRazonSocial());
                    datosUsuario.setCargo(certificadoExtMiembroEmpresaEclipsoft.getCargo());
                }
                if (certificadoEclipsoft instanceof CertificadoExtRepresentanteLegalEclipsoft certificadoExtRepresentanteLegalEclipsoft) {
                    datosUsuario.setTipoCertificado("Representante Legal (EXT)");
                    datosUsuario.setCedula(certificadoExtRepresentanteLegalEclipsoft.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtRepresentanteLegalEclipsoft.getNombres());
                    datosUsuario.setApellido(certificadoExtRepresentanteLegalEclipsoft.getPrimerApellido() + " "
                            + certificadoExtRepresentanteLegalEclipsoft.getSegundoApellido());
                    datosUsuario.setRuc(certificadoExtRepresentanteLegalEclipsoft.getRuc());
                    datosUsuario.setRazonSocial(certificadoExtRepresentanteLegalEclipsoft.getRazonSocial());
                    datosUsuario.setCargo(certificadoExtRepresentanteLegalEclipsoft.getCargo());
                }
                if (certificadoEclipsoft instanceof CertificadoExtPersonaJuridicaPrivadaEclipsoft certificadoExtPersonaJuridicaPrivadaEclipsoft) {
                    datosUsuario.setTipoCertificado("Persona Jurídica Privada (EXT)");
                    datosUsuario.setCedula(certificadoExtPersonaJuridicaPrivadaEclipsoft.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtPersonaJuridicaPrivadaEclipsoft.getNombres());
                    datosUsuario.setApellido(certificadoExtPersonaJuridicaPrivadaEclipsoft.getPrimerApellido() + " "
                            + certificadoExtPersonaJuridicaPrivadaEclipsoft.getSegundoApellido());
                    datosUsuario.setRuc(datosUsuario.getRuc());
                    datosUsuario.setRazonSocial(datosUsuario.getRazonSocial());
                    datosUsuario.setCargo(datosUsuario.getCargo());
                }
                if (certificadoEclipsoft instanceof CertificadoExtSelladoTiempoEclipsoft certificadoExtSelladoTiempoEclipsoft) {
                    datosUsuario.setTipoCertificado("Sellado de Tiempo (EXT)");
                    datosUsuario.setRuc(certificadoExtSelladoTiempoEclipsoft.getRuc());
                    datosUsuario.setRazonSocial(certificadoExtSelladoTiempoEclipsoft.getRazonSocial());
                    datosUsuario.setCommonName(certificadoExtSelladoTiempoEclipsoft.getCommonName());
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
        if (ec.gob.firmadigital.libreria.certificate.CertUtils.hasCertificatePoliciesMatchingPattern(certificado, "1.3.6.1.4.1.57153.1.1", "")) {
            if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_NATURAL_ARCHIVO)) {
                return new CertificadoExtPersonalNaturalEclipsoft(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_NATURAL_DSCF)) {
                return new CertificadoExtPersonalNaturalEclipsoft(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_MIEMBRO_EMPRESA_ARCHIVO)) {
                return new CertificadoExtMiembroEmpresaEclipsoft(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_MIEMBRO_EMPRESA_DSCF)) {
                return new CertificadoExtMiembroEmpresaEclipsoft(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_REPRESENTANTE_LEGAL_ARCHIVO)) {
                return new CertificadoExtRepresentanteLegalEclipsoft(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_REPRESENTANTE_LEGAL_DSCF)) {
                return new CertificadoExtRepresentanteLegalEclipsoft(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_JURIDICA_ARCHIVO)) {
                return new CertificadoExtPersonaJuridicaPrivadaEclipsoft(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_JURIDICA_DSCF)) {
                return new CertificadoExtPersonaJuridicaPrivadaEclipsoft(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_SELLADO_TIEMPO)) {
                return new CertificadoExtSelladoTiempoEclipsoft(certificado);
            }
//        } else {//RESOLUCION-ARCOTEL-2024-0176
//            if (certificateHasPolicy(certificado, Subj.OID_TIPO_PERSONA_NATURAL)) {
//                return new CertificadoSubjPersonaNaturalAlphaTechnologies(certificado);
        }
        return null;
    }
}
