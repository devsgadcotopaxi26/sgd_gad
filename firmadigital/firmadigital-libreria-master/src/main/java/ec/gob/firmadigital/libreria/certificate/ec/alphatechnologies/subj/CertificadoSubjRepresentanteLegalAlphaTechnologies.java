/*
 * Copyright (C) 2026
 * Authors: Misael Fernández, ALPHA TECHNOLOGIES CIA. LTDA.
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
package ec.gob.firmadigital.libreria.certificate.ec.alphatechnologies.subj;

import ec.gob.firmadigital.libreria.certificate.ec.CertificadoRepresentanteLegal;
import ec.gob.firmadigital.libreria.certificate.ec.subj.AttributeOIDs;
import ec.gob.firmadigital.libreria.certificate.ec.subj.CertificadoSubjImpl;
import java.security.cert.X509Certificate;

/**
 * Certificado de Representante Legal<br>
 * emitido por ALPHA TECHNOLOGIES CIA. LTDA.
 *
 * @author Misael Fernández, ALPHA TECHNOLOGIES CIA. LTDA.
 */
public class CertificadoSubjRepresentanteLegalAlphaTechnologies
        extends CertificadoSubjImpl
        implements CertificadoRepresentanteLegal {

    public CertificadoSubjRepresentanteLegalAlphaTechnologies(X509Certificate certificado) {
        super(certificado);
    }

    @Override
    public String getRazonSocial() {
        return getSubjectField(AttributeOIDs.OID_ORGANIZACION);
    }

    @Override
    public String getCargo() {
        return getSubjectField(AttributeOIDs.OID_CARGO);
    }
}
