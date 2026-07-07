/*
 * Copyright (C) 2026 
 * Authors: Misael Fernández, SECURITY DATA SEGURIDAD EN DATOS Y FIRMA DIGITAL S.A.
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
package ec.gob.firmadigital.libreria.certificate.ec.securitydata;

import ec.gob.firmadigital.libreria.certificate.ec.securitydata.ext.*;
import ec.gob.firmadigital.libreria.certificate.ec.securitydata.subj.*;
import ec.gob.firmadigital.libreria.certificate.ec.securitydata.cert.*;
import ec.gob.firmadigital.libreria.certificate.ec.subj.CertificadoSubjImpl;
import static ec.gob.firmadigital.libreria.certificate.ec.securitydata.CertificadoSecurityData.*;
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
 * @author Misael Fernández, SECURITY DATA SEGURIDAD EN DATOS Y FIRMA DIGITAL
 * S.A.
 */
public class CertificadoDataFactorySecurityData {

    public static X509Certificate getRootCertificate(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        try {
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCaCertSecurityData20112026())) {
                System.out.println("SecurityDataSubCaCert");
                return new SubCaCertSecurityData20112026();
            }
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCaCertSecurityData20192031())) {
                System.out.println("SecurityDataSubCaCert 2019-2031");
                return new SubCaCertSecurityData20192031();
            }
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCaCertSecurityData20202039())) {
                System.out.println("SecurityDataSubCaCert 2020-2032");
                return new SubCaCertSecurityData20202039();
            }
        } catch (java.security.InvalidKeyException ex) {
            throw new EntidadCertificadoraNoValidaException("Certificado de SECURITY DATA SEGURIDAD EN DATOS Y FIRMA DIGITAL S.A. sin categorizar!");
        }
        return null;
    }

    public static DatosUsuario getDatosUsuarioSecurityData(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        DatosUsuario datosUsuario = null;
        Certificado certificadoSecurityData = construir(certificado);
        if (certificadoSecurityData != null) {
            datosUsuario = new DatosUsuario();
            if (certificadoSecurityData instanceof CertificadoExtImplSecurityData) {
                if (certificadoSecurityData instanceof CertificadoExtPersonaNaturalSecurityData certificadoExtPersonaNaturalSecurityData) {
                    datosUsuario.setTipoCertificado("Persona Natural (EXT)");
                    datosUsuario.setCedula(certificadoExtPersonaNaturalSecurityData.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtPersonaNaturalSecurityData.getNombres());
                    datosUsuario.setApellido(certificadoExtPersonaNaturalSecurityData.getPrimerApellido() + " "
                            + certificadoExtPersonaNaturalSecurityData.getSegundoApellido());
                }
                if (certificadoSecurityData instanceof CertificadoExtFuncionarioPublicoSecurityData certificadoExtFuncionarioPublicoSecurityData) {
                    datosUsuario.setTipoCertificado("Funcionario Público (EXT)");
                    datosUsuario.setCedula(certificadoExtFuncionarioPublicoSecurityData.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtFuncionarioPublicoSecurityData.getNombres());
                    datosUsuario.setApellido(certificadoExtFuncionarioPublicoSecurityData.getPrimerApellido() + " "
                            + certificadoExtFuncionarioPublicoSecurityData.getSegundoApellido());
                    datosUsuario.setRuc(certificadoExtFuncionarioPublicoSecurityData.getRuc());
                    datosUsuario.setInstitucion(certificadoExtFuncionarioPublicoSecurityData.getInstitucion());
                    datosUsuario.setRazonSocial(certificadoExtFuncionarioPublicoSecurityData.getRazonSocial());
                    datosUsuario.setCargo(certificadoExtFuncionarioPublicoSecurityData.getCargo());
                }
                if (certificadoSecurityData instanceof CertificadoExtMiembroEmpresaSecurityData certificadoExtMiembroEmpresaSecurityData) {
                    datosUsuario.setTipoCertificado("Miembro de Empresa (EXT)");
                    datosUsuario.setCedula(certificadoExtMiembroEmpresaSecurityData.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtMiembroEmpresaSecurityData.getNombres());
                    datosUsuario.setApellido(certificadoExtMiembroEmpresaSecurityData.getPrimerApellido() + " "
                            + certificadoExtMiembroEmpresaSecurityData.getSegundoApellido());
                    datosUsuario.setRuc(certificadoExtMiembroEmpresaSecurityData.getRuc());
                    datosUsuario.setRazonSocial(certificadoExtMiembroEmpresaSecurityData.getRazonSocial());
                    datosUsuario.setCargo(certificadoExtMiembroEmpresaSecurityData.getCargo());
                }
                if (certificadoSecurityData instanceof CertificadoExtRepresentanteLegalSecurityData certificadoExtRepresentanteLegalSecurityData) {
                    datosUsuario.setTipoCertificado("Representante Legal (EXT)");
                    datosUsuario.setCedula(certificadoExtRepresentanteLegalSecurityData.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtRepresentanteLegalSecurityData.getNombres());
                    datosUsuario.setApellido(certificadoExtRepresentanteLegalSecurityData.getPrimerApellido() + " "
                            + certificadoExtRepresentanteLegalSecurityData.getSegundoApellido());
                    datosUsuario.setRuc(certificadoExtRepresentanteLegalSecurityData.getRuc());
                    datosUsuario.setRazonSocial(certificadoExtRepresentanteLegalSecurityData.getRazonSocial());
                    datosUsuario.setCargo(certificadoExtRepresentanteLegalSecurityData.getCargo());
                }
                if (certificadoSecurityData instanceof CertificadoExtPersonaJuridicaSecurityData certificadoExtPersonaJuridicaSecurityData) {
                    datosUsuario.setTipoCertificado("Persona Jurídica (EXT)");
                    datosUsuario.setCedula(certificadoExtPersonaJuridicaSecurityData.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtPersonaJuridicaSecurityData.getNombres());
                    datosUsuario.setApellido(certificadoExtPersonaJuridicaSecurityData.getPrimerApellido() + " "
                            + certificadoExtPersonaJuridicaSecurityData.getSegundoApellido());
                    datosUsuario.setRuc(certificadoExtPersonaJuridicaSecurityData.getRuc());
                    datosUsuario.setRazonSocial(certificadoExtPersonaJuridicaSecurityData.getRazonSocial());
                    datosUsuario.setCargo(certificadoExtPersonaJuridicaSecurityData.getCargo());
                }
                // Para el caso de sello de tiempo, no se generan los OID's suficientes para validar
                if (certificadoSecurityData instanceof CertificadoExtSelladoTiempoSecurityData certificadoExtSelladoTiempoSecurityData) {
                    datosUsuario.setTipoCertificado("Sellado de Tiempo (EXT)");
                    datosUsuario.setCedula("");
                    datosUsuario.setNombre("");
                    datosUsuario.setApellido("");
                    datosUsuario.setCommonName("");
                    datosUsuario.setRuc("");
                    datosUsuario.setRazonSocial("");
                }
            }
            //RESOLUCION-ARCOTEL-2024-0176
            if (certificadoSecurityData instanceof CertificadoSubjImpl) {
                if (certificadoSecurityData instanceof CertificadoPersonaNatural certificadoPersonaNatural) {
                    datosUsuario.setTipoCertificado("Persona Natural");
                    datosUsuario.setCedula(certificadoPersonaNatural.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoPersonaNatural.getNombres());
                    datosUsuario.setApellido(certificadoPersonaNatural.getPrimerApellido());
                }
                if (certificadoSecurityData instanceof CertificadoMiembroEmpresa certificadoMiembroEmpresa) {
                    datosUsuario.setTipoCertificado("Miembro Empresa");
                    datosUsuario.setRuc(certificadoMiembroEmpresa.getRuc());
                    datosUsuario.setRazonSocial(certificadoMiembroEmpresa.getRazonSocial());
                    datosUsuario.setCargo(certificadoMiembroEmpresa.getCargo());
                }
                if (certificadoSecurityData instanceof CertificadoRepresentanteLegal certificadoRepresentanteLegal) {
                    datosUsuario.setTipoCertificado("Representante Legal");
                    datosUsuario.setRuc(certificadoRepresentanteLegal.getRuc());
                    datosUsuario.setRazonSocial(certificadoRepresentanteLegal.getRazonSocial());
                    datosUsuario.setCargo(certificadoRepresentanteLegal.getCargo());
                }
                if (certificadoSecurityData instanceof CertificadoSelloElectronico certificadoSelloElectronico) {
                    datosUsuario.setTipoCertificado("Sellado Electrónico");
                    datosUsuario.setCommonName(certificadoSelloElectronico.getCommonName());
                    datosUsuario.setRuc(certificadoSelloElectronico.getRuc());
                    datosUsuario.setRazonSocial(certificadoSelloElectronico.getRazonSocial());
                }
                if (certificadoSecurityData instanceof CertificadoSelladoTiempo certificadoSelladoTiempo) {
                    datosUsuario.setTipoCertificado("Sellado de Tiempo");
                    datosUsuario.setCommonName(certificadoSelladoTiempo.getCommonName());
                    datosUsuario.setRuc(certificadoSelladoTiempo.getRuc());
                    datosUsuario.setRazonSocial(certificadoSelladoTiempo.getRazonSocial());
                }
            }
            datosUsuario.setCertificadoDigitalValido(true);
        }
        return datosUsuario;
    }

    private static Certificado construir(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        // No se implementa condicionamiento, debido que el caso de sello de tiempo, 
        // no se genera los OID's suficientes para validar, tambien los OID's son diferentes
        if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_NATURAL)) {
            return new CertificadoExtPersonaNaturalSecurityData(certificado);
        } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_JURIDICA_EMPRESA)) {
            return new CertificadoExtPersonaJuridicaSecurityData(certificado);
        } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_REPRESENTANTE_LEGAL)) {
            return new CertificadoExtRepresentanteLegalSecurityData(certificado);
        } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_MIEMBRO_EMPRESA)) {
            return new CertificadoExtMiembroEmpresaSecurityData(certificado);
        } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_FUNCIONARIO_PUBLICO)) {
            return new CertificadoExtFuncionarioPublicoSecurityData(certificado);
        } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_NATURAL_PROFESIONAL)) {
            return new CertificadoExtPersonaNaturalSecurityData(certificado);
        } else if (certificateHasPolicy(certificado, Ext.OID_SELLADO_TIEMPO)) {
            return new CertificadoExtSelladoTiempoSecurityData(certificado);
        } //RESOLUCION-ARCOTEL-2024-0176
        else if (certificateHasPolicy(certificado, Subj.OID_TIPO_PERSONA_NATURAL)) {
            return new CertificadoSubjPersonaNaturalSecurityData(certificado);
        } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_PERSONA_NATURAL_DSCF)) {
            return new CertificadoSubjPersonaNaturalSecurityData(certificado);
        } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_REPRESENTANTE_LEGAL)) {
            return new CertificadoSubjRepresentanteLegalSecurityData(certificado);
        } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_REPRESENTANTE_LEGAL_DSCF)) {
            return new CertificadoSubjRepresentanteLegalSecurityData(certificado);
        } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_MIEMBRO_EMPRESA)) {
            return new CertificadoSubjMiembroEmpresaSecurityData(certificado);
        } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_MIEMBRO_EMPRESA_DSCF)) {
            return new CertificadoSubjMiembroEmpresaSecurityData(certificado);
        } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_SELLO_ELECTRONICO)) {
            return new CertificadoSubjSelloElectronicoSecurityData(certificado);
        } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_SELLO_ELECTRONICO_DSCF)) {
            return new CertificadoSubjSelloElectronicoSecurityData(certificado);
        } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_SELLO_TIEMPO_DSCF)) {
            return new CertificadoSubjSelladoTiempoSecurityData(certificado);
        }
        return null;
    }
}
