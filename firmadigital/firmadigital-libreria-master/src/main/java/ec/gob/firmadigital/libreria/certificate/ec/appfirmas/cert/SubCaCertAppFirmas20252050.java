/*
 * Copyright (C) 2026 
 * Authors: Misael Fernández, APPFIRMAS S.A.
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
package ec.gob.firmadigital.libreria.certificate.ec.appfirmas.cert;

import ec.gob.firmadigital.libreria.certificate.base.RubricaCertificate;

/**
 * Certificado intermedio representado como un objeto
 * <code>X509Certificate</code>.<br>
 * emitido por APPFIRMAS S.A.
 *
 * @author Misael Fernández, APPFIRMAS S.A.
 */
public class SubCaCertAppFirmas20252050 extends RubricaCertificate {

    private static final StringBuilder stringBuilder;

    public SubCaCertAppFirmas20252050() {
        super(stringBuilder);
    }

    static {
        stringBuilder = new StringBuilder();
        stringBuilder.append("-----BEGIN CERTIFICATE-----\n");
        stringBuilder.append("MIIGvzCCBKegAwIBAgIUXxnaSd+dke1+HCxMj4w4hTyqUscwDQYJKoZIhvcNAQEL\n");
        stringBuilder.append("BQAwgZQxCzAJBgNVBAYTAkVDMQ8wDQYDVQQIDAZHVUFZQVMxEjAQBgNVBAcMCUdV\n");
        stringBuilder.append("QVlBUVVJTDEfMB0GA1UECgwWQVBQRklSTUFTIFMuQS4gUm9vdCBBQzEeMBwGA1UE\n");
        stringBuilder.append("CwwVRU5USURBRCBDRVJUSUZJQ0FET1JBMR8wHQYDVQQDDBZBUFBGSVJNQVMgUy5B\n");
        stringBuilder.append("LiBSb290IEFDMCAXDTI1MDUwMTE4NDIzMVoYDzIwNTAwNDMwMTg0MjMxWjCBkjEL\n");
        stringBuilder.append("MAkGA1UEBhMCRUMxHjAcBgNVBAoMFUFQUEZJUk1BUyBTLkEuIFN1YiBDQTEeMBwG\n");
        stringBuilder.append("A1UECwwVRU5USURBRCBDRVJUSUZJQ0FET1JBMQ8wDQYDVQQIDAZHVUFZQVMxHjAc\n");
        stringBuilder.append("BgNVBAMMFUFQUEZJUk1BUyBTLkEuIFN1YiBDQTESMBAGA1UEBwwJR1VBWUFRVUlM\n");
        stringBuilder.append("MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA58ZFNTgn/+Qtjf+igV8V\n");
        stringBuilder.append("FkYvpVjP/PePnLt8TwV/c5nnGzuABeFQsdJQc2jFH02FXxFFS7F0TIBPksrkvC0q\n");
        stringBuilder.append("Gyb8L0y0zM5sKe4ry3MgZQWqHXVP6kFg52EyYxM4JEJWu3vt40MoHfrUqAxr13Lv\n");
        stringBuilder.append("ByD43vjLp+EclE9m4nxySler15LGzWOK5Z8nfqvMxDp37pXyIHRyCpvTgU8hZ7/6\n");
        stringBuilder.append("mT68a6X4tyiLJJoEFlXDz5+nID0F+8bcr8d81yuy8yvFRi+aFfJJYOPn4OSfdU52\n");
        stringBuilder.append("ldPei9hgqHICWPzRUSfo1EhJMDTDN92wPfojfp0JWC+SO/fMZYOBmzIyBjqq3QrL\n");
        stringBuilder.append("UJOvNScEJM9jiLCYlDIdI0AeAQ/cWXleUHRvqIS6/1cC7EiZKrxKigBYRoPK2eRy\n");
        stringBuilder.append("ZQO2Jh6reol3MBHpa0vma248V2PxGvba0iIWC7vAYQo7FClm/FxyocQnBt3RaaVD\n");
        stringBuilder.append("d7l4NTU8rEnBts1iBE+PvzGXt5I6OnDOcjoKQ2h0+v7iTHr/PLG0rp3It4NVnVTq\n");
        stringBuilder.append("RE1v8PwGCzwQHcg5nXPbygzFeNL4MmYdjFiLp/I/yoeiOztGpFt2uVIfipTtyJTR\n");
        stringBuilder.append("IrKvrJvLl/btE7s7Aq3VdDvmPgnhyT6a6DfDsjkvr4Ds3FmT7MT1eNwDMJLXmUAk\n");
        stringBuilder.append("7l07V32KPwcYJNSIh3wNyx0CAwEAAaOCAQUwggEBMB0GA1UdDgQWBBSOfdCeLtzG\n");
        stringBuilder.append("ZCMfsHREFzlrs0339jCBvgYDVR0jBIG2MIGzoYGapIGXMIGUMQswCQYDVQQGEwJF\n");
        stringBuilder.append("QzEPMA0GA1UECAwGR1VBWUFTMRIwEAYDVQQHDAlHVUFZQVFVSUwxHzAdBgNVBAoM\n");
        stringBuilder.append("FkFQUEZJUk1BUyBTLkEuIFJvb3QgQUMxHjAcBgNVBAsMFUVOVElEQUQgQ0VSVElG\n");
        stringBuilder.append("SUNBRE9SQTEfMB0GA1UEAwwWQVBQRklSTUFTIFMuQS4gUm9vdCBBQ4IUYQnFYW2s\n");
        stringBuilder.append("17v/GhPxNQVzhCH7S4QwDwYDVR0TAQH/BAUwAwEB/zAOBgNVHQ8BAf8EBAMCAYYw\n");
        stringBuilder.append("DQYJKoZIhvcNAQELBQADggIBAHy0pdrj2iYyn3YzQNiAmuW1BCMaHjzhA4kNDZNh\n");
        stringBuilder.append("e67e7NpfzEfYbP27HK1Inc4w9gUVNayhtFUKWz5dkCKvvHk6E1V85Y6RH/MvV9QY\n");
        stringBuilder.append("qbNunD1r7ayWp8prqa6lVhY2YKG9F2FaaQ+Hbufp05quwV7ImzN4fBVQdH+E23vq\n");
        stringBuilder.append("ezghzU159D0x65WGWGPCjUBDTsyYw/qH5hzmzIFhcdKtP43z9un1LBLd2dmGeqKb\n");
        stringBuilder.append("mK0xz5kviLXi1xJKB8o9Dnwqe+JIm8M9CngY/e/SO8S1lQvSLvkWQGZEd6/a0k9s\n");
        stringBuilder.append("GTxeuulLixCDlA2B3hcFGacBIJUW1TpBgT0KPI2eLLMX38mdd2r9vFCpbLf0cIqH\n");
        stringBuilder.append("2RXCeSQTxH3YJ1EbfWspAFt4ONSLgPQcxySwXgfMKsDRGt66vqpDhvP/WachNnhY\n");
        stringBuilder.append("/c1M4+qf4Rwz3Yrd4vef2A9rLo0rzR1R0JDPCheayo0sHS78HF9gKzmiuuELWgpY\n");
        stringBuilder.append("gdT/It23qiTrxoWdd/c72Scvt9KvvqcNyPpYk18hno7nXjCJHBKbQx8QMumKl73S\n");
        stringBuilder.append("Pj5Ri/WLM5IbGayHEbm/CeCOjH94ZhreG2+lojDe5HltvN2cCoIYyZHvngXWu1K/\n");
        stringBuilder.append("6Ip2f1vdw9te3Z0E0Z8aAj1IKR1P1OyOznTqHq1XEKxZrZWIj1bn+9Qfn6khEcf4\n");
        stringBuilder.append("wBZ1\n");
        stringBuilder.append("-----END CERTIFICATE-----");
    }
}
