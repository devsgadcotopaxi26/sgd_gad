/*
 * Firma Digital: API
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
package ec.gob.firmadigital.api;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.FormParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.client.Client;
import jakarta.ws.rs.client.ClientBuilder;
import jakarta.ws.rs.client.Entity;
import jakarta.ws.rs.client.Invocation;
import jakarta.ws.rs.client.WebTarget;
import jakarta.ws.rs.core.Form;
import jakarta.ws.rs.core.MediaType;

/**
 * Proxy REST para el servicio de validacion de revocacion de certificados.
 *
 * Este endpoint actua como gateway publico, reenviando las solicitudes
 * al servicio interno firmadigital-servicio.
 *
 * @author FirmaEC
 */
@Path("/proxycrl")
public class ServicioProxyCrl {

    /**
     * Propiedad de sistema que contiene la URL base de firmadigital-servicio.
     */
    private static final String WS_SYSTEM_PROPERTY = "firmadigital-servicio.url";

    /**
     * URL del servicio REST interno.
     */
    private static final String REST_SERVICE_URL = System.getProperty(WS_SYSTEM_PROPERTY) + "/proxycrl";

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

        try (Client client = ClientBuilder.newClient()) {
            WebTarget target = client.target(REST_SERVICE_URL);
            Form form = new Form();
            form.param("serial", serial);
            if (crlUrl != null && !crlUrl.isEmpty()) {
                form.param("crlUrl", crlUrl);
            }
            if (ocspUrl != null && !ocspUrl.isEmpty()) {
                form.param("ocspUrl", ocspUrl);
            }
            if (certBase64 != null && !certBase64.isEmpty()) {
                form.param("certBase64", certBase64);
            }
            Invocation.Builder builder = target.request(MediaType.APPLICATION_JSON);
            Invocation invocation = builder.buildPost(Entity.form(form));
            return invocation.invoke(String.class);
        }
    }
}
