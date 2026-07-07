/*
 * Copyright (C) 2026 
 * Authors: Misael Fernández
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
package ec.gob.firmadigital.libreria.certificate.ec.subj;

/**
 * Clase contenedora para los Identificadores de Objeto (OIDs) utilizados en
 * certificados digitales.
 *
 * @author Misael Fernández
 */
public final class AttributeOIDs {

    private AttributeOIDs() {
    }

    // OIDs de Campos del Certificado.
    public static final String OID_COMMON_NAME = "2.5.4.3";
    public static final String OID_CEDULA_PASAPORTE = "2.5.4.5";
    public static final String OID_APELLIDOS = "2.5.4.4";
    public static final String OID_NOMBRES = "2.5.4.42";
    public static final String OID_PAIS = "2.5.4.6";
    public static final String OID_CIUDAD = "2.5.4.7";
    public static final String OID_RUC = "2.5.4.97";
    public static final String OID_ORGANIZACION = "2.5.4.10";
    public static final String OID_DEPARTAMENTO = "2.5.4.11";
    public static final String OID_CARGO = "2.5.4.12";
}
