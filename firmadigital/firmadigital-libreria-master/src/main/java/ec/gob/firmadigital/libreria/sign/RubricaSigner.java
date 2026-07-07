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
package ec.gob.firmadigital.libreria.sign;

import java.security.GeneralSecurityException;

/**
 * Permite la firma digital de documentos.
 *
 * @author Ricardo Arguello
 */
public interface RubricaSigner {

    /**
     * Returns the hash algorithm.
     *
     * @return The hash algorithm (e.g. "SHA-1", "SHA-256,...").
     */
    DigestAlgorithm getDigestAlgorithm();

    /**
     * Returns the encryption algorithm used for signing.
     *
     * @return The encryption algorithm ("RSA" or "DSA").
     */
    EncryptionAlgorithm getEncryptionAlgorithm();

    /**
     * Signs the given message using the encryption algorithm in combination
     * with the hash algorithm.
     *
     * @param message The message you want to be hashed and signed.
     * @return A signed message digest.
     * @throws GeneralSecurityException when requested cryptographic algorithm
     * or security provider is not available
     */
    byte[] sign(byte[] message) throws GeneralSecurityException;
}
