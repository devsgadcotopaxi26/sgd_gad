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

import ec.gob.firmadigital.libreria.certificate.Certificado;
import static ec.gob.firmadigital.libreria.certificate.ec.bce.CertificadoBancoCentral.Ext.*;
import java.security.cert.X509Certificate;

/**
 * El certificado contiene OIDs como extensiones.<br>
 * emitido por BANCO CENTRAL DEL ECUADOR
 *
 * @author Misael Fernández, BANCO CENTRAL DEL ECUADOR
 */
public class CertificadoExtImplBancoCentral
        extends Certificado {

    public CertificadoExtImplBancoCentral(X509Certificate certificado) {
        super(certificado);
    }

    public String getCedulaPasaporte() {
        return getExtensionField(OID_CEDULA_PASAPORTE);
    }

    public String getNombres() {
        return getExtensionField(OID_NOMBRES);
    }

    public String getPrimerApellido() {
        return getExtensionField(OID_APELLIDO_1);
    }

    public String getSegundoApellido() {
        return getExtensionField(OID_APELLIDO_2);
    }

    public String getDireccion() {
        return getExtensionField(OID_DIRECCION);
    }

    public String getTelefono() {
        return getExtensionField(OID_TELEFONO);
    }

    public String getCiudad() {
        return getExtensionField(OID_CIUDAD);
    }

    public String getPais() {
        return getExtensionField(OID_PAIS);
    }

    public String getRuc() {
        return getExtensionField(OID_RUC);
    }
}
