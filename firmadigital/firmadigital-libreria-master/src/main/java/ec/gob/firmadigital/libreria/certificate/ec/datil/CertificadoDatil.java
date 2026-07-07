/*
 * Copyright (C) 2026 
 * Authors: Misael Fernández, DATILMEDIA S.A.
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
package ec.gob.firmadigital.libreria.certificate.ec.datil;

/**
 * Clase contenedora para los Identificadores de Objeto (OIDs) utilizados en
 * certificados digitales.
 *
 * Agrupa los OIDs en clases anidadas estáticas según su ubicación dentro del
 * certificado (Subject o Extensions) para una mejor organización y claridad.
 *
 * @author Misael Fernández, DATILMEDIA S.A.
 */
public class CertificadoDatil {

    private CertificadoDatil() {
    }

    /**
     * OIDs encontrados en el Subject del certificado X.509.
     */
    public static final class Subj {

        private Subj() {
        }

        // OIDs de tipo de certificado.
        public static final String OID_TIPO_PERSONA_NATURAL = "1.3.6.1.4.1.52643.2.1.1";
        public static final String OID_TIPO_MIEMBRO_EMPRESA = "1.3.6.1.4.1.52643.2.2.1";
        public static final String OID_TIPO_REPRESENTANTE_LEGAL = "1.3.6.1.4.1.52643.2.3.1";
        public static final String OID_TIPO_SELLO_ELECTRONICO = "1.3.6.1.4.1.52643.102.2.4.1";
        public static final String OID_TIPO_SELLO_TIEMPO = "1.3.6.1.4.1.52643.102.2.5.1";
    }

    /**
     * OIDs encontrados en las extensiones del certificado X.509.
     */
    public static final class Ext {

        private Ext() {
        }

        // OIDs de tipo de certificado:
        public static final String OID_TIPO_PERSONA_NATURAL = "1.3.6.1.4.1.52643.2.5.1";
        public static final String OID_TIPO_PERSONA_JURIDICA = "1.3.6.1.4.1.52643.2.5.2";

        // OIDs de Campos del Certificado:
        public static final String OID_CEDULA_PASAPORTE = "1.3.6.1.4.1.52643.3.1";
        public static final String OID_NOMBRES = "1.3.6.1.4.1.52643.3.2";
        public static final String OID_APELLIDO_1 = "1.3.6.1.4.1.52643.3.3";
        public static final String OID_APELLIDO_2 = "1.3.6.1.4.1.52643.3.4";
        public static final String OID_CARGO = "1.3.6.1.4.1.52643.3.5";
        public static final String OID_DIRECCION = "1.3.6.1.4.1.52643.3.7";
        public static final String OID_TELEFONO = "1.3.6.1.4.1.52643.3.8";
        public static final String OID_CIUDAD = "1.3.6.1.4.1.52643.3.9";
        public static final String OID_RAZON_SOCIAL = "1.3.6.1.4.1.52643.3.10";
        public static final String OID_RUC = "1.3.6.1.4.1.52643.3.11";
        public static final String OID_PAIS = "1.3.6.1.4.1.52643.3.12";
        public static final String OID_PROFESION = "1.3.6.1.4.1.52643.3.30";
        public static final String OID_NUMERO_FACTURA = "1.3.6.1.4.1.52643.3.32";
    }
}
