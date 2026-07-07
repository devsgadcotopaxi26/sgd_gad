/*
 * Copyright (C) 2026
 * Authors: Misael Fernández, FIRMASEGURA S.A.S.
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
package ec.gob.firmadigital.libreria.certificate.ec.firmasegura.cert;

import ec.gob.firmadigital.libreria.certificate.base.RubricaCertificate;

/**
 * Certificado raiz representado como un objeto
 * <code>X509Certificate</code>.<br>
 * emitido por FIRMASEGURA S.A.S.
 *
 * @author Misael Fernández, FIRMASEGURA S.A.S.
 */
public class CaCertFirmaSegura extends RubricaCertificate {

    private static final StringBuilder stringBuilder;

    public CaCertFirmaSegura() {
        super(stringBuilder);
    }

    static {
        stringBuilder = new StringBuilder();
        stringBuilder.append("-----BEGIN CERTIFICATE-----\n");
        stringBuilder.append("MIIGVzCCBD+gAwIBAgIRAKysQ/WAVQpFyoJS0Z+8nKYwDQYJKoZIhvcNAQELBQAw\n");
        stringBuilder.append("gcQxCzAJBgNVBAYTAkVDMRswGQYDVQQKDBJGSVJNQVNFR1VSQSBTLkEuUy4xMDAu\n");
        stringBuilder.append("BgNVBAsMJ0VOVElEQUQgREUgQ0VSVElGSUNBQ0lPTiBERSBJTkZPUk1BQ0lPTjET\n");
        stringBuilder.append("MBEGA1UECAwKVFVOR1VSQUhVQTFAMD4GA1UEAww3QVVUT1JJREFEIERFIENFUlRJ\n");
        stringBuilder.append("RklDQUNJT04gUkFJWiBDQS0xIEZJUk1BU0VHVVJBIFMuQS5TLjEPMA0GA1UEBwwG\n");
        stringBuilder.append("QU1CQVRPMB4XDTIzMTIyNzE4MzYyM1oXDTQzMTIyNzE5MzU1M1owgcQxCzAJBgNV\n");
        stringBuilder.append("BAYTAkVDMRswGQYDVQQKDBJGSVJNQVNFR1VSQSBTLkEuUy4xMDAuBgNVBAsMJ0VO\n");
        stringBuilder.append("VElEQUQgREUgQ0VSVElGSUNBQ0lPTiBERSBJTkZPUk1BQ0lPTjETMBEGA1UECAwK\n");
        stringBuilder.append("VFVOR1VSQUhVQTFAMD4GA1UEAww3QVVUT1JJREFEIERFIENFUlRJRklDQUNJT04g\n");
        stringBuilder.append("UkFJWiBDQS0xIEZJUk1BU0VHVVJBIFMuQS5TLjEPMA0GA1UEBwwGQU1CQVRPMIIC\n");
        stringBuilder.append("IjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAtceNQnldCN8dlA+2XA6rE3YS\n");
        stringBuilder.append("d8eHtVDzM8+ykDettZmPMBsu+gGZAvpvSDl+W3naonsjXSPTYeFWhNNglds4F/AT\n");
        stringBuilder.append("ztwi1aNyOoCrrSchlanhwsQJGiKUv4Zt1dXDKDLYqU3lV0vvUGp7FULldUdqppit\n");
        stringBuilder.append("EpQP5KT6ytAalT4QwcIWx6MjLbZtgh6LVG/B3ZCmQNwEF5SH13ptsJGiH4HxLBZx\n");
        stringBuilder.append("REx5n/In0EsbluGaT8QRBcLbiNj2Zi9sVXkAhyt9V6wN6loNWG8SRBbxkmj21EZ3\n");
        stringBuilder.append("kkqgWAfMKVw9eX9nt6JTsVarGXZWqxnVAhvfknSbvLM+SQ/iNTIuxzqNnKt9zU6v\n");
        stringBuilder.append("eD6MryjA5OBz2SaLkbmjvpPZytzB45qeDdNx20JN3/BZy/gvq/JILMihH3zb7QdU\n");
        stringBuilder.append("wfuiQRqJ3GRevY4P5GnaVmU2y+IpkG7mABt9YFIcWxjzrjAotORjzRkglnruAXBn\n");
        stringBuilder.append("VJVW8jXGTtduRj/uRKIUIa5uP5P7/BbafMyin7UU3AoeOMQM4ZBmMl4wj3fDS2EQ\n");
        stringBuilder.append("vj8Kn13W0k27eHQ5H3ixPXMeLo+OCR9f6m3DocLXedpYGNihWoNmY3OOhc9SG+DB\n");
        stringBuilder.append("5LRa8YeZcrnkbTgDRwq6hP9koj8Jhiyq3dNdqB6LN0RONXd4G4GMGGThknvP8Xre\n");
        stringBuilder.append("3gw/yGYTOl5RmUbQaesCAwEAAaNCMEAwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4E\n");
        stringBuilder.append("FgQUE3QO85otcvosx6bXbt7CII960DMwDgYDVR0PAQH/BAQDAgGGMA0GCSqGSIb3\n");
        stringBuilder.append("DQEBCwUAA4ICAQCt+Ok91nC5rhPFJaq8mqKCWKuESx6bxcTUB8h7V+1LFDND6FVF\n");
        stringBuilder.append("tHwHZmWsRgwEWAufY9rVexISH52+9bBOOl27Ej0YJwIYHRDc5hxZX04AXh80XMKd\n");
        stringBuilder.append("vmtpXp7knsstIaJbCbUnyViRnTUdUi3Jcnkg8RrJbT7KHlVjgIilw/z/ecg5RumF\n");
        stringBuilder.append("QeU34d0XueBlL6wwmS+pI8CYjq1AyrrHyMo38UKkt03z1xW1QxtuAME+99Jmjcae\n");
        stringBuilder.append("sDSslXZgvllP0qy0hHiidEcrijWdVP3fAlpF6eu6aQoRngjpPhfV5Ljch4JNtpDs\n");
        stringBuilder.append("iz4oTOTC1NAyVdfW38CuDwgrIwj10WHhF/D2O64HfwjS1TSkeECYOW4M4QH/d3W8\n");
        stringBuilder.append("+eY+Jqa1KvdvBJEeVRMVgmur4pq4bR3iYmUhmFsXe+H7YrAzOX6dzOytlJnJE5i1\n");
        stringBuilder.append("oq3hw4OORFHlZuvneS030e81r6Gm88912hMoWhM3WjtnE3crs2O6a8Qs74qFUVRR\n");
        stringBuilder.append("krxe1baZZWsnzgcPWPbNa6FsngDO3iCwmPhmhPkpcHk+0Xk6usLyBv7qJEa+Xtub\n");
        stringBuilder.append("0T63e5g+pJZguXzBitqJkAAS8CcPguUkABjlN2k/mFbBD3ZcDjUI8PJxWpkwGMFS\n");
        stringBuilder.append("MSA4T/+OJBJwR2CNTcxfhjpNJMAL/wkFBU38AoM+HuxE/r9RdNSyHKXUSg==\n");
        stringBuilder.append("-----END CERTIFICATE-----\n");
    }
}
