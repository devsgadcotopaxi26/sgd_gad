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

import java.security.GeneralSecurityException;
import java.security.NoSuchAlgorithmException;
import java.security.PrivateKey;
import java.security.Signature;

public class PrivateKeySigner extends BaseSigner {

    private final PrivateKey privateKey;

    public PrivateKeySigner(PrivateKey privateKey, DigestAlgorithm digestAlgorithm) {
        super(digestAlgorithm, EncryptionAlgorithm.forName(privateKey.getAlgorithm()));
        this.privateKey = privateKey;
    }

    @Override
    public byte[] sign(byte[] message) throws GeneralSecurityException {
        try {
            Signature sig = getSignature();
            sig.initSign(privateKey);
            sig.update(message);
            return sig.sign();
        } catch (NoSuchAlgorithmException e) {
            throw new GeneralSecurityException(e);
        }
    }

    private Signature getSignature() throws NoSuchAlgorithmException {
        String algorithm = getDigestAlgorithm().getName() + "with" + getEncryptionAlgorithm().getName();
        return Signature.getInstance(algorithm);
    }
}
