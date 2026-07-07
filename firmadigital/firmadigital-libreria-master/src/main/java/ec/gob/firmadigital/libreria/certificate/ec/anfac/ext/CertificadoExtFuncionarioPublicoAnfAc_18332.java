/*
 * Copyright (C) 2026 
 * Authors: Misael Fernández, ANFAC AUTORIDAD DE CERTIFICACION ECUADOR C.A.
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
package ec.gob.firmadigital.libreria.certificate.ec.anfac.ext;

import ec.gob.firmadigital.libreria.certificate.ec.CertificadoFuncionarioPublico;
import static ec.gob.firmadigital.libreria.certificate.ec.anfac.CertificadoAnfAc.Ext18332.*;
import java.security.cert.X509Certificate;

/**
 * Certificado de Funcionario Publico<br>
 * emitido por ANFAC AUTORIDAD DE CERTIFICACION ECUADOR C.A.
 *
 * @author Misael Fernández, ANFAC AUTORIDAD DE CERTIFICACION ECUADOR C.A.
 */
public class CertificadoExtFuncionarioPublicoAnfAc_18332
        extends CertificadoExtImplAnfAc_18332
        implements CertificadoFuncionarioPublico {

    public CertificadoExtFuncionarioPublicoAnfAc_18332(X509Certificate certificado) {
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

    @Override
    public String getInstitucion() {
        return getExtensionField(OID_INSTITUCION);
    }
}
