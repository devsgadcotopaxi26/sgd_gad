/*
 * Copyright (C) 2026 
 * Authors: Misael Fernández, BANCO CENTRAL DEL ECUADOR
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
package ec.gob.firmadigital.libreria.certificate.ec.bce.cert;

import ec.gob.firmadigital.libreria.certificate.base.RubricaCertificate;

/**
 * Certificado intermedio representado como un objeto
 * <code>X509Certificate</code>.<br>
 * emitido por BANCO CENTRAL DEL ECUADOR
 *
 * @author Misael Fernández, BANCO CENTRAL DEL ECUADOR
 */
public class SubCaCertBce20192029 extends RubricaCertificate {

    private static final StringBuilder stringBuilder;

    public SubCaCertBce20192029() {
        super(stringBuilder);
    }

    static {
        stringBuilder = new StringBuilder();
        stringBuilder.append("-----BEGIN CERTIFICATE-----\n");
        stringBuilder.append("MIII8zCCBtugAwIBAgIEW1yBoTANBgkqhkiG9w0BAQsFADCBwjELMAkGA1UEBhMC\n");
        stringBuilder.append("RUMxIjAgBgNVBAoTGUJBTkNPIENFTlRSQUwgREVMIEVDVUFET1IxNzA1BgNVBAsT\n");
        stringBuilder.append("LkVOVElEQUQgREUgQ0VSVElGSUNBQ0lPTiBERSBJTkZPUk1BQ0lPTi1FQ0lCQ0Ux\n");
        stringBuilder.append("DjAMBgNVBAcTBVFVSVRPMUYwRAYDVQQDEz1BVVRPUklEQUQgREUgQ0VSVElGSUNB\n");
        stringBuilder.append("Q0lPTiBSQUlaIERFTCBCQU5DTyBDRU5UUkFMIERFTCBFQ1VBRE9SMB4XDTE5MDcy\n");
        stringBuilder.append("NzEzMDIwMFoXDTI5MDcyNzEzMzIwMFowgaExCzAJBgNVBAYTAkVDMSIwIAYDVQQK\n");
        stringBuilder.append("ExlCQU5DTyBDRU5UUkFMIERFTCBFQ1VBRE9SMTcwNQYDVQQLEy5FTlRJREFEIERF\n");
        stringBuilder.append("IENFUlRJRklDQUNJT04gREUgSU5GT1JNQUNJT04tRUNJQkNFMQ4wDAYDVQQHEwVR\n");
        stringBuilder.append("VUlUTzElMCMGA1UEAxMcQUMgQkFOQ08gQ0VOVFJBTCBERUwgRUNVQURPUjCCAiIw\n");
        stringBuilder.append("DQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAM0jqNjiN6TxK5NevkojfVPjV2BP\n");
        stringBuilder.append("2dPGxevvAfbp9hrZVcUXPHP85sqKLol1ZQwDXV6sfWKpY1t4NsTftMYcKV1IZwwP\n");
        stringBuilder.append("HYaEqH40/arWW97cvLpfJ3FoAhoAAnJWPGWdDg+UApceIfvoQiSMiR7hCFerPyJ3\n");
        stringBuilder.append("PHkYMpYUOb74XjNQbq/ApuLtPvVLGqPeB10vrXf9LEHYHeoOrN0I1FR1OJU9rFdd\n");
        stringBuilder.append("G/POMGLueUXlbd8VHs/rvymU4so2MkCewbHpT70L1se/AZUcxN8zwNNsAhdfWCOQ\n");
        stringBuilder.append("ADV7/gsM6HaDm91gDNipYDkaCrqC/wwfbvliN3mVzgJ6p/ff2uwzSXl1Btq18+4M\n");
        stringBuilder.append("xnwagrDMouo18noYm1QHeFYauuYzZmCzLl5M7A6Gw6klGPsaWIvFpWmHzC9PDzi5\n");
        stringBuilder.append("BiYWAadCIzKfbSPwW4AznfDbyIhF3+OfH+x9VBFFkFt1H9q9RLU5r+Hw7ZYH3Ehd\n");
        stringBuilder.append("1ZMdkG6+G129w5k8UeKF33nv6WtS8HQuNMfSk4iVaFPGadRtl3SuhnDG4zb12olB\n");
        stringBuilder.append("wdmJUc/rd5d4tGA0iyrGLYeQsLaA0GSf1+gi4c62RplhibNjAsMn9zrdyAWhkqfd\n");
        stringBuilder.append("umsKd/1SfdHQAatCzwwOBOjBzAtnDlDrt/NcZsUMTjItsIpabX+qJf9vdSDHOLlp\n");
        stringBuilder.append("UPOzPY3wJrLVOMjnAgMBAAGjggMOMIIDCjB8BgNVHSAEdTBzMHEGCisGAQQBgqg7\n");
        stringBuilder.append("AQEwYzBhBggrBgEFBQcCARZVaHR0cDovL3d3dy5lY2kuYmNlLmVjL2F1dG9yaWRh\n");
        stringBuilder.append("ZC1jZXJ0aWZpY2FjaW9uL2RlY2xhcmFjaW9uLXByYWN0aWNhcy1jZXJ0aWZpY2Fj\n");
        stringBuilder.append("aW9uLnBkZjCCAhIGA1UdHwSCAgkwggIFMIICAaCCAf2gggH5pIHUMIHRMQswCQYD\n");
        stringBuilder.append("VQQGEwJFQzEiMCAGA1UEChMZQkFOQ08gQ0VOVFJBTCBERUwgRUNVQURPUjE3MDUG\n");
        stringBuilder.append("A1UECxMuRU5USURBRCBERSBDRVJUSUZJQ0FDSU9OIERFIElORk9STUFDSU9OLUVD\n");
        stringBuilder.append("SUJDRTEOMAwGA1UEBxMFUVVJVE8xRjBEBgNVBAMTPUFVVE9SSURBRCBERSBDRVJU\n");
        stringBuilder.append("SUZJQ0FDSU9OIFJBSVogREVMIEJBTkNPIENFTlRSQUwgREVMIEVDVUFET1IxDTAL\n");
        stringBuilder.append("BgNVBAMTBENSTDGGgfpsZGFwOi8vYmNlcWxkYXByYWl6cC5iY2UuZWMvY249Q1JM\n");
        stringBuilder.append("MSxjbj1BVVRPUklEQUQlMjBERSUyMENFUlRJRklDQUNJT04lMjBSQUlaJTIwREVM\n");
        stringBuilder.append("JTIwQkFOQ08lMjBDRU5UUkFMJTIwREVMJTIwRUNVQURPUixsPVFVSVRPLG91PUVO\n");
        stringBuilder.append("VElEQUQlMjBERSUyMENFUlRJRklDQUNJT04lMjBERSUyMElORk9STUFDSU9OLUVD\n");
        stringBuilder.append("SUJDRSxvPUJBTkNPJTIwQ0VOVFJBTCUyMERFTCUyMEVDVUFET1IsYz1FQz9hdXRo\n");
        stringBuilder.append("b3JpdHlSZXZvY2F0aW9uTGlzdD9iYXNlhiNodHRwOi8vd3d3LmVjaS5iY2UuZWMv\n");
        stringBuilder.append("Q1JML2NhY3JsLmNybDALBgNVHQ8EBAMCAQYwHwYDVR0jBBgwFoAUqBAVqN+gmczo\n");
        stringBuilder.append("6M/ubUbv6hbSCswwHQYDVR0OBBYEFEii3yMfHfgsUXqMA81JMqUJwZSrMAwGA1Ud\n");
        stringBuilder.append("EwQFMAMBAf8wGQYJKoZIhvZ9B0EABAwwChsEVjguMAMCAIEwDQYJKoZIhvcNAQEL\n");
        stringBuilder.append("BQADggIBAJCQ+HLjd1hRLQhBGbpKdLnlHsYG7mmXNt9lDpCNUpY5iASFWEhvR9DP\n");
        stringBuilder.append("nBRwy+54Z6VnY7tZSQVqRKFgwYifnOQ2r3n93h9ZyaES/Avxp6zfrFSIGHpiuEd7\n");
        stringBuilder.append("7bEx3S0dR5QQ0Z/BJg86/DyobU3p8sO5+09yFsi1tH4YH+jQEhHgxvEEp+yQmsrf\n");
        stringBuilder.append("lMan60pJq5dG5uIDEh59SV/nzp1XYguqvlq/710ktJkdn0L3kiHmh7MbOxsgwSDr\n");
        stringBuilder.append("OIF2A2Nz3P20kR0jkkA4bm5CUsnRRi4TMjALEUGb4i6XHgGk1+uG8mTz6Vn3qomX\n");
        stringBuilder.append("W5JxIkgxTRG1y821GFn3pxtdALMCF5nrhWttr2Q8IKVj9fI4ShXPiIaDAz5yh0aA\n");
        stringBuilder.append("iVISj5xJlVxv+qJmgluC5bRG4ElxiqDlrDfAokAygjq2f7sQfe4kWdGuA5Xg3zbR\n");
        stringBuilder.append("V7SKJDc8xCEeJjsMvQq2nLzfAWHq3wVPxGuK2FOY6b7qYSCw9ojMXqwPrOvaalE9\n");
        stringBuilder.append("UjpNcvkkdp7KrfVcZLXi6F3i49plCycsogHEWixcawn2VcBs7uTH0iqllozwlVFG\n");
        stringBuilder.append("unGgqX5Z0E25t6Ipmk2WSwFB7rqMmk552QhMvrwK6UFYu8Yw3RS3zxsUk7tKoR+j\n");
        stringBuilder.append("P6LjqQ4/Z+8loHvvLYdXvm7u2GoxzHWMgWzExdUhsMCocBnUVTDB\n");
        stringBuilder.append("-----END CERTIFICATE-----\n");
    }
}
