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
package ec.gob.firmadigital.libreria.utils;

import com.google.zxing.BinaryBitmap;
import com.google.zxing.LuminanceSource;
import com.google.zxing.Result;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.common.HybridBinarizer;
import com.google.zxing.qrcode.QRCodeReader;
import com.google.zxing.qrcode.QRCodeWriter;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import java.io.File;
import java.io.FileInputStream;
import java.util.EnumMap;

/**
 * Created by gustavo.peiretti on 14/09/2015.
 * http://gustavopeiretti.com/java-generar-codigo-qr/
 * https://github.com/zxing/zxing
 */
public class QRCode {

    public static byte[] generateQR(String text, int h, int w) throws Exception {
        // Generamos el mapa de caracterìsticas que requerimos para el QR
        java.util.Map<com.google.zxing.EncodeHintType, Object> hints = new EnumMap<>(
                com.google.zxing.EncodeHintType.class);
        // En nuestro caso particular agregamos soporte para el español con la
        // codificación ISO-8859-1
        hints.put(com.google.zxing.EncodeHintType.CHARACTER_SET, java.nio.charset.StandardCharsets.US_ASCII.name());// ISO_8859_1
        // Desde la versión 3.2.1 de Zxing podemos establecer el tamaño del borde, por
        // default es 4
        hints.put(com.google.zxing.EncodeHintType.MARGIN, 0);
        // Agregamos la correción de error del QR
        hints.put(com.google.zxing.EncodeHintType.ERROR_CORRECTION,
                com.google.zxing.qrcode.decoder.ErrorCorrectionLevel.L);

        QRCodeWriter writer = new QRCodeWriter();
        BitMatrix bitMatrix = writer.encode(text, com.google.zxing.BarcodeFormat.QR_CODE, w, h, hints);

        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(bitMatrix, "png", bos);
        bos.close();
        return bos.toByteArray();
    }

    public static String decoder(File file) throws Exception {

        FileInputStream inputStream = new FileInputStream(file);

        BufferedImage image = ImageIO.read(inputStream);

        LuminanceSource source = new BufferedImageLuminanceSource(image);
        BinaryBitmap bitmap = new BinaryBitmap(new HybridBinarizer(source));

        // decode the barcode
        QRCodeReader reader = new QRCodeReader();
        Result result = reader.decode(bitmap);
        return new String(result.getText());
    }
}
