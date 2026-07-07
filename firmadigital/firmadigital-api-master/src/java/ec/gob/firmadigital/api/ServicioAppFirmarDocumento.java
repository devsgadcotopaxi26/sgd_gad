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

import jakarta.ws.rs.Produces;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.FormParam;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.client.Client;
import jakarta.ws.rs.client.ClientBuilder;
import jakarta.ws.rs.client.Entity;
import jakarta.ws.rs.client.Invocation;
import jakarta.ws.rs.client.WebTarget;
import jakarta.ws.rs.core.Form;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.ClientErrorException;

/**
 * REST Web Service
 *
 * @author Christian Espinosa, Misael Fernández
 */
@Path("/appfirmardocumento")
public class ServicioAppFirmarDocumento extends RequestSizeFilter {

    /**
     * Nombre de la propiedad de sistema que contiene el archivo de
     * configuracion del servidor WildFly (standalone.xml)
     */
    private static final String WS_SYSTEM_PROPERTY = "firmadigital-servicio-mobile.url";

    // Servicio REST interno
    private static final String REST_SERVICE_URL = System.getProperty(WS_SYSTEM_PROPERTY) + "/appfirmardocumento";

    @POST
    @Produces(MediaType.APPLICATION_JSON)
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public String validarEndpointPost(@FormParam("jwt") String jwt,
            @FormParam("pkcs12") String pkcs12, @FormParam("password") String password,
            @FormParam("documento") String documento, @FormParam("json") String json,
            @FormParam("base64") String base64) {
        try {
            return firmarDocumento(jwt, pkcs12, password, documento, json, base64);
        } catch (NotFoundException e) {
            return "No se encuentra el servidor de búsqueda";
        } catch (ClientErrorException e) {
            return e.getMessage();
        } catch (WebApplicationException e) {
            String mensaje;
            System.out.println("WebApplicationException: " + e.getMessage());
            if (e.getResponse().hasEntity()) {
                mensaje = e.getResponse().readEntity(String.class);
            } else {
                mensaje = e.toString();
            }
            return mensaje;
        }
    }

    private String firmarDocumento(String jwt, String pkcs12, String password, String documento, String json, String base64) throws NotFoundException {
        try (Client client = ClientBuilder.newClient()) {
            WebTarget target = client.target(REST_SERVICE_URL);
            Invocation.Builder builder = target.request();
            Form form = new Form();
            form.param("jwt", jwt);
            form.param("pkcs12", pkcs12);
            form.param("password", password);
            form.param("documento", documento);
            form.param("json", json);
            form.param("base64", base64);
            Invocation invocation = builder.buildPost(Entity.form(form));
            return invocation.invoke(String.class);
        }
    }
}
