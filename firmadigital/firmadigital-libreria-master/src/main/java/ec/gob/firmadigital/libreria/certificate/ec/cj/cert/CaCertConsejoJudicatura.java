/*
 * Copyright (C) 2026 
 * Authors: Misael Fernández, CONSEJO DE LA JUDICATURA
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
package ec.gob.firmadigital.libreria.certificate.ec.cj.cert;

import ec.gob.firmadigital.libreria.certificate.base.RubricaCertificate;

/**
 * Certificado raiz representado como un objeto
 * <code>X509Certificate</code>.<br>
 * emitido por CONSEJO DE LA JUDICATURA
 *
 * @author Misael Fernández, CONSEJO DE LA JUDICATURA
 */
public class CaCertConsejoJudicatura extends RubricaCertificate {

    private static final StringBuilder stringBuilder;

    public CaCertConsejoJudicatura() {
        super(stringBuilder);
    }

    static {
        stringBuilder = new StringBuilder();
        stringBuilder.append("-----BEGIN CERTIFICATE-----\n");
        stringBuilder.append("MIIGpjCCBI6gAwIBAgIIclcPl1CWUaYwDQYJKoZIhvcNAQELBQAwgboxCzAJBgNV\n");
        stringBuilder.append("BAYTAkVDMREwDwYDVQQHDAhETSBRVUlUTzEhMB8GA1UECgwYQ09OU0VKTyBERSBM\n");
        stringBuilder.append("QSBKVURJQ0FUVVJBMUQwQgYDVQQLDDtTVUJESVJFQ0NJT04gTkFDSU9OQUwgREUg\n");
        stringBuilder.append("U0VHVVJJREFEIERFIExBIElORk9STUFDSU9OIEROVElDUzEvMC0GA1UEAwwmSUNF\n");
        stringBuilder.append("UlQtRUMgRU5USURBRCBERSBDRVJUSUZJQ0FDSU9OIFJBSVowHhcNMTQxMDE2MTc0\n");
        stringBuilder.append("MDEzWhcNMzQxMDE2MTc0MDEzWjCBujELMAkGA1UEBhMCRUMxETAPBgNVBAcMCERN\n");
        stringBuilder.append("IFFVSVRPMSEwHwYDVQQKDBhDT05TRUpPIERFIExBIEpVRElDQVRVUkExRDBCBgNV\n");
        stringBuilder.append("BAsMO1NVQkRJUkVDQ0lPTiBOQUNJT05BTCBERSBTRUdVUklEQUQgREUgTEEgSU5G\n");
        stringBuilder.append("T1JNQUNJT04gRE5USUNTMS8wLQYDVQQDDCZJQ0VSVC1FQyBFTlRJREFEIERFIENF\n");
        stringBuilder.append("UlRJRklDQUNJT04gUkFJWjCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIB\n");
        stringBuilder.append("AMKpj1qmAlDFg+c2e1tCMij8c5+SAv6DIbDX7664wssD1baWNz7tjMLsHekxr5CR\n");
        stringBuilder.append("RgUq82leyxqFRpBaURxaRMwrys9sSPO5qfln5HM/4I8lRzR+RTD67JGqEI8U1YVf\n");
        stringBuilder.append("LwGYPqC5NTMaK/PKQ0ZoOfk6sgEx5o7XErB6CjSbr2d/ahlt8JL+KShvTkYqtHoM\n");
        stringBuilder.append("kg9a/1jPGKLHiLIxFstf+4L6ss/c4X6HwsjxEVTATuU3ByNVrVItPfxU2fxUsA7D\n");
        stringBuilder.append("JHPS2/mRFmHRuWMOzMoK2H0idavF0vqce1wWyaUbIeKE4NnLvE/Y0ONhVcNwRStl\n");
        stringBuilder.append("1lYix6Llf/5FW+AIJlwI3f8AvpS3sNGLGs27RxM0kklJS6iJx/q1GhoYIsglNJDO\n");
        stringBuilder.append("LDnRfEPwHx9oVa39xV0qvfwQsF4I+alUW2wafTcJtfv0NZHEmj2KcfgosCF0Zeji\n");
        stringBuilder.append("aA3lyA9gQaIARGzF74ui4vj4dkfdf7hOSEp8LSEz7zZH52O8X4rKEKzHQeoTxbzP\n");
        stringBuilder.append("vqLFAhORxpMSkx+n7xUJpGSDLwy3rsTX865j4fokH/IxJylcOeChPcKoMa+P02Zf\n");
        stringBuilder.append("FWi9TrUlyiGe0x2V/8n47IhPRQPiFFN90U3Ct96zAYYSw0jmHy6ktGHRJcGTlw1P\n");
        stringBuilder.append("PYqbcghot0/pB126IFgFx5oiN3VReTXo86yadAxkRm17AgMBAAGjga0wgaowHQYD\n");
        stringBuilder.append("VR0OBBYEFHPIw70P+VVA8WWYelijZ0gfcJ0bMA8GA1UdEwEB/wQFMAMBAf8waAYD\n");
        stringBuilder.append("VR0gBGEwXzBdBgRVHSAAMFUwUwYIKwYBBQUHAgEWR2h0dHA6Ly93d3cuaWNlcnQu\n");
        stringBuilder.append("ZmplLmdvYi5lYy9kcGMvZGVjbGFyYWNpb25fcHJhY3RpY2FzX2NlcnRpZmljYWNp\n");
        stringBuilder.append("b24ucGRmMA4GA1UdDwEB/wQEAwIBBjANBgkqhkiG9w0BAQsFAAOCAgEAkUMleJaH\n");
        stringBuilder.append("8gPVbe3fmLUvOGI5rWMaa3La2LRWkSCzh0TtyBnjMYsSSwEmnsHA71KXwC6rNVwK\n");
        stringBuilder.append("yA4Q9cCytLHb3ewMpuFRAIprrDoCeUxmX4/SlHUOlwJ9oE22dYa6+BiW7OYFMjcc\n");
        stringBuilder.append("EfwYKce9dXc73+TeyJKKZBYoHWDUSQ2+RbTAjLLxyd+pM5GPZe6/WdgjEhYHxWYu\n");
        stringBuilder.append("F7tDMmsk1KqHQWbzA50mPJ9KdrApYt/hf9zZ7Z6+iAdY8yUHzuuSuY2YxyUorPHl\n");
        stringBuilder.append("yOCT2snOqYMq5pyxECnzNyPmtghmVKSa6NE/mCL+VVWalejZsnwq4Bk5U3s/Lpau\n");
        stringBuilder.append("G7n6vpoo4chqNWzHMz+AGukE7Umvb+2UtAyTzZTYCDdwYQCuy0CnG5eM6qxJJbg5\n");
        stringBuilder.append("k+pqUexMvUDFTIuF+HZUVEZcNAhhXi+Fhg3MqJZoCRJHRFt+0D1QG6bNJ4Lq3oH7\n");
        stringBuilder.append("wuOf+wRY7JAaK1FT8lYqD2kLr2if8f0GlAYBUtEqeRdGRh0PYQgcHHM+Sf4QOUNP\n");
        stringBuilder.append("3JN8sVJQZLMWD5D6PHznd19im3T1+SJqWvUQespDi6IYnmlXyjoUtIIpuQGgrlfc\n");
        stringBuilder.append("OcZ17gRrAIbpPfZNTuakG2Q8q1MmSt1CCArLFpTvLoDigNRsMYSwdaeEjJQvIzSK\n");
        stringBuilder.append("yUlekcadxaa0YzaiQOdpExKqoTrZZtN9d9U=\n");
        stringBuilder.append("-----END CERTIFICATE-----");
    }
}
