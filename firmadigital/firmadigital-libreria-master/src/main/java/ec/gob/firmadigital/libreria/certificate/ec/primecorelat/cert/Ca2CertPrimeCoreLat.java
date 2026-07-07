/*
 * Copyright (C) 2026
 * Authors: Misael Fernández, PRIMECORELAT S.A.S. B.I.C.
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
package ec.gob.firmadigital.libreria.certificate.ec.primecorelat.cert;

import ec.gob.firmadigital.libreria.certificate.base.RubricaCertificate;

/**
 * Certificado raiz representado como un objeto
 * <code>X509Certificate</code>.<br>
 * emitido por PRIMECORELAT S.A.S. B.I.C.
 *
 * @author Misael Fernández, PRIMECORELAT S.A.S. B.I.C.
 */
public class Ca2CertPrimeCoreLat extends RubricaCertificate {

    private static final StringBuilder stringBuilder;

    public Ca2CertPrimeCoreLat() {
        super(stringBuilder);
    }

    static {
        stringBuilder = new StringBuilder();
        stringBuilder.append("-----BEGIN CERTIFICATE-----\n");
        stringBuilder.append("MIIHdDCCBVygAwIBAgIUSMfXmAp7meXIkqWPuK7PYu1BZfgwDQYJKoZIhvcNAQEL\n");
        stringBuilder.append("BQAwgbIxCzAJBgNVBAYTAkVDMRIwEAYDVQQIDAlQSUNISU5DSEExDjAMBgNVBAcM\n");
        stringBuilder.append("BVFVSVRPMSMwIQYDVQQKDBpQUklNRUNPUkVMQVQgUy5BLlMuIEIuSS5DLjEeMBwG\n");
        stringBuilder.append("A1UECwwVRW50ZSBkZSBDZXJ0aWZpY2FjaW9uMRwwGgYDVQQDDBNQcmltZSBDb3Jl\n");
        stringBuilder.append("IFJvb3QgQ0EyMRwwGgYDVQRhDBNWQVRFQy0xNzkzMjI0MzM5MDAxMB4XDTI2MDIx\n");
        stringBuilder.append("OTA3NTc1MFoXDTM4MDIxNjA3NTc1MFowgbIxCzAJBgNVBAYTAkVDMRIwEAYDVQQI\n");
        stringBuilder.append("DAlQSUNISU5DSEExDjAMBgNVBAcMBVFVSVRPMSMwIQYDVQQKDBpQUklNRUNPUkVM\n");
        stringBuilder.append("QVQgUy5BLlMuIEIuSS5DLjEeMBwGA1UECwwVRW50ZSBkZSBDZXJ0aWZpY2FjaW9u\n");
        stringBuilder.append("MRwwGgYDVQQDDBNQcmltZSBDb3JlIFJvb3QgQ0EyMRwwGgYDVQRhDBNWQVRFQy0x\n");
        stringBuilder.append("NzkzMjI0MzM5MDAxMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA0buM\n");
        stringBuilder.append("4UcZKuVDr1WC1aOnK7W/D90zzBI4IqkLDPywC5nviM0ft035HnzLFg/87AFgV+uR\n");
        stringBuilder.append("tGV1vIEIlgdlh8/xV6kfd1StNLdksL0j5dTKH8DvpUpkUDshzBigcE+ulHzmIJKj\n");
        stringBuilder.append("WB5UXcj1bffsY45TmaKrXW3yHX5OoU47TwRKWMe7P1CTgkutICggTDlVNvbMM6kn\n");
        stringBuilder.append("qmNe2Aat69Yen+PRcFdEQmkay/8/1lN7ASDdGqXOVRCStLozHGR+nR4+pMgrpwCC\n");
        stringBuilder.append("sqby+/m+3mdzRSrJDjFzkHzh90vG488sxkD7N1GEI4K6Kd0Ph/6NkX1X+Tk0AiHd\n");
        stringBuilder.append("+rdcUGdTGkamm0puBUHeKRDosgMNJusY9llnocN193z1kuzIAG/Bh2X87EzGVqXS\n");
        stringBuilder.append("WRB00GmUX9YU0NSitz/D1vrnAYh6hoXCIrGQjjlgVA/ViGQcQqgywDl+4aWs7wCx\n");
        stringBuilder.append("r8WjMClAn7ZXFX+84EZNwIclXav28/hry2PseceUFKgZREs0PcDe8/qGpC3gmcwQ\n");
        stringBuilder.append("Ny5x4Bnln3E+SFYNxj02xdUhk1FVBsBBxv+Q7Y5nog8HIfKQkkpWk+e7NbHTakAv\n");
        stringBuilder.append("ILVUiVkzYd/flg6qrZkCSRSPBnYPENnX4H8dgGmZ8WaXAktfHYzk/PFcd/yBx+B/\n");
        stringBuilder.append("e2fqMEeZgQALxmVi+kM/9a9pPd2Z2nVUZ/ODNb8CAwEAAaOCAX4wggF6MB0GA1Ud\n");
        stringBuilder.append("DgQWBBQgXdXVGpdTgSDmVB9SBa53jwky2TAfBgNVHSMEGDAWgBQgXdXVGpdTgSDm\n");
        stringBuilder.append("VB9SBa53jwky2TAOBgNVHQ8BAf8EBAMCAQYwDwYDVR0TAQH/BAUwAwEB/zAwBgNV\n");
        stringBuilder.append("HR8EKTAnMCWgI6Ahhh9odHRwOi8vcGNjYTIub25saW5lL2NybC9jYTIuY3JsMIHD\n");
        stringBuilder.append("BgNVHSAEgbswgbgwgbUGBFUdIAAwgawwNAYIKwYBBQUHAgEWKGh0dHBzOi8vd3d3\n");
        stringBuilder.append("LnByaW1lY29yZS5sYXQvcmVwb3NpdG9yeS9jcHMwdAYIKwYBBQUHAgIwaBpmRWwg\n");
        stringBuilder.append("cHJlc2VudGUgY2VydGlmaWNhZG8gZXMgZW1pdGlkbyBlbiBiYXNlIGEgbGFzIHBv\n");
        stringBuilder.append("bMOtdGljYXMgZGUgc2VndXJpZGFkIGRlIFBSSU1FQ09SRUxBVCBTLkEuUy4gQi5J\n");
        stringBuilder.append("LkMuMB8GA1UdEQQYMBaBFGZpcm1hc0BwcmltZWNvcmUubGF0MA0GCSqGSIb3DQEB\n");
        stringBuilder.append("CwUAA4ICAQCd0T+HxPp+8yLX5kz4QnZSMNyfOqwuwlUKH1htW1PIiPMlh4a4eBDG\n");
        stringBuilder.append("ZmsGe0OeT3foriahJYnMvv7qLVFrFt4ZDpBSRZO4NEHTl+jBznevktdKhI0n71Rm\n");
        stringBuilder.append("/s1Jm+WDgvOVvQmVroOsrkPxybke02Jef2oaRTrf5mrTgAUbcMW5itzeuR85mWSm\n");
        stringBuilder.append("89HFMT1BohaqlUUvBCelK2nHM0oFGfpXnkN9hA3ev2WlwG3U9FgbD4WR4BFtzxt6\n");
        stringBuilder.append("//dW0jiDHInsEKLz35rI3iR78kvLFWMPjaEeevtmbBTorX6RGA04dAOTSKjCHKRN\n");
        stringBuilder.append("EE+r6qFIOjd79RAaSGsjkLSF1GEGcE7/5JHKbehCgFzI1eIcBHh1+f8KMTJXbkqr\n");
        stringBuilder.append("yIWJ8mu2Ddqo1P/CqR3LuHD4+ZrYXIlkxEL1G1VzVANSNQkgYUZoVOwO8ETKeuIB\n");
        stringBuilder.append("dkpRVmloL8oLZTz/G2nPhRsianq9IQ3xtNVTluZGr4J8/pjREPZhOF/8vb3hOkmA\n");
        stringBuilder.append("DHHX/t+BDMOALc48fpJOmhdjGzq0VqgG+J3uU3Q6H+XyzBy4qKa+XlPWb1Nk84bU\n");
        stringBuilder.append("jg6lwG7iBrWNYw33O5jKkicVCwdjDF9ecCIMpNdzOA5S06ykemwo7AZFNcG6hAXY\n");
        stringBuilder.append("VCUZfcf2t3mx5AYl7DkW6/l8iOHKI9H2S9XHa22DzHaWC+tX2miGcQ==\n");
        stringBuilder.append("-----END CERTIFICATE-----\n");
    }
}
