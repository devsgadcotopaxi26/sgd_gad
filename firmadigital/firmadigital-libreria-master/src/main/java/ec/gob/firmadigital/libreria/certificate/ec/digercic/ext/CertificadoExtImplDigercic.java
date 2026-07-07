/*
 * Copyright (C) 2026 
 * @author Misael Fernández, DIRECCIÓN GENERAL DE REGISTRO CIVIL, IDENTIFICACIÓN Y CEDULACIÓN
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

import ec.gob.firmadigital.libreria.certificate.Certificado;
import static ec.gob.firmadigital.libreria.certificate.ec.digercic.CertificadoDigercic.Ext.*;
import java.security.cert.X509Certificate;

/**
 * El certificado contiene OIDs como extensiones.<br>
 * emitido por DATILMEDIA S.A.
 *
 * @author Misael Fernández, DIRECCIÓN GENERAL DE REGISTRO CIVIL, IDENTIFICACIÓN
 * Y CEDULACIÓN
 */
public class CertificadoExtImplDigercic
        extends Certificado {

    public CertificadoExtImplDigercic(X509Certificate certificado) {
        super(certificado);
    }

    public String getCedulaPasaporte() {
        return getExtensionField(OID_CEDULA);
    }

    public String getNombres() {
        return getExtensionField("");
    }

    public String getPrimerApellido() {
        return getExtensionField(OID_APELLIDO);
    }

    public String getSegundoApellido() {
        return getExtensionField("");
    }

    public String getDireccion() {
        return getExtensionField("");
    }

    public String getTelefono() {
        return getExtensionField("");
    }

    public String getCiudad() {
        return getExtensionField("");
    }

    public String getPais() {
        return getExtensionField("");
    }

    public String getRuc() {
        return getExtensionField(OID_RUC);
    }
}
