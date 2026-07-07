/*
 * Firma Digital: Servicio
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
package ec.gob.firmadigital.servicio.rest;

import ec.gob.firmadigital.servicio.crl.ServicioProxyCrl;
import jakarta.ejb.EJB;
import jakarta.ejb.Stateless;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.FormParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

/**
 * REST endpoint para el proxy de validacion de revocacion de certificados.
 *
 * Permite a clientes que no tienen acceso directo a los servidores de las CAs
 * validar si un certificado esta revocado, enviando la URL del CRL y el serial
 * number del certificado.
 *
 * Endpoint: POST /proxycrl
 * Parametros:
 *   - serial (obligatorio): Serial number del certificado
 *   - crlUrl (opcional): URL del CRL Distribution Point
 *   - ocspUrl (opcional): URL del OCSP Responder
 *   - certBase64 (opcional): Certificado X.509 en Base64 (necesario para OCSP)
 *
 * @author FirmaEC
 */
@Stateless
@Path("/proxycrl")
public class ServicioProxyCrlRest {

    @EJB
    private ServicioProxyCrl servicioProxyCrl;

    @POST
    @Produces(MediaType.APPLICATION_JSON)
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public String verificarRevocacion(
            @FormParam("serial") String serial,
            @FormParam("crlUrl") String crlUrl,
            @FormParam("ocspUrl") String ocspUrl,
            @FormParam("certBase64") String certBase64) {

        if (serial == null || serial.trim().isEmpty()) {
            return "{\"revocado\":false,\"fechaRevocacion\":null,\"fuente\":null,"
                    + "\"error\":\"Se debe incluir el parametro serial\"}";
        }

        return servicioProxyCrl.verificarRevocacion(crlUrl, ocspUrl, serial, certBase64);
    }
}
