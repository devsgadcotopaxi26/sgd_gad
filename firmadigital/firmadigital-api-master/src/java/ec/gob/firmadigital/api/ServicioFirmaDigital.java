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
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.client.Client;
import jakarta.ws.rs.client.ClientBuilder;
import jakarta.ws.rs.client.Invocation;
import jakarta.ws.rs.client.Invocation.Builder;
import jakarta.ws.rs.client.WebTarget;
import jakarta.ws.rs.core.Form;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.Response.Status;

/**
 * Proxy para el servicio interno de Firma Digital.
 */
@Path("/")
public class ServicioFirmaDigital {

    private static final String WS_SYSTEM_PROPERTY = "firmadigital-servicio.url";

    @GET
    @Path("firmadigital")
    @Produces(MediaType.TEXT_PLAIN)
    public String verificarServicio() {
        return "Servicio API de Firma Digital Operativo";
    }

    @GET
    @Path("firmadigital/{token: .*}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response obtenerDocumentos(@PathParam("token") String token) {
        // LIMPIEZA AGRESIVA DEL TOKEN
        if (token.contains("firmadigital/")) {
            token = token.substring(token.lastIndexOf("firmadigital/") + 13);
        }
        if (token.startsWith("/")) {
            token = token.substring(1);
        }
        
        String baseUrl = System.getProperty("firmadigital-servicio.url");
        String fullUrl = baseUrl + "/documentos/" + token;
        System.out.println(">>> API PROXY: Llamando a Servicio en: " + fullUrl);
        
        try (Client client = ClientBuilder.newClient()) {
            WebTarget target = client.target(fullUrl);
            Builder builder = target.request(MediaType.APPLICATION_JSON);
            Invocation invocation = builder.buildGet();
            try {
                Response response = invocation.invoke();
                int statusCode = response.getStatus();
                String jsonResponse = response.readEntity(String.class);
                System.out.println(">>> API PROXY: Respuesta de Servicio: " + statusCode);
                
                if (statusCode == 200) {
                    return Response.ok(jsonResponse).header("Content-Length", jsonResponse.length()).build();
                } else {
                    System.out.println(">>> API PROXY: Error del Servicio (" + statusCode + "): " + jsonResponse);
                    return Response.status(statusCode).type(response.getMediaType()).entity(jsonResponse).build();
                }
            } catch (Exception e) {
                System.out.println(">>> API PROXY: ERROR al llamar a Servicio: " + e.getMessage());
                return Response.status(Status.INTERNAL_SERVER_ERROR).entity("Capa API: " + e.getMessage()).build();
            }
        }
    }

    @PUT
    @Path("firmadigital/{token: .*}")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response actualizarDocumentos(@PathParam("token") String token, @FormParam("json") String json, @FormParam("base64") String base64) {
        // LIMPIEZA AGRESIVA DEL TOKEN
        if (token.contains("firmadigital/")) {
            token = token.substring(token.lastIndexOf("firmadigital/") + 13);
        }
        if (token.startsWith("/")) {
            token = token.substring(1);
        }
        
        if (json == null) {
            return Response.status(Status.BAD_REQUEST).entity("Se debe incluir json").build();
        }
        if (base64 == null) {
            return Response.status(Status.BAD_REQUEST).entity("Se debe incluir base64").build();
        }

        String baseUrl = System.getProperty("firmadigital-servicio.url");
        String fullUrl = baseUrl + "/documentos/" + token;
        System.out.println(">>> API PROXY (PUT): Llamando a Servicio en: " + fullUrl);

        try (Client client = ClientBuilder.newClient()) {
            WebTarget target = client.target(fullUrl);
            Builder builder = target.request();
            Form form = new Form();
            form.param("json", json);
            form.param("base64", base64);
            Invocation invocation = builder.buildPut(jakarta.ws.rs.client.Entity.form(form));
            try {
                Response response = invocation.invoke();
                int statusCode = response.getStatus();
                String jsonResponse = response.readEntity(String.class);
                if (statusCode == 200) {
                    return Response.ok(jsonResponse).header("Content-Length", jsonResponse.length()).build();
                } else {
                    System.out.println(">>> API PROXY (PUT): Error del Servicio (" + statusCode + "): " + jsonResponse);
                    return Response.status(statusCode).type(response.getMediaType()).entity(jsonResponse).build();
                }
            } catch (Exception e) {
                System.out.println(">>> API PROXY (PUT): ERROR al llamar a Servicio: " + e.getMessage());
                return Response.status(Status.INTERNAL_SERVER_ERROR).entity("Capa API (PUT): " + e.getMessage()).build();
            }
        }
    }
}
