/*
 * Copyright (C) 2026 
 * Authors: Misael Fernández, CONSEJO DE LA JUDICATURA
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
package ec.gob.firmadigital.libreria.certificate.ec.cj;

/**
 * Clase contenedora para los Identificadores de Objeto (OIDs) utilizados en
 * certificados digitales.
 *
 * Agrupa los OIDs en clases anidadas estáticas según su ubicación dentro del
 * certificado (Subject o Extensions) para una mejor organización y claridad.
 *
 * @author Misael Fernández, CONSEJO DE LA JUDICATURA
 */
public class CertificadoConsejoJudicatura {

    private CertificadoConsejoJudicatura() {
    }

    /**
     * OIDs encontrados en el Subject del certificado X.509.
     */
    public static final class Subj {

//        private Subj() {
//        }
//
//        // OIDs de tipo de certificado.
//        public static final String OID_TIPO_PERSONA_NATURAL = "1.3.6.1.4.1.56105.2.1.1";
//        public static final String OID_TIPO_MIEMBRO_EMPRESA = "1.3.6.1.4.1.56105.2.2.1";
//        public static final String OID_TIPO_REPRESENTANTE_LEGAL = "1.3.6.1.4.1.56105.2.3.1";
    }

    /**
     * OIDs encontrados en las extensiones del certificado X.509.
     */
    public static final class Ext {

        private Ext() {
        }
        // OIDs de tipo de certificado:
        public static final String OID_TIPO_PERSONA_NATURAL_HW_TOKEN = "1.3.6.1.4.1.43745.1.2.1.1.1.1";     // Certificado de Persona Natural - Hardware - Token/Tarjeta
        public static final String OID_TIPO_PERSONA_NATURAL_HW_HSM_SFC = "1.3.6.1.4.1.43745.1.2.1.1.1.2";   // Certificado de Persona Natural - Hardware - HSM SFC
        public static final String OID_TIPO_PERSONA_NATURAL_HW_HSM = "1.3.6.1.4.1.43745.1.2.1.1.1.3";       // Certificado de Persona Natural - Hardware - HSM
        public static final String OID_TIPO_PERSONA_NATURAL_SW_PKCS12 = "1.3.6.1.4.1.43745.1.2.1.1.2.1";    // Certificado de Persona Natural - Software - Archivo (PKCS #12)

        public static final String OID_TIPO_PERSONA_JURIDICA_PRIVADA_HW_TOKEN = "1.3.6.1.4.1.43745.1.2.1.2.1.1";    // Certificados de Persona Jurídica Privada - Hardware - Token/Tarjeta
        public static final String OID_TIPO_PERSONA_JURIDICA_PRIVADA_HW_HSM_SFC = "1.3.6.1.4.1.43745.1.2.1.2.1.2";  // Certificados de Persona Jurídica Privada - Hardware - HSM SFC
        public static final String OID_TIPO_PERSONA_JURIDICA_PRIVADA_SW_PKCS12 = "1.3.6.1.4.1.43745.1.2.1.2.2.1";   // Certificados de Persona Jurídica Privada - Software - Archivo (PKCS#12)    

        public static final String OID_TIPO_PERSONA_JURIDICA_PUBLICA_HW_TOKEN = "1.3.6.1.4.1.43745.1.2.1.3.1.1";    // Certificado de Persona Jurídica Pública - Hardware - Token/Tarjeta
        public static final String OID_TIPO_PERSONA_JURIDICA_PUBLICA_HW_HSM_SFC = "1.3.6.1.4.1.43745.1.2.1.3.1.2";  // Certificado de Persona Jurídica Pública - Hardware - HSM SFC
        public static final String OID_TIPO_PERSONA_JURIDICA_PUBLICA_HW_HSM = "1.3.6.1.4.1.43745.1.2.1.3.1.3";      // Certificado de Persona Jurídica Pública - Hardware - HSM
        public static final String OID_TIPO_PERSONA_JURIDICA_PUBLICA_SW_PKCS12 = "1.3.6.1.4.1.43745.1.2.1.3.2.1";   // Certificado de Persona Jurídica Pública - Software - Archivo (PKCS#12)

        public static final String OID_TIPO_MIEMBRO_EMPRESA_HW_TOKEN = "1.3.6.1.4.1.43745.1.2.1.4.1.1";     // Certificado de Miembro de Empresa - Hardware - Token/Tarjeta
        public static final String OID_TIPO_MIEMBRO_EMPRESA_HW_HSM_SFC = "1.3.6.1.4.1.43745.1.2.1.4.1.2";   // Certificado de Miembro de Empresa - Hardware - HSM SFC
        public static final String OID_TIPO_MIEMBRO_EMPRESA_HW_HSM = "1.3.6.1.4.1.43745.1.2.1.4.1.3";       // Certificado de Miembro de Empresa - Hardware - HSM
        public static final String OID_TIPO_MIEMBRO_EMPRESA_SW_PKCS12 = "1.3.6.1.4.1.43745.1.2.1.4.2.1";    // Certificado de Miembro de Empresa - Software - Archivo (PKCS #12)

        public static final String OID_TIPO_EMPRESA_HW_HSM_SFC = "1.3.6.1.4.1.43745.1.2.2.1.1.2";   // Certificado - Empresa o Institución - Hardware - HSM Remoto SFC
        public static final String OID_TIPO_EMPRESA_HW_HSM = "1.3.6.1.4.1.43745.1.2.2.1.2.1";       // Certificado de Empresa o Institución - Hardware - HSM

        public static final String OID_TIPO_DEPARTAMENTO_EMPRESA_HW_HSM_SFC = "1.3.6.1.4.1.43745.1.2.3.1.1.2";  // Certificado de Departamento de Empresa o Institución - Hardware - HSM SFC
        public static final String OID_TIPO_DEPARTAMENTO_EMPRESA_SW_PKCS12 = "1.3.6.1.4.1.43745.1.2.3.1.2.1";   // Certificado de Departamento de Empresa o Institución - Software - Archivo (PKCS #12)

        public static final String OID_SELLADO_TIEMPO = "1.3.6.1.4.1.43745.1.2.4.1.1.3";            // Certificado de Sellado de Tiempo

        // OIDs de Campos del Certificado:
        public static final String OID_CEDULA_PASAPORTE = "1.3.6.1.4.1.43745.1.3.1";
        public static final String OID_NOMBRES = "1.3.6.1.4.1.43745.1.3.2";
        public static final String OID_APELLIDO_1 = "1.3.6.1.4.1.43745.1.3.3";
        public static final String OID_APELLIDO_2 = "1.3.6.1.4.1.43745.1.3.4";
        public static final String OID_CARGO = "1.3.6.1.4.1.43745.1.3.5";
        public static final String OID_INSTITUCION = "1.3.6.1.4.1.43745.1.3.6";
        public static final String OID_DIRECCION = "1.3.6.1.4.1.43745.1.3.7";
        public static final String OID_TELEFONO = "1.3.6.1.4.1.43745.1.3.8";
        public static final String OID_CIUDAD = "1.3.6.1.4.1.43745.1.3.9";
        public static final String OID_RAZON_SOCIAL = "1.3.6.1.4.1.43745.1.3.10";
        public static final String OID_RUC = "1.3.6.1.4.1.43745.1.3.11";
        public static final String OID_PAIS = "1.3.6.1.4.1.43745.1.3.12";
        public static final String OID_CERTIFICADO = "1.3.6.1.4.1.43745.1.3.50";
        public static final String OID_CONTENEDOR = "1.3.6.1.4.1.43745.1.3.51";
        public static final String OID_RUP = "1.3.6.1.4.1.43745.1.3.52";
        public static final String OID_PROFESION = "1.3.6.1.4.1.43745.1.3.53";
        public static final String OID_DEPARTAMENTO = "1.3.6.1.4.1.43745.1.3.54";
    }
}
