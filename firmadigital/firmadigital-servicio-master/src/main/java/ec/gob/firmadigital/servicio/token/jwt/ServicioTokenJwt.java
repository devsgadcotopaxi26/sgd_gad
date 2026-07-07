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
package ec.gob.firmadigital.servicio.token.jwt;

import ec.gob.firmadigital.servicio.token.ServicioToken;
import ec.gob.firmadigital.servicio.exception.TokenExpiradoException;
import ec.gob.firmadigital.servicio.exception.TokenInvalidoException;
import ec.gob.firmadigital.servicio.exception.Base64InvalidoException;
import java.util.Date;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import jakarta.annotation.PostConstruct;
import jakarta.ejb.Singleton;
import jakarta.ejb.Startup;
import jakarta.ejb.Lock;
import jakarta.ejb.LockType;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.SignatureException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.io.Encoders;

/**
 * Servicio para trabajar con tokens tipo JWT (https://jwt.io).
 *
 * La llave secreta para firmar los tokens se genera al iniciar la aplicacion.
 * Sin embargo, se puede almacenar una version en Base64 de la llave en el
 * archivo de configuracion del servidor WildFly (standalone.xml), asi:
 *
 * <pre>
 *   <system-properties>
 *     <property name="jwt.key" value= "Jgh46..." />
 *   </system-properties>
 * </pre>
 *
 * @author Ricardo Arguello
 */
@Singleton
@Startup
@Lock(LockType.READ)
public class ServicioTokenJwt implements ServicioToken {

    private static final Logger LOGGER = Logger.getLogger(ServicioTokenJwt.class.getName());

    /**
     * Llave secreta para firmar los tokens
     */
    private SecretKey secretKey;

    /**
     * Algoritmo de firma HMAC por defecto
     */
    private static final String DEFAULT_SIGNATURE_ALGORITHM = "HmacSHA512";

    /**
     * Nombre de la propiedad de sistema que contiene la llave secreta, en
     * formato Base64
     */
    private static final String KEY_SYSTEM_PROPERTY = "jwt.key";

    @PostConstruct
    public void init() {
        LOGGER.info("Inicializando llave secreta estática de TEXTO PLANO para entorno local...");
        // Usamos una cadena de texto larga y fija (más de 64 caracteres)
        String secret = "esta-es-una-cadena-de-texto-muy-pero-que-muy-larga-para-el-algoritmo-hs512-local-1234567890";
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        LOGGER.info("Llave secreta estática de TAMAÑO " + secret.length() + " cargada.");
    }

    /**
     * @param parametros
     * @see
     * ec.gob.firmadigital.servicio.ServicioToken#generarToken(java.util.Map)
     */
    @Override
    public String generarToken(Map<String, Object> parametros) {
        return generarToken(parametros, null);
    }

    /**
     * @param parametros
     * @see
     * ec.gob.firmadigital.servicio.ServicioToken#generarToken(java.util.Map,
     * java.util.Date)
     */
    @Override
    public String generarToken(Map<String, Object> parametros, Date expiracion) {
        String token = Jwts.builder()
                .claims(parametros)
                .expiration(expiracion)
                .signWith(secretKey)
                .compact();
        LOGGER.info("TOKEN GENERADO: " + token);
        return token;
    }

    /**
     * @see
     * ec.gob.firmadigital.servicio.ServicioToken#parseToken(java.lang.String)
     */
    @Override
    public Map<String, Object> parseToken(String token) throws TokenInvalidoException, TokenExpiradoException {
        try {
            return Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (MalformedJwtException e) {
            LOGGER.log(Level.SEVERE, "JWT Malformado: " + e.getMessage(), e);
            throw new TokenInvalidoException(e);
        } catch (SignatureException e) {
            LOGGER.log(Level.SEVERE, "Firma JWT NO COINCIDE: " + e.getMessage(), e);
            throw new TokenInvalidoException(e);
        } catch (UnsupportedJwtException | IllegalArgumentException e) {
            LOGGER.log(Level.SEVERE, "Error JWT: " + e.getMessage(), e);
            throw new TokenInvalidoException(e);
        } catch (ExpiredJwtException e) {
            LOGGER.log(Level.SEVERE, "Token JWT EXPIRADO: " + e.getMessage(), e);
            throw new TokenExpiradoException(e);
        }
    }

    /**
     * Genera una llave secreta para firmar los tokens.
     *
     * @return
     */
    public static SecretKey generarLlaveSecreta() {
        return Keys.secretKeyFor(SignatureAlgorithm.HS512);
    }

    /**
     * Genera una llave privada randómica para configurar como variable dentro
     * del archivo standalone.xml del servidor de aplicaciones WildFly/JBoss.
     *
     * Esta llave debe ser configurada en el servidor de aplicaciones WildFly,
     * en el archivo standalone.xml, en la sección <system-properties>:
     *
     * <pre>
     *  ...
     *  </extensions>
     *  <system-properties>
     *    <property name="jwt.key" value="tYdX9if...=="/>
     *  </system-properties>
     *  <management>
     *  ...
     * </pre>
     *
     * @param key
     * @return una llave privada en formato Base 64.
     */
    public static String codificarLlaveSecreta(SecretKey key) {
        return Encoders.BASE64.encode(key.getEncoded());
    }

    /**
     * Decodificar llave secreta en Base 64.
     *
     * @param keyBase64
     * @return
     * @throws Base64InvalidoException
     */
    public static SecretKey decodificarLlaveSecreta(String keyBase64) throws Base64InvalidoException {
        try {
            byte[] keyBytes = Decoders.BASE64.decode(keyBase64);
            return new SecretKeySpec(keyBytes, DEFAULT_SIGNATURE_ALGORITHM);
        } catch (Exception e) {
            throw new Base64InvalidoException(e);
        }
    }

    // Generar llave secreta randomica en Base 64
    public static void main(String[] args) {
        SecretKey key = generarLlaveSecreta();
        System.out.println("jwt.key: " + codificarLlaveSecreta(key));
    }
}
