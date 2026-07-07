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
public class SubCa1CertLazzate extends RubricaCertificate {

    private static final StringBuilder stringBuilder;

    public SubCa1CertLazzate() {
        super(stringBuilder);
    }

    static {
        stringBuilder = new StringBuilder();
        stringBuilder.append("-----BEGIN CERTIFICATE-----\n");
        stringBuilder.append("MIIEpzCCA4+gAwIBAgIUUWAln6vY4VwosF6dy6AZz+XbasAwDQYJKoZIhvcNAQEL\n");
        stringBuilder.append("BQAwgbcxCzAJBgNVBAYTAkVDMRowGAYDVQQIDBFRdWl0byAtIFBpY2hpbmNoYTEO\n");
        stringBuilder.append("MAwGA1UEBwwFUXVpdG8xGzAZBgNVBAoMEkxhenphdGUgQ2lhLiBMdGRhLjEeMBwG\n");
        stringBuilder.append("A1UECwwVRW50ZSBkZSBDZXJ0aWZpY2FjaW9uMRkwFwYDVQQDDBBMYXp6YXRlIFJv\n");
        stringBuilder.append("b3QgQ0ExMSQwIgYJKoZIhvcNAQkBFhVjZXJ0aWZpY2Fkb3NAZW5leHQuZWMwHhcN\n");
        stringBuilder.append("MjMxMTEwMjAzMTI3WhcNMzMxMTA3MjAzMTI3WjCBgzELMAkGA1UEBhMCRUMxGjAY\n");
        stringBuilder.append("BgNVBAgMEVF1aXRvIC0gUGljaGluY2hhMRswGQYDVQQKDBJMYXp6YXRlIENpYS4g\n");
        stringBuilder.append("THRkYS4xHjAcBgNVBAsMFUVudGUgZGUgQ2VydGlmaWNhY2lvbjEbMBkGA1UEAwwS\n");
        stringBuilder.append("TGF6emF0ZSBFbWlzb3IgQ0ExMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKC\n");
        stringBuilder.append("AQEAx2sZgdZmUTbUlqTUZPCe2foZ/j63j+YeJamT+FBqgl9YJLpk+Ofwxb0N70ws\n");
        stringBuilder.append("LJjrxihG6kdAGddvy13L9VoDEsBodLnd/3FutgzdLXloL3AY4GYj7OKgauWLHbUN\n");
        stringBuilder.append("lRrysNZzIQVC9NyxDWIHojvuc+6NjmZGQzsDNd0Pwr/D6gv3X/A2e8Ez3uzRvOLv\n");
        stringBuilder.append("7C/nkWjd1UEmnT6Bmzh/eIhU8b8z2yWq20QocNcRiX4xftSgON3V0XbIY/4iFa18\n");
        stringBuilder.append("6Rg19/7Yzp2VK9pSX8s5s7mw1/bE6s3rNW7maspwcL/yJtdMnITCLXCpLKSoTGBN\n");
        stringBuilder.append("8Q390h+kBpYunarwIl2teWhOfwIDAQABo4HcMIHZMB0GA1UdDgQWBBQTjc4bTPpP\n");
        stringBuilder.append("aQvsN7GCuplET0rQoDAfBgNVHSMEGDAWgBTGO5ACzh1g+jK62vfikx2rbTJxszAS\n");
        stringBuilder.append("BgNVHRMBAf8ECDAGAQH/AgEAMA4GA1UdDwEB/wQEAwIBhjA1BgNVHR8ELjAsMCqg\n");
        stringBuilder.append("KKAmhiRodHRwOi8vZW5leHQxLnh5ei9jcmwvbGF6emF0ZUNBMS5jcmwwPAYIKwYB\n");
        stringBuilder.append("BQUHAQEEMDAuMCwGCCsGAQUFBzABhiBodHRwOi8vZW5leHQxLnh5ejo4Nzc3L2Fk\n");
        stringBuilder.append("c3Mvb2NzcDANBgkqhkiG9w0BAQsFAAOCAQEAXm6upbz29J4HGzKjGtZJe3wM2WmE\n");
        stringBuilder.append("BzQmOZFDc0T9M+dkNtZyQzYrasaa6q4rbY2ZryaqLS/vW6nh7wzh8GnRkiOj6It9\n");
        stringBuilder.append("4qNwGYBy+EFk24tRh/1HRW2PyHLB+K1X9OtyBnZ/Glh4XmiSjQfp4uJYbf2pTb1Z\n");
        stringBuilder.append("QKb7ZFhavekvM7o8GbkGAn2EjDHGSmUX+eRUNjHgCFLIoBB5YwmSU48CY3Q3Vb1a\n");
        stringBuilder.append("W3CP13GxTDWqdgzheb2rTg/WfS3Rlrdy9A3yCzA9ZUHZRtSxhrkRw/pv0zl4mnHw\n");
        stringBuilder.append("heELwCXqCHRX7Z9UWfSpouv3XetDz80luLDwty7o1CS0q1FZpMFyCqaTGg==\n");
        stringBuilder.append("-----END CERTIFICATE-----\n");
    }

}
