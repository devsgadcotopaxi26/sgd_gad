/*
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
package ec.gob.firmadigital.libreria.certificate;

import ec.gob.firmadigital.libreria.utils.HttpClient;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigInteger;
import java.security.KeyStoreException;
import java.security.cert.CRLException;
import java.security.cert.CertificateException;
import java.security.cert.CertificateFactory;
import java.security.cert.X509CRL;
import java.security.cert.X509CRLEntry;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 *
 * @author mfernandez
 */
public class TestDownloadCrl {

    public static final String CRL1 = "http://crl1.uanataca.com/public/pki/crl/CA2subordinada.crl";
    public static final String CRL2 = "http://crl.appfirmas.com/crl/appfirmas/9dd7d200-d3f5-45d3-9de4-69446907163d.crl";

    private static final Logger LOGGER = Logger.getLogger(TestDownloadCrl.class.getName());

    public static void main(String args[]) throws KeyStoreException, Exception {
        X509CRL entidadCertificacionCrl = downloadCrl(CRL2);
        insertarCrl(entidadCertificacionCrl);

    }

    private static void insertarCrl(X509CRL crl) throws SQLException {
        // Existen CRLs?
        if (crl.getRevokedCertificates() == null) {
            System.out.println("no existen revocados");
        }

        for (X509CRLEntry cert : crl.getRevokedCertificates()) {
            BigInteger serial = cert.getSerialNumber();
            Date fechaRevocacion = cert.getRevocationDate();
            String razonRevocacion = cert.getRevocationReason() == null ? "" : cert.getRevocationReason().toString();
            LocalDateTime ldt = LocalDateTime.ofInstant(fechaRevocacion.toInstant(), ZoneId.systemDefault());

            System.out.println("serial: " + serial);
            System.out.println("fechaRevocacion: " + fechaRevocacion);
            System.out.println("razonRevocacion: " + razonRevocacion);
            System.out.println("ldt: " + ldt);
        }
    }

    private static X509CRL downloadCrl(String url) {
        byte[] content;

        try {
            HttpClient http = new HttpClient();
            content = http.download(url);
        } catch (IOException e) {
            LOGGER.log(Level.SEVERE, "Error al descargar CRL de {0}: {1}", new Object[]{url, e.getMessage()});
            return null;
        }

        try {
            CertificateFactory cf = CertificateFactory.getInstance("X.509");
            return (X509CRL) cf.generateCRL(new ByteArrayInputStream(content));
        } catch (CertificateException | CRLException e) {
            LOGGER.log(Level.SEVERE, "Error al descargar CRL de {0}: {1}", new Object[]{url, e.getMessage()});
            return null;
        }
    }
}
