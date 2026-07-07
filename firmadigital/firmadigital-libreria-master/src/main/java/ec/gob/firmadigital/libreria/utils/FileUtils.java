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

import ec.gob.firmadigital.libreria.exceptions.HoraServidorException;
import java.awt.Desktop;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import javax.swing.JRootPane;
import org.apache.tika.config.TikaConfig;
import org.apache.tika.detect.DefaultDetector;
import org.apache.tika.detect.Detector;
import org.apache.tika.metadata.Metadata;
import org.apache.tika.mime.MediaType;
import org.apache.tika.mime.MimeType;
import org.apache.tika.mime.MimeTypeException;

/**
 * Utilidades para Archivos
 *
 * @author jdc
 */
public class FileUtils {

    public static String getFileExtension(File file) {
        String name = file.getName();
        try {
            return name.substring(name.lastIndexOf(".") + 1).toLowerCase();
        } catch (Exception e) {
            return null;
        }
    }

    public static byte[] fileConvertToByteArray(File file) throws IOException {
        Path documentoPath = Paths.get(file.getAbsolutePath());
        return Files.readAllBytes(documentoPath);
    }

    /**
     * Crea un fichero temporal con los datos.
     *
     * @param data Datos del fichero.
     * @return Fichero generado.
     * @throws IOException Cuando se produce un error durante la
     * generaci&oacute;n.
     */
    public static File byteArrayConvertToFile(byte[] data) throws IOException {
        // Genera el archivo temporal a partir del InputStream de entrada
        final File file = File.createTempFile("firmaec.rubrica.firmadigital.temp", null);
        try (final FileOutputStream fos = new FileOutputStream(file);) {
            fos.write(data);
            fos.flush();
            fos.close();
        }
        file.deleteOnExit();
        return file;
    }

    public static void saveByteArrayToDisc(byte[] archivo, String rutaNombre) throws FileNotFoundException, IOException {
        FileOutputStream fos = new FileOutputStream(rutaNombre);
        File arc = new File(rutaNombre);

        Long espacio = arc.getFreeSpace();

        if (archivo != null) {
            if (espacio < archivo.length) {
                throw new IOException("No se puede crear el archivo firmado. No hay espacio suficiente en el disco");
            }
            fos.write(archivo);
            fos.close();
        } else {
            throw new IOException("No se puede firmar un documento de 0 bytes");
        }
    }

    public static String crearNombreTemporal(File documento, String extension, String base64) throws IOException, HoraServidorException {
        String hora = (TiempoUtils.getFechaHoraServidor(null, base64).replace(":", "").replace(" ", "").replace(".", "").replace("-", "")).substring(0, 20);
        String nombre = crearNombre(documento);
        if (new File(nombre).exists()) {
            nombre = crearNombreTemporal(new File(nombre + "_new"), extension, base64);
        }
        return nombre + hora + extension;
    }

    public static String crearNombreFirmado(File documento, String extension) throws IOException {
        String nombre = crearNombre(documento) + "-signed" + extension;
        if (new File(nombre).exists()) {
            nombre = crearNombreFirmado(new File(nombre + "_new"), extension);
        }
        return nombre;
    }

    public static String crearNombreVerificado(File documento, String extension, String base64) throws IOException, HoraServidorException {
        String hora = (TiempoUtils.getFechaHoraServidor(null, base64).replace(":", "").replace(" ", "").replace(".", "").replace("-", "")).substring(0, 20);
        String nombre = crearNombre(documento);
        if (extension.isEmpty()) {
            extension = getExtension(nombre);
        }
        return nombre + "-verified-" + hora + extension;
    }

    private static String crearNombre(File documento) {
        String nombreCompleto = documento.getAbsolutePath();
        String nombre = nombreCompleto.replaceFirst("[.][^.]+$", "");
        return nombre;
    }

    public static String getExtension(byte[] documento) throws IOException, MimeTypeException {
        TikaConfig tikaConfig = TikaConfig.getDefaultConfig();
        Detector detector = new DefaultDetector();
        MediaType mediaType = detector.detect(new ByteArrayInputStream(documento), new Metadata());
        MimeType mimeType = tikaConfig.getMimeRepository().forName(mediaType.toString());
        return mimeType.getExtension();
    }

    public static String getExtension(String fileName) {
        String extension = "";
        if (fileName.contains(".")) {
            extension = "." + fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
        }
        return extension;
    }

    public static void abrirDocumento(String documento) throws IOException {
        String OS = System.getProperty("os.name").toLowerCase();
        if (OS.contains("win")) {
            String cmd = "rundll32 url.dll,FileProtocolHandler " + documento;
            Runtime.getRuntime().exec(cmd);
        } else {
            File doc = new File(documento);
            Desktop.getDesktop().open(doc);
        }
    }

    public static String rutaFichero(javax.swing.filechooser.FileNameExtensionFilter filtro, JRootPane jRootPane) {
        String ruta = "";
        javax.swing.JFileChooser jFileChooser = new javax.swing.JFileChooser(new java.io.File(System.getProperty("user.home")));
        jFileChooser.setAcceptAllFileFilterUsed(false);
        jFileChooser.setEnabled(false);
        jFileChooser.setFileFilter(filtro);

        int resultado = jFileChooser.showOpenDialog(jRootPane);
        if (resultado == javax.swing.JFileChooser.APPROVE_OPTION) {
            java.io.File file = new java.io.File(jFileChooser.getSelectedFile().toString());
            if (file.exists() && file.isFile()) {
                for (String filtre : filtro.getExtensions()) {
                    if (getFileExtension(file).equals(filtre)) {
                        ruta = file.toString();
                    }
                }
            }
        }
        return ruta;
    }

    public static java.util.List<String> rutaFicheros(javax.swing.filechooser.FileNameExtensionFilter filtro, JRootPane jRootPane) {
        java.util.List<String> ruta = new java.util.ArrayList<>();
        javax.swing.JFileChooser jFileChooser = new javax.swing.JFileChooser(new java.io.File(System.getProperty("user.home")));
        jFileChooser.setAcceptAllFileFilterUsed(false);
        jFileChooser.setEnabled(false);
        jFileChooser.setFileFilter(filtro);
        jFileChooser.setMultiSelectionEnabled(true);

        int resultado = jFileChooser.showOpenDialog(jRootPane);
        if (resultado == javax.swing.JFileChooser.APPROVE_OPTION) {
            java.io.File[] files = jFileChooser.getSelectedFiles();
            for (File file : files) {
                if (file.exists() && file.isFile()) {
                    for (String filtre : filtro.getExtensions()) {
                        if (getFileExtension(file).equals(filtre)) {
                            ruta.add(file.toString());
                        }
                    }
                }
            }
        }
        return ruta;
    }

    /**
     * Elimina los archivos con una determinada extensión de una carpeta
     *
     * @param path Carpeta de la cual eliminar los archivosq
     * @param constante Constante de los archivos a eliminar
     */
    public static void eliminarPorConstante(String path, final String constante) {
        File[] archivos = new File(path).listFiles((File archivo) -> {
            if (archivo.isFile() && archivo.exists()) {
                if (constante != null) {
                    return archivo.getName().startsWith(constante);
                }
            }
            return false;
        });
        for (File archivo : archivos) {
            archivo.delete();
        }
    }

    /**
     * Elimina los archivos con una determinada extensión de una carpeta
     *
     * @param path Carpeta de la cual eliminar los archivosq
     * @param extension Extensión de los archivos a eliminar
     */
    public static void eliminarPorExtension(String path, final String extension) {
        File[] archivos = new File(path).listFiles((File archivo) -> {
            if (archivo.isFile()) {
                if (extension != null) {
                    return archivo.getName().endsWith('.' + extension);
                }
            }
            return false;
        });
        for (File archivo : archivos) {
            archivo.delete();
        }
    }

    /**
     * Calcula el hash de un arreglo de bytes
     *
     * @param datos
     * @param algoritmo "MD5", "SHA-256", "SHA-512"
     * @return
     */
    public static String calcularHash(byte[] datos, String algoritmo) {
        try {
            MessageDigest digest = MessageDigest.getInstance(algoritmo);
            byte[] hashBytes = digest.digest(datos);
            return HexFormat.of().formatHex(hashBytes).toLowerCase();
        } catch (NoSuchAlgorithmException ex) {
            return ex.getMessage();
        }
    }

    /**
     * Valida si un hash coincide con los datos proporcionados
     *
     * @param datos
     * @param hashComparar
     * @param algoritmo "MD5", "SHA-256", "SHA-512"
     * @return
     */
    public static boolean validarHash(byte[] datos, String hashComparar, String algoritmo) {
        String hashCalculado = calcularHash(datos, algoritmo);
        return MessageDigest.isEqual(
                hashCalculado.getBytes(StandardCharsets.UTF_8),
                hashComparar.getBytes(StandardCharsets.UTF_8)
        );
    }
}
