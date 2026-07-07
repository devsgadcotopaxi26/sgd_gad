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
public class CaWeGoCertLazzate extends RubricaCertificate {

    private static final StringBuilder stringBuilder;

    public CaWeGoCertLazzate() {
        super(stringBuilder);
    }

    static {
        stringBuilder = new StringBuilder();
        stringBuilder.append("-----BEGIN CERTIFICATE-----\n");
        stringBuilder.append("MIIFSDCCBDCgAwIBAgIUGoXEdCP8jrhXeRpqb/xHxe+lHecwDQYJKoZIhvcNAQEL\n");
        stringBuilder.append("BQAwgZAxCzAJBgNVBAYTAkVDMRIwEAYDVQQIDAlQSUNISU5DSEExDjAMBgNVBAcM\n");
        stringBuilder.append("BVFVSVRPMRswGQYDVQQKDBJMYXp6YXRlIENpYS4gTHRkYS4xFjAUBgNVBAsMDVdF\n");
        stringBuilder.append("LUdPIExBWlpBVEUxKDAmBgNVBAMMH1dFLUdPIFRFUkNFUiBWSU5DVUxBRE8gUm9v\n");
        stringBuilder.append("dCBDQTEwIBcNMjQwMTIwMDE0MzEzWhgPMjA1NDAxMTIwMTQzMTNaMIGQMQswCQYD\n");
        stringBuilder.append("VQQGEwJFQzESMBAGA1UECAwJUElDSElOQ0hBMQ4wDAYDVQQHDAVRVUlUTzEbMBkG\n");
        stringBuilder.append("A1UECgwSTGF6emF0ZSBDaWEuIEx0ZGEuMRYwFAYDVQQLDA1XRS1HTyBMQVpaQVRF\n");
        stringBuilder.append("MSgwJgYDVQQDDB9XRS1HTyBURVJDRVIgVklOQ1VMQURPIFJvb3QgQ0ExMIIBIjAN\n");
        stringBuilder.append("BgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuqGJ9GTri8W47ELPXJo0PAdul4x1\n");
        stringBuilder.append("HtkfPM0obewzrZ1K9xPhOSWri4Gtc58tcAswGnKFkFsutMVuVLzvitdGoVKficvo\n");
        stringBuilder.append("/lf0YQEV+BJh7Jk0Lq42c0feUDiaP/4ogTPm4qFvLli+R2kdcLSLkXdPa2aOHTE7\n");
        stringBuilder.append("g3AVEOFatqc+SBlIJRFLZgXy5d2TlWJbnfDX1b8h4902+eT60ai+eUZYlDRbJ4Es\n");
        stringBuilder.append("aRce8+92yOk4Uq9dz8Yqs+NeMc2TN25Teq9/MG5vJGsqAYzbj1/bhsAMslol3B0m\n");
        stringBuilder.append("0gBbH+uwgbKqiT1yvJWXFj3s/vn9vbUbmw526HaTjzHtQFqIxA2IO5+yIQIDAQAB\n");
        stringBuilder.append("o4IBlDCCAZAwHQYDVR0OBBYEFOTmNuaGOsQj3FXc1r2TKXjmpdK8MB8GA1UdIwQY\n");
        stringBuilder.append("MBaAFOTmNuaGOsQj3FXc1r2TKXjmpdK8MA4GA1UdDwEB/wQEAwIBhjASBgNVHRMB\n");
        stringBuilder.append("Af8ECDAGAQH/AgECMDQGA1UdHwQtMCswKaAnoCWGI2h0dHA6Ly93ZS1nby54eXov\n");
        stringBuilder.append("Y3JsL2xhenphdGVDQTEuY3JsMIHzBgNVHSAEgeswgegwgeUGCSsGAQQBg892ATCB\n");
        stringBuilder.append("1zBCBggrBgEFBQcCARY2aHR0cHM6Ly93ZS1nby54eXovZGVzY2FyZ2FzL3BvbGl0\n");
        stringBuilder.append("aWNhcy9jZXJ0aWZpY2Fkb3MucGRmMIGQBggrBgEFBQcCAjCBgxqBgEVsIHByZXNl\n");
        stringBuilder.append("bnRlIGNlcnRpZmljYWRvIGVzIGVtaXRpZG8gZW4gYmFzZSBhIGxhcyBwb2zDrXRp\n");
        stringBuilder.append("Y2FzIGRlIHNlZ3VyaWRhZCBkZSBXRS1HTyBURVJDRVIgVklOQ1VMQURPIExBWlpB\n");
        stringBuilder.append("VEUgRU5URSBERSBDRVJUSUZJQ0FDSU9OMA0GCSqGSIb3DQEBCwUAA4IBAQChfego\n");
        stringBuilder.append("SCn33e/mATsVxyVXpw8o1LV2EPOyWVfsWq9NBhNt1bEfu5W7tf9NQ/ngc3i2qG+N\n");
        stringBuilder.append("NeHP/9zwi0UvZj+3JSDTfNBbI3mIQqxE5P4vMyAF03eI5httzmSNsZnvSg5pDOWb\n");
        stringBuilder.append("PPfNiNlFfOIkExVJ3G891ToV6AXvtqiJ0tNYL/ApuDXWLPQe7TVwXz+2PMsWsafb\n");
        stringBuilder.append("uDZQzzH09aEkP9rGn8WgHxqGDqu4em+jwxyJz4KLJlENXywIMbeHPw3bbS5BTlYD\n");
        stringBuilder.append("gW19+P97D/15mC3y4sFOENREvQjpOTtuNLsZPMkUcNTth/WmoThuXUNcA2av00+T\n");
        stringBuilder.append("wrtj3moaqJNEP0cM\n");
        stringBuilder.append("-----END CERTIFICATE-----\n");
    }
}
