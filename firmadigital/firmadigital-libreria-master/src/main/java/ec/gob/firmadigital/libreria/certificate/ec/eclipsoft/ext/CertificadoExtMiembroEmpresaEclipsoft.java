/*
 * Copyright (C) 2026 
 * Authors: Misael Fernández, ECLIPSOFT S.A.
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
package ec.gob.firmadigital.libreria.certificate.ec.eclipsoft.ext;

import ec.gob.firmadigital.libreria.certificate.ec.CertificadoPersonaJuridica;
import static ec.gob.firmadigital.libreria.certificate.ec.eclipsoft.CertificadoEclipsoft.Ext.*;
import java.security.cert.X509Certificate;

/**
 * Certificado de Miembro de Empresa<br>
 * emitido por el ECLIPSOFT S.A.
 *
 * @author Misael Fernández, ECLIPSOFT S.A.
 */
public class CertificadoExtMiembroEmpresaEclipsoft
        extends CertificadoExtImplEcplipsoft
        implements CertificadoPersonaJuridica {

    public CertificadoExtMiembroEmpresaEclipsoft(X509Certificate certificado) {
        super(certificado);
    }

    @Override
    public String getRazonSocial() {
        return getSubjectAlternativeName(OID_RAZON_SOCIAL);
    }

    @Override
    public String getCargo() {
        return getSubjectAlternativeName(OID_CARGO);
    }
}
