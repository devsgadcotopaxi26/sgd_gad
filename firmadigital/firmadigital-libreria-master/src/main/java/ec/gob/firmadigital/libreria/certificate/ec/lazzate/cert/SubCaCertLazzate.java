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
public class SubCaCertLazzate extends RubricaCertificate {

    private static final StringBuilder stringBuilder;

    public SubCaCertLazzate() {
        super(stringBuilder);
    }

    static {
        stringBuilder = new StringBuilder();
        stringBuilder.append("-----BEGIN CERTIFICATE-----\n");
        stringBuilder.append("MIIE/zCCA+egAwIBAgIUewru6cS/TNFZnzF1y+HlbyVQKkkwDQYJKoZIhvcNAQEL\n");
        stringBuilder.append("BQAwgbYxCzAJBgNVBAYTAkVDMRowGAYDVQQIExFRdWl0byAtIFBpY2hpbmNoYTEO\n");
        stringBuilder.append("MAwGA1UEBxMFUXVpdG8xJDAiBgkqhkiG9w0BCQEWFWNlcnRpZmljYWRvc0BlbmV4\n");
        stringBuilder.append("dC5lYzEbMBkGA1UEChMSTGF6emF0ZSBDaWEuIEx0ZGEuMR4wHAYDVQQLExVFbnRl\n");
        stringBuilder.append("IGRlIENlcnRpZmljYWNpb24xGDAWBgNVBAMTD0xhenphdGUgUm9vdCBDQTAeFw0y\n");
        stringBuilder.append("MjEwMTMxNjU3MDlaFw0zNzEwMTMxNjU3MDlaMIHIMQswCQYDVQQGEwJFQzEaMBgG\n");
        stringBuilder.append("A1UECBMRUXVpdG8gLSBQaWNoaW5jaGExDjAMBgNVBAcTBVF1aXRvMSQwIgYJKoZI\n");
        stringBuilder.append("hvcNAQkBFhVjZXJ0aWZpY2Fkb3NAZW5leHQuZWMxDjAMBgNVBGETBTU5MzgyMRsw\n");
        stringBuilder.append("GQYDVQQKExJMYXp6YXRlIENpYS4gTHRkYS4xHjAcBgNVBAsTFUVudGUgZGUgQ2Vy\n");
        stringBuilder.append("dGlmaWNhY2lvbjEaMBgGA1UEAxMRTGF6emF0ZSBFbWlzb3IgQ0EwggEiMA0GCSqG\n");
        stringBuilder.append("SIb3DQEBAQUAA4IBDwAwggEKAoIBAQCwFNnWJH6zpz6C3tPGLmwrwIpp1mDVzmzw\n");
        stringBuilder.append("x3mIXXm7wMcwT9U4ErQu3OnfMsWYRo73zNZ2gtPMUrvoQuvm6gFvjTnSmlZf3gXH\n");
        stringBuilder.append("V9XzF/M1hFF/Emwz9IJoQ2qsFPUQ6AuOQ8sXoyorLRfLWcY9nXpW5qAUAmh4+QTL\n");
        stringBuilder.append("JasbmrrhFSZ+gwmyJXFUOKwhuhZ4kpwJXQvSlnNRUtr01oAzJXQAfQZuaWxCugjC\n");
        stringBuilder.append("oORVy4xuiG9iSAFL2WappFGam0xX68C8WaFMITlUTIzDk1gtyHa7YfZhTWf9fK1w\n");
        stringBuilder.append("TZYUuzLF92jzPQXhOWTpPOiWwFuGl4s2lJ+nFhfURj4d4gnB8VMxAgMBAAGjgfAw\n");
        stringBuilder.append("ge0wDgYDVR0PAQH/BAQDAgEGMBIGA1UdEwEB/wQIMAYBAf8CAQAwHwYDVR0jBBgw\n");
        stringBuilder.append("FoAU4Jb2x9aG40aQMEeeXa2fTc9E1bAwgYYGA1UdIAR/MH0wewYJKwYBBAGDz3YB\n");
        stringBuilder.append("MG4wbAYIKwYBBQUHAgIwYAxeRWwgcHJlc2VudGUgY2VydGlmaWNhZG8gZXMgZW1p\n");
        stringBuilder.append("dGlkbyBlbiBiYXNlIGEgbGFzIHBvbMOtdGljYXMgZGUgc2VndXJpZGFkIGRlIExh\n");
        stringBuilder.append("enphdGUgQ2lhLiBMdGRhLjAdBgNVHQ4EFgQU4umBjHsfY1yzy+fymq8QhkS7CgUw\n");
        stringBuilder.append("DQYJKoZIhvcNAQELBQADggEBAD+tGgVNim3d2iO2jYiN1A500pSmQN6gIqr2LDih\n");
        stringBuilder.append("T3AD29OkoCG4wVisq7pNzfjVaK0ZF2RyW/SGX94ASp0/qYdNsxHQvW2uz/rVRsnJ\n");
        stringBuilder.append("A9UavHcg+5qu86Kvv5UZi2rmaFqs9fFVO/sAgpZ8qYSY6D6aZqXrxd6iP3U02aOq\n");
        stringBuilder.append("bpjDlxl9sYrU7xJzdZ7qOH1ChyJkd/y8UtlD/D9G+urIrgDH4du1Bl255RfYBgdS\n");
        stringBuilder.append("e5fDZBA5MEdD3IDZZ1hnU0cwM7tWRl1DoUuFYXaTNapMstFURHXMsf4avN1leoYp\n");
        stringBuilder.append("3ms97TNEm9moPG4QNAzmGy8YaWsq/JItoUbgHDa7uWTxgpc=\n");
        stringBuilder.append("-----END CERTIFICATE-----\n");
    }
}
