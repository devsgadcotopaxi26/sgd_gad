/*
 * Copyright (C) 2026 
 * Authors: Misael Fernández, CONSEJO DE LA JUDICATURA
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
package ec.gob.firmadigital.libreria.certificate.ec.cj.cert;

import ec.gob.firmadigital.libreria.certificate.base.RubricaCertificate;

/**
 * Certificado intermedio representado como un objeto
 * <code>X509Certificate</code>.<br>
 * emitido por CONSEJO DE LA JUDICATURA
 *
 * @author Misael Fernández, CONSEJO DE LA JUDICATURA
 */
public class SubCaCertConsejoJudicatura extends RubricaCertificate {

    private static final StringBuilder stringBuilder;

    public SubCaCertConsejoJudicatura() {
        super(stringBuilder);
    }

    static {
        stringBuilder = new StringBuilder();
        stringBuilder.append("-----BEGIN CERTIFICATE-----\n");
        stringBuilder.append("MIIHAzCCBOugAwIBAgIIVTHTgM5nqVQwDQYJKoZIhvcNAQELBQAwgboxCzAJBgNV\n");
        stringBuilder.append("BAYTAkVDMREwDwYDVQQHDAhETSBRVUlUTzEhMB8GA1UECgwYQ09OU0VKTyBERSBM\n");
        stringBuilder.append("QSBKVURJQ0FUVVJBMUQwQgYDVQQLDDtTVUJESVJFQ0NJT04gTkFDSU9OQUwgREUg\n");
        stringBuilder.append("U0VHVVJJREFEIERFIExBIElORk9STUFDSU9OIEROVElDUzEvMC0GA1UEAwwmSUNF\n");
        stringBuilder.append("UlQtRUMgRU5USURBRCBERSBDRVJUSUZJQ0FDSU9OIFJBSVowHhcNMTQxMDE2MTgz\n");
        stringBuilder.append("NDUyWhcNMzQxMDE1MTgzNDUyWjCBtTELMAkGA1UEBhMCRUMxETAPBgNVBAcMCERN\n");
        stringBuilder.append("IFFVSVRPMSEwHwYDVQQKDBhDT05TRUpPIERFIExBIEpVRElDQVRVUkExRDBCBgNV\n");
        stringBuilder.append("BAsMO1NVQkRJUkVDQ0lPTiBOQUNJT05BTCBERSBTRUdVUklEQUQgREUgTEEgSU5G\n");
        stringBuilder.append("T1JNQUNJT04gRE5USUNTMSowKAYDVQQDDCFFTlRJREFEIERFIENFUlRJRklDQUNJ\n");
        stringBuilder.append("T04gSUNFUlQtRUMwggIiMA0GCSqGSIb3DQEBAQUAA4ICDwAwggIKAoICAQCydJBT\n");
        stringBuilder.append("wK4TDgzh3aVnaXnvmOg5s3ryiaEE86Ue1VQisGH7w4JOkPyZz/wODeR4Jq5cXxYL\n");
        stringBuilder.append("opbJEOIHhuhgJ2NVoLwkxx9IIqKUY1Kw2ebcZ6YLtQAHDQxuoYJ+nyJcrYFipzB6\n");
        stringBuilder.append("UXo/Zj6nCo/K5cBkXyL63JhUccvzjW6f96US4J02Zk2F2CVIRlxKh61KbPmuaxwH\n");
        stringBuilder.append("WGfhReSUFXw70t9IMHgTxDwlMiDiWVfwaT7tgynYCBslH2ESFRCKjdcgF84GiWDT\n");
        stringBuilder.append("sc7aCnbCWFn//kBACs0zaaPguixn8NmY3MRUlYSpG79XIqLqMFAN1aDQhsI/xley\n");
        stringBuilder.append("QAeGreb4DvA2CSra+qpmFyPZ1663GhvU08k5BwUTrdbgd0vpCQB5zY3aif8L5GBj\n");
        stringBuilder.append("P8hap+e3PlymyGZ2pC+mg12fPowPHnGROPaY/3krIbLdIvpndmLSiPcr1bwyB91g\n");
        stringBuilder.append("ePIitgv9Vj43/3dgTOehji6nQbcF/HqqTVJc5QQTdhhN8WGHW280I2nbJndcvkoS\n");
        stringBuilder.append("/u6g6iSM90bo5UOvtLjl9jJjK0MD3yfAc153GOJ0MGaAjR5mcy/6wPhBT9/vws1w\n");
        stringBuilder.append("8YxYMRpaDqfNypSLzAP261kKrULNzHI5pXxO6YaEZpaEnw3ETgX63l1vqZXUNhHU\n");
        stringBuilder.append("PuFxW6CV/lQOR+LtNEUwQmo5E5eCQvA4TaVgcwIDAQABo4IBDjCCAQowHQYDVR0O\n");
        stringBuilder.append("BBYEFC8ievhebZSOakAUN8dua3LpOsI/MBIGA1UdEwEB/wQIMAYBAf8CAQAwHwYD\n");
        stringBuilder.append("VR0jBBgwFoAUc8jDvQ/5VUDxZZh6WKNnSB9wnRswaAYDVR0gBGEwXzBdBgRVHSAA\n");
        stringBuilder.append("MFUwUwYIKwYBBQUHAgEWR2h0dHA6Ly93d3cuaWNlcnQuZmplLmdvYi5lYy9kcGMv\n");
        stringBuilder.append("ZGVjbGFyYWNpb25fcHJhY3RpY2FzX2NlcnRpZmljYWNpb24ucGRmMDoGA1UdHwQz\n");
        stringBuilder.append("MDEwL6AtoCuGKWh0dHA6Ly93d3cuaWNlcnQuZmplLmdvYi5lYy9hcmxfaWNlcnQu\n");
        stringBuilder.append("Y3JsMA4GA1UdDwEB/wQEAwIBBjANBgkqhkiG9w0BAQsFAAOCAgEAmAYIAzMoT7iY\n");
        stringBuilder.append("TCluU3LAMWVcoqRyES/Aw2M1mqxkl2CpogiFJWSikj2jfHPfgVZR67ZmLdhAcA8R\n");
        stringBuilder.append("2a0Yz4ziTT4FwuJkcXK10lMJiF+sX6fMJ8t1abVpr8iYgsrF3Baoaw6p+W4pc/HY\n");
        stringBuilder.append("6ZasyQdi0s5unMCE9kDFmd9T6NwHh+iBVXLxwRUEDjw6iM+HWqCkWkV84NgbXWR7\n");
        stringBuilder.append("nrMjPFLLEYkzADCDld7mNQmBTEIyKmGpQRTypRoh0+P4npjRuob7wY4XVqGDWDOq\n");
        stringBuilder.append("PNx52qJXUVOj6i0xkI2d6mRd/w4A3waVv2gSyF7OD5iF6T8tizkJ9dnJEiAC8ZZ6\n");
        stringBuilder.append("xmBkwGezTrVw8zUk6ky2BWfn3dB2bIH6L4Pm+7+fI9VoactqUAAYv8niFvqff64/\n");
        stringBuilder.append("LtRW3IPNOmMatcUDrZs2we7lO6PxznuP38wcLkhO5+KDZw6/zY269Jw+aJ6OKGxr\n");
        stringBuilder.append("yuGJLCSA7m+xcbGVwikjXSZlqlbwRefHZzxLu68ORCg6KuiP31Dcc7FphhQxPgoS\n");
        stringBuilder.append("/G8tOoZlbjF8JPoH2PZcCIecx28+Ny/nBN6tNhQiMU0s9UkT1eB+E0nFSg8p61yJ\n");
        stringBuilder.append("rdiQ0jztV4LZuJIRg5xcVg3IX1rvJHFZ21PbMWBVi31jHp8OEX0k0RcjB7IToVj4\n");
        stringBuilder.append("tAp26GsfWS0uQGJAvY/Znn5/Qm1QzM0=\n");
        stringBuilder.append("-----END CERTIFICATE-----\n");
    }
}
