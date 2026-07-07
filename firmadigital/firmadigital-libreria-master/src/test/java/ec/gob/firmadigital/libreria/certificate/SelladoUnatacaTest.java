/*
 * Copyright (C) 2021 
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
package ec.gob.firmadigital.libreria.certificate;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.List;

import ec.gob.firmadigital.libreria.certificate.to.Certificado;
import ec.gob.firmadigital.libreria.certificate.to.Documento;
import ec.gob.firmadigital.libreria.utils.FileUtils;
import ec.gob.firmadigital.libreria.utils.PropertiesUtils;
import ec.gob.firmadigital.libreria.utils.Utils;

/**
 * @author Edison Lomas Almeida
 * @since Mar 17, 2023
 */
public class SelladoUnatacaTest {

    private static final String FILE_PATH = "/Users/elomas/Downloads/uanataca/TEST sellado de tiempo.pdf";
//	private static final String FILE_PATH = "/Users/elomas/Downloads/uanataca/TEST firmatradicional v3.pdf";
    private static SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

    public static void main(String[] args) {
        try {
            File file = new File(FILE_PATH);
            byte[] docByteArray = FileUtils.fileConvertToByteArray(file);
            String extDocumento = FileUtils.getExtension(docByteArray);
            Documento documento = Utils.verificarDocumento(file, PropertiesUtils.versionBase64());
            List<Certificado> certificados = documento.getCertificados();
            certificados.stream().map(certificado -> {
                StringBuilder dataCert = new StringBuilder();
                dataCert.append("Cédula:\t");
                dataCert.append(certificado.getDatosUsuario().getCedula());
                dataCert.append("\nApellido:\t");
                String apellido = certificado.getDatosUsuario().getApellido();
                if (certificado.getDatosUsuario().getApellido() == null) {
                    apellido = "";
                }
                String nombre = certificado.getDatosUsuario().getNombre();
                if (certificado.getDatosUsuario().getNombre() == null) {
                    nombre = "";
                }
                dataCert.append(nombre + " " + nombre + "\t" + apellido + "\t" + certificado.getDatosUsuario().getInstitucion());
                dataCert.append("\nRazón / Localización:\t");
                dataCert.append(certificado.getDocReason() + "\t" + certificado.getDocReason());
                dataCert.append("\nEntidad Certificadora:\t");
                dataCert.append(certificado.getDocTimeStampIssuedBy());
                dataCert.append("\nFecha firmado:\t");
                dataCert.append(simpleDateFormat.format(certificado.getSignGenerated().getTime()));
                dataCert.append("\nFirma:\t");
                String validez;
                if (documento.getSignValidate().booleanValue()) {
                    validez = "Válida";
                } else {
                    validez = "Inválida";
                }
                if (!documento.getDocValidate().booleanValue() && extDocumento.toLowerCase().equals(".pdf")) {
                    validez = "Inválida";
                }
                dataCert.append(validez);
                return dataCert;
            }).forEachOrdered(dataCert -> {
                System.out.println("\nXXXXXXXXXXXXXXXXXXXXXXXXXX");
                System.out.println(dataCert.toString());
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

}
