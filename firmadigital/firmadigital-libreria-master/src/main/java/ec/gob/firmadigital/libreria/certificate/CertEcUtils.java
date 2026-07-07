/*
 * Copyright (C) 2026 
 * Authors: Ricardo Arguello, Misael Fernández
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
package ec.gob.firmadigital.libreria.certificate;

import ec.gob.firmadigital.libreria.certificate.ec.alphatechnologies.*;
import ec.gob.firmadigital.libreria.certificate.ec.anfac.*;
import ec.gob.firmadigital.libreria.certificate.ec.appfirmas.*;
import ec.gob.firmadigital.libreria.certificate.ec.argosdata.*;
import ec.gob.firmadigital.libreria.certificate.ec.bce.*;
import ec.gob.firmadigital.libreria.certificate.ec.cj.*;
import ec.gob.firmadigital.libreria.certificate.ec.corpnewbest.*;
import ec.gob.firmadigital.libreria.certificate.ec.darkcam.*;
import ec.gob.firmadigital.libreria.certificate.ec.datil.*;
import ec.gob.firmadigital.libreria.certificate.ec.digercic.*;
import ec.gob.firmadigital.libreria.certificate.ec.eclipsoft.*;
import ec.gob.firmadigital.libreria.certificate.ec.firmasegura.*;
import ec.gob.firmadigital.libreria.certificate.ec.lazzate.*;
import ec.gob.firmadigital.libreria.certificate.ec.letmi.*;
import ec.gob.firmadigital.libreria.certificate.ec.primecorelat.*;
import ec.gob.firmadigital.libreria.certificate.ec.securitydata.*;
import ec.gob.firmadigital.libreria.certificate.ec.uanataca.*;

import ec.gob.firmadigital.libreria.utils.Utils;
import ec.gob.firmadigital.libreria.certificate.to.DatosUsuario;
import ec.gob.firmadigital.libreria.exceptions.EntidadCertificadoraNoValidaException;
import java.security.cert.X509Certificate;

/**
 * Validar diferentes certificados digitales acreditados por ARCOTEL
 *
 * @author Misael Fernández
 */
public class CertEcUtils {

    public static final String ALPHATECHNOLOGIES_NAME = "ALPHA TECHNOLOGIES CIA. LTDA.";
    public static final String ANFAC_NAME = "ANFAC AUTORIDAD DE CERTIFICACION ECUADOR C.A.";
    public static final String ANFAC_NAME_OLD = "ANFAC AUTORIDAD DE CERTIFICACION ECUADOR CA";
    public static final String APPFIRMAS_NAME = "APPFIRMAS S.A.";
    public static final String APPFIRMAS_NAME_OLD = "APPFIRMAS S.A. SUB CA";
    public static final String AGOSDATA_NAME = "ARGOSDATA CERTIFICACIÓN DE INFORMACIÓN Y SERVICIOS RELACIONADOS"; //ARGOSDATA CERTIFICACIÓN DE INFORMACIÓN Y SERVICIOS RELACIONADOS S.A.S.
    public static final String AGOSDATA_NAME_OLD = "ARGOSDATA";
    public static final String BCE_NAME = "BANCO CENTRAL DEL ECUADOR";
    public static final String CJ_NAME = "CONSEJO DE LA JUDICATURA";
    public static final String CORPNEWBEST_NAME = "CORPNEWBEST CIA. LTDA.";
    public static final String DARKCAM_NAME = "DARKCAM S.A.";
    public static final String DATIL_NAME = "DATILMEDIA S.A.";
    public static final String DIGERCIC_NAME = "DIRECCIÓN GENERAL DE REGISTRO CIVIL, IDENTIFICACIÓN Y CEDULACIÓN";
    public static final String ECLIPSOFT_NAME = "ECLIPSOFT S.A.";
    public static final String FIRMASEGURA_NAME = "FIRMASEGURA S.A.S.";
    public static final String LAZZATE_NAME = "LAZZATE CIA. LTDA.";
    public static final String LETMI_NAME = "LETMI ECUADOR S.A.";
    public static final String PRIMECORELAT_NAME = "PRIMECORELAT S.A.S. B.I.C.";
    public static final String SECURITYDATA_NAME = "SECURITY DATA SEGURIDAD EN DATOS Y FIRMA DIGITAL S.A.";
    public static final String SECURITYDATA_NAME_OLD = "SECURITY DATA";
    public static final String UANATACA_NAME = "UANATACA ECUADOR S.A.";
    public static final String UANATACA_NAME_OLD = "UANATACA S.A.";
    public static final String ECLIPSOFT_COMMON_NAME = "UANATACA CA1 2016";

    public static String getNombreCA(X509Certificate certificado) {
        String organization = Utils.getRDNvalueFromLdapName("O", certificado.getIssuerX500Principal().toString());
        if (organization.toUpperCase().equals(ALPHATECHNOLOGIES_NAME)) {
            return ALPHATECHNOLOGIES_NAME;
        }
        if (organization.toUpperCase().equals(ANFAC_NAME)) {
            return ANFAC_NAME;
        }
        if (organization.toUpperCase().equals(ANFAC_NAME_OLD)) {
            return ANFAC_NAME_OLD;
        }
        if (organization.toUpperCase().equals(APPFIRMAS_NAME)) {
            return APPFIRMAS_NAME;
        }
        if (organization.toUpperCase().equals(APPFIRMAS_NAME_OLD)) {
            return APPFIRMAS_NAME_OLD;
        }
        if (organization.toUpperCase().contains(AGOSDATA_NAME)) {
            return AGOSDATA_NAME;
        }
        if (organization.toUpperCase().equals(AGOSDATA_NAME_OLD)) {
            return AGOSDATA_NAME_OLD;
        }
        if (organization.toUpperCase().equals(BCE_NAME)) {
            return BCE_NAME;
        }
        if (organization.toUpperCase().equals(CJ_NAME)) {
            return CJ_NAME;
        }
        if (organization.toUpperCase().equals(CORPNEWBEST_NAME)) {
            return CORPNEWBEST_NAME;
        }
        if (organization.toUpperCase().equals(DARKCAM_NAME)) {
            return DARKCAM_NAME;
        }
        if (organization.toUpperCase().equals(DATIL_NAME)) {
            return DATIL_NAME;
        }
        if (organization.toUpperCase().equals(DIGERCIC_NAME)) {
            return DIGERCIC_NAME;
        }
        if (organization.toUpperCase().equals(ECLIPSOFT_NAME)) {
            return ECLIPSOFT_NAME;
        }
        if (organization.toUpperCase().equals(FIRMASEGURA_NAME)) {
            return FIRMASEGURA_NAME;
        }
        if (organization.toUpperCase().equals(LAZZATE_NAME)) {
            return LAZZATE_NAME;
        }
        if (organization.toUpperCase().equals(LETMI_NAME)) {
            return LETMI_NAME;
        }
        if (organization.toUpperCase().equals(PRIMECORELAT_NAME)) {
            return PRIMECORELAT_NAME;
        }
        if (organization.toUpperCase().equals(SECURITYDATA_NAME)) {
            return SECURITYDATA_NAME;
        }
        if (organization.toUpperCase().contains(SECURITYDATA_NAME_OLD)) {
            return SECURITYDATA_NAME_OLD;
        }
        if (organization.toUpperCase().equals(UANATACA_NAME)) {
            return UANATACA_NAME;
        }
        if (organization.toUpperCase().contains(UANATACA_NAME_OLD)) {
            String commonName = Utils.getRDNvalueFromLdapName("CN", certificado.getIssuerX500Principal().toString());
            if (commonName.toUpperCase().equals(ECLIPSOFT_COMMON_NAME)) {
                return ECLIPSOFT_NAME;
            } else {
                return UANATACA_NAME_OLD;
            }
        }
        return "Entidad no reconocida " + certificado.getIssuerX500Principal().getName();
    }

    public static X509Certificate getRootCertificate(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        switch (getNombreCA(certificado)) {
            case ALPHATECHNOLOGIES_NAME -> {
                return CertificadoDataFactoryAlphaTechnologies.getRootCertificate(certificado);
            }
            case ANFAC_NAME -> {
                return CertificadoDataFactoryAnfAc.getRootCertificate(certificado);
            }
            case ANFAC_NAME_OLD -> {
                return CertificadoDataFactoryAnfAc.getRootCertificate(certificado);
            }
            case APPFIRMAS_NAME -> {
                return CertificadoDataFactoryAppFirmas.getRootCertificate(certificado);
            }
            case APPFIRMAS_NAME_OLD -> {
                return CertificadoDataFactoryAppFirmas.getRootCertificate(certificado);
            }
            case AGOSDATA_NAME -> {
                return CertificadoDataFactoryArgosData.getRootCertificate(certificado);
            }
            case AGOSDATA_NAME_OLD -> {
                return CertificadoDataFactoryArgosData.getRootCertificate(certificado);
            }
            case BCE_NAME -> {
                return CertificadoDataFactoryBancoCentral.getRootCertificate(certificado);
            }
            case CJ_NAME -> {
                return CertificadoDataFactoryConsejoJudicatura.getRootCertificate(certificado);
            }
            case CORPNEWBEST_NAME -> {
                return CertificadoDataFactoryCorpNewBest.getRootCertificate(certificado);
            }
            case DARKCAM_NAME -> {
                return CertificadoDataFactoryDarkcam.getRootCertificate(certificado);
            }
            case DATIL_NAME -> {
                return CertificadoDataFactoryDatil.getRootCertificate(certificado);
            }
            case DIGERCIC_NAME -> {
                return CertificadoDataFactoryDigercic.getRootCertificate(certificado);
            }
            case ECLIPSOFT_NAME -> {
                return CertificadoDataFactoryEclipsoft.getRootCertificate(certificado);
            }
            case FIRMASEGURA_NAME -> {
                return CertificadoDataFactoryFirmaSegura.getRootCertificate(certificado);
            }
            case LAZZATE_NAME -> {
                return CertificadoDataFactoryLazzate.getRootCertificate(certificado);
            }
            case LETMI_NAME -> {
                return CertificadoDataFactoryLetmi.getRootCertificate(certificado);
            }
            case PRIMECORELAT_NAME -> {
                return CertificadoDataFactoryPrimeCoreLat.getRootCertificate(certificado);
            }
            case SECURITYDATA_NAME -> {
                return CertificadoDataFactorySecurityData.getRootCertificate(certificado);
            }
            case SECURITYDATA_NAME_OLD -> {
                return CertificadoDataFactorySecurityData.getRootCertificate(certificado);
            }
            case UANATACA_NAME -> {
                return CertificadoDataFactoryUanataca.getRootCertificate(certificado);
            }
            case UANATACA_NAME_OLD -> {
                return CertificadoDataFactoryUanataca.getRootCertificate(certificado);
            }
            default ->
                throw new EntidadCertificadoraNoValidaException("Entidad Certificadora no reconocida");
        }
    }

    public static DatosUsuario getDatosUsuarios(X509Certificate certificado) throws EntidadCertificadoraNoValidaException {
        switch (getNombreCA(certificado)) {
            case ALPHATECHNOLOGIES_NAME -> {
                return CertificadoDataFactoryAlphaTechnologies.getDatosUsuarioAlphaTechnologies(certificado);
            }
            case ANFAC_NAME -> {
                return CertificadoDataFactoryAnfAc.getDatosUsuarioAnfAc(certificado);
            }
            case ANFAC_NAME_OLD -> {
                return CertificadoDataFactoryAnfAc.getDatosUsuarioAnfAc(certificado);
            }
            case APPFIRMAS_NAME -> {
                return CertificadoDataFactoryAppFirmas.getDatosUsuarioAppFirmas(certificado);
            }
            case APPFIRMAS_NAME_OLD -> {
                return CertificadoDataFactoryAppFirmas.getDatosUsuarioAppFirmas(certificado);
            }
            case AGOSDATA_NAME -> {
                return CertificadoDataFactoryArgosData.getDatosUsuarioArgosData(certificado);
            }
            case AGOSDATA_NAME_OLD -> {
                return CertificadoDataFactoryArgosData.getDatosUsuarioArgosData(certificado);
            }
            case BCE_NAME -> {
                return CertificadoDataFactoryBancoCentral.getDatosUsuarioBancoCentral(certificado);
            }
            case CJ_NAME -> {
                return CertificadoDataFactoryConsejoJudicatura.getDatosUsuarioConsejoJudicatura(certificado);
            }
            case CORPNEWBEST_NAME -> {
                return CertificadoDataFactoryCorpNewBest.getDatosUsuarioCorpNewBest(certificado);
            }
            case DARKCAM_NAME -> {
                return CertificadoDataFactoryDarkcam.getDatosUsuarioDarkcam(certificado);
            }
            case DATIL_NAME -> {
                return CertificadoDataFactoryDatil.getDatosUsuarioDatil(certificado);
            }
            case DIGERCIC_NAME -> {
                return CertificadoDataFactoryDatil.getDatosUsuarioDatil(certificado);
            }
            case ECLIPSOFT_NAME -> {
                return CertificadoDataFactoryEclipsoft.getDatosUsuarioEclipsoft(certificado);
            }
            case FIRMASEGURA_NAME -> {
                return CertificadoDataFactoryFirmaSegura.getDatosUsuarioFirmaSegura(certificado);
            }
            case LAZZATE_NAME -> {
                return CertificadoDataFactoryLazzate.getDatosUsuarioLazzate(certificado);
            }
            case LETMI_NAME -> {
                return CertificadoDataFactoryLetmi.getDatosUsuarioLetmi(certificado);
            }
            case PRIMECORELAT_NAME -> {
                return CertificadoDataFactoryPrimeCoreLat.getDatosUsuarioPrimeCoreLat(certificado);
            }
            case SECURITYDATA_NAME -> {
                return CertificadoDataFactorySecurityData.getDatosUsuarioSecurityData(certificado);
            }
            case SECURITYDATA_NAME_OLD -> {
                return CertificadoDataFactorySecurityData.getDatosUsuarioSecurityData(certificado);
            }
            case UANATACA_NAME -> {
                return CertificadoDataFactoryUanataca.getDatosUsuarioUanataca(certificado);
            }
            case UANATACA_NAME_OLD -> {
                return CertificadoDataFactoryUanataca.getDatosUsuarioUanataca(certificado);
            }
            default ->
                throw new EntidadCertificadoraNoValidaException("Entidad Certificadora no reconocida");
        }
    }
}
