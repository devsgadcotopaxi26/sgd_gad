/*
 * Copyright (C) 2026
 * Authors: Misael Fernández, CORPNEWBEST CIA. LTDA.
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
package ec.gob.firmadigital.libreria.certificate.ec.corpnewbest;

import ec.gob.firmadigital.libreria.certificate.ec.corpnewbest.ext.*;
import ec.gob.firmadigital.libreria.certificate.ec.corpnewbest.subj.*;
import ec.gob.firmadigital.libreria.certificate.ec.corpnewbest.cert.*;
import ec.gob.firmadigital.libreria.certificate.ec.subj.CertificadoSubjImpl;
import static ec.gob.firmadigital.libreria.certificate.ec.corpnewbest.CertificadoCorpNewBest.*;
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
 * @author Misael Fernández, CORPNEWBEST CIA. LTDA.
 */
public class CertificadoDataFactoryCorpNewBest {

    public static X509Certificate getRootCertificate(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        try {
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCa1CertCorpNewBest20232033())) {
                System.out.println("CorpNewBestSubCa1Cert");
                return new SubCa1CertCorpNewBest20232033();
            }
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCa2CertCorpNewBest20232033())) {
                System.out.println("CorpNewBestSubCa2Cert");
                return new SubCa2CertCorpNewBest20232033();
            }
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCa3CertCorpNewBest20232033())) {
                System.out.println("CorpNewBestSubCa3Cert");
                return new SubCa3CertCorpNewBest20232033();
            }
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCa1CertCorpNewBest2026022620400223())) {
                System.out.println("SubCa1CertCorpNewBest2026022620400223Cert");
                return new SubCa1CertCorpNewBest2026022620400223();
            }
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCa2CertCorpNewBest2026022620400223())) {
                System.out.println("SubCa2CertCorpNewBest2026022620400223Cert");
                return new SubCa2CertCorpNewBest2026022620400223();
            }
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCa3CertCorpNewBest2026022620400223())) {
                System.out.println("SubCa3CertCorpNewBest2026022620400223Cert");
                return new SubCa3CertCorpNewBest2026022620400223();
            }
        } catch (java.security.InvalidKeyException ex) {
            throw new EntidadCertificadoraNoValidaException("Tipo Certificado de CORPNEWBEST CIA. LTDA. sin categorizar!");
        }
        return null;
    }

    public static DatosUsuario getDatosUsuarioCorpNewBest(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        DatosUsuario datosUsuario = null;
        Certificado certificadoCorpNewBest = construir(certificado);
        if (certificadoCorpNewBest != null) {
            datosUsuario = new DatosUsuario();
            if (certificadoCorpNewBest instanceof CertificadoExtImplCorpNewBest) {
                if (certificadoCorpNewBest instanceof CertificadoExtPersonaNaturalCorpNewBest certificadoExtPersonaNaturalCorpNewBest) {
                    datosUsuario.setTipoCertificado("Persona Natural (EXT)");
                    datosUsuario.setCedula(certificadoExtPersonaNaturalCorpNewBest.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtPersonaNaturalCorpNewBest.getNombres());
                    datosUsuario.setApellido(certificadoExtPersonaNaturalCorpNewBest.getPrimerApellido() + " "
                            + certificadoExtPersonaNaturalCorpNewBest.getSegundoApellido());
                }
                if (certificadoCorpNewBest instanceof CertificadoExtPersonaJuridicaCorpNewBest certificadoExtPersonaJuridicaCorpNewBest) {
                    datosUsuario.setTipoCertificado("Persona Jurídica (EXT)");
                    datosUsuario.setCedula(certificadoExtPersonaJuridicaCorpNewBest.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtPersonaJuridicaCorpNewBest.getNombres());
                    datosUsuario.setApellido(certificadoExtPersonaJuridicaCorpNewBest.getPrimerApellido() + " "
                            + certificadoExtPersonaJuridicaCorpNewBest.getSegundoApellido());
                    datosUsuario.setRuc(certificadoExtPersonaJuridicaCorpNewBest.getRuc());
                    datosUsuario.setRazonSocial(certificadoExtPersonaJuridicaCorpNewBest.getRazonSocial());
                    datosUsuario.setCargo(certificadoExtPersonaJuridicaCorpNewBest.getCargo());
                }
                if (certificadoCorpNewBest instanceof CertificadoExtMiembroEmpresaCorpNewBest certificadoExtMiembroEmpresaCorpNewBest) {
                    datosUsuario.setTipoCertificado("Miembro Empresa (EXT)");
                    datosUsuario.setCedula(certificadoExtMiembroEmpresaCorpNewBest.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoExtMiembroEmpresaCorpNewBest.getNombres());
                    datosUsuario.setApellido(certificadoExtMiembroEmpresaCorpNewBest.getPrimerApellido() + " "
                            + certificadoExtMiembroEmpresaCorpNewBest.getSegundoApellido());
                    datosUsuario.setRuc(certificadoExtMiembroEmpresaCorpNewBest.getRuc());
                    datosUsuario.setRazonSocial(certificadoExtMiembroEmpresaCorpNewBest.getRazonSocial());
                    datosUsuario.setCargo(certificadoExtMiembroEmpresaCorpNewBest.getCargo());
                }
            }
            //RESOLUCION-ARCOTEL-2024-0176
            if (certificadoCorpNewBest instanceof CertificadoSubjImpl) {
                if (certificadoCorpNewBest instanceof CertificadoPersonaNatural certificadoPersonaNatural) {
                    datosUsuario.setTipoCertificado("Persona Natural");
                    datosUsuario.setCedula(certificadoPersonaNatural.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoPersonaNatural.getNombres());
                    datosUsuario.setApellido(certificadoPersonaNatural.getPrimerApellido());
                }
                if (certificadoCorpNewBest instanceof CertificadoMiembroEmpresa certificadoMiembroEmpresa) {
                    datosUsuario.setTipoCertificado("Miembro Empresa");
                    datosUsuario.setRuc(certificadoMiembroEmpresa.getRuc());
                    datosUsuario.setRazonSocial(certificadoMiembroEmpresa.getRazonSocial());
                    datosUsuario.setCargo(certificadoMiembroEmpresa.getCargo());
                }
                if (certificadoCorpNewBest instanceof CertificadoRepresentanteLegal certificadoRepresentanteLegal) {
                    datosUsuario.setTipoCertificado("Representante Legal");
                    datosUsuario.setRuc(certificadoRepresentanteLegal.getRuc());
                    datosUsuario.setRazonSocial(certificadoRepresentanteLegal.getRazonSocial());
                    datosUsuario.setCargo(certificadoRepresentanteLegal.getCargo());
                }
                if (certificadoCorpNewBest instanceof CertificadoSelloElectronico certificadoSelloElectronico) {
                    datosUsuario.setTipoCertificado("Sello Electrónico");
                    datosUsuario.setCommonName(certificadoSelloElectronico.getCommonName());
                    datosUsuario.setRuc(certificadoSelloElectronico.getRuc());
                    datosUsuario.setRazonSocial(certificadoSelloElectronico.getRazonSocial());
                }
                if (certificadoCorpNewBest instanceof CertificadoSelladoTiempo certificadoSelladoTiempo) {
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
        if (ec.gob.firmadigital.libreria.certificate.CertUtils.hasExtensionMatchingPattern(certificado, "1.3.6.1.4.1", "34380.3.1")) {
            if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_NATURAL)) {
                return new CertificadoExtPersonaNaturalCorpNewBest(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_JURIDICA)) {
                return new CertificadoExtPersonaJuridicaCorpNewBest(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_MIEMBRO_EMPRESA)) {
                return new CertificadoExtMiembroEmpresaCorpNewBest(certificado);
            }
        } else {//RESOLUCION-ARCOTEL-2024-0176
            if (certificateHasPolicy(certificado, Subj.OID_TIPO_PERSONA_NATURAL)) {
                return new CertificadoSubjPersonaNaturalCorpNewBest(certificado);
            } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_PERSONA_NATURAL_DSCF)) {
                return new CertificadoSubjPersonaNaturalCorpNewBest(certificado);
            } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_MIEMBRO_EMPRESA)) {
                return new CertificadoSubjMiembroEmpresaCorpNewBest(certificado);
            } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_MIEMBRO_EMPRESA_DSCF)) {
                return new CertificadoSubjMiembroEmpresaCorpNewBest(certificado);
            } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_REPRESENTANTE_LEGAL)) {
                return new CertificadoSubjRepresentanteLegalCorpNewBest(certificado);
            } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_REPRESENTANTE_LEGAL_DSCF)) {
                return new CertificadoSubjRepresentanteLegalCorpNewBest(certificado);
            } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_SELLO_ELECTRONICO)) {
                return new CertificadoSubjSelloElectronicoCorpNewBest(certificado);
            } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_SELLO_ELECTRONICO_DSCF)) {
                return new CertificadoSubjSelloElectronicoCorpNewBest(certificado);
            } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_SELLO_TIEMPO)) {
                return new CertificadoSubjSelladoTiempoCorpNewBest(certificado);
            }
        }
        return null;
    }
}
