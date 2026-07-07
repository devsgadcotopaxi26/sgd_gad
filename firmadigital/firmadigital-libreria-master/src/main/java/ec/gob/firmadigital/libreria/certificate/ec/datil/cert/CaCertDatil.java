/*
 * Copyright (C) 2026 
 * Authors: Misael Fernández, DATILMEDIA S.A.
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
package ec.gob.firmadigital.libreria.certificate.ec.datil.cert;

import ec.gob.firmadigital.libreria.certificate.base.RubricaCertificate;

/**
 * Certificado raiz representado como un objeto
 * <code>X509Certificate</code>.<br>
 * emitido por DATILMEDIA S.A.
 *
 * @author Misael Fernández, DATILMEDIA S.A.
 */
public class CaCertDatil extends RubricaCertificate {

    private static final StringBuilder stringBuilder;

    static {
        stringBuilder = new StringBuilder();
        stringBuilder.append("-----BEGIN CERTIFICATE-----\n");
        stringBuilder.append("MIIGdDCCBFygAwIBAgIJANqb9ymH8dXxMA0GCSqGSIb3DQEBCwUAMIHGMQswCQYD\n");
        stringBuilder.append("VQQGEwJFQzEPMA0GA1UECAwGR3VheWFzMRIwEAYDVQQHDAlHdWF5YXF1aWwxGDAW\n");
        stringBuilder.append("BgNVBAoMD0RhdGlsbWVkaWEgUy5BLjEwMC4GA1UECwwnRW50aWRhZCBkZSBjZXJ0\n");
        stringBuilder.append("aWZpY2FjaW9uIGRlIGluZm9ybWFjaW9uMSkwJwYDVQQDDCBEYXRpbCBBdXRvcmlk\n");
        stringBuilder.append("YWQgZGUgQ2VydGlmaWNhY2lvbjEbMBkGCSqGSIb3DQEJARYMY2FAZGF0aWwuY29t\n");
        stringBuilder.append("MB4XDTIxMTIxNjEzMjMxMloXDTMxMTIxNDEzMjMxMlowgcYxCzAJBgNVBAYTAkVD\n");
        stringBuilder.append("MQ8wDQYDVQQIDAZHdWF5YXMxEjAQBgNVBAcMCUd1YXlhcXVpbDEYMBYGA1UECgwP\n");
        stringBuilder.append("RGF0aWxtZWRpYSBTLkEuMTAwLgYDVQQLDCdFbnRpZGFkIGRlIGNlcnRpZmljYWNp\n");
        stringBuilder.append("b24gZGUgaW5mb3JtYWNpb24xKTAnBgNVBAMMIERhdGlsIEF1dG9yaWRhZCBkZSBD\n");
        stringBuilder.append("ZXJ0aWZpY2FjaW9uMRswGQYJKoZIhvcNAQkBFgxjYUBkYXRpbC5jb20wggIiMA0G\n");
        stringBuilder.append("CSqGSIb3DQEBAQUAA4ICDwAwggIKAoICAQDEkvBcRWxA2JteO/kvD76ScA+DJFhf\n");
        stringBuilder.append("Xf//tser9D9/5To6+wBR6ElGLRUz1Jd+lS86WxUNb+sROGeCDnWrHkxlmPZHGJwh\n");
        stringBuilder.append("RsG3w8nO4nd53DZCnM5UazRr2NtJhB3f9cGwIhAJndlDGzJhP/CULBYtitzcZGNA\n");
        stringBuilder.append("VkTVj9bTjJODcZgUVFHwlR1p8Fn9cSZmtTyaP+72oSpUkhqtn0Al3SDESWw5iSiQ\n");
        stringBuilder.append("73HKPXoeeonm1g74zIznqC+qGOvXeP3DPI82rOHxM9aej33wNppPAcLvKdJGDdBE\n");
        stringBuilder.append("TYBuGY6JxbrESbxHURc6+V/6BiIEnvtONrj869rEEPv7veb+udPEV6s1bXM4g1I9\n");
        stringBuilder.append("FGxbZHDSnp50aBZ8s1RXywBaAr0SZAmf3G//s6BHZ5+KTuIgB5CknRsV/+uMEHLd\n");
        stringBuilder.append("oP96m9tD5Lu/IGrNHPIiXmkSmZS8N2lzeXtEuqzbkfqTJ4afje2t/Dla3V9Hetx2\n");
        stringBuilder.append("XvFqorVHfHGdwoxWuqwKsmkb3Vpe/PU6OuFL4v5i3SMgDyBsXhkfXMXX5aBJ4Kck\n");
        stringBuilder.append("A0SwKz6inYgpIA/qD1IxbEABwOYK36vE0+dkulcfleBRe4+L0ClL0iCsdZQMCUR5\n");
        stringBuilder.append("JVFP9vTVAspKlWcWfTpJhjFN7I4yCiTWRcvFwqyby0R0MEx5qNqI30nRD2hjOd3+\n");
        stringBuilder.append("ImWU/wC/Iy8AvwIDAQABo2MwYTAdBgNVHQ4EFgQUOV+p2rw5tOEiDtcsBMoBM9BW\n");
        stringBuilder.append("bHMwHwYDVR0jBBgwFoAUOV+p2rw5tOEiDtcsBMoBM9BWbHMwDwYDVR0TAQH/BAUw\n");
        stringBuilder.append("AwEB/zAOBgNVHQ8BAf8EBAMCAYYwDQYJKoZIhvcNAQELBQADggIBABQe2YfTNrD3\n");
        stringBuilder.append("uv+zBbIQsYCdlVXIm8MB3W+79vktwwByzuha53RXSQa+tCF0Ix7HLfqoRG1B6Voa\n");
        stringBuilder.append("hsv5FXTcWhyuFURD/CP/ne35HN+EsQ4F4ffFJXFEAwbFqrfwa/KPIx+HsQa4rLA7\n");
        stringBuilder.append("Ez4K7E2NyFHsjZhRJP0UgPO5bbxOD1lUAFyf4nJLSOykDxUK4E3GsT65gKB8H98l\n");
        stringBuilder.append("nA7jsVaKPtpjfZcwmuPS/aRSP3Q3uxADvC1TXdCc3B5mXslgx4UTV2JdlwLhyrlk\n");
        stringBuilder.append("BM4jScLLZAe5jc01YeNy32O90aeT4EDcLdm1QhiNPN7TdS//m46p0i1Axm4CktIH\n");
        stringBuilder.append("gvdOaTG4T+iVVXVEbVnTLlaCozGzJCePVPUoF5+otF4yf9WMrxqWq9Dz01o7q6+q\n");
        stringBuilder.append("DqCs74abCiTztbCzk5Eg1VFXJ+Xp8arIBgY5HfAFwEAu6HgOOSDe5W+xjqb3E0u0\n");
        stringBuilder.append("Q/p4MHNdVXf/5cU6Tee1FDCl4sv903GvheB3iVbbjegdNMjzu+SfsZgyXsIoA13O\n");
        stringBuilder.append("ijSLTVeNJTZPLuIVsbd+eM1joDhOGQKs0+2fpP0Pmiazio3EjKUZY+lm48O9+v1h\n");
        stringBuilder.append("ji3VJuXA3p3QHEKB+WhwFmb8qMlWOTBZkIs0Xi+JQGmWJ8G5HZ0ahM8WMUu9g9o2\n");
        stringBuilder.append("jkZBvTqwakKAsYbxHn40E0Ptyuw8AeG/\n");
        stringBuilder.append("-----END CERTIFICATE-----\n");
    }

    public CaCertDatil() {
        super(stringBuilder);
    }
}
