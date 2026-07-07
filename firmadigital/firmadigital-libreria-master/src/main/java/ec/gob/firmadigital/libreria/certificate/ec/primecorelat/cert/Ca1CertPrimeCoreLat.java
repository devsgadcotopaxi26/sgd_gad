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
public class Ca1CertPrimeCoreLat extends RubricaCertificate {

    private static final StringBuilder stringBuilder;

    public Ca1CertPrimeCoreLat() {
        super(stringBuilder);
    }

    static {
        stringBuilder = new StringBuilder();
        stringBuilder.append("-----BEGIN CERTIFICATE-----\n");
        stringBuilder.append("MIIHdDCCBVygAwIBAgIULhXUe7AMV94KoNZOp0CtyoXqNsMwDQYJKoZIhvcNAQEL\n");
        stringBuilder.append("BQAwgbIxCzAJBgNVBAYTAkVDMRIwEAYDVQQIDAlQSUNISU5DSEExDjAMBgNVBAcM\n");
        stringBuilder.append("BVFVSVRPMSMwIQYDVQQKDBpQUklNRUNPUkVMQVQgUy5BLlMuIEIuSS5DLjEeMBwG\n");
        stringBuilder.append("A1UECwwVRW50ZSBkZSBDZXJ0aWZpY2FjaW9uMRwwGgYDVQQDDBNQcmltZSBDb3Jl\n");
        stringBuilder.append("IFJvb3QgQ0ExMRwwGgYDVQRhDBNWQVRFQy0xNzkzMjI0MzM5MDAxMB4XDTI2MDIx\n");
        stringBuilder.append("OTA4MDE0OVoXDTM4MDIxNjA4MDE0OVowgbIxCzAJBgNVBAYTAkVDMRIwEAYDVQQI\n");
        stringBuilder.append("DAlQSUNISU5DSEExDjAMBgNVBAcMBVFVSVRPMSMwIQYDVQQKDBpQUklNRUNPUkVM\n");
        stringBuilder.append("QVQgUy5BLlMuIEIuSS5DLjEeMBwGA1UECwwVRW50ZSBkZSBDZXJ0aWZpY2FjaW9u\n");
        stringBuilder.append("MRwwGgYDVQQDDBNQcmltZSBDb3JlIFJvb3QgQ0ExMRwwGgYDVQRhDBNWQVRFQy0x\n");
        stringBuilder.append("NzkzMjI0MzM5MDAxMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEApII0\n");
        stringBuilder.append("w6oafYmbUjCGVoOWfsJYlf8CMvQx78z2WLoDX26TCuX5TrtnOW9lkQnwif9Swr96\n");
        stringBuilder.append("d442RkQ34oKc5cHuPFVjTREMmE1OnhxkwJnBpKASgBaKssitgamB5XLRk8Qjus9B\n");
        stringBuilder.append("CZkmOXbj1k5MMl0q730n1oNb5j8fflWEtkfqKWx/eBCdTBdAT7ZPmKzM7HGgcstZ\n");
        stringBuilder.append("PwKbODGR7Dj4htE5hsPa95Rgx0k0y9tBB0dzPvtsRDEbEEiaKyPiapNe4UeBNqYI\n");
        stringBuilder.append("tMN0Iu6Bk6wsAIe0312Gn3E8qJ69Sd7YmFPNe2i54ESksDVgbQIkfq4s2jfHHNmf\n");
        stringBuilder.append("l32aKTYe00JY2yMYunKsHQgnXoWqpqW433QVQjBl5BqtRgZdJHjxvAUD+NpAi3Vi\n");
        stringBuilder.append("EbktgJLMwAC9umkJeG3jRvzYtKb6xN0Es+edsmysXAd2rnXFJSBVwSq2nx1JfBCB\n");
        stringBuilder.append("Ep48KAahI7DIh4XN5/mXRMPEW6Ivr7r6L/zN1Lkj5N/j53R/mMJGwFyLCG1sGno/\n");
        stringBuilder.append("jFuguGOCobk+KRaP+eudlmn0eeas8mE4z/OgHZD4w6xG4MOY4tVf1huqAVDr8Bxf\n");
        stringBuilder.append("jGCZ82TJO9Hil5J1hsdFPSux4rVeF46NUPV230T1WsUiedlwqa0uN00K2T4x8Rdy\n");
        stringBuilder.append("tHK/5/EVzPbsZIfULLDuBuoyrcIxvet9WFs9nVECAwEAAaOCAX4wggF6MB0GA1Ud\n");
        stringBuilder.append("DgQWBBRQ4c3Hufg+eRWvgUnoJlhEfq3mXzAfBgNVHSMEGDAWgBRQ4c3Hufg+eRWv\n");
        stringBuilder.append("gUnoJlhEfq3mXzAOBgNVHQ8BAf8EBAMCAQYwDwYDVR0TAQH/BAUwAwEB/zAwBgNV\n");
        stringBuilder.append("HR8EKTAnMCWgI6Ahhh9odHRwOi8vcGNjYTEub25saW5lL2NybC9jYTEuY3JsMIHD\n");
        stringBuilder.append("BgNVHSAEgbswgbgwgbUGBFUdIAAwgawwNAYIKwYBBQUHAgEWKGh0dHBzOi8vd3d3\n");
        stringBuilder.append("LnByaW1lY29yZS5sYXQvcmVwb3NpdG9yeS9jcHMwdAYIKwYBBQUHAgIwaBpmRWwg\n");
        stringBuilder.append("cHJlc2VudGUgY2VydGlmaWNhZG8gZXMgZW1pdGlkbyBlbiBiYXNlIGEgbGFzIHBv\n");
        stringBuilder.append("bMOtdGljYXMgZGUgc2VndXJpZGFkIGRlIFBSSU1FQ09SRUxBVCBTLkEuUy4gQi5J\n");
        stringBuilder.append("LkMuMB8GA1UdEQQYMBaBFGZpcm1hc0BwcmltZWNvcmUubGF0MA0GCSqGSIb3DQEB\n");
        stringBuilder.append("CwUAA4ICAQCgdubX2iAkTd1CjtUromCNPT14NQvsHkVqyoHmIsknDssPSWnJxnKH\n");
        stringBuilder.append("WmqbKtm413+XOL5rGWNzdYNx229RRMYGBCmhsTreGXU7UX5A8y7BuAutKKFW1XLK\n");
        stringBuilder.append("YqmjlxxOK+WLRulb8XoNfEFU6+rmlHBKLbfvcYuk6odXwo7jat73Z42Y5+/vKeXh\n");
        stringBuilder.append("xlVWHtwU/qkXtxum8/DxoJRfSFg4T0818iQ7jFjY/tH2OkmgE/8dijo2ouoT8alT\n");
        stringBuilder.append("kQw68oX7oJYLi/ysaWBN8QoDM+u/ZChH25oSCTTx7o50GTut0N7qXJK7/7nuK3je\n");
        stringBuilder.append("AA/Q6v3zObGYOedTS6wCxCxQNEG2/+lx4h1fChZUrAiOh0v7bStapkmdNSi45QKE\n");
        stringBuilder.append("9L3BwLHJY7pB8FHOtaLW/k4Q72VXzCaTGBsejw4YKoMgMJTbKzyaVsQcbJOgRucz\n");
        stringBuilder.append("C/VFglTCsbIe1orW9sb/30xBLi9gGReVpIrCRtKYWKYqyWg4513dX1i8Fd9JLowH\n");
        stringBuilder.append("0dsOhflQVkEg/PrazRvEOY76XnX5p5Afzv7jtbRA1sofH0ndMVEZmzMpH73eHYWX\n");
        stringBuilder.append("VRJtoa5naKsOHpcB4OY3d+llDopgPyuuw6/d7lZpObdCPcLI5SKfcrdLNZSS3B2K\n");
        stringBuilder.append("JTF6hJuvrC0GCPJBpsNnf6AL2lMKEX7WHW1T1VNT1kBEjSWaM2MPsw==\n");
        stringBuilder.append("-----END CERTIFICATE-----\n");
    }
}
