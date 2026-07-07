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

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.FormParam;
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

/**
 * Este servicio permite obtener la fecha y hora del servidor en formato
 * ISO-8601.
 *
 * @author Ricardo Arguello
 */
@Path("/fecha-hora")
public class ServicioFechaHora {

    /**
     * Nombre de la propiedad de sistema que contiene el archivo de
     * configuracion del servidor WildFly (standalone.xml)
     */
    private static final String WS_SYSTEM_PROPERTY = "firmadigital-servicio.url";

    // Servicio REST interno
    private static final String REST_SERVICE_URL = System.getProperty(WS_SYSTEM_PROPERTY) + "/version";

    /**
     * Retorna la fecha y hora del servidor, en formato ISO-8601.Por ejemplo:
     * "2017-08-27T17:54:43.562-05:00"
     *
     * @param base64
     * @return
     */
    @POST
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    @Produces(MediaType.TEXT_PLAIN)
    public String getFechaHora(@FormParam("base64") String base64) {
        try {
            String respuesta = buscarVersion(base64);

            String resultado;
            try {
                JsonObject jsonObject = new Gson().fromJson(respuesta, JsonObject.class);
                resultado = jsonObject.get("resultado").getAsString();
            } catch (NullPointerException | com.google.gson.JsonSyntaxException e) {
                return null;
            }

            if (resultado.equals("Version enabled")) {
                return ZonedDateTime.now().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
            } else {
                return null;
            }
        } catch (NotFoundException e) {
            return null;
//            return "No se encuentra el servidor de búsqueda";
        }
    }

    private String buscarVersion(String base64) throws NotFoundException {
        try (Client client = ClientBuilder.newClient()) {
            WebTarget target = client.target(REST_SERVICE_URL);
            Invocation.Builder builder = target.request();
            Form form = new Form();
            form.param("base64", base64);
            Invocation invocation = builder.buildPost(Entity.form(form));
            return invocation.invoke(String.class);
        }
    }
}
