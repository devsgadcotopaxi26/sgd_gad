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
public class Ca1CertLazzate extends RubricaCertificate {

    private static final StringBuilder stringBuilder;

    public Ca1CertLazzate() {
        super(stringBuilder);
    }

    static {
        stringBuilder = new StringBuilder();
        stringBuilder.append("-----BEGIN CERTIFICATE-----\n");
        stringBuilder.append("MIIFcTCCBFmgAwIBAgIUHt051usZwqVQEoeeAS4FwTr7T4wwDQYJKoZIhvcNAQEL\n");
        stringBuilder.append("BQAwgbcxCzAJBgNVBAYTAkVDMRowGAYDVQQIDBFRdWl0byAtIFBpY2hpbmNoYTEO\n");
        stringBuilder.append("MAwGA1UEBwwFUXVpdG8xGzAZBgNVBAoMEkxhenphdGUgQ2lhLiBMdGRhLjEeMBwG\n");
        stringBuilder.append("A1UECwwVRW50ZSBkZSBDZXJ0aWZpY2FjaW9uMRkwFwYDVQQDDBBMYXp6YXRlIFJv\n");
        stringBuilder.append("b3QgQ0ExMSQwIgYJKoZIhvcNAQkBFhVjZXJ0aWZpY2Fkb3NAZW5leHQuZWMwIBcN\n");
        stringBuilder.append("MjMxMTEwMjAxMTEwWhgPMjA1MzExMDIyMDExMTBaMIG3MQswCQYDVQQGEwJFQzEa\n");
        stringBuilder.append("MBgGA1UECAwRUXVpdG8gLSBQaWNoaW5jaGExDjAMBgNVBAcMBVF1aXRvMRswGQYD\n");
        stringBuilder.append("VQQKDBJMYXp6YXRlIENpYS4gTHRkYS4xHjAcBgNVBAsMFUVudGUgZGUgQ2VydGlm\n");
        stringBuilder.append("aWNhY2lvbjEZMBcGA1UEAwwQTGF6emF0ZSBSb290IENBMTEkMCIGCSqGSIb3DQEJ\n");
        stringBuilder.append("ARYVY2VydGlmaWNhZG9zQGVuZXh0LmVjMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A\n");
        stringBuilder.append("MIIBCgKCAQEA5LAMYiotndbFw9IMTegql6LlCn3I09w70fff5oRpryX18++c47Ms\n");
        stringBuilder.append("PIelsUoTDQ2Av2oXn55p7C9PHyTOnGGBgS3VJuVysiIoD58ozBcdGkg9+N2n8n8U\n");
        stringBuilder.append("yNfo5vYviC3/PdTr8MoUKbIBgWQYhQxzT2Ue7WG/cwYUupaZIT+5n6E+gLX1vHJ7\n");
        stringBuilder.append("9v0Pw7+B+6E7a+dZikFtD3C9+vitmn2OG6l8mWng0VqKXwNUwF6h9T4meBTjQMoE\n");
        stringBuilder.append("oW7G8E4jUpGlzCysqeF/Me/sRRE4hFuw4eOMyFw2AQcFF5VFNPLsjWKU+y6NMQ9e\n");
        stringBuilder.append("hzlJrRFwXujPNEFCnO0Bn51L7nFIp8jefwIDAQABo4IBbzCCAWswHQYDVR0OBBYE\n");
        stringBuilder.append("FMY7kALOHWD6Mrra9+KTHattMnGzMB8GA1UdIwQYMBaAFMY7kALOHWD6Mrra9+KT\n");
        stringBuilder.append("HattMnGzMA4GA1UdDwEB/wQEAwIBhjASBgNVHRMBAf8ECDAGAQH/AgECMDUGA1Ud\n");
        stringBuilder.append("HwQuMCwwKqAooCaGJGh0dHA6Ly9lbmV4dDEueHl6L2NybC9sYXp6YXRlQ0ExLmNy\n");
        stringBuilder.append("bDCBzQYDVR0gBIHFMIHCMIG/BgkrBgEEAYPPdgEwgbEwQQYIKwYBBQUHAgEWNWh0\n");
        stringBuilder.append("dHBzOi8vZW5leHQuZWMvZGVzY2FyZ2FzL3BvbGl0aWNhcy9jZXJ0aWZpY2Fkb3Mu\n");
        stringBuilder.append("cGRmMGwGCCsGAQUFBwICMGAaXkVsIHByZXNlbnRlIGNlcnRpZmljYWRvIGVzIGVt\n");
        stringBuilder.append("aXRpZG8gZW4gYmFzZSBhIGxhcyBwb2zDrXRpY2FzIGRlIHNlZ3VyaWRhZCBkZSBM\n");
        stringBuilder.append("YXp6YXRlIENpYS4gTHRkYS4wDQYJKoZIhvcNAQELBQADggEBAGylLKqr30h/kijt\n");
        stringBuilder.append("YBJcTQoL4Ix5r9CmwJ4xIpV41eBDz/CNPzDnEiEhP8kf+2OQHTo/KmwTzA+CMkfP\n");
        stringBuilder.append("9bMkh4TdBbUaIh2MhcDYd1gLW6BFuuk+1GOUwu52AIpyiB8gWeoGEN7l/GchhZSg\n");
        stringBuilder.append("BBNoPw6Xvxo9h1X9npnBleKZLZ9gCfFRujOSnI5LMpxUmnYyAorNCIycc+zoAOw+\n");
        stringBuilder.append("i9xfXaL1gwRq45g5lrNCq1CkG4M4vQOWsGbCBzsd4q9vwK0LvxpGt3gOpB3emSG0\n");
        stringBuilder.append("+Tsz7eQegyIXXKqF3Kn0npe2gC9BkkpBJBYQhdP4LnExeXIsdUXMt8xFRU58Uol8\n");
        stringBuilder.append("y9DaQ98=\n");
        stringBuilder.append("-----END CERTIFICATE-----\n");
    }
}
