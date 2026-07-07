/*
 * Firma Digital: Servicio
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
package ec.gob.firmadigital.servicio.exception;

/**
 * Excepcion lanzada en caso de problemas en la validación del documento.
 *
 * @author Christian Espinosa, Misael Fernández
 */
public class ProblemaDocumentoException extends Exception {

    public ProblemaDocumentoException() {
    }

    public ProblemaDocumentoException(String message) {
        super(message);
    }

    public ProblemaDocumentoException(Throwable cause) {
        super(cause);
    }

    public ProblemaDocumentoException(String message, Throwable cause) {
        super(message, cause);
    }
}
