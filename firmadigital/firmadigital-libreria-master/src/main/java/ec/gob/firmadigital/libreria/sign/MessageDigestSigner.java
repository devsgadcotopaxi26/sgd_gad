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
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public abstract class MessageDigestSigner extends BaseSigner {

    public MessageDigestSigner(DigestAlgorithm digestAlgorithm, EncryptionAlgorithm encryptionAlgorithm) {
        super(digestAlgorithm, encryptionAlgorithm);
    }

    @Override
    public byte[] sign(byte[] data) throws GeneralSecurityException {
        byte[] digest = digest(data);
        return signDigest(digest);
    }

    public abstract byte[] signDigest(byte[] digest) throws GeneralSecurityException;

    private byte[] digest(byte[] data) throws NoSuchAlgorithmException {
        MessageDigest messageDigest = digestAlgorithm.getMessageDigest();
        messageDigest.update(data);
        return messageDigest.digest();
    }
}
