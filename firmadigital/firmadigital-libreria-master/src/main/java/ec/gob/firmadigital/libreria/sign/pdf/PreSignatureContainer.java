/*
 * Copyright (C) 2022 
 * Authors: Misael Fernández
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
package ec.gob.firmadigital.libreria.sign.pdf;

import com.itextpdf.kernel.pdf.PdfDictionary;
import com.itextpdf.kernel.pdf.PdfName;
import com.itextpdf.signatures.BouncyCastleDigest;
import com.itextpdf.signatures.DigestAlgorithms;
import com.itextpdf.signatures.IExternalSignatureContainer;
import java.io.IOException;
import java.io.InputStream;
import java.security.GeneralSecurityException;

/**
 *
 * @author Misael Fernández
 */
public class PreSignatureContainer implements IExternalSignatureContainer {

    private PdfDictionary sigDic;
    private byte hash[];
    String hashAlgorithm;

    public PreSignatureContainer(PdfName filter, PdfName subFilter, String hashAlgorithm) {

        sigDic = new PdfDictionary();
        sigDic.put(PdfName.Filter, filter);
        sigDic.put(PdfName.SubFilter, subFilter);
        this.hashAlgorithm = hashAlgorithm;
    }

    @Override
    public byte[] sign(InputStream data) throws GeneralSecurityException {
        BouncyCastleDigest digest = new BouncyCastleDigest();
        try {
            this.hash = DigestAlgorithms.digest(data, digest.getMessageDigest(hashAlgorithm));
        } catch (IOException e) {
            throw new GeneralSecurityException("PreSignatureContainer signing exception", e);
        }
        return new byte[0];
    }

    @Override
    public void modifySigningDictionary(PdfDictionary signDic) {
        signDic.putAll(sigDic);

    }

    public byte[] getHash() {
        return hash;
    }

    public void setHash(byte hash[]) {
        this.hash = hash;
    }
}
