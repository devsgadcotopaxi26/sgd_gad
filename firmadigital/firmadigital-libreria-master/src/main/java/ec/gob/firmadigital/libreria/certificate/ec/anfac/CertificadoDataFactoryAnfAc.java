/*
 * Copyright (C) 2026 
 * Authors: Misael Fernández, ANFAC AUTORIDAD DE CERTIFICACION ECUADOR C.A.
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
package ec.gob.firmadigital.libreria.certificate.ec.anfac;

import ec.gob.firmadigital.libreria.certificate.ec.anfac.ext.*;
import ec.gob.firmadigital.libreria.certificate.ec.anfac.subj.*;
import ec.gob.firmadigital.libreria.certificate.ec.anfac.cert.*;
import ec.gob.firmadigital.libreria.certificate.ec.subj.CertificadoSubjImpl;
import static ec.gob.firmadigital.libreria.certificate.ec.anfac.CertificadoAnfAc.*;
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
 * @author Misael Fernández, ANFAC AUTORIDAD DE CERTIFICACION ECUADOR C.A.
 */
public class CertificadoDataFactoryAnfAc {

    public static X509Certificate getRootCertificate(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        try {
            // Certificado firmado por la raíz (p. ej. el intermedio 2025-2044)
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new CaCertAnfAc20242044_37442())) {
                System.out.println("Anf Root 2024-2044");
                return new CaCertAnfAc20242044_37442();
            }
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCaCertAnfAc20162032_18332())) {
                System.out.println("Anf 2016-2032");
                return new SubCaCertAnfAc20162032_18332();
            }
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCaCertAnfAc20192029_37442())) {
                System.out.println("Anf 2019-2029");
                return new SubCaCertAnfAc20192029_37442();
            }
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCaAnfAc20252044_37442())) {
                System.out.println("Anf 2025-2044");
                return new SubCaAnfAc20252044_37442();
            }
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCaAnfAc20262044_37442())) {
                System.out.println("Anf 2026-2044");
                return new SubCaAnfAc20262044_37442();
            }
        } catch (java.security.InvalidKeyException ex) {
            throw new EntidadCertificadoraNoValidaException("Entidad Certificadora no reconocidaCertificado de ANFAC AUTORIDAD DE CERTIFICACION ECUADOR C.A. sin categorizar!");
        }
        return null;
    }

    public static DatosUsuario getDatosUsuarioAnfAc(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        DatosUsuario datosUsuario = null;
        Certificado certificadoAnfAc18332 = construir18332(certificado);
        if (certificadoAnfAc18332 != null) {
            datosUsuario = new DatosUsuario();
            if (certificadoAnfAc18332 instanceof CertificadoExtImplAnfAc_18332) {
                if (certificadoAnfAc18332 instanceof CertificadoExtPersonaNaturalAnfAc_18332 certificadoExtPersonaNaturalAnfAc_18332) {
                    datosUsuario.setTipoCertificado("Persona Natural (EXT)");
                    datosUsuario.setCedula(certificadoExtPersonaNaturalAnfAc_18332.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtPersonaNaturalAnfAc_18332.getNombres());
                    datosUsuario.setApellido(certificadoExtPersonaNaturalAnfAc_18332.getPrimerApellido() + " "
                            + certificadoExtPersonaNaturalAnfAc_18332.getSegundoApellido());
                }
                if (certificadoAnfAc18332 instanceof CertificadoExtFuncionarioPublicoAnfAc_18332 certificadoExtFuncionarioPublicoAnfAc_18332) {
                    datosUsuario.setTipoCertificado("Funcionario Público (EXT)");
                    datosUsuario.setCedula(certificadoExtFuncionarioPublicoAnfAc_18332.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtFuncionarioPublicoAnfAc_18332.getNombres());
                    datosUsuario.setApellido(certificadoExtFuncionarioPublicoAnfAc_18332.getPrimerApellido() + " "
                            + certificadoExtFuncionarioPublicoAnfAc_18332.getSegundoApellido());
                    datosUsuario.setRuc(certificadoExtFuncionarioPublicoAnfAc_18332.getRuc());
                    datosUsuario.setInstitucion(certificadoExtFuncionarioPublicoAnfAc_18332.getInstitucion());
                    datosUsuario.setCargo(certificadoExtFuncionarioPublicoAnfAc_18332.getCargo());
                }
                if (certificadoAnfAc18332 instanceof CertificadoExtPersonaJuridicaAnfAc_18332 certificadoExtPersonaJuridicaAnfAc_18332) {
                    datosUsuario.setTipoCertificado("Persona Jurídica (EXT)");
                    datosUsuario.setCedula(certificadoExtPersonaJuridicaAnfAc_18332.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtPersonaJuridicaAnfAc_18332.getNombres());
                    datosUsuario.setApellido(certificadoExtPersonaJuridicaAnfAc_18332.getPrimerApellido() + " "
                            + certificadoExtPersonaJuridicaAnfAc_18332.getSegundoApellido());
                    datosUsuario.setRuc(certificadoExtPersonaJuridicaAnfAc_18332.getRuc());
                    datosUsuario.setRazonSocial(certificadoExtPersonaJuridicaAnfAc_18332.getRazonSocial());
                    datosUsuario.setCargo(certificadoExtPersonaJuridicaAnfAc_18332.getCargo());
                }
            }
            datosUsuario.setCertificadoDigitalValido(true);
        }

        Certificado certificadoAnfAc37442 = construir37442(certificado);
        if (certificadoAnfAc37442 != null) {
            datosUsuario = new DatosUsuario();
            if (certificadoAnfAc37442 instanceof CertificadoExtImplAnfAc_37442) {
                if (certificadoAnfAc37442 instanceof CertificadoExtPersonaNaturalAnfAc_37442 certificadoExtPersonaNaturalAnfAc_37442) {
                    datosUsuario.setTipoCertificado("Persona Natural (EXT)");
                    datosUsuario.setCedula(certificadoExtPersonaNaturalAnfAc_37442.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtPersonaNaturalAnfAc_37442.getNombres());
                    datosUsuario.setApellido(certificadoExtPersonaNaturalAnfAc_37442.getPrimerApellido() + " "
                            + certificadoExtPersonaNaturalAnfAc_37442.getSegundoApellido());
                }
                if (certificadoAnfAc37442 instanceof CertificadoExtFuncionarioPublicoAnfAc_37442 certificadoExtFuncionarioPublicoAnfAc_37442) {
                    datosUsuario.setTipoCertificado("Funcionario Público (EXT)");
                    datosUsuario.setCedula(certificadoExtFuncionarioPublicoAnfAc_37442.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtFuncionarioPublicoAnfAc_37442.getNombres());
                    datosUsuario.setApellido(certificadoExtFuncionarioPublicoAnfAc_37442.getPrimerApellido() + " "
                            + certificadoExtFuncionarioPublicoAnfAc_37442.getSegundoApellido());
                    datosUsuario.setRuc(certificadoExtFuncionarioPublicoAnfAc_37442.getRuc());
                    datosUsuario.setInstitucion(certificadoExtFuncionarioPublicoAnfAc_37442.getInstitucion());
                    datosUsuario.setCargo(certificadoExtFuncionarioPublicoAnfAc_37442.getCargo());
                }
                if (certificadoAnfAc37442 instanceof CertificadoExtPersonaJuridicaAnfAc_37442 certificadoExtPersonaJuridicaAnfAc_37442) {
                    datosUsuario.setTipoCertificado("Persona Jurídica (EXT)");
                    datosUsuario.setCedula(certificadoExtPersonaJuridicaAnfAc_37442.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtPersonaJuridicaAnfAc_37442.getNombres());
                    datosUsuario.setApellido(certificadoExtPersonaJuridicaAnfAc_37442.getPrimerApellido() + " "
                            + certificadoExtPersonaJuridicaAnfAc_37442.getSegundoApellido());
                    datosUsuario.setRuc(certificadoExtPersonaJuridicaAnfAc_37442.getRuc());
                    datosUsuario.setRazonSocial(certificadoExtPersonaJuridicaAnfAc_37442.getRazonSocial());
                    datosUsuario.setCargo(certificadoExtPersonaJuridicaAnfAc_37442.getCargo());
                }
                if (certificadoAnfAc37442 instanceof CertificadoExtSelladoTiempoAnfAc_37442 certificadoExtSelladoTiempoAnfAc_37442) {
                    datosUsuario.setTipoCertificado("Sellado de Tiempo (EXT)");
                    datosUsuario.setCommonName(certificadoExtSelladoTiempoAnfAc_37442.getCommonName());
                    datosUsuario.setRuc(certificadoExtSelladoTiempoAnfAc_37442.getRuc());
                    datosUsuario.setRazonSocial(certificadoExtSelladoTiempoAnfAc_37442.getRazonSocial());
                }
            }
            // RESOLUCION-ARCOTEL-2024-0176
            if (certificadoAnfAc37442 instanceof CertificadoSubjImpl) {
                if (certificadoAnfAc37442 instanceof CertificadoPersonaNatural certificadoPersonaNatural) {
                    datosUsuario.setTipoCertificado("Persona Natural");
                    datosUsuario.setCedula(certificadoPersonaNatural.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoPersonaNatural.getNombres());
                    datosUsuario.setApellido(certificadoPersonaNatural.getPrimerApellido() + " "
                            + certificadoPersonaNatural.getSegundoApellido());
                }
                if (certificadoAnfAc37442 instanceof CertificadoMiembroEmpresa certificadoMiembroEmpresa) {
                    datosUsuario.setTipoCertificado("Miembro Empresa");
                    datosUsuario.setRuc(certificadoMiembroEmpresa.getRuc());
                    datosUsuario.setRazonSocial(certificadoMiembroEmpresa.getRazonSocial());
                    datosUsuario.setCargo(certificadoMiembroEmpresa.getCargo());
                }
                if (certificadoAnfAc37442 instanceof CertificadoRepresentanteLegal certificadoRepresentanteLegal) {
                    datosUsuario.setTipoCertificado("Representante Legal");
                    datosUsuario.setRuc(certificadoRepresentanteLegal.getRuc());
                    datosUsuario.setRazonSocial(certificadoRepresentanteLegal.getRazonSocial());
                    datosUsuario.setCargo(certificadoRepresentanteLegal.getCargo());
                }
                if (certificadoAnfAc37442 instanceof CertificadoSelloElectronico certificadoSelloElectronico) {
                    datosUsuario.setTipoCertificado("Sellado Electrónico");
                    datosUsuario.setCommonName(certificadoSelloElectronico.getCommonName());
                    datosUsuario.setRuc(certificadoSelloElectronico.getRuc());
                    datosUsuario.setRazonSocial(certificadoSelloElectronico.getRazonSocial());
                }
                if (certificadoAnfAc37442 instanceof CertificadoSelladoTiempo certificadoSelladoTiempo) {
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

    private static Certificado construir18332(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        if (ec.gob.firmadigital.libreria.certificate.CertUtils.hasExtensionMatchingPattern(certificado, "1.3.6.1.4.1", "3.1")) {
            if (certificateHasPolicy(certificado, Ext18332.OID_TIPO_PERSONA_NATURAL)) {
                return new CertificadoExtPersonaNaturalAnfAc_18332(certificado);
            } else if (certificateHasPolicy(certificado, Ext18332.OID_TIPO_PERSONA_JURIDICA)) {
                return new CertificadoExtPersonaJuridicaAnfAc_18332(certificado);
            } else if (certificateHasPolicy(certificado, Ext18332.OID_TIPO_FUNCIONARIO_PUBLICO)) {
                return new CertificadoExtFuncionarioPublicoAnfAc_18332(certificado);
            }
        }
        return null;
    }

    private static Certificado construir37442(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        if (ec.gob.firmadigital.libreria.certificate.CertUtils.hasExtensionMatchingPattern(certificado, "1.3.6.1.4.1", "3.1")) {
            if (certificateHasPolicy(certificado, Ext37442.OID_TIPO_PERSONA_NATURAL)) {
                return new CertificadoExtPersonaNaturalAnfAc_37442(certificado);
            } else if (certificateHasPolicy(certificado, Ext37442.OID_TIPO_PERSONA_NATURAL_TOKEN)) {
                return new CertificadoExtPersonaNaturalAnfAc_37442(certificado);
            } else if (certificateHasPolicy(certificado, Ext37442.OID_TIPO_PERSONA_JURIDICA)) {
                return new CertificadoExtPersonaJuridicaAnfAc_37442(certificado);
            } else if (certificateHasPolicy(certificado, Ext37442.OID_TIPO_PERSONA_JURIDICA_TOKEN)) {
                return new CertificadoExtPersonaJuridicaAnfAc_37442(certificado);
            } else if (certificateHasPolicy(certificado, Ext37442.OID_TIPO_FUNCIONARIO_PUBLICO)) {
                return new CertificadoExtFuncionarioPublicoAnfAc_37442(certificado);
            } else if (certificateHasPolicy(certificado, Ext37442.OID_TIPO_FUNCIONARIO_PUBLICO_TOKEN)) {
                return new CertificadoExtFuncionarioPublicoAnfAc_37442(certificado);
            } else if (certificateHasPolicy(certificado, Ext37442.OID_SELLADO_TIEMPO)) {
                return new CertificadoExtSelladoTiempoAnfAc_37442(certificado);
            }
        } else {//RESOLUCION-ARCOTEL-2024-0176 
            if (certificateHasPolicy(certificado, Subj.OID_CERTIFICADO_PERSONA_NATURAL)) {
                return new CertificadoSubjPersonaNaturalAnfAc(certificado);
            } else if (certificateHasPolicy(certificado, Subj.OID_CERTIFICADO_MIEMBRO_EMPRESA)) {
                return new CertificadoSubjMiembroEmpresaAnfAc(certificado);
            } else if (certificateHasPolicy(certificado, Subj.OID_CERTIFICADO_REPRESENTANTE_LEGAL)) {
                return new CertificadoSubjRepresentanteLegalAnfAc(certificado);
            } else if (certificateHasPolicy(certificado, Subj.OID_SELLADO_TIEMPO)) {
                return new CertificadoSubjSelladoTiempoAnfAc(certificado);
            } else if (certificateHasPolicy(certificado, Subj.OID_SELLO_ELECTRONICO)) {
                return new CertificadoSubjSelloElectronicoAnfAc(certificado);
            }
        }
        return null;
    }
}
