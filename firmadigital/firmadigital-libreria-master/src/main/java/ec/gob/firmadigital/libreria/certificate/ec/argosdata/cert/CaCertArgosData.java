/*
 * Copyright (C) 2026 
 * Authors: Misael Fernández, ARGOSDATA CERTIFICACIÓN DE INFORMACIÓN Y SERVICIOS RELACIONADOS S.A.S.
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
package ec.gob.firmadigital.libreria.certificate.ec.argosdata.cert;

import ec.gob.firmadigital.libreria.certificate.base.RubricaCertificate;

/**
 * Certificado raiz representado como un objeto
 * <code>X509Certificate</code>.<br>
 * emitido por ARGOSDATA CERTIFICACIÓN DE INFORMACIÓN Y SERVICIOS RELACIONADOS
 * S.A.S.
 *
 * @author Misael Fernández, ARGOSDATA CERTIFICACIÓN DE INFORMACIÓN Y SERVICIOS
 * RELACIONADOS S.A.S.
 */
public class CaCertArgosData extends RubricaCertificate {

    private static final StringBuilder stringBuilder;

    public CaCertArgosData() {
        super(stringBuilder);
    }

    static {
        stringBuilder = new StringBuilder();
        stringBuilder.append("-----BEGIN CERTIFICATE-----\n");
        stringBuilder.append("MIIDhTCCAm2gAwIBAgIRALExbzvYmB+gvQ7j1vn+z9EwDQYJKoZIhvcNAQELBQAw\n");
        stringBuilder.append("XDELMAkGA1UEBhMCRUMxEjAQBgNVBAoMCUFyZ29zRGF0YTEVMBMGA1UECwwMQXJn\n");
        stringBuilder.append("b3NEYXRhIENBMSIwIAYDVQQDDBlBcmdvc0RhdGEgUm9vdCBDQSAtU0hBMjU2MB4X\n");
        stringBuilder.append("DTIyMDYwOTE4MDkxMFoXDTMyMDYwOTE5MDkxMFowXDELMAkGA1UEBhMCRUMxEjAQ\n");
        stringBuilder.append("BgNVBAoMCUFyZ29zRGF0YTEVMBMGA1UECwwMQXJnb3NEYXRhIENBMSIwIAYDVQQD\n");
        stringBuilder.append("DBlBcmdvc0RhdGEgUm9vdCBDQSAtU0hBMjU2MIIBIjANBgkqhkiG9w0BAQEFAAOC\n");
        stringBuilder.append("AQ8AMIIBCgKCAQEAiL+DIRt8+qCAh9VNlq6chZRYNCernnENvGvoilsNIei1UYht\n");
        stringBuilder.append("BL0wWj2rNtRaY5LGtn6ivMsv7DokN8EOpj+y+x/KUmuCQJJt99ylvei2u/iuUTPZ\n");
        stringBuilder.append("nxmB7iOww53kLF/Wy5VeFBFEG7prRyLecsvi7BKw2LPpLa+dqauhfMKwQKXz+5Py\n");
        stringBuilder.append("InjpMKjb3vg/W7ho9w+VZ3RUm1boP6RxvnWZKgOkdDrkZpD3jPXkn1WNqs70freu\n");
        stringBuilder.append("4tEJ7YlQje6fSvvzv9Ra4P+D1oDOOIg/qC20PLFlgdmQKT4SAw5AV/Nso/TLRI81\n");
        stringBuilder.append("S4lCmsj55lKWfvV2p14TkypPOWrHO2Y2VaYxtwIDAQABo0IwQDAPBgNVHRMBAf8E\n");
        stringBuilder.append("BTADAQH/MB0GA1UdDgQWBBR5P8fvvzpxJ/XaJ70JDuj/xJgOTDAOBgNVHQ8BAf8E\n");
        stringBuilder.append("BAMCAYYwDQYJKoZIhvcNAQELBQADggEBAEJNF6X5KJ91dXewbnRFYlTHn49SC5FE\n");
        stringBuilder.append("4oEKpQPBL37iGeBIGdZeCvIErsxnVrDolu0/k1tRYHKPWlgR/i0d7pVMX0n6dZGr\n");
        stringBuilder.append("vdZX7XXMLIOHNrQaeIIcQf9TB8p2iIAUzQ11iyt7y34U0XtWSUKWkjgtey5rfJea\n");
        stringBuilder.append("U9UdGXMI9WjWOFtC4EcJI50QA8X5ImzmK34pl/3xk6MqJvdNM8Hg7hZpjyobig/8\n");
        stringBuilder.append("XrfBOZYhRptIJ9DaTA52cbVEWhpB+ZFzyb6AzXbYf8zkquzJwULMIvBPRcJP6wWi\n");
        stringBuilder.append("9CGTnOYtIAoXOQuSdr61PIuIJPBBDuyX2XW3rJ7476mevsR0oQH/sOY=\n");
        stringBuilder.append("-----END CERTIFICATE-----");
    }
}
