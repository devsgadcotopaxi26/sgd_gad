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

/**
 *
 * @author Misael Fernández
 */
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;
import java.io.IOException;

@Provider
public class RequestSizeFilter implements ContainerRequestFilter {

    @Override
    public void filter(ContainerRequestContext requestContext) throws IOException {
        String uri = requestContext.getUriInfo().getRequestUri().toString();
        System.out.println(">>> API FILTER: Recibida peticion en URI: " + uri);
        
        String matchedPath = "";
        if (!requestContext.getUriInfo().getMatchedURIs().isEmpty()) {
            matchedPath = requestContext.getUriInfo().getMatchedURIs().get(0);
        }

        String requestSizeProp;
        switch (matchedPath) {
            case "appverificardocumento" -> {
                requestSizeProp = "firmadigital-api-mobile.appverificardocumento.request.size";
            }
            case "appvalidarcertificadodigital" -> {
                requestSizeProp = "firmadigital-api-mobile.appvalidarcertificadodigital.request.size";
            }
            case "appfirmardocumento" -> {
                requestSizeProp = "firmadigital-api-mobile.appfirmardocumento.request.size";
            }
            case "appfirmardocumentotransversal" -> {
                requestSizeProp = "firmadigital-api-mobile.appfirmardocumentotransversal.request.size";
            }
            default -> {
                requestSizeProp = "firmadigital-api.request.size";
            }
        }
        
        int maxRequestSize = (System.getProperty(requestSizeProp)) != null
                ? Integer.parseInt(System.getProperty(requestSizeProp)) : 512000;//KB
        long contentLength = requestContext.getLength();
        
        if (requestContext.getMethod().equals("POST") && contentLength > (maxRequestSize * 1024)) {
            requestContext.abortWith(Response.status(Response.Status.REQUEST_ENTITY_TOO_LARGE)
                    .entity("La solicitud no puede exceder los " + maxRequestSize / 1024 + " MB - api")
                    .build());
        }
    }
}
