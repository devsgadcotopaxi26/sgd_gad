/*
 * Copyright (C) 2026 
 * Authors: Misael Fernández, DIRECCIÓN GENERAL DE REGISTRO CIVIL, IDENTIFICACIÓN Y CEDULACIÓN
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
package ec.gob.firmadigital.libreria.certificate.ec.digercic.cert;

import ec.gob.firmadigital.libreria.certificate.base.RubricaCertificate;

/**
 * Certificado raiz representado como un objeto
 * <code>X509Certificate</code>.<br>
 * emitido por DIRECCIÓN GENERAL DE REGISTRO CIVIL, IDENTIFICACIÓN Y CEDULACIÓN
 *
 * @author Misael Fernández, DIRECCIÓN GENERAL DE REGISTRO CIVIL, IDENTIFICACIÓN
 * Y CEDULACIÓN
 */
public class CaCertDigercic extends RubricaCertificate {

    private static final StringBuilder stringBuilder;

    public CaCertDigercic() {
        super(stringBuilder);
    }

    static {
        stringBuilder = new StringBuilder();
        stringBuilder.append("-----BEGIN CERTIFICATE-----\n");
        stringBuilder.append("MIIHYjCCBUqgAwIBAgIUMDAwMDAwMDAwMDAwMDAwMDAwMTgwDQYJKoZIhvcNAQEL\n");
        stringBuilder.append("BQAwggE/MQ4wDAYDVQQHEwVRdWl0bzESMBAGA1UECBMJUGljaGluY2hhMQswCQYD\n");
        stringBuilder.append("VQQGEwJFQzEuMCwGA1UECRMlQXYuIEFtYXpvbmFzIE4zNy02MSB5IE5hY2lvbmVz\n");
        stringBuilder.append("IFVuaWRhczEvMC0GA1UEAxMmQXV0b3JpZGFkIENlcnRpZmljYWRvcmEgZGUgbGEg\n");
        stringBuilder.append("RElHRVJDSUMxKzApBgNVBAsMIkNvb3JkaW5hY2nDs24gR2VuZXJhbCBkZSBTZXJ2\n");
        stringBuilder.append("aWNpb3MxTDBKBgNVBAoMQ0RpcmVjY2nDs24gR2VuZXJhbCBkZSBSZWdpc3RybyBD\n");
        stringBuilder.append("aXZpbCwgSWRlbnRpZmljYWNpw7NuIHkgQ2VkdWxhY2nDs24xMDAuBgkqhkiG9w0B\n");
        stringBuilder.append("CQEWIWluZm8tZmlybWFyY0ByZWdpc3Ryb2NpdmlsLmdvYi5lYzAeFw0yMTAyMDky\n");
        stringBuilder.append("MzA3MTlaFw0yMTA4MDkyMzA3MTlaMIGaMRcwFQYDVQQqEw5FZGdhciBTYW50aWFn\n");
        stringBuilder.append("bzEQMA4GA1UEBBMHQ29sdW1iYTFCMEAGA1UECRM5Q2FsbGUgQmVuamFtaW4gV2Fu\n");
        stringBuilder.append("ZGVtYmVyZyBOMTQtMTg5IHkgSm9yZ2UgQ2FycmVyYSBBbmRyYWRlMSkwJwYDVQQD\n");
        stringBuilder.append("EyBFZGdhciBTYW50aWFnbyBDb2x1bWJhIENhdHVjdWFnbzCCASIwDQYJKoZIhvcN\n");
        stringBuilder.append("AQEBBQADggEPADCCAQoCggEBAJTfXmIogCic3KlP4P6Ja1PUP6HKxRMF/V1N6Mgn\n");
        stringBuilder.append("H6onTeQnO/OOJfvmYNlArwPBflGOeuv/0qoVZqjjBV9aVKxB0yW0jTjPIZleVLFG\n");
        stringBuilder.append("2jG94MxsWhZuMQu/87eYqCmZMHFqIF+ny6m7hvp3Y2RV5xUOWORNl0pZt4o2ZhWX\n");
        stringBuilder.append("btsNb2seSxsgSfhs+lQKvT+ebBeu2WvHEdraj8JMnubG7xUOXJXTQz0vbf0UtkvU\n");
        stringBuilder.append("QHHfD9kUe9Q7vKawie+WvgTPmvgTIYWpYhbxSxtIBeYwsVwQ/VjlTwfgTKG1nLGu\n");
        stringBuilder.append("+eU3UGcGl6ON9cIwoOMFzWSvi2dvjmac8KUQIYFcgt4dJAECAwEAAaOCAfYwggHy\n");
        stringBuilder.append("MB4GDisGAQQBg7FfAQEBBQIBBAwTCjE3MTM0MDQ0NzEwHgYOKwYBBAGDsV8BAQEF\n");
        stringBuilder.append("AgIEDBMKMTcxMzQwNDQ3MTAdBg4rBgEEAYOxXwEBAQUCAwQLEwlDYXR1Y3VhZ28w\n");
        stringBuilder.append("IQYOKwYBBAGDsV8BAQEFAgQEDxMNMTcxMzQwNDQ3MTAwMTAfBgNVHSMEGDAWgBTT\n");
        stringBuilder.append("3FdYYmf8RIHo6IU0VPLMUmgqfDAdBgNVHQ4EFgQUpvvRULJ7OaqZrOszD/OJXHom\n");
        stringBuilder.append("2MEwRQYIKwYBBQUHAQEBAf8ENjA0MDIGCCsGAQUFBzABhiZodHRwOi8vb2NzcC5y\n");
        stringBuilder.append("ZWdpc3Ryb2NpdmlsLmdvYi5lYzo4MDgyLzA7BgNVHR8ENDAyMDCgLqAshipodHRw\n");
        stringBuilder.append("czovL2Zpcm1hLnJlZ2lzdHJvY2l2aWwuZ29iLmVjL2NybC5jcmwwWgYDVR0gAQH/\n");
        stringBuilder.append("BFAwTjBMBg4rBgEEAYOxXwEBAQUDAjA6MDgGCCsGAQUFBwIBFixodHRwczovL2Zp\n");
        stringBuilder.append("cm1hLnJlZ2lzdHJvY2l2aWwuZ29iLmVjL3BvbGl0aWNhczAdBgNVHSUEFjAUBggr\n");
        stringBuilder.append("BgEFBQcDBAYIKwYBBQUHAwIwDAYDVR0TAQH/BAIwADAOBgNVHQ8BAf8EBAMCA/gw\n");
        stringBuilder.append("EQYJYIZIAYb4QgEBBAQDAgWgMA0GCSqGSIb3DQEBCwUAA4ICAQAWZ8b8gdQazpCi\n");
        stringBuilder.append("SoOA0fvxMlZqHeH+39Jk7f4ytQ4iaoYlkqws5O7sBz06h4VAQugt61KKRM5NX1pi\n");
        stringBuilder.append("jFpZrjso+MXOXk/8LxO9l34n004m5c/AWopQN+KLPGF5nnc0bwBYMor2d8YqzWMO\n");
        stringBuilder.append("+jckaH1LMGCr0Ne8zPV2uN1ah0lYd5/iM906u4af+zHPfl/BmYM4J8XKEEcLfmx3\n");
        stringBuilder.append("tJcVm6EyvsVpsk/hSye8HCyGieAGUoHEhoM1AtbB3f0qUGILOMr4hjWQBuEKbL2U\n");
        stringBuilder.append("+s/a10s0O8fciYuXZp87fhspSg7ML1IKAabAm++I3Ls2p1KQweHxhAJ8ja6VbS5o\n");
        stringBuilder.append("xFN2ASXqH9Pwip/wKqqx2zPmkzSn99UivmT+79mU2PX4HGxxQj+tOrABEuXA6YfS\n");
        stringBuilder.append("i24N5J78ds6TI2i1hJ2c9mQWloVOZwfyQssd+zDjso48IjLWD8KmKk6DgX8aOGp4\n");
        stringBuilder.append("4uIcqPleJ6Tt15u2bwQQxAkf1e6rdjuq6eKnpqalC8SLA0ATZe1Dc2O3DUsv+hju\n");
        stringBuilder.append("XFAgqUFTJu2qt0Z8adNmlcY3z+60aBq/TyQaPF9//mnQ+uo/RFJI6GorTErH9j2V\n");
        stringBuilder.append("MfTdtfzHL+tqZsDMNWXhAadO84I0+A2G7C0K4GwzSJlrgAPdozFIVk7wS6eFy15+\n");
        stringBuilder.append("qevWJmd0+4htjWHKBt/VM7H7M29i7w==\n");
        stringBuilder.append("-----END CERTIFICATE-----");
    }
}
