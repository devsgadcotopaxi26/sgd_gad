/*
 * Copyright (C) 2026
 * Authors: Misael Fernández, DARKCAM S.A.
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
package ec.gob.firmadigital.libreria.certificate.ec.darkcam.subj;

import ec.gob.firmadigital.libreria.certificate.ec.CertificadoSelloElectronico;
import ec.gob.firmadigital.libreria.certificate.ec.subj.AttributeOIDs;
import ec.gob.firmadigital.libreria.certificate.ec.subj.CertificadoSubjImpl;
import java.security.cert.X509Certificate;

/**
 * Certificado de Miembro Empresa / Sello Electrónico<br>
 * emitido por DARKCAM S.A.
 *
 * @author Misael Fernández, DARKCAM S.A.
 */
public class CertificadoSubjSelloElectronicoDarkcam
        extends CertificadoSubjImpl
        implements CertificadoSelloElectronico {

    public CertificadoSubjSelloElectronicoDarkcam(X509Certificate certificado) {
        super(certificado);
    }

    @Override
    public String getCommonName() {
        return getSubjectField(AttributeOIDs.OID_COMMON_NAME);
    }

    @Override
    public String getRazonSocial() {
        return getSubjectField(AttributeOIDs.OID_ORGANIZACION);
    }
}
