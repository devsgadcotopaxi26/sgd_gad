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
package ec.gob.firmadigital.servicio.util;

import ec.gob.firmadigital.libreria.keystore.Alias;
import ec.gob.firmadigital.libreria.keystore.FileKeyStoreProvider;
import ec.gob.firmadigital.libreria.keystore.KeyStoreProvider;
import ec.gob.firmadigital.libreria.keystore.KeyStoreUtilities;
import ec.gob.firmadigital.servicio.exception.ServicioValidarCertificadoDigitalException;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.KeyStore;
import java.security.KeyStoreException;
import java.util.Base64;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 *
 * @author Misael Fernández
 */
public class Pkcs12 {

    public static KeyStore getKeyStore(String pkcs12, String password) throws KeyStoreException {
        byte decodedPkcs12[] = Base64.getDecoder().decode(pkcs12);
        KeyStoreProvider ksp = null;
        try (InputStream inputStreamPkcs12 = new ByteArrayInputStream(decodedPkcs12);) {
            ksp = new FileKeyStoreProvider(inputStreamPkcs12);
        } catch (IOException ex) {
            Logger.getLogger(Pkcs12.class.getName()).log(Level.SEVERE, null, ex);
        }
        return ksp.getKeystore(password.toCharArray());
    }

    public static String getAlias(KeyStore keyStore) throws ServicioValidarCertificadoDigitalException {
        String aliasString = null;
        List<Alias> signingAliases = KeyStoreUtilities.getSigningAliases(keyStore);
        if (signingAliases.isEmpty()) {
            throw new ServicioValidarCertificadoDigitalException("No se encuentran certificados para firmar\nPuede estar expirado, revocado o no reconocido");
        }
        if (signingAliases.size() >= 1) {
            aliasString = signingAliases.get(0).getAlias();
        }
        return aliasString;
    }
}
