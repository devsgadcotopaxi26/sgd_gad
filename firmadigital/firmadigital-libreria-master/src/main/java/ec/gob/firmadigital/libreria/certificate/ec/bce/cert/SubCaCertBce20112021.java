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
public class SubCaCertBce20112021 extends RubricaCertificate {

    private static final StringBuilder stringBuilder;

    public SubCaCertBce20112021() {
        super(stringBuilder);
    }

    static {
        stringBuilder = new StringBuilder();
        stringBuilder.append("-----BEGIN CERTIFICATE-----\n");
        stringBuilder.append("MIII8zCCBtugAwIBAgIETj/6njANBgkqhkiG9w0BAQsFADCBwjELMAkGA1UEBhMC\n");
        stringBuilder.append("RUMxIjAgBgNVBAoTGUJBTkNPIENFTlRSQUwgREVMIEVDVUFET1IxNzA1BgNVBAsT\n");
        stringBuilder.append("LkVOVElEQUQgREUgQ0VSVElGSUNBQ0lPTiBERSBJTkZPUk1BQ0lPTi1FQ0lCQ0Ux\n");
        stringBuilder.append("DjAMBgNVBAcTBVFVSVRPMUYwRAYDVQQDEz1BVVRPUklEQUQgREUgQ0VSVElGSUNB\n");
        stringBuilder.append("Q0lPTiBSQUlaIERFTCBCQU5DTyBDRU5UUkFMIERFTCBFQ1VBRE9SMB4XDTExMDgw\n");
        stringBuilder.append("ODE1MjUyN1oXDTIxMDgwODE1NTUyN1owgaExCzAJBgNVBAYTAkVDMSIwIAYDVQQK\n");
        stringBuilder.append("ExlCQU5DTyBDRU5UUkFMIERFTCBFQ1VBRE9SMTcwNQYDVQQLEy5FTlRJREFEIERF\n");
        stringBuilder.append("IENFUlRJRklDQUNJT04gREUgSU5GT1JNQUNJT04tRUNJQkNFMQ4wDAYDVQQHEwVR\n");
        stringBuilder.append("VUlUTzElMCMGA1UEAxMcQUMgQkFOQ08gQ0VOVFJBTCBERUwgRUNVQURPUjCCAiIw\n");
        stringBuilder.append("DQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK7NYNPmTUjhN0eJBvM1uWYlMgHl\n");
        stringBuilder.append("oXYBdHiYMPBVH17vVBFh4NHS7JmhnbH4NXxzb/8D9slyzBbwtXoK4y2MRBKFqwl6\n");
        stringBuilder.append("4xSCQQcXAt350qm605FBjbi+Y64wPSn69gjtIHrwJQ80rqwdsUbGlsPZFYwAaHTg\n");
        stringBuilder.append("ZsFNsYkC8oGbvpjqT0iiwEOvb+l/uou7LpWtHallQpMVonLGfRAvxXyD+JvGmaFg\n");
        stringBuilder.append("nwlOTDeGul267lQS0qTjX+22HhOX9seDX/MN/9ste6kzHnB68fWJERoXcP20Vy9K\n");
        stringBuilder.append("L+E6BQVuM3rbt0MU02/p/fgcz8n2AviWCM74G0uU6z5VBMnejIRKhEqgQ+wwKSrU\n");
        stringBuilder.append("8L1rwsfqIR2EvqAoI08zNBOYIDxpRv1WGkK9qKTlSifHqiydsmAyzcp5SCtwzD7c\n");
        stringBuilder.append("ZJ8L6hCgxwjXGwIj1UeAf7h0CVDIICF1ORODcsHJYYzbxzm7AggiLSkb97KJDpBh\n");
        stringBuilder.append("yTerIm/FPjQejpzbcAB39P82jSdIO6eihOcUPsr2SGl4eZo3MkVYGkG8gJwk7pxg\n");
        stringBuilder.append("Oc8YgCYH8W39Tp05Kq1/vMmV2+JP+AEhxKCpD7q+CgBPNTYNXTgxE/zyDJmr5pEl\n");
        stringBuilder.append("mOdLPPRZBAP+3PyRFpeItnPedLnPs3rFR2/holNn8ePzZFSj9EabRNL+JNQ8rUZW\n");
        stringBuilder.append("xjbTxxnEdSEOLWzFAgMBAAGjggMOMIIDCjB8BgNVHSAEdTBzMHEGCisGAQQBgqg7\n");
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
        stringBuilder.append("6M/ubUbv6hbSCswwHQYDVR0OBBYEFBj58PvmMhyZZjkqyouyaX1JJ7/OMAwGA1Ud\n");
        stringBuilder.append("EwQFMAMBAf8wGQYJKoZIhvZ9B0EABAwwChsEVjguMAMCAIEwDQYJKoZIhvcNAQEL\n");
        stringBuilder.append("BQADggIBAFmBSqSDfZyDSU7ucmm5++0f0mBL74FuSf5cv8IyAdRM++eqfgPL72K3\n");
        stringBuilder.append("MVMjA7uG3zH5lKo5Fa9X4GSAn8mxkOe5Y5QGdftoYXizN8l37nH3EKppzSS1dish\n");
        stringBuilder.append("VPTGUi8kjVXXDbCnLHhOlbhoulQEp0xQBUef2AoWw4YWcxJflw8Vor5oLy5eU4Jl\n");
        stringBuilder.append("s5tBI4i+q34Wjr/2RZhPOBft3EYTlD3JmznHRDwjUKH24afr1VEzECy++Fb+1ZgP\n");
        stringBuilder.append("tRTzdByWftqQdvXpxV6EUHaMHN7epgk/x99JgMxXC0ULjoxr7nsAy0jSeQeH4rd0\n");
        stringBuilder.append("kSVNIuW34Q6KkbgiASftuZWWFTZYWxInXVz4GKtpI1TOeYYhsO2bCJi0Cg2LcWhq\n");
        stringBuilder.append("jUr1ff1AzTeQRkBf9MTyHK3kOsB0Uht8nTy1z+NbfHX+jr119FCXhc3cNNAeHgHK\n");
        stringBuilder.append("UXAF+xKgjglJm9SoFske12zxVpJ+toYckn4p5Ug9w0/3pqS2qWoPy9rJrAW159aB\n");
        stringBuilder.append("r1SH+SZxZZ6Ygq9D9Br+EUfDC8ybZ5KeYjBKjtjCK7BEGywlHVBXI7Zvsq+WsLmc\n");
        stringBuilder.append("6KM75hTNJe2V2Edvnv1s3BWR7hVdtiR/C66FDD+9UtObrBDX2a3Q2efOus506le7\n");
        stringBuilder.append("Cxx6t4ioB8gMTbPDK29F4SExlbeqnVjbnSRhyQwOHGeP548aBXdu\n");
        stringBuilder.append("-----END CERTIFICATE-----");
    }
}
