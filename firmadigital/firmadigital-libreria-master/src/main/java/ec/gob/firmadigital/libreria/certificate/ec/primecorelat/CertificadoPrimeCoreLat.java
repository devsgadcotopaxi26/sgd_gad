/*
 * Copyright (C) 2026
 * Authors: Misael Fernández, PRIMECORELAT S.A.S. B.I.C.
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
package ec.gob.firmadigital.libreria.certificate.ec.primecorelat;

/**
 * Clase contenedora para los Identificadores de Objeto (OIDs) utilizados en
 * certificados digitales.
 *
 * Agrupa los OIDs en clases anidadas estáticas según su ubicación dentro del
 * certificado (Subject o Extensions) para una mejor organización y claridad.
 *
 * @author Misael Fernández, PRIMECORELAT S.A.S. B.I.C.
 */
public class CertificadoPrimeCoreLat {

    private CertificadoPrimeCoreLat() {
    }

    /**
     * OIDs encontrados en el Subject del certificado X.509.
     */
    public static final class Subj {

        private Subj() {
        }

        // OIDs de tipo de certificado.
        public static final String OID_TIPO_PERSONA_NATURAL = "1.3.6.1.4.1.63542.2.1.1";
        public static final String OID_TIPO_MIEMBRO_EMPRESA = "1.3.6.1.4.1.63542.2.2.1";
        public static final String OID_TIPO_REPRESENTANTE_LEGAL = "1.3.6.1.4.1.63542.2.3.1";
        public static final String OID_TIPO_SELLO_ELECTRONICO = "1.3.6.1.4.1.63542.102.2.4.1";
    }
}
