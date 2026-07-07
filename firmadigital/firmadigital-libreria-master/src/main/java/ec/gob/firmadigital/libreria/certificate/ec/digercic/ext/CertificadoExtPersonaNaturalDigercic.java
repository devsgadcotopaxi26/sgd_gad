/*
 * Copyright (C) 2026 
 * Authors: Misael Fernández, DIRECCIÓN GENERAL DE REGISTRO CIVIL, IDENTIFICACIÓN Y CEDULACIÓN
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
package ec.gob.firmadigital.libreria.certificate.ec.digercic.ext;

import ec.gob.firmadigital.libreria.certificate.ec.CertificadoPersonaNatural;
import java.security.cert.X509Certificate;

/**
 * Certificado de persona natural<br>
 * emitido DIRECCIÓN GENERAL DE REGISTRO CIVIL, IDENTIFICACIÓN Y CEDULACIÓN
 *
 * @author Misael Fernández, DIRECCIÓN GENERAL DE REGISTRO CIVIL, IDENTIFICACIÓN
 * Y CEDULACIÓN
 */
public class CertificadoExtPersonaNaturalDigercic
        extends CertificadoExtImplDigercic
        implements CertificadoPersonaNatural {

    public CertificadoExtPersonaNaturalDigercic(X509Certificate certificado) {
        super(certificado);
    }
}
