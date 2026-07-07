/*
 * Copyright (C) 2026
 * Authors: Misael Fernández, LETMI ECUADOR S.A.
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
package ec.gob.firmadigital.libreria.certificate.ec.letmi.cert;

import ec.gob.firmadigital.libreria.certificate.base.RubricaCertificate;

/**
 * Certificado raiz representado como un objeto
 * <code>X509Certificate</code>.<br>
 * emitido por LETMI ECUADOR S.A.
 *
 * @author Misael Fernández, LETMI ECUADOR S.A.
 */
public class CaCertLetmi20252055 extends RubricaCertificate {

    private static final StringBuilder stringBuilder;

    public CaCertLetmi20252055() {
        super(stringBuilder);
    }

    static {
        stringBuilder = new StringBuilder();
        stringBuilder.append("-----BEGIN CERTIFICATE-----\n");
        stringBuilder.append("MIIGwjCCBKqgAwIBAgIKCznjDQseGzbJyDANBgkqhkiG9w0BAQsFADCBozEaMBgG\n");
        stringBuilder.append("A1UEAxMRTEVUTUkgUlNBIFJPT1QgQzExLTArBgNVBAsTJENBIFJTQSBST09UIChD\n");
        stringBuilder.append("ZXJ0aWZpY2F0aW9uIFNlcnZpY2VzKTEcMBoGA1UEYRMTVkFURUMtMTc5MzIyMTEw\n");
        stringBuilder.append("MTAwMTEbMBkGA1UEChMSTEVUTUkgRUNVQURPUiBTLkEuMQ4wDAYDVQQHEwVRVUlU\n");
        stringBuilder.append("TzELMAkGA1UEBhMCRUMwIBcNMjUwMTIwMTcyNzU1WhgPMjA1NTAxMTMxNzI3NTRa\n");
        stringBuilder.append("MIGjMRowGAYDVQQDExFMRVRNSSBSU0EgUk9PVCBDMTEtMCsGA1UECxMkQ0EgUlNB\n");
        stringBuilder.append("IFJPT1QgKENlcnRpZmljYXRpb24gU2VydmljZXMpMRwwGgYDVQRhExNWQVRFQy0x\n");
        stringBuilder.append("NzkzMjIxMTAxMDAxMRswGQYDVQQKExJMRVRNSSBFQ1VBRE9SIFMuQS4xDjAMBgNV\n");
        stringBuilder.append("BAcTBVFVSVRPMQswCQYDVQQGEwJFQzCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCC\n");
        stringBuilder.append("AgoCggIBAM83JC93oesAe6gJuncYlFOQ46kjcFBO08q1ZzknhRAWqoZibCx2eMc9\n");
        stringBuilder.append("HOm0bldrBRytLxqvjeM1ykIuyDC178hsT4CZDLmxnyF3NFc09rUPqgfoyVy1YnUd\n");
        stringBuilder.append("hbm1MhLQDP/VbySroCvd2jbq0R455AyhnJYJIavGa84vXwICcozxvCdKCDVMRpLr\n");
        stringBuilder.append("orpAoHzhg0r5qZjRFSihgQ8oXvIe8yy39xaWQLmFLY8oRIrqZdxgVIl3V5Mk7YHQ\n");
        stringBuilder.append("4cfbIcznu7JPIPQ9kKJdHg+iXG0rX+hk7qRVXF+KsY1G+5arGV4XDrEuO7lhaTJV\n");
        stringBuilder.append("luewhAEEb4ToTIuk7dAXk1CcUrrPzV6vBuXcDZew4hztGpp8JRC60RpWxRFbRmkD\n");
        stringBuilder.append("krvUBJyloWWRNFvq32tdVgvtXE0HPP+Bo8koQbMwA5xAk5a+/YX6vhne1LR16Km/\n");
        stringBuilder.append("d6C47e0roE0WX9vRBYZtkLjOPqb7hiE80tnjwHhAkR7+1Ig+JN9siLmF0beDZHrd\n");
        stringBuilder.append("F/JhpUQW4cAC0ThQ/K/rKxphP+H2t81RwGH3wvrXw8vwDTRzEVHHXXcNv2UI4Jxn\n");
        stringBuilder.append("A1hxWSn8shnLjH1Q0eW4XkhRd+Ejzd6aNGvoUCKIJAmphQG9dGi2JgzlmD/lKZ3N\n");
        stringBuilder.append("tNgzXZEF+Oz0tU4b2K+XKYzP+6EqL0KtIeFcpSxpCutcEQ7RL60bAgMBAAGjgfMw\n");
        stringBuilder.append("gfAwDwYDVR0TAQH/BAUwAwEB/zAfBgNVHSMEGDAWgBR5FM6lo2Rcu1yJwZCp1TWc\n");
        stringBuilder.append("8caUYDAZBgNVHREEEjAQgQ5pbmZvQGxldG1pLmFwcDByBgNVHSAEazBpMGcGBFUd\n");
        stringBuilder.append("IAAwXzA7BggrBgEFBQcCARYvaHR0cHM6Ly9sZXRtaS5hcHAvZG9jdW1lbnRvcy9N\n");
        stringBuilder.append("YXJjb19yZWd1bGF0b3Jpby8wIAYIKwYBBQUHAgIwFAwSaHR0cHM6Ly9sZXRtaS5h\n");
        stringBuilder.append("cHAvMB0GA1UdDgQWBBR5FM6lo2Rcu1yJwZCp1TWc8caUYDAOBgNVHQ8BAf8EBAMC\n");
        stringBuilder.append("AQYwDQYJKoZIhvcNAQELBQADggIBAHJsCzJDJJOUMrMjnAo6YAjtXFoq6z5muvjL\n");
        stringBuilder.append("OuXZBS4ujNtn2tCbHM7zw4dvUre4PDdlRLCLRQuTFAbtUAaxf35sRrscCoUquEBD\n");
        stringBuilder.append("W4Tp+eQO0JjpUCWdESxNOVOhSO6z+WllAOCuTVzkWX4XXDWODVvNcRhU8srV+pAV\n");
        stringBuilder.append("uXQAVdjle2mRwfgg+vgGF4nvVK4z3JbMTThZctisyk835pw/8XTKDKxgS7TQmOy4\n");
        stringBuilder.append("H1GE9jlJkFctvOi0hiPA1PgBf/tWOB0TF2vZRR/2UGht+o4qs3AXfZbc4G2fxGFG\n");
        stringBuilder.append("x/2paYeH4Fsge/DVy9juv5tbdpXHI9NADO8BWD/VJLp5+us5ViiM2Yk9IXdgqUUx\n");
        stringBuilder.append("uGByYGs8q/9w/mNPv2DuDULpm1kk0yrP417LQSXFB2zoL+f3Gld1MSsMgipQTPKg\n");
        stringBuilder.append("nspSgQhZFeU8a4rKzPXK9rAb/agrLc5k5jYqtCXpyKHHfncdBpiNCT0lnW3o4lQv\n");
        stringBuilder.append("ZF8WsWAucs+2cbPEQmnFItX5h0rGBNetw69rMJ3e9zggTbHkQTj4mRnHUKj6Hbvr\n");
        stringBuilder.append("vyWdugvlFrjXRXkbpDCLG0F2XeYis/dy5tQLmOb2rY3F6p3zZVA7ksseL40FML9p\n");
        stringBuilder.append("24gBDc/Hdpi4Z+Ym8iKp1KGRWAP67qacmP/naypaCRA3FUGMgjE4/iPgspTI4zvC\n");
        stringBuilder.append("K0U0dSaY\n");
        stringBuilder.append("-----END CERTIFICATE-----\n");
    }
}
