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

import ec.gob.firmadigital.libreria.exceptions.CertificadoInvalidoException;
import ec.gob.firmadigital.libreria.exceptions.HoraServidorException;
import ec.gob.firmadigital.libreria.certificate.CertEcUtils;
import ec.gob.firmadigital.libreria.exceptions.EntidadCertificadoraNoValidaException;
import ec.gob.firmadigital.libreria.exceptions.RubricaException;
import java.security.KeyStore;
import java.security.KeyStoreException;
import java.security.cert.X509Certificate;

import ec.gob.firmadigital.libreria.certificate.to.DatosUsuario;
import ec.gob.firmadigital.libreria.exceptions.ConexionException;
import java.io.IOException;
import java.security.InvalidKeyException;
import java.util.Date;

/**
 * Utilidades para X509Certificate.
 *
 * @author Misael Fernández
 */
public class X509CertificateUtils {

    private String error = null;
    private String revocado = null;
    private boolean expirado = false;
    private boolean desconocido = false;

    public X509CertificateUtils() {
    }

    public boolean isExpirado() {
        return expirado;
    }

    public boolean isDesconocido() {
        return desconocido;
    }

    public String getRevocado() {
        return revocado;
    }

    public String getError() {
        return error;
    }

    public static String getCedulaRuc(KeyStore keyStore, String alias) throws EntidadCertificadoraNoValidaException {
        try {
            X509Certificate certificate = (X509Certificate) keyStore.getCertificate(alias);
            DatosUsuario datosUsuario = CertEcUtils.getDatosUsuarios(certificate);
            return (datosUsuario.getCedula() != null) ? datosUsuario.getCedula() : datosUsuario.getRuc();
        } catch (KeyStoreException e) {
            throw new RuntimeException(e);
        }
    }

    public boolean validarX509Certificate(X509Certificate x509Certificate, String apiUrl, String base64) throws RubricaException, KeyStoreException, EntidadCertificadoraNoValidaException, InvalidKeyException, CertificadoInvalidoException, IOException, HoraServidorException, ConexionException {
        java.text.SimpleDateFormat simpleDateFormat = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        boolean retorno = false;
        int diasAnticipacion = 0;
        if (x509Certificate != null) {
            String apiUrlFecha = null;
            String apiUrlRevocado = null;
            if (apiUrl != null) {
                apiUrlFecha = apiUrl + "/fecha-hora";
                apiUrlRevocado = apiUrl + "/certificado/fechaRevocado";
            }
            Date fechaHora = TiempoUtils.getFechaHora(apiUrlFecha, base64);

            Date fechaRevocado = UtilsCrlOcsp.validarFechaRevocado(x509Certificate, apiUrlRevocado);
            if (fechaRevocado != null && fechaRevocado.compareTo(fechaHora) <= 0) {
                revocado = simpleDateFormat.format(fechaRevocado.getTime());
            }
            if (fechaHora.compareTo(x509Certificate.getNotBefore()) <= 0 || fechaHora.compareTo(x509Certificate.getNotAfter()) >= 0) {
                expirado = true;
            } else {
                java.util.Calendar calendarRecordatorio = java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("America/Guayaquil"));
                calendarRecordatorio.setTime(x509Certificate.getNotAfter());
                calendarRecordatorio.add(java.util.Calendar.DATE, -diasAnticipacion);
                if (calendarRecordatorio.getTime().compareTo(fechaHora) <= 0) {
                    error = PropertiesUtils.getMessages().getProperty("mensaje.advertencia.certificado_advertencia") + simpleDateFormat.format(x509Certificate.getNotAfter().getTime());
                }
            }

            if (!ec.gob.firmadigital.libreria.utils.Utils.verifySignature(x509Certificate)) {
                desconocido = true;
            }

            if ((revocado != null) || expirado || desconocido) {
                error = PropertiesUtils.getMessages().getProperty("mensaje.error.certificado_invalido");
                retorno = false;
            } else {
                retorno = true;
            }
        }
        return retorno;
    }
}
