/*
 * Firma Digital: API
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
package ec.gob.firmadigital.api;

import ec.gob.firmadigital.api.utils.UtilsJson;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.FormParam;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.NotFoundException;
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
import jakarta.ws.rs.core.Response;

/**
 * Estándar JWT.
 *
 * @author Misael Fernández
 */
@Path("/getjwt")
public class ServicioJWT {

    /**
     * Nombre de la propiedad de sistema que contiene el archivo de
     * configuracion del servidor WildFly (standalone.xml)
     */
    private static final String WS_SYSTEM_PROPERTY = "firmadigital-servicio.url";

    // Servicio REST interno
    private static final String REST_SERVICE_URL = System.getProperty(WS_SYSTEM_PROPERTY) + "/getjwt";

    private static final String API_KEY_HEADER_PARAMETER = "X-API-KEY";

    @POST
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    @Produces(MediaType.TEXT_PLAIN)
    public Response validarEndpoint(@HeaderParam(API_KEY_HEADER_PARAMETER) String apiKey, @FormParam("base64") String base64) {
        try {
            return Response.status(Response.Status.OK).entity(getJWT(apiKey, base64)).build();
        } catch (NotFoundException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(
                    UtilsJson.generarJsonResponse(
                            Response.Status.BAD_REQUEST.getStatusCode(),
                            "No se encuentra el servidor de búsqueda",
                            null)).build();
        }
    }

    private String getJWT(String apiKey, String base64) throws NotFoundException {
        try (Client client = ClientBuilder.newClient()) {
            WebTarget target = client.target(REST_SERVICE_URL);
            Invocation.Builder builder = target.request().header(API_KEY_HEADER_PARAMETER, apiKey);
            Form form = new Form();
            form.param("base64", base64);
            Invocation invocation = builder.buildPost(Entity.form(form));
            return invocation.invoke(String.class);
        }
    }
}
