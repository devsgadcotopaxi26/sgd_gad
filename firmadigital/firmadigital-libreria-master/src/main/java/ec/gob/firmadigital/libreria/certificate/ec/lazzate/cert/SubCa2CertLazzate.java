/*
 * Copyright (C) 2026
 * Authors: Misael Fernández, LAZZATE CIA. LTDA.
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
package ec.gob.firmadigital.libreria.certificate.ec.lazzate.cert;

import ec.gob.firmadigital.libreria.certificate.base.RubricaCertificate;

/**
 * Certificado intermedio representado como un objeto
 * <code>X509Certificate</code>.<br>
 * emitido por LAZZATE CIA. LTDA.
 *
 * @author Misael Fernández, LAZZATE CIA. LTDA.
 */
public class SubCa2CertLazzate extends RubricaCertificate {

    private static final StringBuilder stringBuilder;

    public SubCa2CertLazzate() {
        super(stringBuilder);
    }

    static {
        stringBuilder = new StringBuilder();
        stringBuilder.append("-----BEGIN CERTIFICATE-----\n");
        stringBuilder.append("MIIEPjCCAyagAwIBAgIUV4erTYAKKzD+cP6G4Ux/FVgRutEwDQYJKoZIhvcNAQEL\n");
        stringBuilder.append("BQAwgYkxCzAJBgNVBAYTAkVDMRIwEAYDVQQIDAlQSUNISU5DSEExDjAMBgNVBAcM\n");
        stringBuilder.append("BVFVSVRPMRswGQYDVQQKDBJMYXp6YXRlIENpYS4gTHRkYS4xHjAcBgNVBAsMFUVu\n");
        stringBuilder.append("dGUgZGUgQ2VydGlmaWNhY2lvbjEZMBcGA1UEAwwQTGF6emF0ZSBSb290IENBMjAg\n");
        stringBuilder.append("Fw0yMzExMjkyMjEzMzVaGA8yMDUzMTEyMTIyMTMzNVowRzELMAkGA1UEBhMCRUMx\n");
        stringBuilder.append("GzAZBgNVBAoMEkxhenphdGUgQ2lhLiBMdGRhLjEbMBkGA1UEAwwSTGF6emF0ZSBF\n");
        stringBuilder.append("bWlzb3IgQ0EyMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4aEiyb01\n");
        stringBuilder.append("IImhFv2k1o+QVL1Uhi12XQh6E7roZiIpcKlQkDG6UW6aUjwXXNHsADKe/5UZhEP6\n");
        stringBuilder.append("LFJAiTGPYEB818Ce5ONAs9P20EcNgox44rSQDpFVQffH7Hbp5Rq1QkCmU5I6NCW1\n");
        stringBuilder.append("ddraw6kxESjvtoIrHy/eGrtt9ptTOS7IHA5pZS+wu1liD6K/HTrIdKHTsQSMiYPy\n");
        stringBuilder.append("cVqZ2mUWtjRR7qxLCFV4thRYSOr+qVVmrhICR8pO4u5MGRLLidUR8gPZXmWCYKXu\n");
        stringBuilder.append("Fv0RTuztYnihYt9KgP4cnQBj56hb+i3BOU1QuSYNdO+WMpG0Ujthqd1dYZMkxHjK\n");
        stringBuilder.append("EkiQryxlbFAZjwIDAQABo4HcMIHZMB0GA1UdDgQWBBTtdkiwCvHJhoYMTEZk0gb4\n");
        stringBuilder.append("zNW9PjAfBgNVHSMEGDAWgBQSyTRfn3cPf1bel04Kk50Tp3BtxzASBgNVHRMBAf8E\n");
        stringBuilder.append("CDAGAQH/AgEAMA4GA1UdDwEB/wQEAwIBhjA1BgNVHR8ELjAsMCqgKKAmhiRodHRw\n");
        stringBuilder.append("Oi8vZW5leHQyLnh5ei9jcmwvbGF6emF0ZUNBMi5jcmwwPAYIKwYBBQUHAQEEMDAu\n");
        stringBuilder.append("MCwGCCsGAQUFBzABhiBodHRwOi8vZW5leHQyLnh5ejo4Nzc3L2Fkc3Mvb2NzcDAN\n");
        stringBuilder.append("BgkqhkiG9w0BAQsFAAOCAQEAQ5WeUskOVYag1yIbsUg32XSUDahdY00LtOK0O3Y5\n");
        stringBuilder.append("sEZwW12OKyKc2h9LU7UK7NZKbfLXX2le8/IIPbiRkfQ6yvjUOx+keK9IWQ4mzjXb\n");
        stringBuilder.append("w7eW1JR1eBlwAZNhtZZRQfPhSEu8MQIFVSYZyaTSaq5yf3JocQjh//KS/QBM7OFy\n");
        stringBuilder.append("niwyPxW4Yl9UVJeCyneAAVkQvC1icM7BUowcEdyuQ2m4zs+myJN7eqWhKMJ2vSDF\n");
        stringBuilder.append("G3HeanHHZGN1nKFt0+dLT6oV2ul1BuXT9Vtcb4de742PKkeMFFBr3f9E6K6vKffG\n");
        stringBuilder.append("QtL+jnfzs/tMf9Ze9U6rHv6Cy13CZXwadteise3LV31P6g==\n");
        stringBuilder.append("-----END CERTIFICATE-----\n");
    }
}
