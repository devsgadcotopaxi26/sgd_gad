/*
 * Copyright (C) 2026
 * Authors: Misael Fernández, DARKCAM S.A.
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
package ec.gob.firmadigital.libreria.certificate.ec.darkcam.cert;

import ec.gob.firmadigital.libreria.certificate.base.RubricaCertificate;

/**
 * Certificado subordinado para certificados Short-Lived (SubCA
 * Short), representado como un objeto <code>X509Certificate</code>.<br>
 * emitido por DARKCAM S.A.
 *
 * Este SubCA se utiliza para emitir certificados de corta duración (short-lived
 * certificates) que típicamente tienen validez de horas o días, diseñados para
 * escenarios "one-shot" donde no se requiere revocación tradicional.
 *
 * @author Misael Fernández, DARKCAM S.A.
 */
public class SubCaShortCertDarkcam20262036 extends RubricaCertificate {

    private static final StringBuilder stringBuilder;

    public SubCaShortCertDarkcam20262036() {
        super(stringBuilder);
    }

    static {
        stringBuilder = new StringBuilder();
        stringBuilder.append("-----BEGIN CERTIFICATE-----\n");
        stringBuilder.append("MIIHkDCCBXigAwIBAgIQNsfH579+q6bcaJcnPN+fxjANBgkqhkiG9w0BAQsFADBo\n");
        stringBuilder.append("MQswCQYDVQQGEwJFQzEVMBMGA1UECgwMREFSS0NBTSBTLkEuMQwwCgYDVQQLDANQ\n");
        stringBuilder.append("S0kxEjAQBgNVBAgMCVBpY2hpbmNoYTEQMA4GA1UEAwwHQ0EgUm9vdDEOMAwGA1UE\n");
        stringBuilder.append("BwwFUXVpdG8wHhcNMjYwMTI5MjM1MDMzWhcNMzYwMTMwMDA1MDMyWjCBojELMAkG\n");
        stringBuilder.append("A1UEBhMCRUMxFTATBgNVBAoMDERBUktDQU0gUy5BLjEqMCgGA1UECwwhQ0EgRW1p\n");
        stringBuilder.append("c29yYSBkZSBDZXJ0aWZpY2FjaW9uIFNob3J0MRIwEAYDVQQIDAlQaWNoaW5jaGEx\n");
        stringBuilder.append("LDAqBgNVBAMMI0RBUktDQU0gUy5BLiAtIENBIFN1Ym9yZGluYWRhIFNob3J0MQ4w\n");
        stringBuilder.append("DAYDVQQHDAVRdWl0bzCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAJqp\n");
        stringBuilder.append("kAtoWjGqtnIiGuK/SCwJSJCW2JjvYqSRbF7bOEE8+xEWGbmvaZSQpiH5n3ONKgPN\n");
        stringBuilder.append("9aMu/AeLWaOWfUXxljynRVb0kMdEONYfqff58+yvI8aL2+R5rlYPJKIv5N+lmNGN\n");
        stringBuilder.append("qkN39HXMp+FiNNf87RqR4IYRdl/bRVbWeWBki1qwFY8KcvRkwADE97YrOZkT03bL\n");
        stringBuilder.append("E2zvFO7teD6Gv3cpiTh2g5cgO6ot/sb/QEblFeXpHCHQmZjDzxmYD1kAk3ehU5a+\n");
        stringBuilder.append("xDRNShN757/ogfXz832lhaK2EgwbllvU+HkwL8IegFQVAgVdPNazYdJsOBU43s3W\n");
        stringBuilder.append("ZMypurHYgvPmQzYclU/Jiao8r0P/JkmOkkvLlqGv2oSTibs+qBZYWnkv40lkst/O\n");
        stringBuilder.append("6KLb4y9FB65UT9/wSjEzAdPTaX9VXk7ahhq78PlnrszNroCE+kpvc6hm2OhKicC/\n");
        stringBuilder.append("//MZOkKOYs32H43jx3UX/qRgCkHX4Kbhzv3WM6tzTn+BInYq9YlASMU19BPpqrVf\n");
        stringBuilder.append("HRs4Nk1nnRcN5mFoIF2Ono74vrzcmBEohDdy9EiJMcaYRGKH9kbNWnNJReSYUDnn\n");
        stringBuilder.append("Q9x8VkbRjns1y8PQuwhuyUKF0Tum7tSeaBE/U0tp2Jhu0Ea5udwkCEd7K33KExTm\n");
        stringBuilder.append("+VA3gdE2wZYUnYLUieup4tyBJf4TXNXBiZEAl/zFAgMBAAGjggH5MIIB9TASBgNV\n");
        stringBuilder.append("HRMBAf8ECDAGAQH/AgEAMB8GA1UdIwQYMBaAFBCE3RAEUJNqKXzLYFOTD1k107fL\n");
        stringBuilder.append("MB0GA1UdDgQWBBRL9SSVRcnKc3ihpYBouYoG/Ur/lTAOBgNVHQ8BAf8EBAMCAYYw\n");
        stringBuilder.append("JgYDVR0RBB8wHYEbYWRtaW5pc3RyYXRpdm9AZGFyay1jYW0uY29tMIGCBgNVHR8E\n");
        stringBuilder.append("ezB5MHegdaBzhnFodHRwOi8vY2Etcm9vdC1jcmwtZGFya2NhbS12Mi5zMy51cy1l\n");
        stringBuilder.append("YXN0LTEuYW1hem9uYXdzLmNvbS9jcmwvY2M4NWRiNWEtN2UyNC00M2FkLWE4NzMt\n");
        stringBuilder.append("NGM1YjAyMTBhNzUzL0VvTklaYmpBOXRkLmNybDBHBggrBgEFBQcBAQQ7MDkwNwYI\n");
        stringBuilder.append("KwYBBQUHMAGGK2h0dHA6Ly9vY3NwLmFjbS1wY2EudXMtZWFzdC0xLmFtYXpvbmF3\n");
        stringBuilder.append("cy5jb20wgZgGA1UdIASBkDCBjTCBigYEVR0gADCBgTAzBggrBgEFBQcCARYnaHR0\n");
        stringBuilder.append("cHM6Ly91bml2ZXJzZS1pZC5jb20vZGFya2NhbS9jcHMucGRmMEoGCCsGAQUFBwIC\n");
        stringBuilder.append("MD4MPENlcnRpZmljYWRvIGVtaXRpZG8gY29uZm9ybWUgYSBsYXMgcG9saXRpY2Fz\n");
        stringBuilder.append("IGRlIERBUktDQU0gUy5BLjANBgkqhkiG9w0BAQsFAAOCAgEAcDK/I2EqYsO60qeq\n");
        stringBuilder.append("ZgtkwvFFy4aygxjomHqwrQSh0mzS8aSEBJqnqHub8K/OWkZdKvUFgObVkjHsgZTE\n");
        stringBuilder.append("66hdIXfTG+PVO+rlo79BXrAIhOrJh8Vsuz+YaKMoeMhIKm4TcXRmlLPqtyWU9B4t\n");
        stringBuilder.append("5DB/uw/kb3ScskscWyH4K5vZouYcj0Lg8UTebOKt/wNaAHFy5CK4RQUu/KTen7Yr\n");
        stringBuilder.append("w/LNdHUPtQ+WiGzhj2tyoulFoSKC+e+uNjlHrL1zFoFNByI76iS1ZoXKvV5xSE1K\n");
        stringBuilder.append("Zp3vpSFwBeh+8w1INy+PkPkMgWIS/HiqE05vewIbaVdLNPWT4Vs0CgAUbo8PBIq2\n");
        stringBuilder.append("xZBf7vMP5xlbmI//cCENdRWk93VTWiwKAg2y6qveAH3ynm1rvDYGkhqUlE5mY3Pd\n");
        stringBuilder.append("2OeoTrRnQWBr4sCdnHqaHGKxFIBHWSY/cCSk3M1hYXUQQ+Ui/PGnL6cNRSKrFg0y\n");
        stringBuilder.append("jpFwJzWwjNAry1OrLGfde1793PVLJHyqj8b0tJPvsDM38+Opz2a3ROj5UdGFj1Ex\n");
        stringBuilder.append("E8L2pTAHfp/dYubmhFrmN/4V/2PtuUN8qPc1NygXgJaqxBvpyb1sW0AGKzaNSOgA\n");
        stringBuilder.append("CRMJMKL3hQy6CdTM1nn7SgUCoIURvLz4zA48EPhwq/lEpv4+0D9Yobc7ZfrAO+9D\n");
        stringBuilder.append("pl0OY8lsibl+inz+COKvGTS7Ako=\n");
        stringBuilder.append("-----END CERTIFICATE-----\n");
    }
}
