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
public class SubCaWeGoCertLazzate extends RubricaCertificate {

    private static final StringBuilder stringBuilder;

    public SubCaWeGoCertLazzate() {
        super(stringBuilder);
    }

    static {
        stringBuilder = new StringBuilder();
        stringBuilder.append("-----BEGIN CERTIFICATE-----\n");
        stringBuilder.append("MIIEUTCCAzmgAwIBAgIURvxE/imz7Nqq7hjR0b0Rvik5vtMwDQYJKoZIhvcNAQEL\n");
        stringBuilder.append("BQAwgZAxCzAJBgNVBAYTAkVDMRIwEAYDVQQIDAlQSUNISU5DSEExDjAMBgNVBAcM\n");
        stringBuilder.append("BVFVSVRPMRswGQYDVQQKDBJMYXp6YXRlIENpYS4gTHRkYS4xFjAUBgNVBAsMDVdF\n");
        stringBuilder.append("LUdPIExBWlpBVEUxKDAmBgNVBAMMH1dFLUdPIFRFUkNFUiBWSU5DVUxBRE8gUm9v\n");
        stringBuilder.append("dCBDQTEwIBcNMjQwMzA3MTI1NDEwWhgPMjA1NDAyMjgxMjU0MTBaMFYxCzAJBgNV\n");
        stringBuilder.append("BAYTAkVDMRswGQYDVQQKDBJMYXp6YXRlIENpYS4gTHRkYS4xKjAoBgNVBAMMIVdF\n");
        stringBuilder.append("LUdPIFRFUkNFUiBWSU5DVUxBRE8gRW1pc29yIENBMTCCASIwDQYJKoZIhvcNAQEB\n");
        stringBuilder.append("BQADggEPADCCAQoCggEBAMNiS0eHBb9xBDm6T82Kopif7hRSwDQ8uR57Tj5MN3iA\n");
        stringBuilder.append("pC0pIUXQB5z+r9jgfLN+SXRSWITkIliT9ORcbwum/czZ2FKzqMqCbFpO+9ERQV0y\n");
        stringBuilder.append("q/7GxmyIRyc549Iz3JaYKED+FPnk+t3G2pqk0YN7FnnO4MJkTMIxS3QIdaQP0Bbs\n");
        stringBuilder.append("ea+kK3rDzBUklexQE8ymGsrvUr6wuTPunYDjm4anFsa5+MwCzCxA9Q4omEcqeX0Q\n");
        stringBuilder.append("iubX7xYMTfxfi/zk8Qzf04h5ciweUC5oMK8rJwBUHi9p5/uk+GowAfPl4m74C0T5\n");
        stringBuilder.append("5hXXi1z8TScPpgPtvQHAgQgA2bfjyNscny8NqdKnhN8CAwEAAaOB2TCB1jAdBgNV\n");
        stringBuilder.append("HQ4EFgQU1SLDtuGQ22FwlSta8rjoJi6vTCUwHwYDVR0jBBgwFoAU5OY25oY6xCPc\n");
        stringBuilder.append("VdzWvZMpeOal0rwwEgYDVR0TAQH/BAgwBgEB/wIBADAOBgNVHQ8BAf8EBAMCAYYw\n");
        stringBuilder.append("MwYDVR0fBCwwKjAooCagJIYiaHR0cDovL3dlLWdvLnh5ei9jcmwvZW1pc29yQ0Ex\n");
        stringBuilder.append("LmNybDA7BggrBgEFBQcBAQQvMC0wKwYIKwYBBQUHMAGGH2h0dHA6Ly93ZS1nby54\n");
        stringBuilder.append("eXo6ODc3Ny9hZHNzL29jc3AwDQYJKoZIhvcNAQELBQADggEBAAmPa1aFzF4T/xJX\n");
        stringBuilder.append("AU17eOx7tHJBm+oRGOdm79511sDq/vu04jQJ5Fkn3K+/+YFCCbZ/TZH8AlI5GmU0\n");
        stringBuilder.append("Ygqc9ptikwXIFkAbhyB1RB8Cqel4az/smK0HrtQ73jtca/4njEguKWWou3LoBA2E\n");
        stringBuilder.append("Ytg2e7qe9A9EPkADpzggCMEsVi7XBuUHnbQbR83e1FQkU4gnAMQZhuBlEWtR3wdP\n");
        stringBuilder.append("+yMg5q0q2SASBqIP7ZF0ZaTNJGoipViVS0poj2tkGzqHYHTIlReZcK72HJq/Xbv+\n");
        stringBuilder.append("CdLYhdlUBdwUly8VWyCm38T7tNvHaE6y2AOa5s9rOLxFzUHsFDDDTgpWepmLuozR\n");
        stringBuilder.append("vabtpSA=\n");
        stringBuilder.append("-----END CERTIFICATE-----\n");
    }
}
