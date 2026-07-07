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
package ec.gob.firmadigital.libreria.certificate.ec.securitydata.ext;

import ec.gob.firmadigital.libreria.certificate.ec.CertificadoPersonaNatural;
import java.security.cert.X509Certificate;

/**
 * Certificado de Persona Natural<br>
 * emitido por SECURITY DATA SEGURIDAD EN DATOS Y FIRMA DIGITAL S.A.
 *
 * @author Misael Fernández, SECURITY DATA SEGURIDAD EN DATOS Y FIRMA DIGITAL
 * S.A.
 */
public class CertificadoExtPersonaNaturalSecurityData
        extends CertificadoExtImplSecurityData
        implements CertificadoPersonaNatural {

    public CertificadoExtPersonaNaturalSecurityData(X509Certificate certificado) {
        super(certificado);
    }
}
