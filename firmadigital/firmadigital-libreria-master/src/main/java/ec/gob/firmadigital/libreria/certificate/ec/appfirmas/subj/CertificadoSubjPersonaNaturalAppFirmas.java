/*
 * Copyright (C) 2026
 * Authors: Misael Fernández, APPFIRMAS S.A.
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
package ec.gob.firmadigital.libreria.certificate.ec.appfirmas.subj;

import ec.gob.firmadigital.libreria.certificate.ec.CertificadoPersonaNatural;
import ec.gob.firmadigital.libreria.certificate.ec.subj.CertificadoSubjImpl;
import java.security.cert.X509Certificate;

/**
 * Certificado de persona natural<br>
 * emitido por APPFIRMAS S.A.
 *
 * @author Misael Fernández, APPFIRMAS S.A.
 */
public class CertificadoSubjPersonaNaturalAppFirmas 
        extends CertificadoSubjImpl
        implements CertificadoPersonaNatural {

    public CertificadoSubjPersonaNaturalAppFirmas(X509Certificate certificado) {
        super(certificado);
    }
}
