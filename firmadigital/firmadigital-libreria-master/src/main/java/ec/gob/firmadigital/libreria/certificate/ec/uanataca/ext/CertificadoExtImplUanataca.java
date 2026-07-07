/*
 * Copyright (C) 2026 
 * Authors: Misael Fernández, UANATACA ECUADOR S.A.
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
package ec.gob.firmadigital.libreria.certificate.ec.uanataca.ext;

import ec.gob.firmadigital.libreria.certificate.Certificado;
import static ec.gob.firmadigital.libreria.certificate.ec.uanataca.CertificadoUanataca.Ext.*;
import java.security.cert.X509Certificate;

/**
 * El certificado contiene OIDs como extensiones.<br>
 * emitido por UANATACA ECUADOR S.A.
 *
 * @author Misael Fernández, UANATACA ECUADOR S.A.
 */
public class CertificadoExtImplUanataca
        extends Certificado {

    public CertificadoExtImplUanataca(X509Certificate certificado) {
        super(certificado);
    }

    public String getCedulaPasaporte() {
        return getSubjectAlternativeName(OID_CEDULA_PASAPORTE);
    }

    public String getNombres() {
        return getSubjectAlternativeName(OID_NOMBRES);
    }

    public String getPrimerApellido() {
        return getSubjectAlternativeName(OID_APELLIDO_1);
    }

    public String getSegundoApellido() {
        return getSubjectAlternativeName(OID_APELLIDO_2);
    }

    public String getDireccion() {
        return getSubjectAlternativeName(OID_DIRECCION);
    }

    public String getTelefono() {
        return getSubjectAlternativeName(OID_TELEFONO);
    }

    public String getCiudad() {
        return getSubjectAlternativeName(OID_CIUDAD);
    }

    public String getPais() {
        return getSubjectAlternativeName(OID_PAIS);
    }

    public String getRuc() {
        return getSubjectAlternativeName(OID_RUC);
    }
}
