/*
 * Copyright (C) 2020 
 * Authors: Ricardo Arguello, Misael Fernández
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.*
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
package ec.gob.firmadigital.libreria.keystore;

import java.io.IOException;
import java.security.KeyStore;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.security.Provider;
import java.security.Security;
import java.security.cert.CertificateException;

/**
 * Implementacion de <code>KeyStoreProvider</code> para utilizar con
 * dispositivos fisicos tipo PKCS#11 (Token USB, Smart Card, etc).
 * https://docs.oracle.com/en/java/javase/17/security/pkcs11-reference-guide1.html#GUID-C4ABFACB-B2C9-4E71-A313-79F881488BB9
 *
 * Utiliza internamente la clase <code>sun.security.pkcs11.SunPKCS11</code> para
 * acceder al API de PKCS#11 provisto en Java, por tanto funciona solo con el
 * JVM de Sun Microsystems.
 *
 * @author Ricardo Arguello
 */
public abstract class PKCS11KeyStoreProvider implements KeyStoreProvider {

    private static final String SUN_PKCS11_PROVIDER_NAME = "SunPKCS11";

    /**
     * Obtiene la configuracion para el Provider, segun el sistema operativo que
     * se utilice.
     *
     * @return
     */
    public abstract String getConfig();

    public abstract boolean existeDriver();

    public abstract String getCfg();

    @Override
    public KeyStore getKeystore() throws KeyStoreException {
        return getKeystore(null);
    }

    @Override
    public KeyStore getKeystore(char[] password) throws KeyStoreException {
        try {
            Provider provider = Security.getProvider(SUN_PKCS11_PROVIDER_NAME);
            provider = provider.configure(getCfg());
            Security.addProvider(provider);

            KeyStore keyStore = KeyStore.getInstance("PKCS11");
            keyStore.load(null, password);
            return keyStore;
        } catch (CertificateException | NoSuchAlgorithmException | IOException | java.security.ProviderException e) {
            throw new KeyStoreException(e);
        }
    }
    
    protected static boolean is64bit() {
        return System.getProperty("sun.arch.data.model").contains("64");
    }
}
