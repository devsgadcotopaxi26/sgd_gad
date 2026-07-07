/*
 * Copyright (C) 2020 
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
package ec.gob.firmadigital.libreria.utils;

import java.security.Security;
import java.security.cert.CertificateEncodingException;
import java.security.cert.X509Certificate;
import java.util.logging.Logger;

import org.bouncycastle.asn1.x509.CertificatePolicies;
import org.bouncycastle.asn1.x509.PolicyInformation;
import org.bouncycastle.cert.jcajce.JcaX509CertificateHolder;
import org.bouncycastle.jce.provider.BouncyCastleProvider;

/**
 * Utilidades para la libreria BouncyCastle.
 *
 * @author Ricardo Arguello
 */
public class BouncyCastleUtils {

    private static final Logger LOGGER = Logger.getLogger(BouncyCastleUtils.class.getName());

    /**
     * Inicializa el Proveedor de Seguridad BouncyCastle
     */
    public static void initializeBouncyCastle() {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
    }

    /**
     * Verifica si un certificado X.509 contiene una política de certificado
     * específica.
     * <p>
     * Este método recorre las políticas de certificado definidas en la
     * extensión "Certificate Policies" (OID 2.5.29.32 segun RFC 5280) del
     * certificado y busca una coincidencia exacta con el OID proporcionado.
     *
     * @param cert El certificado X.509 que se va a verificar.
     * @param policyOid El Identificador de Objeto (OID) de la política que se
     * busca, representado como una cadena de texto (e.g.,
     * "1.3.6.1.4.1.oid_AC.2.1").
     * @return {@code true} si el certificado contiene la política especificada,
     * {@code false} en caso contrario o si ocurre un error.
     */
    public static boolean certificateHasPolicy(X509Certificate cert, String policyOid) {
        try {
            // Usar un CertificateHolder de Bouncy Castle para acceder fácilmente a las extensiones procesadas
            JcaX509CertificateHolder certHolder = new JcaX509CertificateHolder(cert);
            CertificatePolicies policies = CertificatePolicies.fromExtensions(certHolder.getExtensions());
            if (policies != null) {
                for (PolicyInformation policyInfo : policies.getPolicyInformation()) {
                    // Usar .equals() para una coincidencia exacta de OID
                    if (policyInfo.getPolicyIdentifier().getId().equals(policyOid)) {
                        return true;
                    }
                }
            }
        } catch (CertificateEncodingException ex) {
            LOGGER.severe(() -> "Error reading certificate policies: " + ex);
        }
        return false;
    }

}
