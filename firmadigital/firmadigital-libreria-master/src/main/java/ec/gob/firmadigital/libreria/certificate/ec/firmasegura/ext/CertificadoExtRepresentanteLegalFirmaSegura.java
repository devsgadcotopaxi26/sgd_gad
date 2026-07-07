/*
 * Copyright (C) 2026
 * Authors: Misael Fernández, FIRMASEGURA S.A.S.
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
package ec.gob.firmadigital.libreria.certificate.ec.firmasegura.ext;

import ec.gob.firmadigital.libreria.certificate.ec.CertificadoRepresentanteLegal;
import static ec.gob.firmadigital.libreria.certificate.ec.firmasegura.CertificadoFirmaSegura.Ext.*;
import java.security.cert.X509Certificate;

/**
 * Certificado de Representante Legal<br>
 * emitido por FIRMASEGURA S.A.S.
 *
 * @author Misael Fernández, FIRMASEGURA S.A.S.
 */
public class CertificadoExtRepresentanteLegalFirmaSegura
        extends CertificadoExtImplFirmaSegura
        implements CertificadoRepresentanteLegal {

    public CertificadoExtRepresentanteLegalFirmaSegura(X509Certificate certificado) {
        super(certificado);
    }

    @Override
    public String getRazonSocial() {
        return getExtensionField(OID_RAZON_SOCIAL);
    }

    @Override
    public String getCargo() {
        return getExtensionField(OID_CARGO);
    }
}
