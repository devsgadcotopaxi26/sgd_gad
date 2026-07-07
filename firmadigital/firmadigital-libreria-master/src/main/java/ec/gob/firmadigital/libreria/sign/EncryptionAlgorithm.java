/*
 * Copyright (C) 2021 
 * Authors: Ricardo Arguello
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
package ec.gob.firmadigital.libreria.sign;

import java.security.Key;

public enum EncryptionAlgorithm {

    /**
     * RSA
     */
    RSA("RSA");

    /**
     * The name of the algorithm
     */
    private String name;

    /**
     * Default constructor
     *
     * @param name {@link String} algorithm name
     */
    EncryptionAlgorithm(String name) {
        this.name = name;
    }

    /**
     * Get the algorithm name
     *
     * @return the name
     */
    public String getName() {
        return name;
    }

    /**
     * Returns the encryption algorithm associated to the given key.
     *
     * @param key the key
     * @return the linked encryption algorithm
     * @throws IllegalArgumentException if the key doesn't match any algorithm
     */
    public static EncryptionAlgorithm forKey(Key key) {
        return forName(key.getAlgorithm());
    }

    /**
     * Returns the encryption algorithm associated to the given JCE name.
     *
     * @param name the encryption algorithm name
     * @return the linked encryption algorithm
     * @throws IllegalArgumentException if the name doesn't match any algorithm
     */
    public static EncryptionAlgorithm forName(final String name) {
        for (EncryptionAlgorithm encryptionAlgo : values()) {
            if (encryptionAlgo.getName().equals(name) || encryptionAlgo.name().equals(name)) {
                return encryptionAlgo;
            }
        }
        throw new IllegalArgumentException("Unsupported algorithm: " + name);
    }
}
