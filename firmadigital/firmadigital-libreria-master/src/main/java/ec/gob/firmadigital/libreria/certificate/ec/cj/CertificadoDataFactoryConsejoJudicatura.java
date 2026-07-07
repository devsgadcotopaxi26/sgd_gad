/*
 * Copyright (C) 2026 
 * Authors: Misael Fernández, CONSEJO DE LA JUDICATURA
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
package ec.gob.firmadigital.libreria.certificate.ec.cj;

import ec.gob.firmadigital.libreria.certificate.ec.cj.ext.*;
//import ec.gob.firmadigital.libreria.certificate.ec.cj.subj.*;
import ec.gob.firmadigital.libreria.certificate.ec.cj.cert.*;
import ec.gob.firmadigital.libreria.certificate.ec.subj.CertificadoSubjImpl;
import static ec.gob.firmadigital.libreria.certificate.ec.cj.CertificadoConsejoJudicatura.*;
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
 * @author Misael Fernández, CONSEJO DE LA JUDICATURA
 */
public class CertificadoDataFactoryConsejoJudicatura {

    public static X509Certificate getRootCertificate(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        try {
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCaCertConsejoJudicatura())) {
                System.out.println("SubCA Consejo de la Judicatura");
                return new SubCaCertConsejoJudicatura();
            }
        } catch (java.security.InvalidKeyException ex) {
            throw new EntidadCertificadoraNoValidaException("Certificado del CONSEJO DE LA JUDICATURA sin categorizar!w");
        }
        return null;
    }

    public static DatosUsuario getDatosUsuarioConsejoJudicatura(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        DatosUsuario datosUsuario = null;
        Certificado certificadoConsejoJudicatura = construir(certificado);
        if (certificadoConsejoJudicatura != null) {
            datosUsuario = new DatosUsuario();
            if (certificadoConsejoJudicatura instanceof CertificadoExtImplConsejoJudicatura) {
                if (certificadoConsejoJudicatura instanceof CertificadoExtPersonaNaturalConsejoJudicatura certificadoExtPersonaNaturalConsejoJudicatura) {
                    datosUsuario.setTipoCertificado("Persona Natural (EXT)");
                    datosUsuario.setCedula(certificadoExtPersonaNaturalConsejoJudicatura.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtPersonaNaturalConsejoJudicatura.getNombres());
                    datosUsuario.setApellido(certificadoExtPersonaNaturalConsejoJudicatura.getPrimerApellido() + " "
                            + certificadoExtPersonaNaturalConsejoJudicatura.getSegundoApellido());
                }
                if (certificadoConsejoJudicatura instanceof CertificadoExtDepartamentoEmpresaConsejoJudicatura certificadoExtDepartamentoEmpresaConsejoJudicatura) {
                    datosUsuario.setTipoCertificado("Departamento Empresa (EXT)");
                    datosUsuario.setCedula(certificadoExtDepartamentoEmpresaConsejoJudicatura.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtDepartamentoEmpresaConsejoJudicatura.getNombres());
                    datosUsuario.setApellido(certificadoExtDepartamentoEmpresaConsejoJudicatura.getPrimerApellido() + " "
                            + certificadoExtDepartamentoEmpresaConsejoJudicatura.getSegundoApellido());
                    datosUsuario.setRuc(certificadoExtDepartamentoEmpresaConsejoJudicatura.getRuc());
                    datosUsuario.setRazonSocial(certificadoExtDepartamentoEmpresaConsejoJudicatura.getRazonSocial());
                    datosUsuario.setCargo(certificadoExtDepartamentoEmpresaConsejoJudicatura.getCargo());
                }
                if (certificadoConsejoJudicatura instanceof CertificadoExtEmpresaConsejoJudicatura certificadoExtEmpresaConsejoJudicatura) {
                    datosUsuario.setTipoCertificado("Empresa (EXT)");
                    datosUsuario.setCedula(certificadoExtEmpresaConsejoJudicatura.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtEmpresaConsejoJudicatura.getNombres());
                    datosUsuario.setApellido(certificadoExtEmpresaConsejoJudicatura.getPrimerApellido() + " "
                            + certificadoExtEmpresaConsejoJudicatura.getSegundoApellido());
                    datosUsuario.setRuc(certificadoExtEmpresaConsejoJudicatura.getRuc());
                    datosUsuario.setRazonSocial(certificadoExtEmpresaConsejoJudicatura.getRazonSocial());
                    datosUsuario.setCargo(certificadoExtEmpresaConsejoJudicatura.getCargo());
                }
                if (certificadoConsejoJudicatura instanceof CertificadoExtMiembroEmpresaConsejoJudicatura certificadoExtMiembroEmpresaConsejoJudicatura) {
                    datosUsuario.setTipoCertificado("Miembro de Empresa (EXT)");
                    datosUsuario.setCedula(certificadoExtMiembroEmpresaConsejoJudicatura.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtMiembroEmpresaConsejoJudicatura.getNombres());
                    datosUsuario.setApellido(certificadoExtMiembroEmpresaConsejoJudicatura.getPrimerApellido() + " "
                            + certificadoExtMiembroEmpresaConsejoJudicatura.getSegundoApellido());
                    datosUsuario.setRuc(certificadoExtMiembroEmpresaConsejoJudicatura.getRuc());
                    datosUsuario.setRazonSocial(certificadoExtMiembroEmpresaConsejoJudicatura.getRazonSocial());
                    datosUsuario.setCargo(certificadoExtMiembroEmpresaConsejoJudicatura.getCargo());
                }
                if (certificadoConsejoJudicatura instanceof CertificadoExtPersonaJuridicaPrivadaConsejoJudicatura certificadoExtPersonaJuridicaPrivadaConsejoJudicatura) {
                    datosUsuario.setTipoCertificado("Persona Jurídica (EXT)");
                    datosUsuario.setCedula(certificadoExtPersonaJuridicaPrivadaConsejoJudicatura.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtPersonaJuridicaPrivadaConsejoJudicatura.getNombres());
                    datosUsuario.setApellido(certificadoExtPersonaJuridicaPrivadaConsejoJudicatura.getPrimerApellido() + " "
                            + certificadoExtPersonaJuridicaPrivadaConsejoJudicatura.getSegundoApellido());
                    datosUsuario.setRuc(datosUsuario.getRuc());
                    datosUsuario.setRazonSocial(datosUsuario.getRazonSocial());
                    datosUsuario.setCargo(datosUsuario.getCargo());
                }
                if (certificadoConsejoJudicatura instanceof CertificadoExtPersonaJuridicaPublicaConsejoJudicatura certificadoExtPersonaJuridicaPublicaConsejoJudicatura) {
                    datosUsuario.setTipoCertificado("Persona Jurídica Pública (EXT)");
                    datosUsuario.setCedula(certificadoExtPersonaJuridicaPublicaConsejoJudicatura.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtPersonaJuridicaPublicaConsejoJudicatura.getNombres());
                    datosUsuario.setApellido(certificadoExtPersonaJuridicaPublicaConsejoJudicatura.getPrimerApellido() + " "
                            + certificadoExtPersonaJuridicaPublicaConsejoJudicatura.getSegundoApellido());
                    datosUsuario.setRuc(certificadoExtPersonaJuridicaPublicaConsejoJudicatura.getRuc());
                    datosUsuario.setRazonSocial(certificadoExtPersonaJuridicaPublicaConsejoJudicatura.getRazonSocial());
                    datosUsuario.setCargo(certificadoExtPersonaJuridicaPublicaConsejoJudicatura.getCargo());
                }
                if (certificadoConsejoJudicatura instanceof CertificadoExtSelladoTiempoConsejoJudicatura certificadoExtSelladoTiempoConsejoJudicatura) {
                    datosUsuario.setTipoCertificado("Sellado de Tiempo (EXT)");
                    datosUsuario.setCommonName(certificadoExtSelladoTiempoConsejoJudicatura.getCommonName());
                    datosUsuario.setRuc(certificadoExtSelladoTiempoConsejoJudicatura.getRuc());
                    datosUsuario.setRazonSocial(certificadoExtSelladoTiempoConsejoJudicatura.getRazonSocial());
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
        if (ec.gob.firmadigital.libreria.certificate.CertUtils.hasCertificatePoliciesMatchingPattern(certificado, "1.3.6.1.4.1.43745.1.2", "")) {
            if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_NATURAL_HW_TOKEN)) {
                return new CertificadoExtPersonaNaturalConsejoJudicatura(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_NATURAL_HW_HSM_SFC)) {
                return new CertificadoExtPersonaNaturalConsejoJudicatura(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_NATURAL_HW_HSM)) {
                return new CertificadoExtPersonaNaturalConsejoJudicatura(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_NATURAL_SW_PKCS12)) {
                return new CertificadoExtPersonaNaturalConsejoJudicatura(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_JURIDICA_PRIVADA_HW_TOKEN)) {
                return new CertificadoExtPersonaJuridicaPrivadaConsejoJudicatura(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_JURIDICA_PRIVADA_HW_HSM_SFC)) {
                return new CertificadoExtPersonaJuridicaPrivadaConsejoJudicatura(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_JURIDICA_PRIVADA_SW_PKCS12)) {
                return new CertificadoExtPersonaJuridicaPrivadaConsejoJudicatura(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_JURIDICA_PUBLICA_HW_TOKEN)) {
                return new CertificadoExtPersonaJuridicaPublicaConsejoJudicatura(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_JURIDICA_PUBLICA_HW_HSM_SFC)) {
                return new CertificadoExtPersonaJuridicaPublicaConsejoJudicatura(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_JURIDICA_PUBLICA_HW_HSM)) {
                return new CertificadoExtPersonaJuridicaPublicaConsejoJudicatura(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_JURIDICA_PUBLICA_SW_PKCS12)) {
                return new CertificadoExtPersonaJuridicaPublicaConsejoJudicatura(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_MIEMBRO_EMPRESA_HW_TOKEN)) {
                return new CertificadoExtMiembroEmpresaConsejoJudicatura(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_MIEMBRO_EMPRESA_HW_HSM_SFC)) {
                return new CertificadoExtMiembroEmpresaConsejoJudicatura(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_MIEMBRO_EMPRESA_HW_HSM)) {
                return new CertificadoExtMiembroEmpresaConsejoJudicatura(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_MIEMBRO_EMPRESA_SW_PKCS12)) {
                return new CertificadoExtMiembroEmpresaConsejoJudicatura(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_EMPRESA_HW_HSM_SFC)) {
                return new CertificadoExtEmpresaConsejoJudicatura(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_EMPRESA_HW_HSM)) {
                return new CertificadoExtEmpresaConsejoJudicatura(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_DEPARTAMENTO_EMPRESA_HW_HSM_SFC)) {
                return new CertificadoExtDepartamentoEmpresaConsejoJudicatura(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_DEPARTAMENTO_EMPRESA_SW_PKCS12)) {
                return new CertificadoExtDepartamentoEmpresaConsejoJudicatura(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_SELLADO_TIEMPO)) {
                return new CertificadoExtSelladoTiempoConsejoJudicatura(certificado);
            }
//        } else {//RESOLUCION-ARCOTEL-2024-0176
//            if (certificateHasPolicy(certificado, Subj.OID_TIPO_PERSONA_NATURAL)) {
//                return new CertificadoSubjPersonaNaturalAlphaTechnologies(certificado);
        }
        return null;
    }
}
