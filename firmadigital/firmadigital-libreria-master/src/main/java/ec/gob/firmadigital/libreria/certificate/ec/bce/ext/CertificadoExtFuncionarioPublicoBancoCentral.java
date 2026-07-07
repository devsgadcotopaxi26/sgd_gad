/*
 * Copyright (C) 2026 
 * Authors: Misael Fernández, BANCO CENTRAL DEL ECUADOR
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
package ec.gob.firmadigital.libreria.certificate.ec.bce.ext;

import ec.gob.firmadigital.libreria.certificate.ec.CertificadoFuncionarioPublico;
import static ec.gob.firmadigital.libreria.certificate.ec.bce.CertificadoBancoCentral.Ext.*;
import java.security.cert.X509Certificate;

/**
 * Certificado de Funcionario Publico<br>
 * emitido por el BANCO CENTRAL DEL ECUADOR
 *
 * @author Misael Fernández, BANCO CENTRAL DEL ECUADOR
 */
public class CertificadoExtFuncionarioPublicoBancoCentral
        extends CertificadoExtImplBancoCentral
        implements CertificadoFuncionarioPublico {

    public CertificadoExtFuncionarioPublicoBancoCentral(X509Certificate certificado) {
        super(certificado);
    }

    @Override
    public String getInstitucion() {
        return getExtensionField(OID_INSTITUCION);
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
