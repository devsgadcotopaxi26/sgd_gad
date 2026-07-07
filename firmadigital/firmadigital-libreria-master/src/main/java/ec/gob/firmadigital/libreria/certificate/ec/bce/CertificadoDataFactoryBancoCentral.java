/*
 * Copyright (C) 2026 
 * Authors: Misael Fernández, BANCO CENTRAL DEL ECUADOR
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
package ec.gob.firmadigital.libreria.certificate.ec.bce;

import ec.gob.firmadigital.libreria.certificate.ec.bce.ext.*;
//import ec.gob.firmadigital.libreria.certificate.ec.bce.subj.*;
import ec.gob.firmadigital.libreria.certificate.ec.bce.cert.*;
import ec.gob.firmadigital.libreria.certificate.ec.subj.CertificadoSubjImpl;
import static ec.gob.firmadigital.libreria.certificate.ec.bce.CertificadoBancoCentral.*;
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
 * @author Misael Fernández, BANCO CENTRAL DEL ECUADOR
 */
public class CertificadoDataFactoryBancoCentral {

    public static X509Certificate getRootCertificate(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        try {
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCaCertBce20112021())) {
                System.out.println("BceSubCaCert 2011-2021");
                return new SubCaCertBce20112021();
            }
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCaCertBce20192029())) {
                System.out.println("BceSubCaCert 2019-2029");
                return new SubCaCertBce20192029();
            }
        } catch (java.security.InvalidKeyException ex) {
            throw new EntidadCertificadoraNoValidaException("Certificado del BANCO CENTRAL DEL ECUADOR sin categorizar!");
        }
        return null;
    }

    public static DatosUsuario getDatosUsuarioBancoCentral(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        DatosUsuario datosUsuario = null;
        Certificado certificadoBancoCentral = construir(certificado);
        if (certificadoBancoCentral != null) {
            datosUsuario = new DatosUsuario();
            if (certificadoBancoCentral instanceof CertificadoExtImplBancoCentral) {
                if (certificadoBancoCentral instanceof CertificadoPersonaNatural certificadoPersonaNatural) {
                    datosUsuario.setTipoCertificado("Persona Natural (EXT)");
                    datosUsuario.setCedula(certificadoPersonaNatural.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoPersonaNatural.getNombres());
                    datosUsuario.setApellido(certificadoPersonaNatural.getPrimerApellido() + " "
                            + certificadoPersonaNatural.getSegundoApellido());
                }
                if (certificadoBancoCentral instanceof CertificadoFuncionarioPublico certificadoFuncionarioPublico) {
                    datosUsuario.setTipoCertificado("Funcionario Publico (EXT)");
                    datosUsuario.setCedula(certificadoFuncionarioPublico.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoFuncionarioPublico.getNombres());
                    datosUsuario.setApellido(certificadoFuncionarioPublico.getPrimerApellido() + " "
                            + certificadoFuncionarioPublico.getSegundoApellido());
                    datosUsuario.setRuc(certificadoFuncionarioPublico.getRuc());
                    datosUsuario.setInstitucion(certificadoFuncionarioPublico.getInstitucion());
                    datosUsuario.setCargo(certificadoFuncionarioPublico.getCargo());
                }
                if (certificadoBancoCentral instanceof CertificadoMiembroEmpresa certificadoMiembroEmpresa) {
                    datosUsuario.setTipoCertificado("Miembro Empresa (EXT)");
                    datosUsuario.setCedula(certificadoMiembroEmpresa.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoMiembroEmpresa.getNombres());
                    datosUsuario.setApellido(certificadoMiembroEmpresa.getPrimerApellido() + " "
                            + certificadoMiembroEmpresa.getSegundoApellido());
                    datosUsuario.setRuc(certificadoMiembroEmpresa.getRuc());
                    datosUsuario.setRazonSocial(certificadoMiembroEmpresa.getRazonSocial());
                    datosUsuario.setCargo(certificadoMiembroEmpresa.getCargo());
                }
                if (certificadoBancoCentral instanceof CertificadoPersonaJuridica certificadoPersonaJuridica) {
                    datosUsuario.setTipoCertificado("Persona Jurídica (EXT)");
                    datosUsuario.setCedula(certificadoPersonaJuridica.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoPersonaJuridica.getNombres());
                    datosUsuario.setApellido(certificadoPersonaJuridica.getPrimerApellido() + " "
                            + certificadoPersonaJuridica.getSegundoApellido());
                    datosUsuario.setRuc(certificadoPersonaJuridica.getRuc());
                    datosUsuario.setRazonSocial(certificadoPersonaJuridica.getRazonSocial());
                    datosUsuario.setCargo(certificadoPersonaJuridica.getCargo());
                }

                if (certificadoBancoCentral instanceof CertificadoRepresentanteLegal certificadoRepresentanteLegal) {
                    datosUsuario.setTipoCertificado("Representante Legal (EXT)");
                    datosUsuario.setCedula(certificadoRepresentanteLegal.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoRepresentanteLegal.getNombres());
                    datosUsuario.setApellido(certificadoRepresentanteLegal.getPrimerApellido() + " "
                            + certificadoRepresentanteLegal.getSegundoApellido());
                    datosUsuario.setRuc(certificadoRepresentanteLegal.getRuc());
                    datosUsuario.setRazonSocial(certificadoRepresentanteLegal.getRazonSocial());
                    datosUsuario.setCargo(certificadoRepresentanteLegal.getCargo());
                }
                if (certificadoBancoCentral instanceof CertificadoSelladoTiempo certificadoSelladoTiempo) {
                    datosUsuario.setTipoCertificado("Sellado de Tiempo (EXT)");
                    datosUsuario.setCommonName(certificadoSelladoTiempo.getCommonName());
                    datosUsuario.setRuc(certificadoSelladoTiempo.getRuc());
                    datosUsuario.setRazonSocial(certificadoSelladoTiempo.getRazonSocial());
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
        if (ec.gob.firmadigital.libreria.certificate.CertUtils.hasExtensionMatchingPattern(certificado, "1.3.6.1.4.1", "3.1")) {
            if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_NATURAL)) {
                return new CertificadoExtPersonaNaturalBancoCentral(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_PERSONA_JURIDICA)) {
                return new CertificadoExtPersonaJuridicaBancoCentral(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_TIPO_FUNCIONARIO_PUBLICO)) {
                return new CertificadoExtFuncionarioPublicoBancoCentral(certificado);
            } else if (certificateHasPolicy(certificado, Ext.OID_SELLADO_TIEMPO)) {
                return new CertificadoExtSelladoTiempoBancoCentral(certificado);
            }
//        } else {//RESOLUCION-ARCOTEL-2024-0176
//            if (certificateHasPolicy(certificado, Subj.OID_TIPO_PERSONA_NATURAL)) {
//                return new CertificadoSubjPersonaNaturalAlphaTechnologies(certificado);
        }
        return null;
    }
}
