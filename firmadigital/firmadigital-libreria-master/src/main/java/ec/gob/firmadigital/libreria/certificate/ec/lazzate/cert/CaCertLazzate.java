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
 * Certificado raiz representado como un objeto
 * <code>X509Certificate</code>.<br>
 * emitido por LAZZATE CIA. LTDA.
 *
 * @author Misael Fernández, LAZZATE CIA. LTDA.
 */
public class CaCertLazzate extends RubricaCertificate {

    private static final StringBuilder stringBuilder;

    public CaCertLazzate() {
        super(stringBuilder);
    }

    static {
        stringBuilder = new StringBuilder();
        stringBuilder.append("-----BEGIN CERTIFICATE-----\n");
        stringBuilder.append("MIIEyzCCA7OgAwIBAgIUTWuFyYRCM4bAog3Hy1L3GOcMGcswDQYJKoZIhvcNAQEL\n");
        stringBuilder.append("BQAwgbYxCzAJBgNVBAYTAkVDMRowGAYDVQQIExFRdWl0byAtIFBpY2hpbmNoYTEO\n");
        stringBuilder.append("MAwGA1UEBxMFUXVpdG8xJDAiBgkqhkiG9w0BCQEWFWNlcnRpZmljYWRvc0BlbmV4\n");
        stringBuilder.append("dC5lYzEbMBkGA1UEChMSTGF6emF0ZSBDaWEuIEx0ZGEuMR4wHAYDVQQLExVFbnRl\n");
        stringBuilder.append("IGRlIENlcnRpZmljYWNpb24xGDAWBgNVBAMTD0xhenphdGUgUm9vdCBDQTAgFw0y\n");
        stringBuilder.append("MjEwMTMxNjAzNTFaGA8yMDUyMTAxMzE2MDM1MVowgbYxCzAJBgNVBAYTAkVDMRow\n");
        stringBuilder.append("GAYDVQQIExFRdWl0byAtIFBpY2hpbmNoYTEOMAwGA1UEBxMFUXVpdG8xJDAiBgkq\n");
        stringBuilder.append("hkiG9w0BCQEWFWNlcnRpZmljYWRvc0BlbmV4dC5lYzEbMBkGA1UEChMSTGF6emF0\n");
        stringBuilder.append("ZSBDaWEuIEx0ZGEuMR4wHAYDVQQLExVFbnRlIGRlIENlcnRpZmljYWNpb24xGDAW\n");
        stringBuilder.append("BgNVBAMTD0xhenphdGUgUm9vdCBDQTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCC\n");
        stringBuilder.append("AQoCggEBAMW9RmxCvmsrgpc5UGnISJKR4j9h3nuxx/BYt60Ew9oEmE6Wi13xzyhB\n");
        stringBuilder.append("aJ3CHTZKSkMd+pDb2BlIW5Y2bAeRjcEEFJIDLfqHsm/nOG3BOt31FKqYiaicYMfM\n");
        stringBuilder.append("gKJfnSh4KtyeVcrsPWeK6npruLyQvnNj14CTkgFSwZXOFejI8rwcH5f1/AuvjAzw\n");
        stringBuilder.append("K+EWcsFxfVwW+RxPI4enmriFZktSvXoAPmT918jU2jvydUCZi71poQw2On6WXOVa\n");
        stringBuilder.append("GxKHk9YX5OWy6abLWNgbDhdWVf7hMsQTuO+lml2+qEll7rwYDt+o/CLzLbX3FeRt\n");
        stringBuilder.append("fPzPVRz/TvzDKN+69Ntk9ToV28LBwjcCAwEAAaOBzDCByTAOBgNVHQ8BAf8EBAMC\n");
        stringBuilder.append("AQYwDwYDVR0TAQH/BAUwAwEB/zCBhgYDVR0gBH8wfTB7BgkrBgEEAYPPdgEwbjBs\n");
        stringBuilder.append("BggrBgEFBQcCAjBgDF5FbCBwcmVzZW50ZSBjZXJ0aWZpY2FkbyBlcyBlbWl0aWRv\n");
        stringBuilder.append("IGVuIGJhc2UgYSBsYXMgcG9sw610aWNhcyBkZSBzZWd1cmlkYWQgZGUgTGF6emF0\n");
        stringBuilder.append("ZSBDaWEuIEx0ZGEuMB0GA1UdDgQWBBTglvbH1objRpAwR55drZ9Nz0TVsDANBgkq\n");
        stringBuilder.append("hkiG9w0BAQsFAAOCAQEAVneZ4igXcgT8zVhiVLMmkfgdggC7W+Y5/+p1WNb5cvtY\n");
        stringBuilder.append("XuTzp0A5KTxVIaSvzdWeFhX59EkTJByC1UkopTU0JmbdlWCFoS6QLccX9gjYRqqp\n");
        stringBuilder.append("WQ0tm983a6+bl4mjR34jOHS+nFawDGSAPXzbGTk93OuiMMH/nsPX9wC7lltZK7+/\n");
        stringBuilder.append("O4VXwOcB/3KgaC4kzI+VVGz9ejB424G7zLy6W+fvn4RqWADW+QCC5Hmd6Apy9IyD\n");
        stringBuilder.append("owE05uoE5MCA0yAsEN5eZEq3XbvsdzfKOuJp9Uxh9MgnuKvU7ptG/Wvh27b0MmKA\n");
        stringBuilder.append("n/RnpZEaz2BYnOrDkyEubpwTHkYFIq9oojwwrcLd1A==\n");
        stringBuilder.append("-----END CERTIFICATE-----");
    }
}
