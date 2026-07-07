/*
 * Copyright (C) 2026
 * Authors: Misael Fernández, PRIMECORELAT S.A.S. B.I.C.
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
package ec.gob.firmadigital.libreria.certificate.ec.primecorelat;

import ec.gob.firmadigital.libreria.certificate.ec.primecorelat.subj.*;
import ec.gob.firmadigital.libreria.certificate.ec.primecorelat.cert.*;
import ec.gob.firmadigital.libreria.certificate.ec.subj.CertificadoSubjImpl;
import static ec.gob.firmadigital.libreria.certificate.ec.primecorelat.CertificadoPrimeCoreLat.*;
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
 * @author Misael Fernández, PRIMECORELAT S.A.S. B.I.C.
 */
public class CertificadoDataFactoryPrimeCoreLat {

    public static X509Certificate getRootCertificate(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        try {
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCa1CertPrimeCoreLat20262036())) {
                System.out.println("PrimeCoreLatCA1 2026-2036");
                return new SubCa1CertPrimeCoreLat20262036();
            }
            if (ec.gob.firmadigital.libreria.utils.Utils.verifySignature(certificado, new SubCa2CertPrimeCoreLat20262036())) {
                System.out.println("PrimeCoreLatCA2 2026-2036");
                return new SubCa2CertPrimeCoreLat20262036();
            }
        } catch (java.security.InvalidKeyException ex) {
            throw new EntidadCertificadoraNoValidaException("Certificado de PRIMECORELAT S.A.S. B.I.C. sin categorizar!");
        }
        return null;
    }

    public static DatosUsuario getDatosUsuarioPrimeCoreLat(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        DatosUsuario datosUsuario = null;
        Certificado certificadoPrimeCoreLat = construir(certificado);
        if (certificadoPrimeCoreLat != null) {
            datosUsuario = new DatosUsuario();
            //RESOLUCION-ARCOTEL-2024-0176
            if (certificadoPrimeCoreLat instanceof CertificadoSubjImpl) {
                if (certificadoPrimeCoreLat instanceof CertificadoPersonaNatural certificadoPersonaNatural) {
                    datosUsuario.setTipoCertificado("Persona Natural");
                    datosUsuario.setCedula(certificadoPersonaNatural.getCedulaPasaporte());
                    datosUsuario.setNombre(certificadoPersonaNatural.getNombres());
                    datosUsuario.setApellido(certificadoPersonaNatural.getPrimerApellido());
                }
                if (certificadoPrimeCoreLat instanceof CertificadoMiembroEmpresa certificadoMiembroEmpresa) {
                    datosUsuario.setTipoCertificado("Miembro Empresa");
                    datosUsuario.setRuc(certificadoMiembroEmpresa.getRuc());
                    datosUsuario.setRazonSocial(certificadoMiembroEmpresa.getRazonSocial());
                    datosUsuario.setCargo(certificadoMiembroEmpresa.getCargo());
                }
                if (certificadoPrimeCoreLat instanceof CertificadoPersonaJuridica certificadoPersonaJuridica) {
                    datosUsuario.setTipoCertificado("Persona Jurídica");
                    datosUsuario.setRuc(certificadoPersonaJuridica.getRuc());
                    datosUsuario.setRazonSocial(certificadoPersonaJuridica.getRazonSocial());
                    datosUsuario.setCargo(certificadoPersonaJuridica.getCargo());
                }
                if (certificadoPrimeCoreLat instanceof CertificadoSelloElectronico certificadoSelloElectronico) {
                    datosUsuario.setTipoCertificado("Sello Electrónico");
                    datosUsuario.setRuc(certificadoSelloElectronico.getRuc());
                    datosUsuario.setRazonSocial(certificadoSelloElectronico.getRazonSocial());
                    datosUsuario.setCommonName(certificadoSelloElectronico.getCommonName());
                }
            }
            datosUsuario.setCertificadoDigitalValido(true);
        }
        return datosUsuario;
    }

    private static Certificado construir(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        if (certificateHasPolicy(certificado, Subj.OID_TIPO_PERSONA_NATURAL)) {
            return new CertificadoSubjPersonaNaturalPrimeCoreLat(certificado);
        } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_MIEMBRO_EMPRESA)) {
            return new CertificadoSubjMiembroEmpresaPrimeCoreLat(certificado);
        } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_REPRESENTANTE_LEGAL)) {
            return new CertificadoSubjPersonaJuridicaPrimeCoreLat(certificado);
        } else if (certificateHasPolicy(certificado, Subj.OID_TIPO_SELLO_ELECTRONICO)) {
            return new CertificadoSubjSelloElectronicoPrimeCoreLat(certificado);
        }
        return null;
    }
}
