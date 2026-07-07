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

import java.util.logging.Logger;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.client.Client;
import jakarta.ws.rs.client.ClientBuilder;
import jakarta.ws.rs.client.Invocation;
import jakarta.ws.rs.client.WebTarget;
import jakarta.ws.rs.core.MediaType;
import java.util.logging.Level;

/**
 * Permite validar la si un API URL es permitido.
 *
 * @author Ricardo Arguello
 */
@Path("/url")
public class ServicioApiUrl {

    /**
     * Nombre de la propiedad de sistema que contiene el archivo de
     * configuracion del servidor WildFly (standalone.xml)
     */
    private static final String WS_SYSTEM_PROPERTY = "firmadigital-servicio.url";

    // Servicio REST interno
    private static final String REST_SERVICE_URL = System.getProperty(WS_SYSTEM_PROPERTY) + "/apiurl";

    private static final Logger LOGGER = Logger.getLogger(ServicioApiUrl.class.getName());

    @GET
    @Path("{base64}")
    @Produces(MediaType.TEXT_PLAIN)
    public String validarEndpoint(@PathParam("base64") String base64) {
        LOGGER.log(Level.INFO, "base64={0}", base64);
        try {
            return buscarUrl(base64);
        } catch (NotFoundException e) {
            return "No se encuentra el servidor de búsqueda";
        }
    }

    private String buscarUrl(String base64) throws NotFoundException {
        try (Client client = ClientBuilder.newClient()) {
            WebTarget target = client.target(REST_SERVICE_URL).path("{base64}").resolveTemplate("base64", base64);
            Invocation.Builder builder = target.request();
            Invocation invocation = builder.buildGet();
            return invocation.invoke(String.class);
        }
    }
}
